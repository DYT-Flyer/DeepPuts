import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import type { OpportunityItem } from "@/types";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ symbol: string }> }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { symbol } = await params;
  const upper = symbol.toUpperCase();

  // SQLite: search JSON array string for this ticker
  const analyses = await prisma.analysis.findMany({
    where: {
      affectedTickers: { contains: upper },
    },
    include: { rawEvent: true },
    orderBy: [{ convictionScore: "desc" }, { createdAt: "desc" }],
    take: 50,
  });

  // Filter to only exact matches (avoid partial matches like "AMD" matching "AMDA")
  const filtered = analyses.filter((a) => {
    const tickers = JSON.parse(a.affectedTickers) as string[];
    return tickers.includes(upper);
  });

  const items: OpportunityItem[] = filtered.map((a) => ({
    id: a.id,
    bearThesis: a.bearThesis,
    convictionScore: a.convictionScore,
    signalType: a.signalType as OpportunityItem["signalType"],
    affectedTickers: JSON.parse(a.affectedTickers) as string[],
    sector: a.sector,
    catalystDate: a.catalystDate?.toISOString() || null,
    createdAt: a.createdAt.toISOString(),
    event: {
      id: a.rawEvent.id,
      headline: a.rawEvent.headline,
      summary: a.rawEvent.summary,
      publishedAt: a.rawEvent.publishedAt.toISOString(),
      assetClass: a.rawEvent.assetClass as "stock" | "crypto",
      source: a.rawEvent.source,
      articleUrl: (JSON.parse(a.rawEvent.rawJson) as { article_url?: string }).article_url ?? null,
    },
  }));

  return NextResponse.json({ symbol: upper, items });
}
