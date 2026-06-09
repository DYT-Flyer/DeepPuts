import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const lastRun = await prisma.schedulerRun.findFirst({
    orderBy: { startedAt: "desc" },
  });

  const totalEvents = await prisma.rawEvent.count();
  const totalAnalyzed = await prisma.analysis.count();

  return NextResponse.json({
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
    totalEvents,
    totalAnalyzed,
  });
}
