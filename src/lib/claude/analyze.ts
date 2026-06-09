import { getClaudeClient } from "./client";
import type { AnalysisResult } from "@/types";
import type { PriceAnomaly } from "@/lib/polygon/aggregates";

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
1-3: Weak signal, noise likely, minimal short thesis
4-6: Moderate signal, worth monitoring, incomplete thesis
7-8: Strong signal, high probability of continued downside, clear thesis
9-10: Extreme signal, imminent or ongoing severe catalyst

Output schema (valid JSON, no trailing commas):
{
  "bearThesis": "2-4 sentences explaining the short case with specific risks",
  "convictionScore": <integer 1-10>,
  "signalType": "<one taxonomy value>",
  "affectedTickers": ["array", "of", "uppercase", "symbols"],
  "sector": "<sector string or null>",
  "catalystDate": "<ISO 8601 date string or null>"
}

Rules:
- If no meaningful short thesis exists, return convictionScore 1-2
- affectedTickers should only include symbols with direct exposure to the negative event
- For crypto, use symbols like BTC, ETH, SOL (no USD suffix)
- sector should be one of: Technology, Healthcare, Energy, Financials, Consumer, Industrials, Materials, Utilities, Real Estate, Crypto, Macro
- catalystDate is when the primary catalyst will materialize (e.g., earnings date), not today`;

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

export async function analyzeEvent(event: EventInput): Promise<AnalysisResult> {
  const client = getClaudeClient();

  let userContent = `Analyze this market event for shorting opportunities:

Asset class: ${event.assetClass}
Published: ${event.publishedAt}
Headline: ${event.headline}
Summary: ${event.summary || "No summary available"}
Tickers mentioned: ${event.tickers.join(", ") || "None"}`;

  if (event.anomaly) {
    userContent += `\nPrice anomaly: ${event.anomaly.symbol} moved ${event.anomaly.pctChange.toFixed(1)}% on this date, volume was ${event.anomaly.volumeMultiple.toFixed(1)}x the 30-day average. Current price: $${event.anomaly.currentPrice.toFixed(2)}`;
  }

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      // Use beta.messages for prompt caching support
      const response = await (client.beta.messages as unknown as {
        create: (params: Record<string, unknown>) => Promise<{ content: Array<{ type: string; text?: string }> }>
      }).create({
        model: "claude-opus-4-6",
        max_tokens: 500,
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

      const text = response.content[0].type === "text" ? (response.content[0].text ?? "") : "";
      const parsed = JSON.parse(text) as AnalysisResult;

      // Validate required fields
      if (
        typeof parsed.bearThesis !== "string" ||
        typeof parsed.convictionScore !== "number" ||
        typeof parsed.signalType !== "string" ||
        !Array.isArray(parsed.affectedTickers)
      ) {
        throw new Error("Invalid response shape");
      }

      parsed.convictionScore = Math.max(1, Math.min(10, Math.round(parsed.convictionScore)));

      return parsed;
    } catch (err) {
      if (attempt === 0) {
        console.error("Claude analysis attempt 1 failed, retrying:", err);
        await sleep(2000);
        continue;
      }
      console.error("Claude analysis failed after 2 attempts:", err);
      return {
        bearThesis: "Analysis could not be completed.",
        convictionScore: 1,
        signalType: "news_negative",
        affectedTickers: event.tickers,
        sector: null,
        catalystDate: null,
      };
    }
  }

  // Should never reach here
  return {
    bearThesis: "Analysis unavailable.",
    convictionScore: 1,
    signalType: "news_negative",
    affectedTickers: [],
    sector: null,
    catalystDate: null,
  };
}
