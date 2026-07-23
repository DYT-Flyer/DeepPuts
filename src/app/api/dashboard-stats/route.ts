import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET() {
  const session = await auth();

  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const [
    totalEvents,
    totalAnalyzed,
    highConviction,
    events24h,
    analyzed24h,
    highConviction24h,
    recentTop,
  ] = await Promise.all([
    prisma.rawEvent.count(),
    prisma.analysis.count(),
    prisma.analysis.count({ where: { convictionScore: { gte: 7 } } }),
    prisma.rawEvent.count({ where: { publishedAt: { gte: since24h } } }),
    prisma.analysis.count({ where: { createdAt: { gte: since24h } } }),
    prisma.analysis.count({ where: { createdAt: { gte: since24h }, convictionScore: { gte: 7 } } }),
    prisma.analysis.findMany({
      where: { convictionScore: { gte: 7 } },
      include: { 
        canonicalEvent: { include: { rawEvents: { take: 1, select: { rawJson: true } } } }, 
        _count: { select: { comments: true } } 
      },
      orderBy: [{ canonicalEvent: { firstSeenAt: "desc" } }, { convictionScore: "desc" }],
      take: 5,
    }),
  ]);

  // Trending tickers: count appearances across last 30 days
  const sinceDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const recentAnalyses = await prisma.analysis.findMany({
    where: { createdAt: { gte: sinceDate } },
    select: { affectedTickers: true },
  });
  const tickerCounts = new Map<string, number>();
  for (const a of recentAnalyses) {
    for (const t of JSON.parse(a.affectedTickers) as string[]) {
      tickerCounts.set(t, (tickerCounts.get(t) ?? 0) + 1);
    }
  }
  const trendingTickers = [...tickerCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([ticker, count]) => ({ ticker, count }));

  const analysisIds = recentTop.map((a) => a.id);
  const [voteSums, userVotes] = await Promise.all([
    analysisIds.length
      ? prisma.vote.groupBy({ by: ["analysisId"], where: { analysisId: { in: analysisIds } }, _sum: { value: true } })
      : Promise.resolve([]),
    session?.user?.id && analysisIds.length
      ? prisma.vote.findMany({ where: { userId: session.user.id, analysisId: { in: analysisIds } }, select: { analysisId: true, value: true } })
      : Promise.resolve([]),
  ]);
  const voteMap = new Map((voteSums as Array<{ analysisId: string; _sum: { value: number | null } }>).map((v) => [v.analysisId, v._sum.value ?? 0]));
  const userVoteMap = new Map((userVotes as Array<{ analysisId: string; value: number }>).map((v) => [v.analysisId, v.value as 1 | -1]));

  return NextResponse.json({
    stats: {
      totalEvents,
      totalAnalyzed,
      highConviction,
      pendingAnalysis: totalEvents - totalAnalyzed,
      events24h,
      analyzed24h,
      highConviction24h,
    },
    recentTop: recentTop.map((a) => ({
      id: a.id,
      convictionScore: a.convictionScore,
      signalType: a.signalType,
      bearThesis: a.bearThesis,
      affectedTickers: JSON.parse(a.affectedTickers) as string[],
      sector: a.sector,
      catalystDate: a.catalystDate?.toISOString() || null,
      createdAt: a.createdAt.toISOString(),
      commentCount: a._count.comments,
      voteScore: voteMap.get(a.id) ?? 0,
      userVote: (userVoteMap.get(a.id) ?? 0) as 1 | -1 | 0,
      event: {
        headline: a.canonicalEvent.primaryHeadline,
        publishedAt: a.canonicalEvent.firstSeenAt.toISOString(),
        assetClass: a.canonicalEvent.assetClass,
        articleUrl: a.canonicalEvent.rawEvents?.[0]?.rawJson
          ? (JSON.parse(a.canonicalEvent.rawEvents[0].rawJson) as { article_url?: string }).article_url ?? null
          : null,
      },
    })),
    trendingTickers,
  });
}
