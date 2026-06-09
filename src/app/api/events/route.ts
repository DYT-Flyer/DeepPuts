import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import type { EventFeedItem, SignalType } from "@/types";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = req.nextUrl;
  const limit = parseInt(searchParams.get("limit") || "50", 10);
  const offset = parseInt(searchParams.get("offset") || "0", 10);
  const assetClass = searchParams.get("assetClass");

  const events = await prisma.rawEvent.findMany({
    where: assetClass ? { assetClass } : undefined,
    include: { analysis: true },
    orderBy: { publishedAt: "desc" },
    take: Math.min(limit, 100),
    skip: offset,
  });

  const items: EventFeedItem[] = events.map((e) => ({
    id: e.id,
    headline: e.headline,
    summary: e.summary,
    publishedAt: e.publishedAt.toISOString(),
    assetClass: e.assetClass as "stock" | "crypto",
    tickers: JSON.parse(e.tickers) as string[],
    analysis: e.analysis
      ? {
          convictionScore: e.analysis.convictionScore,
          signalType: e.analysis.signalType as SignalType,
          bearThesis: e.analysis.bearThesis,
          affectedTickers: JSON.parse(e.analysis.affectedTickers) as string[],
        }
      : null,
  }));

  return NextResponse.json(items);
}
