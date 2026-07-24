import { getPolygonClient } from "./client";
import type { SparklinePoint } from "@/types";

interface AggResult {
  t: number;
  o: number;
  h: number;
  l: number;
  c: number;
  v: number;
  vw: number;
}

interface AggsResponse {
  results?: AggResult[];
  resultsCount?: number;
  status: string;
  ticker: string;
}

const ANOMALY_WATCHLIST = [
  "AAPL", "MSFT", "NVDA", "TSLA", "AMZN", "META", "GOOGL", "AMD",
  "NFLX", "PYPL", "SNAP", "RIVN", "COIN", "MSTR", "GME", "PLTR",
];

const CRYPTO_ANOMALY_WATCHLIST = ["X:BTCUSD", "X:ETHUSD", "X:SOLUSD", "X:DOGEUSD"];

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

export async function detectAnomalies(): Promise<PriceAnomaly[]> {
  const client = getPolygonClient();
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
      const data = await client.get<AggsResponse>(
        `/v2/aggs/ticker/${encodeURIComponent(symbol)}/range/1/day/${toDateStr(from)}/${toDateStr(now)}`,
        { adjusted: "true", sort: "asc", limit: "50" }
      );

      if (!data.results || data.results.length < 2) continue;

      const recent = data.results.slice(-2);
      const prev = recent[0];
      const curr = recent[1];
      const pctChange = ((curr.c - prev.c) / prev.c) * 100;

      // Calculate 30-day average volume
      const last30 = data.results.slice(-31, -1);
      const avgVolume = last30.reduce((sum, d) => sum + d.v, 0) / (last30.length || 1);
      const volumeMultiple = curr.v / avgVolume;

      // Flag: >5% drop OR volume spike >2x with any drop
      if (pctChange < -5 || (volumeMultiple > 2 && pctChange < -2)) {
        anomalies.push({
          symbol: symbol.replace("X:", "").replace("USD", "/USD"),
          assetClass,
          date: new Date(curr.t).toISOString(),
          pctChange,
          volumeMultiple,
          currentPrice: curr.c,
        });
      }
    } catch (err) {
      console.error(`Anomaly check failed for ${symbol}:`, err);
    }
  }

  return anomalies;
}

export async function fetchPriceAt(symbol: string, date: Date): Promise<number | null> {
  const client = getPolygonClient();
  const polygonSymbol = symbol.includes("/") ? `X:${symbol.replace("/", "")}` : symbol;
  const from = new Date(date);
  const to = new Date(date);
  to.setDate(to.getDate() + 7); // look forward up to a week to skip weekends/holidays

  try {
    const data = await client.get<AggsResponse>(
      `/v2/aggs/ticker/${encodeURIComponent(polygonSymbol)}/range/1/day/${toDateStr(from)}/${toDateStr(to)}`,
      { adjusted: "true", sort: "asc", limit: "5" }
    );
    return data.results?.[0]?.c ?? null;
  } catch {
    return null;
  }
}

export function toPolygonSymbol(ticker: string): string {
  if (ticker.startsWith("X:")) return ticker;
  if (ticker.includes("/")) return `X:${ticker.replace("/", "")}`;
  const cryptoMap: Record<string, string> = {
    BTC: "X:BTCUSD", ETH: "X:ETHUSD", SOL: "X:SOLUSD",
    DOGE: "X:DOGEUSD", ADA: "X:ADAUSD", XRP: "X:XRPUSD",
    AVAX: "X:AVAXUSD", DOT: "X:DOTUSD", MATIC: "X:MATICUSD",
  };
  return cryptoMap[ticker] ?? ticker;
}

export async function fetchCurrentPrice(symbol: string): Promise<number | null> {
  const client = getPolygonClient();
  const polygonSymbol = toPolygonSymbol(symbol);
  const now = new Date();
  const from = new Date(now);
  from.setDate(from.getDate() - 7);

  try {
    const data = await client.get<AggsResponse>(
      `/v2/aggs/ticker/${encodeURIComponent(polygonSymbol)}/range/1/day/${toDateStr(from)}/${toDateStr(now)}`,
      { adjusted: "true", sort: "desc", limit: "1" }
    );
    return data.results?.[0]?.c ?? null;
  } catch {
    return null;
  }
}

export async function fetchSparkline(symbol: string, days = 30): Promise<SparklinePoint[]> {
  const client = getPolygonClient();
  const now = new Date();
  const from = new Date(now);
  from.setDate(from.getDate() - days);

  const polygonSymbol = toPolygonSymbol(symbol);

  const data = await client.get<AggsResponse>(
    `/v2/aggs/ticker/${encodeURIComponent(polygonSymbol)}/range/1/hour/${toDateStr(from)}/${toDateStr(now)}`,
    { adjusted: "true", sort: "asc", limit: "720" }
  );

  return (data.results || []).map((r) => ({ t: r.t, c: r.c }));
}
