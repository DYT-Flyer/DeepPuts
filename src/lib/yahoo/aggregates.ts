import yahooFinance from 'yahoo-finance2';
import type { SparklinePoint } from "@/types";

const ANOMALY_WATCHLIST = [
  "AAPL", "MSFT", "NVDA", "TSLA", "AMZN", "META", "GOOGL", "AMD",
  "NFLX", "PYPL", "SNAP", "RIVN", "COIN", "MSTR", "GME", "PLTR",
];

const CRYPTO_ANOMALY_WATCHLIST = ["BTC-USD", "ETH-USD", "SOL-USD", "DOGE-USD"];

export interface PriceAnomaly {
  symbol: string;
  assetClass: "stock" | "crypto";
  date: string;
  pctChange: number;
  volumeMultiple: number;
  currentPrice: number;
}

function toDateStr(d: Date) {
  return d.toISOString().split("T")[0];
}

export function toYahooSymbol(ticker: string, assetClass?: "stock" | "crypto"): string {
  // Mapping Crypto format (X:BTCUSD to BTC-USD)
  if (ticker.startsWith("X:")) {
    const withoutPrefix = ticker.replace("X:", "");
    return withoutPrefix.replace("USD", "-USD");
  }
  // Mapping AI output (BTC, ETH, SOL) to Yahoo Finance pairs (BTC-USD, ETH-USD)
  const cryptoMap: Record<string, string> = {
    BTC: "BTC-USD",
    ETH: "ETH-USD",
    SOL: "SOL-USD",
    DOGE: "DOGE-USD",
    XRP: "XRP-USD",
    ADA: "ADA-USD",
    AVAX: "AVAX-USD",
    BNB: "BNB-USD",
    LINK: "LINK-USD",
    DOT: "DOT-USD",
    MATIC: "MATIC-USD",
    UNI: "UNI-USD",
  };
  if (cryptoMap[ticker]) {
    return cryptoMap[ticker];
  }
  if (assetClass === "crypto" && !ticker.includes("-")) {
    return `${ticker}-USD`;
  }
  return ticker;
}

export async function detectAnomalies(): Promise<PriceAnomaly[]> {
  const anomalies: PriceAnomaly[] = [];
  const now = new Date();
  const from = new Date(now);
  from.setDate(from.getDate() - 35);

  const allSymbols: Array<{ symbol: string; assetClass: "stock" | "crypto" }> = [
    ...ANOMALY_WATCHLIST.map((s) => ({ symbol: s, assetClass: "stock" as const })),
    ...CRYPTO_ANOMALY_WATCHLIST.map((s) => ({ symbol: s, assetClass: "crypto" as const })),
  ];

  for (const { symbol, assetClass } of allSymbols) {
    try {
      const results = (await yahooFinance.historical(symbol, {
        period1: toDateStr(from),
        period2: toDateStr(now),
        interval: "1d",
      })) as any[];

      if (!results || results.length < 2) continue;

      const recent = results.slice(-2);
      const prev = recent[0];
      const curr = recent[1];
      const pctChange = ((curr.close - prev.close) / prev.close) * 100;

      // Calculate 30-day average volume
      const last30 = results.slice(-31, -1);
      const avgVolume = last30.reduce((sum, d) => sum + (d.volume || 0), 0) / (last30.length || 1);
      const volumeMultiple = (curr.volume || 0) / avgVolume;

      // Flag: >5% drop OR volume spike >2x with any drop
      if (pctChange < -5 || (volumeMultiple > 2 && pctChange < -2)) {
        anomalies.push({
          symbol: symbol.replace("-USD", "/USD"), // Keep UI consistent with what Polygon used to provide
          assetClass,
          date: curr.date.toISOString(),
          pctChange,
          volumeMultiple,
          currentPrice: curr.close,
        });
      }
    } catch (err) {
      console.error(`Anomaly check failed for ${symbol}:`, err);
    }
  }

  return anomalies;
}

export async function fetchPriceAt(symbol: string, date: Date): Promise<number | null> {
  const yahooSymbol = toYahooSymbol(symbol);
  const from = new Date(date);
  const to = new Date(date);
  to.setDate(to.getDate() + 7); // look forward up to a week to skip weekends/holidays

  try {
    const results = (await yahooFinance.historical(yahooSymbol, {
      period1: toDateStr(from),
      period2: toDateStr(to),
      interval: "1d",
    })) as any[];

    if (results && results.length > 0) {
      return results[0].close;
    }
    return null;
  } catch (err) {
    console.error(`Failed to fetch historical price for ${symbol} around ${date}:`, err);
    return null;
  }
}

export async function fetchSparkline(symbol: string, assetClass?: "stock" | "crypto"): Promise<SparklinePoint[]> {
  const yahooSymbol = toYahooSymbol(symbol, assetClass);
  const now = new Date();
  const from = new Date(now);
  from.setDate(from.getDate() - 7); // Default to last 7 days for a sparkline

  try {
    const period1 = Math.floor(from.getTime() / 1000);
    const period2 = Math.floor(now.getTime() / 1000);
    
    // Attempt intra-day if supported
    let interval = "1h";
    let res = await fetch(`https://query2.finance.yahoo.com/v8/finance/chart/${yahooSymbol}?period1=${period1}&period2=${period2}&interval=${interval}`);
    
    if (!res.ok) {
      interval = "1d";
      res = await fetch(`https://query2.finance.yahoo.com/v8/finance/chart/${yahooSymbol}?period1=${period1}&period2=${period2}&interval=${interval}`);
    }
    
    if (!res.ok) return [];
    
    const data = await res.json();
    const result = data?.chart?.result?.[0];
    if (!result) return [];
    
    const timestamps = result.timestamp as number[];
    const closes = result.indicators?.quote?.[0]?.close as (number | null)[];
    
    if (!timestamps || !closes || timestamps.length !== closes.length) return [];
    
    const validPoints: SparklinePoint[] = [];
    for (let i = 0; i < timestamps.length; i++) {
      if (closes[i] !== null) {
        validPoints.push({
          t: timestamps[i] * 1000,
          c: closes[i] as number,
        });
      }
    }
    return validPoints;
  } catch (err) {
    console.error(`Failed to fetch sparkline for ${symbol}:`, err);
    return [];
  }
}
