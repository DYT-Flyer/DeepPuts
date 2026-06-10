import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();

  const analysis = await prisma.analysis.findUnique({
    where: { id },
    include: {
      rawEvent: true,
      comments: {
        where: { parentId: null },
        include: {
          user: { select: { id: true, name: true, email: true } },
          replies: {
            include: {
              user: { select: { id: true, name: true, email: true } },
              replies: {
                include: { user: { select: { id: true, name: true, email: true } } },
                orderBy: { createdAt: "asc" },
              },
            },
            orderBy: { createdAt: "asc" },
          },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!analysis) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const [voteAgg, userVoteRow] = await Promise.all([
    prisma.vote.aggregate({ where: { analysisId: id }, _sum: { value: true } }),
    session?.user?.id
      ? prisma.vote.findUnique({ where: { userId_analysisId: { userId: session.user.id, analysisId: id } }, select: { value: true } })
      : null,
  ]);

  const a = analysis as typeof analysis & {
    keyRisks?: string | null;
    counterArgs?: string | null;
    confidenceLabel?: string | null;
    timeHorizon?: string | null;
    severity?: string | null;
    sourceQuality?: string | null;
    promptVersion?: string | null;
    modelName?: string | null;
    industry?: string | null;
  };

  return NextResponse.json({
    id: a.id,
    bearThesis: a.bearThesis,
    convictionScore: a.convictionScore,
    signalType: a.signalType,
    affectedTickers: JSON.parse(a.affectedTickers) as string[],
    sector: a.sector,
    industry: a.industry ?? null,
    catalystDate: a.catalystDate?.toISOString() || null,
    createdAt: a.createdAt.toISOString(),
    voteScore: voteAgg._sum.value ?? 0,
    userVote: (userVoteRow?.value ?? 0) as 1 | -1 | 0,
    keyRisks: a.keyRisks ? (JSON.parse(a.keyRisks) as string[]) : null,
    counterArgs: a.counterArgs ? (JSON.parse(a.counterArgs) as string[]) : null,
    confidenceLabel: a.confidenceLabel ?? null,
    timeHorizon: a.timeHorizon ?? null,
    severity: a.severity ?? null,
    sourceQuality: a.sourceQuality ?? null,
    promptVersion: a.promptVersion ?? null,
    modelName: a.modelName ?? null,
    event: {
      headline: a.rawEvent.headline,
      summary: a.rawEvent.summary,
      publishedAt: a.rawEvent.publishedAt.toISOString(),
      assetClass: a.rawEvent.assetClass,
      source: a.rawEvent.source,
      articleUrl: (JSON.parse(a.rawEvent.rawJson) as { article_url?: string }).article_url ?? null,
    },
    comments: a.comments.map(serializeComment),
  });
}

type PrismaComment = {
  id: string; content: string; createdAt: Date; parentId: string | null;
  user: { id: string; name: string | null; email: string };
  replies: PrismaComment[];
};

function serializeComment(c: PrismaComment): object {
  return {
    id: c.id,
    content: c.content,
    createdAt: c.createdAt.toISOString(),
    user: c.user,
    replies: c.replies.map(serializeComment),
  };
}
