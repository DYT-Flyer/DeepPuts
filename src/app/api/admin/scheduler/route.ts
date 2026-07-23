import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id || (session.user as any).role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const [
    runs,
    totalEvents,
    totalAnalyzed,
    highConviction,
    events24h,
    analyzed24h,
    highConviction24h,
    signalBreakdown,
    assetBreakdown
  ] = await Promise.all([
    prisma.schedulerRun.findMany({ orderBy: { startedAt: "desc" }, take: 20 }),
    prisma.rawEvent.count(),
    prisma.analysis.count(),
    prisma.analysis.count({ where: { convictionScore: { gte: 7 } } }),
    prisma.rawEvent.count({ where: { publishedAt: { gte: since24h } } }),
    prisma.analysis.count({ where: { createdAt: { gte: since24h } } }),
    prisma.analysis.count({ where: { createdAt: { gte: since24h }, convictionScore: { gte: 7 } } }),
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
    runs: runs.map(r => ({
      id: r.id,
      status: r.status,
      startedAt: r.startedAt.toISOString(),
      finishedAt: r.finishedAt?.toISOString() ?? null,
      eventsFound: r.eventsFound,
      eventsAnalyzed: r.eventsAnalyzed,
      errorMessage: r.errorMessage,
      durationSec: r.finishedAt
        ? Math.round((r.finishedAt.getTime() - r.startedAt.getTime()) / 1000)
        : null,
      claudeCost: r.claudeCost ?? null,
    })),
    stats: { 
      totalEvents, 
      totalAnalyzed, 
      pendingAnalysis: totalEvents - totalAnalyzed,
      highConviction,
      events24h,
      analyzed24h,
      highConviction24h
    },
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

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id || (session.user as any).role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({})) as { dryRun?: boolean };
  const dryRun = body.dryRun === true;
  
  // Delegate to existing cron endpoint
  const baseUrl = req.nextUrl.origin;
  const res = await fetch(`${baseUrl}/api/cron`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ dryRun }),
  });

  if (!res.ok) return NextResponse.json({ error: "Scheduler trigger failed" }, { status: 502 });
  return NextResponse.json({ ok: true, dryRun });
}
