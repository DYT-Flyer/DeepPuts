import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [
    totalEvents,
    totalAnalyzed,
    highConviction,
    lastRun,
    recentTop,
    signalBreakdown,
    assetBreakdown,
  ] = await Promise.all([
    prisma.rawEvent.count(),
    prisma.analysis.count(),
    prisma.analysis.count({ where: { convictionScore: { gte: 7 } } }),
    prisma.schedulerRun.findFirst({ orderBy: { startedAt: "desc" } }),
    prisma.analysis.findMany({
      where: { convictionScore: { gte: 7 } },
      include: { rawEvent: true },
      orderBy: [{ convictionScore: "desc" }, { createdAt: "desc" }],
      take: 5,
    }),
    prisma.analysis.groupBy({
      by: ["signalType"],
      _count: { signalType: true },
      orderBy: { _count: { signalType: "desc" } },
      take: 6,
    }),
    prisma.rawEvent.groupBy({
      by: ["assetClass"],
      _count: { assetClass: true },
    }),
  ]);

  return NextResponse.json({
    stats: {
      totalEvents,
      totalAnalyzed,
      highConviction,
      pendingAnalysis: totalEvents - totalAnalyzed,
    },
    lastRun: lastRun
      ? {
          status: lastRun.status,
          startedAt: lastRun.startedAt.toISOString(),
          finishedAt: lastRun.finishedAt?.toISOString() || null,
          eventsFound: lastRun.eventsFound,
          eventsAnalyzed: lastRun.eventsAnalyzed,
          errorMessage: lastRun.errorMessage,
        }
      : null,
    recentTop: recentTop.map((a) => ({
      id: a.id,
      convictionScore: a.convictionScore,
      signalType: a.signalType,
      bearThesis: a.bearThesis,
      affectedTickers: JSON.parse(a.affectedTickers) as string[],
      sector: a.sector,
      createdAt: a.createdAt.toISOString(),
      event: {
        headline: a.rawEvent.headline,
        publishedAt: a.rawEvent.publishedAt.toISOString(),
        assetClass: a.rawEvent.assetClass,
        articleUrl: (JSON.parse(a.rawEvent.rawJson) as { article_url?: string }).article_url ?? null,
      },
    })),
    signalBreakdown: signalBreakdown.map((s) => ({
      type: s.signalType,
      count: s._count.signalType,
    })),
    assetBreakdown: assetBreakdown.map((a) => ({
      assetClass: a.assetClass,
      count: a._count.assetClass,
    })),
  });
}
