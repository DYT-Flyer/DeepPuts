import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { computeThesisStatus, type ThesisStatus } from "@/lib/performance/calculator";
import { toYahooSymbol } from "@/lib/yahoo/aggregates";
import yahooFinance from 'yahoo-finance2';

export interface TickerPerformance {
  ticker: string;
  pubPrice: number | null;
  price1d: number | null;
  price5d: number | null;
  price30d: number | null;
  priceCurrent: number | null;
  pct1d: number | null;
  pct5d: number | null;
  pct30d: number | null;
  pctCurrent: number | null;
  status: ThesisStatus;
}

function toDateStr(d: Date) {
  return d.toISOString().split("T")[0];
}

async function fetchClose(yahooSymbol: string, from: Date, to: Date, sort = "asc"): Promise<number | null> {
  try {
    const period1 = Math.floor(from.getTime() / 1000);
    const period2 = Math.floor(to.getTime() / 1000);
    const res = await fetch(`https://query2.finance.yahoo.com/v8/finance/chart/${yahooSymbol}?period1=${period1}&period2=${period2}&interval=1d`);
    if (!res.ok) return null;
    
    const data = await res.json();
    const result = data?.chart?.result?.[0];
    if (!result) return null;
    
    const closes = result.indicators?.quote?.[0]?.close as (number | null)[];
    if (!closes || closes.length === 0) return null;
    
    const validCloses = closes.filter((c): c is number => c !== null);
    if (validCloses.length === 0) return null;
    
    if (sort === "desc") {
      return validCloses[validCloses.length - 1];
    }
    return validCloses[0];
  } catch (err) {
    console.error("fetchClose error:", err);
    return null;
  }
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function pct(pub: number | null, current: number | null): number | null {
  if (pub === null || current === null) return null;
  return ((current - pub) / pub) * 100;
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const tickersStr = url.searchParams.get("tickers");
  const pubDateStr = url.searchParams.get("pubDate");
  const assetClass = url.searchParams.get("assetClass") as "stock" | "crypto" | null;

  if (!tickersStr || !pubDateStr) return NextResponse.json({ error: "Missing params" }, { status: 400 });

  const tickers = tickersStr.split(",").slice(0, 4);
  const pubDate = new Date(pubDateStr);
  const catalystDate = null; // Raw events don't have catalysts

  // Fetch pub prices on the fly since they aren't cached for raw events
  const snapshot: Record<string, number> = {};
  const pubPrices = await Promise.all(
    tickers.map(t => fetchClose(toYahooSymbol(t, assetClass || undefined), pubDate, addDays(pubDate, 7), "asc"))
  );
  tickers.forEach((t, i) => {
    if (pubPrices[i] !== null) {
      snapshot[t] = pubPrices[i]!;
    }
  });

  const now = new Date();

  // Fetch all horizon prices in parallel per ticker
  const results: TickerPerformance[] = await Promise.all(
    tickers.map(async (ticker) => {
      const sym = toYahooSymbol(ticker, assetClass || undefined);
      const pubPrice = snapshot[ticker] ?? null;

      // Fetch horizons in parallel — only meaningful if pub date is old enough
      const pub = pubDate;
      const [price1d, price5d, price30d, priceCurrent] = await Promise.all([
        addDays(pub, 1) < now ? fetchClose(sym, addDays(pub, 1), addDays(pub, 8), "asc") : Promise.resolve(null),
        addDays(pub, 5) < now ? fetchClose(sym, addDays(pub, 5), addDays(pub, 12), "asc") : Promise.resolve(null),
        addDays(pub, 30) < now ? fetchClose(sym, addDays(pub, 30), addDays(pub, 37), "asc") : Promise.resolve(null),
        fetchClose(sym, addDays(now, -7), now, "desc"),
      ]);

      const status = computeThesisStatus(pubPrice, priceCurrent ?? price30d, catalystDate);

      return {
        ticker,
        pubPrice,
        price1d,
        price5d,
        price30d,
        priceCurrent,
        pct1d: pct(pubPrice, price1d),
        pct5d: pct(pubPrice, price5d),
        pct30d: pct(pubPrice, price30d),
        pctCurrent: pct(pubPrice, priceCurrent),
        status,
      };
    })
  );

  return NextResponse.json(results);
}
