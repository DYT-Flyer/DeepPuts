import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { sendHighConvictionAlert } from "@/lib/email";

// Called by the scheduler after each ingestion run to notify PRO users.
// Secured by CRON_SECRET to prevent public access.
export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Find analyses created in the last hour that meet high-conviction threshold
  const since = new Date(Date.now() - 60 * 60 * 1000);
  const analyses = await prisma.analysis.findMany({
    where: { createdAt: { gte: since }, convictionScore: { gte: 7 } },
    include: { canonicalEvent: { select: { id: true } } },
  });

  if (analyses.length === 0) return NextResponse.json({ sent: 0 });

  // Find PRO users who opted into high-conviction alerts
  const prefs = await prisma.notificationPreference.findMany({
    where: { emailOnHighConviction: true, user: { tier: "PRO" } },
    include: { user: { select: { email: true, watchlist: { select: { symbol: true } } } } },
  });

  let sent = 0;
  for (const pref of prefs) {
    const eligible = analyses.filter(a => {
      if (a.convictionScore < pref.minConvictionThreshold) return false;
      if (pref.watchlistAlertsOnly) {
        const watchSymbols = new Set(pref.user.watchlist.map(w => w.symbol));
        const tickers: string[] = JSON.parse(a.affectedTickers || "[]");
        return tickers.some(t => watchSymbols.has(t));
      }
      return true;
    });

    if (eligible.length === 0) continue;

    const alertData = eligible.map(a => {
      const tickers: string[] = JSON.parse(a.affectedTickers || "[]");
      return {
        ticker: tickers[0] || a.canonicalEvent.id,
        bearThesis: a.bearThesis,
        convictionScore: a.convictionScore,
        signalType: a.signalType,
        timeHorizon: a.timeHorizon,
        eventUrl: `/opportunities/${a.canonicalEventId}`,
      };
    });

    try {
      await sendHighConvictionAlert(pref.user.email, alertData);
      sent++;
    } catch (err) {
      console.error(`Failed to send alert to ${pref.user.email}:`, err);
    }
  }

  return NextResponse.json({ sent, total: prefs.length });
}
