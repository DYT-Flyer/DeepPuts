import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import type { OpportunityItem } from "@/types";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = req.nextUrl;
  const sector = searchParams.get("sector");
  const signalType = searchParams.get("signalType");
  const assetClass = searchParams.get("assetClass");
  const minScore = parseInt(searchParams.get("minScore") || "1", 10);
  const limit = parseInt(searchParams.get("limit") || "50", 10);
  const offset = parseInt(searchParams.get("offset") || "0", 10);

  const analyses = await prisma.analysis.findMany({
    where: {
      convictionScore: { gte: minScore },
      ...(sector ? { sector } : {}),
      ...(signalType ? { signalType } : {}),
      ...(assetClass
        ? { rawEvent: { assetClass } }
        : {}),
    },
    include: {
      rawEvent: true,
    },
    orderBy: [{ convictionScore: "desc" }, { createdAt: "desc" }],
    take: Math.min(limit, 100),
    skip: offset,
  });

  const items: OpportunityItem[] = analyses.map((a) => ({
    id: a.id,
    bearThesis: a.bearThesis,
    convictionScore: a.convictionScore,
    signalType: a.signalType as OpportunityItem["signalType"],
    affectedTickers: JSON.parse(a.affectedTickers) as string[],
    sector: a.sector,
    catalystDate: a.catalystDate?.toISOString() || null,
    createdAt: a.createdAt.toISOString(),
    event: {
      id: a.rawEvent.id,
      headline: a.rawEvent.headline,
      summary: a.rawEvent.summary,
      publishedAt: a.rawEvent.publishedAt.toISOString(),
      assetClass: a.rawEvent.assetClass as "stock" | "crypto",
      source: a.rawEvent.source,
      articleUrl: (JSON.parse(a.rawEvent.rawJson) as { article_url?: string }).article_url ?? null,
    },
  }));

  return NextResponse.json(items);
}
