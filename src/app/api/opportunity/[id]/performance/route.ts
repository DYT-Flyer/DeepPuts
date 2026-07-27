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
    const results: any = await yahooFinance.historical(yahooSymbol, {
      period1: toDateStr(from),
      period2: toDateStr(to),
      interval: "1d"
    });
    
    if (!results || results.length === 0) return null;
    
    if (sort === "desc") {
      return results[results.length - 1].close ?? null;
    }
    return results[0].close ?? null;
  } catch {
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

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const analysis = await prisma.analysis.findUnique({
    where: { id },
    include: { canonicalEvent: true },
  });

  if (!analysis) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const tickers = (JSON.parse(analysis.affectedTickers) as string[]).slice(0, 4);
  const pubDate = analysis.canonicalEvent.firstSeenAt;
  const catalystDate = analysis.catalystDate?.toISOString() ?? null;

  // Load cached pub prices
  const snapshot: Record<string, number> = analysis.priceSnapshot
    ? (JSON.parse(analysis.priceSnapshot) as Record<string, number>)
    : {};

  // Fetch missing pub prices
  const missingPub = tickers.filter(t => snapshot[t] === undefined);
  if (missingPub.length > 0) {
    const prices = await Promise.all(
      missingPub.map(t => fetchClose(toYahooSymbol(t), pubDate, addDays(pubDate, 7), "asc"))
    );
    let updated = false;
    missingPub.forEach((t, i) => {
      if (prices[i] !== null) { snapshot[t] = prices[i]!; updated = true; }
    });
    if (updated) {
      await prisma.analysis.update({ where: { id }, data: { priceSnapshot: JSON.stringify(snapshot) } });
    }
  }

  const now = new Date();

  // Fetch all horizon prices in parallel per ticker
  const results: TickerPerformance[] = await Promise.all(
    tickers.map(async (ticker) => {
      const sym = toYahooSymbol(ticker);
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
