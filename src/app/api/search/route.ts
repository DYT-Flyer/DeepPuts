import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import type { SignalType } from "@/types";

export async function GET(req: NextRequest) {
  const session = await auth();
  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q || q.length < 2) return NextResponse.json({ opportunities: [], events: [] });

  const [analyses, events] = await Promise.all([
    prisma.analysis.findMany({
      where: {
        OR: [
          { bearThesis: { contains: q } },
          { affectedTickers: { contains: q.toUpperCase() } },
          { canonicalEvent: { primaryHeadline: { contains: q } } },
          { canonicalEvent: { summary: { contains: q } } },
          { sector: { contains: q } },
        ],
      },
      include: { 
        canonicalEvent: { include: { rawEvents: { take: 1, select: { rawJson: true } } } }, 
        _count: { select: { comments: true } }, 
        votes: true 
      },
      orderBy: { convictionScore: "desc" },
      take: 20,
    }),
    prisma.rawEvent.findMany({
      where: {
        canonicalEvent: { is: { analysis: null } }, // only events without analysis (avoid duplicates)
        OR: [
          { headline: { contains: q } },
          { summary: { contains: q } },
          { tickers: { contains: q.toUpperCase() } },
        ],
      },
      take: 20,
      orderBy: { publishedAt: "desc" },
    }),
  ]);

  const userId = session?.user?.id;

  const opportunities = analyses.map((a) => ({
    id: a.id,
    bearThesis: a.bearThesis,
    convictionScore: a.convictionScore,
    signalType: a.signalType as SignalType,
    affectedTickers: JSON.parse(a.affectedTickers) as string[],
    sector: a.sector,
    catalystDate: a.catalystDate?.toISOString() || null,
    createdAt: a.createdAt.toISOString(),
    commentCount: a._count.comments,
    voteScore: a.votes.reduce((s, v) => s + v.value, 0),
    userVote: (userId ? (a.votes.find((v) => v.userId === userId)?.value ?? 0) : 0) as 1 | -1 | 0,
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
  }));

  const rawEvents = events.map((e) => ({
    id: e.id,
    headline: e.headline,
    publishedAt: e.publishedAt.toISOString(),
    assetClass: e.assetClass,
    tickers: JSON.parse(e.tickers) as string[],
    articleUrl: (JSON.parse(e.rawJson) as { article_url?: string }).article_url ?? null,
  }));

  return NextResponse.json({ opportunities, events: rawEvents });
}
