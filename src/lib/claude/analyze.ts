import { getClaudeClient } from "./client";
import type { AnalysisResult } from "@/types";
import type { PriceAnomaly } from "@/lib/polygon/aggregates";

export const PROMPT_VERSION = "v2.1";

const SYSTEM_PROMPT = `You are a bearish equity and crypto analyst. Your job is to identify shorting opportunities from market events. You output structured JSON only — no prose, no markdown, no explanation outside the JSON object.

Signal type taxonomy (use exactly these values):
- earnings_miss: missed EPS or revenue, guidance cut
- sec_filing: 8-K adverse filing, insider sell, restatement
- news_negative: lawsuit, recall, executive departure, scandal, product failure
- macro: rate decision, CPI, geopolitical escalation, recession signals
- crypto_dump: large wallet movement, exchange outflow, protocol exploit, whale sell
- insider_sell: Form 4 significant insider selling
- guidance_cut: forward guidance reduction without earnings miss
- regulatory: FDA rejection, DOJ investigation, sanctions, regulatory crackdown

Conviction scoring rubric (integer 1-10):
1-2: Noise or highly speculative, minimal evidence
3-4: Weak signal, worth monitoring, incomplete thesis
5-6: Moderate signal, credible thesis, outcome uncertain
7-8: Strong signal, multiple corroborating factors, clear bear case
9: Primary source evidence (SEC filing, earnings call), near-term catalyst confirmed
10: Reserved — do not use for routine events

Most analyses should score 3-7. Score 8+ requires primary source evidence cited in the thesis.

Output schema (valid JSON, no trailing commas, all fields required):
{
  "bearThesis": "2-4 sentences explaining the short case with specific evidence",
  "convictionScore": <integer 1-10>,
  "signalType": "<one taxonomy value>",
  "affectedTickers": ["UPPERCASE", "SYMBOLS"],
  "sector": "<sector or null>",
  "industry": "<specific industry or null>",
  "catalystDate": "<ISO 8601 date or null>",
  "keyRisks": ["specific risk 1", "specific risk 2", "specific risk 3"],
  "counterArgs": ["strongest bull case 1", "bull case 2"],
  "confidenceLabel": "<high|medium|low|speculative>",
  "timeHorizon": "<1-7d|1-4w|1-3m|3m+>",
  "severity": "<low|medium|high|critical>",
  "sourceQuality": "<primary|secondary|aggregated>"
}

Rules:
- If no meaningful short thesis exists, return convictionScore 1-2
- affectedTickers: only symbols with direct exposure to the negative event; crypto uses BTC/ETH/SOL without USD
- sector: Technology|Healthcare|Energy|Financials|Consumer|Industrials|Materials|Utilities|Real Estate|Crypto|Macro
- catalystDate: a real future event date or null — never invented
- keyRisks: 2-4 concrete, specific risks (not generic); avoid "stock may fall"
- counterArgs: 1-3 genuine bull cases that could invalidate the thesis
- confidenceLabel: high=clear evidence from primary source; medium=credible but secondary; low=limited evidence; speculative=inference only
- timeHorizon: when the thesis is expected to resolve
- severity: low=modest pullback; medium=10-25% decline; high=25%+; critical=existential/bankruptcy risk
- sourceQuality: primary=SEC/earnings/direct; secondary=news report; aggregated=wire/summary`;

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export interface EventInput {
  assetClass: "stock" | "crypto";
  headline: string;
  summary: string | null;
  tickers: string[];
  publishedAt: string;
  anomaly?: PriceAnomaly;
}

export interface AnalysisUsage {
  inputTokens: number;
  outputTokens: number;
  estimatedCostUsd: number;
  latencyMs: number;
}

export async function analyzeEvent(
  event: EventInput
): Promise<{ result: AnalysisResult; usage: AnalysisUsage }> {
  const client = getClaudeClient();

  let userContent = `Analyze this market event for bearish implications:

Asset class: ${event.assetClass}
Published: ${event.publishedAt}
Headline: ${event.headline}
Summary: ${event.summary || "No summary available"}
Tickers mentioned: ${event.tickers.join(", ") || "None"}`;

  if (event.anomaly) {
    userContent += `\nPrice anomaly: ${event.anomaly.symbol} moved ${event.anomaly.pctChange.toFixed(1)}% on this date, volume was ${event.anomaly.volumeMultiple.toFixed(1)}x the 30-day average. Current price: $${event.anomaly.currentPrice.toFixed(2)}`;
  }

  for (let attempt = 0; attempt < 2; attempt++) {
    const t0 = Date.now();
    try {
      const response = await (client.beta.messages as unknown as {
        create: (params: Record<string, unknown>) => Promise<{
          content: Array<{ type: string; text?: string }>;
          usage?: { input_tokens?: number; output_tokens?: number };
        }>
      }).create({
        model: "claude-opus-4-6",
        max_tokens: 800,
        betas: ["prompt-caching-2024-07-31"],
        system: [
          {
            type: "text",
            text: SYSTEM_PROMPT,
            cache_control: { type: "ephemeral" },
          },
        ],
        messages: [{ role: "user", content: userContent }],
      });

      const latencyMs = Date.now() - t0;
      const inputTokens = response.usage?.input_tokens ?? 0;
      const outputTokens = response.usage?.output_tokens ?? 0;
      // Opus 4.6 pricing: ~$15/M input, $75/M output (approximate)
      const estimatedCostUsd = (inputTokens * 15 + outputTokens * 75) / 1_000_000;

      const text = response.content[0].type === "text" ? (response.content[0].text ?? "") : "";
      const json = text.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();
      const parsed = JSON.parse(json) as AnalysisResult;

      if (
        typeof parsed.bearThesis !== "string" ||
        typeof parsed.convictionScore !== "number" ||
        typeof parsed.signalType !== "string" ||
        !Array.isArray(parsed.affectedTickers)
      ) {
        throw new Error("Invalid response shape");
      }

      parsed.convictionScore = Math.max(1, Math.min(10, Math.round(parsed.convictionScore)));

      return {
        result: parsed,
        usage: { inputTokens, outputTokens, estimatedCostUsd, latencyMs },
      };
    } catch (err) {
      if (attempt === 0) {
        console.error("Claude analysis attempt 1 failed, retrying:", err);
        await sleep(2000);
        continue;
      }
      console.error("Claude analysis failed after 2 attempts:", err);
      const fallback: AnalysisResult = {
        bearThesis: "Analysis could not be completed.",
        convictionScore: 1,
        signalType: "news_negative",
        affectedTickers: event.tickers,
        sector: null,
        catalystDate: null,
      };
      return { result: fallback, usage: { inputTokens: 0, outputTokens: 0, estimatedCostUsd: 0, latencyMs: Date.now() - t0 } };
    }
  }

  const fallback: AnalysisResult = {
    bearThesis: "Analysis unavailable.",
    convictionScore: 1,
    signalType: "news_negative",
    affectedTickers: [],
    sector: null,
    catalystDate: null,
  };
  return { result: fallback, usage: { inputTokens: 0, outputTokens: 0, estimatedCostUsd: 0, latencyMs: 0 } };
}
