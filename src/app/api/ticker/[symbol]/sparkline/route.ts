import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { fetchSparkline } from "@/lib/polygon/aggregates";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ symbol: string }> }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { symbol } = await params;

  try {
    const data = await fetchSparkline(symbol.toUpperCase(), 30);
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
