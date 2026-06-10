import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import type { SignalType } from "@/types";

export async function GET(req: NextRequest) {
  const session = await auth();
  const { searchParams } = req.nextUrl;
  const sector = searchParams.get("sector");
  const excludeId = searchParams.get("exclude");
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "4", 10), 8);

  if (!sector && !excludeId) return NextResponse.json([]);

  const analyses = await prisma.analysis.findMany({
    where: {
      ...(sector ? { sector } : {}),
      ...(excludeId ? { id: { not: excludeId } } : {}),
      convictionScore: { gte: 5 },
    },
    include: { rawEvent: true, _count: { select: { comments: true } } },
    orderBy: [{ convictionScore: "desc" }, { createdAt: "desc" }],
    take: limit,
  });

  if (analyses.length === 0) return NextResponse.json([]);

  const analysisIds = analyses.map((a) => a.id);
  const [voteSums, userVotes] = await Promise.all([
    prisma.vote.groupBy({ by: ["analysisId"], where: { analysisId: { in: analysisIds } }, _sum: { value: true } }),
    session?.user?.id
      ? prisma.vote.findMany({ where: { userId: session.user.id, analysisId: { in: analysisIds } }, select: { analysisId: true, value: true } })
      : Promise.resolve([]),
  ]);
  const voteMap = new Map((voteSums as Array<{ analysisId: string; _sum: { value: number | null } }>).map((v) => [v.analysisId, v._sum.value ?? 0]));
  const userVoteMap = new Map((userVotes as Array<{ analysisId: string; value: number }>).map((v) => [v.analysisId, v.value as 1 | -1]));

  return NextResponse.json(
    analyses.map((a) => ({
      id: a.id,
      convictionScore: a.convictionScore,
      signalType: a.signalType as SignalType,
      bearThesis: a.bearThesis,
      affectedTickers: JSON.parse(a.affectedTickers) as string[],
      sector: a.sector,
      catalystDate: a.catalystDate?.toISOString() ?? null,
      createdAt: a.createdAt.toISOString(),
      commentCount: a._count.comments,
      voteScore: voteMap.get(a.id) ?? 0,
      userVote: (userVoteMap.get(a.id) ?? 0) as 1 | -1 | 0,
      event: {
        headline: a.rawEvent.headline,
        publishedAt: a.rawEvent.publishedAt.toISOString(),
        assetClass: a.rawEvent.assetClass,
        articleUrl: (JSON.parse(a.rawEvent.rawJson) as { article_url?: string }).article_url ?? null,
      },
    }))
  );
}
