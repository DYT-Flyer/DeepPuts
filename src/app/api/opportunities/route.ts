import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { computeCompositeScore } from "@/lib/scoring/composite";
import type { OpportunityItem } from "@/types";

export async function GET(req: NextRequest) {
  const session = await auth();
  const userId = session?.user?.id;

  const { searchParams } = req.nextUrl;
  const sector = searchParams.get("sector");
  const signalType = searchParams.get("signalType");
  const assetClass = searchParams.get("assetClass");
  const minScore = parseInt(searchParams.get("minScore") || "1", 10);
  const limit = parseInt(searchParams.get("limit") || "50", 10);
  const offset = parseInt(searchParams.get("offset") || "0", 10);
  const sortBy = searchParams.get("sortBy") || "score"; // "score" | "votes" | "recent" | "composite" | "popular"
  const needsClientSort = sortBy === "votes" || sortBy === "composite" || sortBy === "popular";

  const analyses = await prisma.analysis.findMany({
    where: {
      convictionScore: { gte: minScore },
      ...(sector ? { sector } : {}),
      ...(signalType ? { signalType } : {}),
      ...(assetClass ? { canonicalEvent: { assetClass } } : {}),
    },
    include: {
      canonicalEvent: { include: { rawEvents: { take: 1, select: { rawJson: true } } } },
      _count: { select: { comments: true } },
      votes: true,
    },
    orderBy: sortBy === "recent"
      ? [{ createdAt: "desc" }]
      : needsClientSort
      ? [{ createdAt: "desc" }]
      : [{ convictionScore: "desc" }, { createdAt: "desc" }],
    take: needsClientSort ? undefined : Math.min(limit, 100),
    skip: needsClientSort ? undefined : offset,
  });

  let items: (OpportunityItem & { compositeScore?: number })[] = analyses.map((a) => {
    const voteScore = a.votes.reduce((sum, v) => sum + v.value, 0);
    const userVote = (userId ? (a.votes.find((v) => v.userId === userId)?.value ?? 0) : 0) as 1 | -1 | 0;
    const ageHours = (Date.now() - a.createdAt.getTime()) / 3_600_000;
    const compositeScore = computeCompositeScore({
      convictionScore: a.convictionScore,
      confidenceLabel: (a as Record<string, unknown>).confidenceLabel as string | null,
      sourceQuality: (a as Record<string, unknown>).sourceQuality as string | null,
      severity: (a as Record<string, unknown>).severity as string | null,
      noveltyScore: (a as Record<string, unknown>).noveltyScore as number | null,
      voteScore,
      commentCount: a._count.comments,
      ageHours,
    }).total;
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
      compositeScore,
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

  if (sortBy === "votes") {
    items.sort((a, b) => b.voteScore - a.voteScore || b.convictionScore - a.convictionScore);
  } else if (sortBy === "composite") {
    items.sort((a, b) => (b.compositeScore ?? 0) - (a.compositeScore ?? 0));
  } else if (sortBy === "popular") {
    items.sort((a, b) => {
      const popA = a.voteScore + (a.commentCount * 2);
      const popB = b.voteScore + (b.commentCount * 2);
      return popB - popA || b.convictionScore - a.convictionScore;
    });
  }

  if (needsClientSort) {
    items = items.slice(offset, offset + Math.min(limit, 100));
  }

  return NextResponse.json(items);
}
