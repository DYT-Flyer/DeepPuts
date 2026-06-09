import prisma from "@/lib/prisma";
import { fetchStockNews, fetchCryptoNews } from "@/lib/polygon/news";
import { detectAnomalies } from "@/lib/polygon/aggregates";
import { analyzeEvent } from "@/lib/claude/analyze";
import type { PrismaClient } from "@prisma/client";

const ANALYSIS_DELAY_MS = 2000; // 2s between Claude calls

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function runRefreshCycle(db: PrismaClient = prisma): Promise<void> {
  console.log(`[scheduler] Starting refresh cycle at ${new Date().toISOString()}`);

  const run = await db.schedulerRun.create({
    data: { status: "running" },
  });

  let eventsFound = 0;
  let eventsAnalyzed = 0;
  const errors: string[] = [];

  try {
    // Get last successful run time for delta fetching
    const lastSuccess = await db.schedulerRun.findFirst({
      where: { status: "success", id: { not: run.id } },
      orderBy: { startedAt: "desc" },
    });

    const sinceUtc = lastSuccess?.startedAt?.toISOString();
    console.log(`[scheduler] Fetching news since: ${sinceUtc || "beginning"}`);

    // --- Fetch news ---
    const [stockNews, cryptoNews, anomalies] = await Promise.allSettled([
      fetchStockNews(sinceUtc).catch((e) => { errors.push(`Stock news: ${e.message}`); return []; }),
      fetchCryptoNews(sinceUtc).catch((e) => { errors.push(`Crypto news: ${e.message}`); return []; }),
      detectAnomalies().catch((e) => { errors.push(`Anomalies: ${e.message}`); return []; }),
    ]);

    const stockArticles = stockNews.status === "fulfilled" ? stockNews.value : [];
    const cryptoArticles = cryptoNews.status === "fulfilled" ? cryptoNews.value : [];
    const priceAnomalies = anomalies.status === "fulfilled" ? anomalies.value : [];

    console.log(`[scheduler] Fetched ${stockArticles.length} stock articles, ${cryptoArticles.length} crypto articles, ${priceAnomalies.length} anomalies`);

    // --- Store raw events ---
    const newEvents: Array<{ id: string; headline: string; summary: string | null; tickers: string[]; publishedAt: Date; assetClass: string }> = [];

    // Stock news
    for (const article of stockArticles) {
      try {
        const existing = await db.rawEvent.findUnique({ where: { externalId: article.id } });
        if (existing) continue;

        const event = await db.rawEvent.create({
          data: {
            source: "polygon_news",
            assetClass: "stock",
            externalId: article.id,
            tickers: JSON.stringify(article.tickers),
            headline: article.title,
            summary: article.description,
            publishedAt: new Date(article.published_utc),
            rawJson: JSON.stringify(article),
          },
        });
        newEvents.push({
          id: event.id,
          headline: event.headline,
          summary: event.summary,
          tickers: article.tickers,
          publishedAt: event.publishedAt,
          assetClass: event.assetClass,
        });
        eventsFound++;
      } catch (err) {
        errors.push(`Store stock event: ${(err as Error).message}`);
      }
    }

    // Crypto news
    for (const article of cryptoArticles) {
      try {
        const existing = await db.rawEvent.findUnique({ where: { externalId: article.id } });
        if (existing) continue;

        const event = await db.rawEvent.create({
          data: {
            source: "polygon_news",
            assetClass: "crypto",
            externalId: article.id,
            tickers: JSON.stringify(article.tickers),
            headline: article.title,
            summary: article.description,
            publishedAt: new Date(article.published_utc),
            rawJson: JSON.stringify(article),
          },
        });
        newEvents.push({
          id: event.id,
          headline: event.headline,
          summary: event.summary,
          tickers: article.tickers,
          publishedAt: event.publishedAt,
          assetClass: event.assetClass,
        });
        eventsFound++;
      } catch (err) {
        errors.push(`Store crypto event: ${(err as Error).message}`);
      }
    }

    // Price anomalies as events
    for (const anomaly of priceAnomalies) {
      try {
        const externalId = `anomaly-${anomaly.symbol}-${anomaly.date.split("T")[0]}`;
        const existing = await db.rawEvent.findUnique({ where: { externalId } });
        if (existing) continue;

        const headline = `${anomaly.symbol} dropped ${Math.abs(anomaly.pctChange).toFixed(1)}% with ${anomaly.volumeMultiple.toFixed(1)}x average volume`;
        const event = await db.rawEvent.create({
          data: {
            source: "polygon_anomaly",
            assetClass: anomaly.assetClass,
            externalId,
            tickers: JSON.stringify([anomaly.symbol.replace("/USD", "")]),
            headline,
            summary: `Price anomaly detected: ${anomaly.symbol} experienced an unusual ${anomaly.pctChange.toFixed(1)}% price move with volume ${anomaly.volumeMultiple.toFixed(1)}x above the 30-day average. Current price: $${anomaly.currentPrice.toFixed(2)}.`,
            publishedAt: new Date(anomaly.date),
            rawJson: JSON.stringify(anomaly),
          },
        });
        newEvents.push({
          id: event.id,
          headline: event.headline,
          summary: event.summary,
          tickers: [anomaly.symbol.replace("/USD", "")],
          publishedAt: event.publishedAt,
          assetClass: event.assetClass,
        });
        eventsFound++;
      } catch (err) {
        errors.push(`Store anomaly event: ${(err as Error).message}`);
      }
    }

    console.log(`[scheduler] Stored ${eventsFound} new events, now analyzing...`);

    // --- Analyze new events with Claude ---
    for (const event of newEvents) {
      try {
        const result = await analyzeEvent({
          assetClass: event.assetClass as "stock" | "crypto",
          headline: event.headline,
          summary: event.summary,
          tickers: event.tickers,
          publishedAt: event.publishedAt.toISOString(),
        });

        await db.analysis.create({
          data: {
            rawEventId: event.id,
            bearThesis: result.bearThesis,
            convictionScore: result.convictionScore,
            signalType: result.signalType,
            affectedTickers: JSON.stringify(result.affectedTickers),
            sector: result.sector,
            catalystDate: result.catalystDate ? new Date(result.catalystDate) : null,
            analysisJson: JSON.stringify(result),
          },
        });

        eventsAnalyzed++;
        console.log(`[scheduler] Analyzed: "${event.headline.slice(0, 60)}..." → score ${result.convictionScore}`);
        await sleep(ANALYSIS_DELAY_MS);
      } catch (err) {
        errors.push(`Analyze event ${event.id}: ${(err as Error).message}`);
      }
    }

    const status = errors.length > 0 ? "partial" : "success";
    await db.schedulerRun.update({
      where: { id: run.id },
      data: {
        status,
        finishedAt: new Date(),
        eventsFound,
        eventsAnalyzed,
        errorMessage: errors.length > 0 ? errors.slice(0, 5).join("; ") : null,
      },
    });

    console.log(`[scheduler] Cycle complete: ${eventsFound} found, ${eventsAnalyzed} analyzed, status: ${status}`);
  } catch (err) {
    console.error("[scheduler] Fatal error:", err);
    await db.schedulerRun.update({
      where: { id: run.id },
      data: {
        status: "error",
        finishedAt: new Date(),
        eventsFound,
        eventsAnalyzed,
        errorMessage: (err as Error).message,
      },
    });
  }
}
