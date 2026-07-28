import { NextResponse } from "next/server";
import yahooFinance from 'yahoo-finance2';
import { toYahooSymbol } from "@/lib/yahoo/aggregates";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const tickersStr = searchParams.get("tickers");
  if (!tickersStr) return NextResponse.json({});

  const tickers = tickersStr.split(",").map(t => toYahooSymbol(t));

  const map: Record<string, { change: number, changePerc: number }> = {};
  
  try {
    const quotes: any = await yahooFinance.quote(tickers);
    for (const q of quotes) {
      if (!q.symbol) continue;
      // Re-map back to Polygon format if necessary for UI, or just store by original requested string?
      // Wait, the UI passes X:BTCUSD, so we need to map the returned symbol back, or just use the index.
      // Better yet, map back for crypto: BTC-USD -> X:BTCUSD
      const originalSymbol = q.symbol.includes("-USD") 
        ? `X:${q.symbol.replace("-USD", "USD")}`
        : q.symbol;

      map[originalSymbol] = {
        change: q.regularMarketChange ?? 0,
        changePerc: q.regularMarketChangePercent ?? 0
      };
    }
  } catch (err) {
    console.error("Failed to fetch quotes from yahoo-finance2", err);
  }

  return NextResponse.json(map);
}
