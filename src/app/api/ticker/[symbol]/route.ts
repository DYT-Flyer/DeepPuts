import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import type { OpportunityItem } from "@/types";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ symbol: string }> }
) {
  const session = await auth();
  const userId = session?.user?.id;

  const resolvedParams = await params;
  const upper = resolvedParams.symbol.toUpperCase();

  const analyses = await prisma.analysis.findMany({
    where: {
      affectedTickers: { contains: upper },
    },
    select: {
      id: true,
      bearThesis: true,
      convictionScore: true,
      signalType: true,
      affectedTickers: true,
      sector: true,
      catalystDate: true,
      createdAt: true,
      canonicalEvent: { 
        select: { 
          id: true,
          primaryHeadline: true, 
          summary: true, 
          firstSeenAt: true, 
          assetClass: true,
          rawEvents: { take: 1, select: { rawJson: true } } 
        } 
      },
      _count: { select: { comments: true } },
      votes: true
    },
    orderBy: [{ createdAt: "desc" }, { convictionScore: "desc" }],
    take: 50,
  });

  // Filter to exact matches (avoid partial matches like "AMD" matching "AMDA")
  const filtered = analyses.filter((a) => {
    const tickers = JSON.parse(a.affectedTickers) as string[];
    return tickers.includes(upper);
  });

  const items: OpportunityItem[] = filtered.map((a) => {
    const voteScore = a.votes.reduce((sum, v) => sum + v.value, 0);
    const userVote = (userId ? (a.votes.find((v) => v.userId === userId)?.value ?? 0) : 0) as 1 | -1 | 0;
    return {
      id: a.id,
      bearThesis: a.bearThesis,
      convictionScore: a.convictionScore,
      signalType: a.signalType as OpportunityItem["signalType"],
      affectedTickers: JSON.parse(a.affectedTickers) as string[],
      sector: a.sector,
      catalystDate: a.catalystDate?.toISOString() || null,
      createdAt: a.createdAt.toISOString(),
      commentCount: a._count.comments,
      voteScore,
      userVote,
      event: {
        id: a.canonicalEvent.id,
        headline: a.canonicalEvent.primaryHeadline,
        summary: a.canonicalEvent.summary,
        publishedAt: a.canonicalEvent.firstSeenAt.toISOString(),
        assetClass: a.canonicalEvent.assetClass as "stock" | "crypto",
        source: "polygon_news",
        articleUrl: a.canonicalEvent.rawEvents?.[0]?.rawJson
          ? (JSON.parse(a.canonicalEvent.rawEvents[0].rawJson) as { article_url?: string }).article_url ?? null
          : null,
      },
    };
  });

  return NextResponse.json({ symbol: upper, items });
}
