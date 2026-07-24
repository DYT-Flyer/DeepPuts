import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const tickersStr = searchParams.get("tickers");
  if (!tickersStr) return NextResponse.json({});

  const stockTickers = tickersStr.split(",").filter(t => !t.startsWith("X:")).join(",");
  const cryptoTickers = tickersStr.split(",").filter(t => t.startsWith("X:")).join(",");

  const fetchSnapshot = async (type: "stocks" | "crypto", tickers: string) => {
    if (!tickers) return [];
    const locale = type === "stocks" ? "us" : "global";
    const res = await fetch(`https://api.polygon.io/v2/snapshot/locale/${locale}/markets/${type}/tickers?tickers=${tickers}&apiKey=${process.env.POLYGON_API_KEY}`, { next: { revalidate: 60 } });
    if (!res.ok) return [];
    const json = await res.json();
    return json.tickers || [];
  };

  const [stockSnaps, cryptoSnaps] = await Promise.all([
    fetchSnapshot("stocks", stockTickers),
    fetchSnapshot("crypto", cryptoTickers)
  ]);

  const map: Record<string, { change: number, changePerc: number }> = {};
  for (const s of [...stockSnaps, ...cryptoSnaps]) {
    map[s.ticker] = {
      change: s.todaysChange,
      changePerc: s.todaysChangePerc
    };
  }

  return NextResponse.json(map);
}
