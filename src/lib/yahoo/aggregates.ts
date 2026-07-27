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

export function toYahooSymbol(ticker: string): string {
  // Mapping Crypto format (X:BTCUSD to BTC-USD)
  if (ticker.startsWith("X:")) {
    const withoutPrefix = ticker.replace("X:", "");
    return withoutPrefix.replace("USD", "-USD");
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

export async function fetchSparkline(symbol: string): Promise<SparklinePoint[]> {
  const yahooSymbol = toYahooSymbol(symbol);
  const now = new Date();
  const from = new Date(now);
  from.setDate(from.getDate() - 7); // Default to last 7 days for a sparkline

  try {
    // Yahoo Finance intra-day data is limited in the historical API to '1d', '1wk', '1mo'
    // To get hourly data, we must use chart/historical with specific intervals, but 
    // yahoo-finance2 `historical` actually supports '1h' if period is short enough.
    // However, using '1d' over a larger period works well for sparklines too.
    
    // Attempt intra-day if supported
    let results: any[] = [];
    try {
      results = (await yahooFinance.historical(yahooSymbol, {
        period1: toDateStr(from),
        period2: toDateStr(now),
        interval: "1h",
      })) as any[];
    } catch {
      // Fallback to daily if hourly fails
      results = (await yahooFinance.historical(yahooSymbol, {
        period1: toDateStr(from),
        period2: toDateStr(now),
        interval: "1d",
      })) as any[];
    }

    return results.map((r) => ({
      t: new Date(r.date).getTime(),
      c: r.close,
    }));
  } catch (err) {
    console.error(`Failed to fetch sparkline for ${symbol}:`, err);
    return [];
  }
}
