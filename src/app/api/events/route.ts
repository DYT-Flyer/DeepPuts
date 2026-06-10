import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import type { EventFeedItem, SignalType } from "@/types";

export async function GET(req: NextRequest) {
  const session = await auth();

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

  const analysisIds = events.flatMap((e) => (e.analysis ? [e.analysis.id] : []));
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

  const items: EventFeedItem[] = events.map((e) => ({
    id: e.id,
    headline: e.headline,
    summary: e.summary,
    publishedAt: e.publishedAt.toISOString(),
    assetClass: e.assetClass as "stock" | "crypto",
    tickers: JSON.parse(e.tickers) as string[],
    articleUrl: (JSON.parse(e.rawJson) as { article_url?: string }).article_url ?? null,
    analysis: e.analysis
      ? {
          id: e.analysis.id,
          convictionScore: e.analysis.convictionScore,
          signalType: e.analysis.signalType as SignalType,
          bearThesis: e.analysis.bearThesis,
          affectedTickers: JSON.parse(e.analysis.affectedTickers) as string[],
          voteScore: voteMap.get(e.analysis.id) ?? 0,
          userVote: (userVoteMap.get(e.analysis.id) ?? 0) as 1 | -1 | 0,
        }
      : null,
  }));

  return NextResponse.json(items);
}
