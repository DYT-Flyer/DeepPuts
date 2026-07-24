import { NextResponse } from "next/server";
import { fetchSparkline } from "@/lib/polygon/aggregates";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ symbol: string }> }
) {

  const resolvedParams = await params;
  const symbol = resolvedParams.symbol;

  try {
    const data = await fetchSparkline(symbol.toUpperCase(), 30);
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
