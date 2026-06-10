import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [runs, totalEvents, totalAnalyzed, pendingAnalysis] = await Promise.all([
    prisma.schedulerRun.findMany({ orderBy: { startedAt: "desc" }, take: 20 }),
    prisma.rawEvent.count(),
    prisma.analysis.count(),
    prisma.rawEvent.count({ where: { analysis: null } }),
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
    stats: { totalEvents, totalAnalyzed, pendingAnalysis },
  });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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
