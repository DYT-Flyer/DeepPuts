import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { parseBody } from "@/lib/validation/parse";
import { WatchlistToggleSchema } from "@/lib/validation/schemas";
import { checkRateLimit } from "@/lib/rate-limit";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ symbols: [] });

  const entries = await prisma.watchlist.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
  });

  const symbols = entries.map((e) => e.symbol);

  if (symbols.length === 0) return NextResponse.json({ symbols: [], stats: {} });

  const analyses = await prisma.analysis.findMany({
    select: { affectedTickers: true, convictionScore: true },
  });

  const stats: Record<string, { thesisCount: number; highConvictionCount: number }> = {};
  for (const sym of symbols) {
    const matching = analyses.filter((a) => {
      try {
        return (JSON.parse(a.affectedTickers) as string[]).includes(sym);
      } catch {
        return false;
      }
    });
    stats[sym] = {
      thesisCount: matching.length,
      highConvictionCount: matching.filter((a) => a.convictionScore >= 7).length,
    };
  }

  return NextResponse.json({ symbols, stats });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!checkRateLimit(`watchlist:${session.user.id}`, 20, 60_000))
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const parsed = await parseBody(req, WatchlistToggleSchema);
  if (!parsed.ok) return parsed.response;
  const { symbol: upper } = parsed.data;
  const existing = await prisma.watchlist.findUnique({
    where: { userId_symbol: { userId: session.user.id, symbol: upper } },
  });

  if (existing) {
    await prisma.watchlist.delete({ where: { id: existing.id } });
    return NextResponse.json({ watching: false });
  } else {
    await prisma.watchlist.create({ data: { userId: session.user.id, symbol: upper } });
    return NextResponse.json({ watching: true });
  }
}
