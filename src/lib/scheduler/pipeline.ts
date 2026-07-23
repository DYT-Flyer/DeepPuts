import prisma from "@/lib/prisma";
import { fetchStockNews, fetchCryptoNews } from "@/lib/polygon/news";
import { detectAnomalies } from "@/lib/polygon/aggregates";
import { analyzeEvent, PROMPT_VERSION, GEMINI_MODEL } from "@/lib/gemini/analyze";
import { IngestionService } from "@/domain/ingestion/service";
import { DeduplicationService } from "@/domain/resolution/service";
import { AnalysisOrchestrator } from "@/domain/analysis/pipeline";
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

    const ingestionService = new IngestionService(db);
    const deduplicationService = new DeduplicationService(db);
    const ingestionRunId = await ingestionService.startRun("polygon");

    // --- Store raw events ---
    const canonicalEventIdsToAnalyze = new Set<string>();

    // Stock news
    for (const article of stockArticles) {
      const tickerList = article.tickers.length ? ` [${article.tickers.join(", ")}]` : "";
      console.log(`[scheduler] Article (Stock)${tickerList}: "${article.title}"`);
      try {
        const ingested = await ingestionService.ingestEvent({
          provider: "polygon",
          source: "polygon_news",
          assetClass: "stock",
          externalId: article.id,
          tickers: article.tickers,
          headline: article.title,
          summary: article.description,
          publishedAt: new Date(article.published_utc),
          rawJson: JSON.stringify(article),
        }, ingestionRunId);

        if (ingested.status === "duplicate") {
          console.log(`   ↳ Duplicate event (skipping)`);
          continue;
        } else if (ingested.status === "quarantined") {
          console.log(`   ↳ Quarantined payload: ${ingested.quarantineReason}`);
          continue;
        }

        const canonical = await deduplicationService.resolveCanonicalEvent(ingested.id);
        const matchLabel = canonical.isNewCanonical ? "NEW Canonical Event" : `Merged into Canonical Cluster ${canonical.canonicalEventId}`;
        console.log(`   ↳ ${matchLabel} (Members: ${canonical.totalMembers}, Match: ${canonical.matchType})`);

        if (canonical.isNewCanonical) {
          canonicalEventIdsToAnalyze.add(canonical.canonicalEventId);
        }
        eventsFound++;
      } catch (err) {
        errors.push(`Store stock event: ${(err as Error).message}`);
      }
    }

    // Crypto news
    for (const article of cryptoArticles) {
      const tickerList = article.tickers.length ? ` [${article.tickers.join(", ")}]` : "";
      console.log(`[scheduler] Article (Crypto)${tickerList}: "${article.title}"`);
      try {
        const ingested = await ingestionService.ingestEvent({
          provider: "polygon",
          source: "polygon_news",
          assetClass: "crypto",
          externalId: article.id,
          tickers: article.tickers,
          headline: article.title,
          summary: article.description,
          publishedAt: new Date(article.published_utc),
          rawJson: JSON.stringify(article),
        }, ingestionRunId);

        if (ingested.status === "duplicate") {
          console.log(`   ↳ Duplicate event (skipping)`);
          continue;
        } else if (ingested.status === "quarantined") {
          console.log(`   ↳ Quarantined payload: ${ingested.quarantineReason}`);
          continue;
        }

        const canonical = await deduplicationService.resolveCanonicalEvent(ingested.id);
        const matchLabel = canonical.isNewCanonical ? "NEW Canonical Event" : `Merged into Canonical Cluster ${canonical.canonicalEventId}`;
        console.log(`   ↳ ${matchLabel} (Members: ${canonical.totalMembers}, Match: ${canonical.matchType})`);

        if (canonical.isNewCanonical) {
          canonicalEventIdsToAnalyze.add(canonical.canonicalEventId);
        }
        eventsFound++;
      } catch (err) {
        errors.push(`Store crypto event: ${(err as Error).message}`);
      }
    }

    // Price anomalies as events
    for (const anomaly of priceAnomalies) {
      const headline = `${anomaly.symbol} dropped ${Math.abs(anomaly.pctChange).toFixed(1)}% with ${anomaly.volumeMultiple.toFixed(1)}x average volume`;
      console.log(`[scheduler] Anomaly (${anomaly.symbol}): "${headline}"`);
      try {
        const externalId = `anomaly-${anomaly.symbol}-${anomaly.date.split("T")[0]}`;
        const ingested = await ingestionService.ingestEvent({
          provider: "polygon",
          source: "polygon_anomaly",
          assetClass: anomaly.assetClass,
          externalId,
          tickers: [anomaly.symbol.replace("/USD", "")],
          headline,
          summary: `Price anomaly detected: ${anomaly.symbol} experienced an unusual ${anomaly.pctChange.toFixed(1)}% price move with volume ${anomaly.volumeMultiple.toFixed(1)}x above the 30-day average. Current price: $${anomaly.currentPrice.toFixed(2)}.`,
          publishedAt: new Date(anomaly.date),
          rawJson: JSON.stringify(anomaly),
        }, ingestionRunId);

        if (ingested.status === "duplicate") {
          console.log(`   ↳ Duplicate event (skipping)`);
          continue;
        } else if (ingested.status === "quarantined") {
          console.log(`   ↳ Quarantined anomaly payload: ${ingested.quarantineReason}`);
          continue;
        }

        const canonical = await deduplicationService.resolveCanonicalEvent(ingested.id);
        const matchLabel = canonical.isNewCanonical ? "NEW Canonical Event" : `Merged into Canonical Cluster ${canonical.canonicalEventId}`;
        console.log(`   ↳ ${matchLabel} (Members: ${canonical.totalMembers}, Match: ${canonical.matchType})`);
        
        if (canonical.isNewCanonical) {
          canonicalEventIdsToAnalyze.add(canonical.canonicalEventId);
        }
        eventsFound++;
      } catch (err) {
        errors.push(`Store anomaly event: ${(err as Error).message}`);
      }
    }

    await ingestionService.finishRun(ingestionRunId, errors.length > 0 ? "partial" : "success");

    console.log(`[scheduler] Stored ${eventsFound} events, now analyzing ${canonicalEventIdsToAnalyze.size} new canonical events...`);

    const analysisOrchestrator = new AnalysisOrchestrator(db);

    // --- Analyze new events with Gemini ---
    for (const canonicalId of canonicalEventIdsToAnalyze) {
      try {
        const runId = await analysisOrchestrator.analyzeCanonicalEvent(canonicalId);
        if (runId) {
          eventsAnalyzed++;
          console.log(`[scheduler] Analyzed canonical event ${canonicalId}`);
        }
        await sleep(ANALYSIS_DELAY_MS);
      } catch (err) {
        errors.push(`Analyze canonical ${canonicalId}: ${(err as Error).message}`);
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
        claudeCost: null,
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
