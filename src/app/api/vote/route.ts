import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { parseBody } from "@/lib/validation/parse";
import { VoteSchema } from "@/lib/validation/schemas";
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!checkRateLimit(`vote:${session.user.id}`, 30, 60_000))
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const parsed = await parseBody(req, VoteSchema);
  if (!parsed.ok) return parsed.response;
  const { analysisId, value } = parsed.data;

  const existing = await prisma.vote.findUnique({
    where: { userId_analysisId: { userId: session.user.id, analysisId } },
  });

  if (existing && existing.value === value) {
    // Same vote again — toggle off
    await prisma.vote.delete({ where: { id: existing.id } });
    const agg = await prisma.vote.aggregate({ where: { analysisId }, _sum: { value: true } });
    return NextResponse.json({ userVote: 0, voteScore: agg._sum.value ?? 0 });
  }

  await prisma.vote.upsert({
    where: { userId_analysisId: { userId: session.user.id, analysisId } },
    create: { userId: session.user.id, analysisId, value },
    update: { value },
  });

  const agg = await prisma.vote.aggregate({ where: { analysisId }, _sum: { value: true } });
  return NextResponse.json({ userVote: value, voteScore: agg._sum.value ?? 0 });
}
