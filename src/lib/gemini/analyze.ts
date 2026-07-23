import { getGeminiClient } from "./client";
import type { AnalysisResult } from "@/types";
import type { PriceAnomaly } from "@/lib/polygon/aggregates";
import { Type } from "@google/genai";

export const PROMPT_VERSION = "v3.0-gemini";
export const GEMINI_MODEL = "gemini-3.6-flash";

const SYSTEM_PROMPT = `You are a bearish equity and crypto analyst. Your job is to identify shorting opportunities from market events. You output structured JSON only — no prose, no markdown wrappers, matching the specified output schema.

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

Rules:
- If no meaningful short thesis exists, return convictionScore 1-2
- affectedTickers: only symbols with direct exposure to the negative event; crypto uses BTC/ETH/SOL without USD
- sector: Technology|Healthcare|Energy|Financials|Consumer|Industrials|Materials|Utilities|Real Estate|Crypto|Macro
- catalystDate: a real future event date (YYYY-MM-DD) or null — never invented
- keyRisks: 2-4 concrete, specific risks (not generic); avoid "stock may fall"
- counterArgs: 1-3 genuine bull cases that could invalidate the thesis
- confidenceLabel: high=clear evidence from primary source; medium=credible but secondary; low=limited evidence; speculative=inference only
- timeHorizon: when the thesis is expected to resolve (1-7d|1-4w|1-3m|3m+)
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

const analysisResponseSchema = {
  type: Type.OBJECT,
  properties: {
    bearThesis: { type: Type.STRING, description: "2-4 sentences explaining the short case with specific evidence" },
    convictionScore: { type: Type.INTEGER, description: "Integer 1-10" },
    signalType: { type: Type.STRING },
    affectedTickers: { type: Type.ARRAY, items: { type: Type.STRING } },
    sector: { type: Type.STRING, nullable: true },
    industry: { type: Type.STRING, nullable: true },
    catalystDate: { type: Type.STRING, nullable: true },
    keyRisks: { type: Type.ARRAY, items: { type: Type.STRING } },
    counterArgs: { type: Type.ARRAY, items: { type: Type.STRING } },
    confidenceLabel: { type: Type.STRING },
    timeHorizon: { type: Type.STRING },
    severity: { type: Type.STRING },
    sourceQuality: { type: Type.STRING },
  },
  required: [
    "bearThesis",
    "convictionScore",
    "signalType",
    "affectedTickers",
  ],
};

export async function analyzeEvent(
  event: EventInput
): Promise<{ result: AnalysisResult; usage: AnalysisUsage }> {
  const ai = getGeminiClient();

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
      const response = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: userContent,
        config: {
          systemInstruction: SYSTEM_PROMPT,
          responseMimeType: "application/json",
          responseSchema: analysisResponseSchema,
          temperature: 0.2,
        },
      });

      const latencyMs = Date.now() - t0;
      const usageMetadata = response.usageMetadata;
      const inputTokens = usageMetadata?.promptTokenCount ?? 0;
      const outputTokens = usageMetadata?.candidatesTokenCount ?? 0;
      
      // Gemini 2.5 Flash pricing estimate (~$0.075/M input, ~$0.30/M output)
      const estimatedCostUsd = (inputTokens * 0.075 + outputTokens * 0.30) / 1_000_000;

      const text = response.text ?? "";
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
        console.error("Gemini analysis attempt 1 failed, retrying:", err);
        await sleep(1500);
        continue;
      }
      console.error("Gemini analysis failed after 2 attempts:", err);
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
