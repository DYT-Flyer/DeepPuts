import { NextResponse } from "next/server";
import { fetchSparkline } from "@/lib/yahoo/aggregates";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ symbol: string }> }
) {

  const resolvedParams = await params;
  const symbol = resolvedParams.symbol;
  
  const url = new URL(req.url);
  const assetClass = url.searchParams.get("assetClass") as "stock" | "crypto" | null;

  try {
    const data = await fetchSparkline(symbol.toUpperCase(), assetClass || undefined);
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
