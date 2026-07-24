import prisma from "@/lib/prisma";
import pLimit from "p-limit";
import { fetchStockNews, fetchCryptoNews } from "@/lib/polygon/news";
import { detectAnomalies } from "@/lib/polygon/aggregates";
import { fetchRecent8KFilings } from "@/lib/sec/edgar";
import { fetchCnbcNews } from "@/lib/cnbc/rss";
import { analyzeEvent, PROMPT_VERSION, GEMINI_MODEL } from "@/lib/gemini/analyze";
import { IngestionService } from "@/domain/ingestion/service";
import { DeduplicationService } from "@/domain/resolution/service";
import { AnalysisOrchestrator } from "@/domain/analysis/pipeline";
import type { PrismaClient } from "@prisma/client";

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

    // --- Detect Anomalies First ---
    let priceAnomalies: any[] = [];
    try {
      priceAnomalies = await detectAnomalies();
    } catch (e: any) {
      errors.push(`Anomalies: ${e.message}`);
    }

    // --- Fetch news & filings ---
    const [stockNews, cryptoNews, secFilingsRes, cnbcNewsRes] = await Promise.allSettled([
      fetchStockNews(sinceUtc).catch((e) => { errors.push(`Stock news: ${e.message}`); return []; }),
      fetchCryptoNews(sinceUtc).catch((e) => { errors.push(`Crypto news: ${e.message}`); return []; }),
      fetchRecent8KFilings().catch((e) => { errors.push(`SEC filings: ${e.message}`); return []; }),
      fetchCnbcNews().catch((e) => { errors.push(`CNBC news: ${e.message}`); return []; }),
    ]);

    const stockArticles = stockNews.status === "fulfilled" ? stockNews.value : [];
    const cryptoArticles = cryptoNews.status === "fulfilled" ? cryptoNews.value : [];
    const secFilings = secFilingsRes.status === "fulfilled" ? secFilingsRes.value : [];
    const cnbcArticles = cnbcNewsRes.status === "fulfilled" ? cnbcNewsRes.value : [];

    console.log(`[scheduler] Fetched ${stockArticles.length} stock articles, ${cryptoArticles.length} crypto articles, ${priceAnomalies.length} anomalies, ${secFilings.length} SEC filings, ${cnbcArticles.length} CNBC articles`);

    const ingestionService = new IngestionService(db);
    const deduplicationService = new DeduplicationService(db);
    const ingestionRunId = await ingestionService.startRun("polygon");

    // --- Store raw events ---
    const canonicalEventIdsToAnalyze = new Set<string>();
    
    // Concurrency limits
    const limitIngest = pLimit(10);
    const ingestTasks: (() => Promise<void>)[] = [];

    // Helper to queue ingest tasks
    const pushIngestTask = (payload: any, logPrefix: string, idLabel: string) => {
      ingestTasks.push(async () => {
        try {
          const ingested = await ingestionService.ingestEvent(payload, ingestionRunId);

          if (ingested.status === "duplicate") {
            console.log(`   ↳ Duplicate event (skipping) [${idLabel}]`);
            return;
          } else if (ingested.status === "quarantined") {
            console.log(`   ↳ Quarantined payload: ${ingested.quarantineReason} [${idLabel}]`);
            return;
          }

          const canonical = await deduplicationService.resolveCanonicalEvent(ingested.id);
          const matchLabel = canonical.isNewCanonical ? "NEW Canonical Event" : `Merged into Canonical Cluster ${canonical.canonicalEventId}`;
          console.log(`   ↳ ${matchLabel} (Members: ${canonical.totalMembers}, Match: ${canonical.matchType}) [${idLabel}]`);

          if (canonical.isNewCanonical) {
            canonicalEventIdsToAnalyze.add(canonical.canonicalEventId);
          }
          eventsFound++;
        } catch (err) {
          errors.push(`Store ${logPrefix} event: ${(err as Error).message}`);
        }
      });
    };

    // Stock news
    for (const article of stockArticles) {
      const tickerList = article.tickers.length ? ` [${article.tickers.join(", ")}]` : "";
      console.log(`[scheduler] Queuing Article (Stock)${tickerList}: "${article.title}"`);
      pushIngestTask({
        provider: "polygon",
        source: "polygon_news",
        assetClass: "stock",
        externalId: article.id,
        tickers: article.tickers,
        headline: article.title,
        summary: article.description,
        publishedAt: new Date(article.published_utc),
        rawJson: JSON.stringify(article),
      }, "stock", article.id);
    }

    // Crypto news
    for (const article of cryptoArticles) {
      const tickerList = article.tickers.length ? ` [${article.tickers.join(", ")}]` : "";
      console.log(`[scheduler] Queuing Article (Crypto)${tickerList}: "${article.title}"`);
      pushIngestTask({
        provider: "polygon",
        source: "polygon_news",
        assetClass: "crypto",
        externalId: article.id,
        tickers: article.tickers,
        headline: article.title,
        summary: article.description,
        publishedAt: new Date(article.published_utc),
        rawJson: JSON.stringify(article),
      }, "crypto", article.id);
    }

    // SEC 8-K filings
    for (const filing of secFilings) {
      console.log(`[scheduler] Queuing SEC Filing: "${filing.companyName}" (${filing.ticker || filing.cik})`);
      pushIngestTask({
        provider: "sec",
        source: "sec_edgar",
        assetClass: "stock",
        externalId: filing.id,
        tickers: filing.ticker ? [filing.ticker] : [],
        headline: `SEC 8-K Filing: ${filing.companyName}`,
        summary: filing.summary,
        publishedAt: new Date(filing.updatedAt),
        rawJson: JSON.stringify(filing),
      }, "SEC", filing.id);
    }

    // CNBC Articles
    for (const article of cnbcArticles) {
      console.log(`[scheduler] Queuing CNBC Article: "${article.title}"`);
      pushIngestTask({
        provider: "cnbc",
        source: "cnbc_rss",
        assetClass: "stock",
        externalId: article.id,
        tickers: [],
        headline: article.title,
        summary: article.summary,
        publishedAt: new Date(article.publishedAt),
        rawJson: JSON.stringify(article),
      }, "CNBC", article.id);
    }

    // Price anomalies as events
    for (const anomaly of priceAnomalies) {
      const headline = `${anomaly.symbol} dropped ${Math.abs(anomaly.pctChange).toFixed(1)}% with ${anomaly.volumeMultiple.toFixed(1)}x average volume`;
      console.log(`[scheduler] Queuing Anomaly (${anomaly.symbol}): "${headline}"`);
      const externalId = `anomaly-${anomaly.symbol}-${anomaly.date.split("T")[0]}`;
      pushIngestTask({
        provider: "polygon",
        source: "polygon_anomaly",
        assetClass: anomaly.assetClass,
        externalId,
        tickers: [anomaly.symbol.replace("/USD", "")],
        headline,
        summary: `Price anomaly detected: ${anomaly.symbol} experienced an unusual ${anomaly.pctChange.toFixed(1)}% price move with volume ${anomaly.volumeMultiple.toFixed(1)}x above the 30-day average. Current price: $${anomaly.currentPrice.toFixed(2)}.`,
        publishedAt: new Date(anomaly.date),
        rawJson: JSON.stringify(anomaly),
      }, "anomaly", externalId);
    }

    // Execute all ingest tasks concurrently with a limit of 10
    await Promise.all(ingestTasks.map(t => limitIngest(t)));

    await ingestionService.finishRun(ingestionRunId, errors.length > 0 ? "partial" : "success");

    console.log(`[scheduler] Stored ${eventsFound} events, now analyzing ${canonicalEventIdsToAnalyze.size} new canonical events...`);

    const analysisOrchestrator = new AnalysisOrchestrator(db);
    const limitAnalysis = pLimit(3);

    // --- Analyze new events with Gemini concurrently ---
    const analysisTasks = Array.from(canonicalEventIdsToAnalyze).map(canonicalId => {
      return limitAnalysis(async () => {
        try {
          const runId = await analysisOrchestrator.analyzeCanonicalEvent(canonicalId);
          if (runId) {
            eventsAnalyzed++;
            console.log(`[scheduler] Analyzed canonical event ${canonicalId}`);
          }
        } catch (err) {
          errors.push(`Analyze canonical ${canonicalId}: ${(err as Error).message}`);
        }
      });
    });

    await Promise.all(analysisTasks);

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
