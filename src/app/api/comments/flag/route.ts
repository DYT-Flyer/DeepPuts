import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";
import { parseBody } from "@/lib/validation/parse";
import { checkRateLimit } from "@/lib/rate-limit";

const FlagSchema = z.object({
  commentId: z.string().min(1),
  reason: z.enum(["spam", "misleading", "offensive", "manipulation"]),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!checkRateLimit(`flag:${session.user.id}`, 10, 60_000))
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const parsed = await parseBody(req, FlagSchema);
  if (!parsed.ok) return parsed.response;
  const { commentId, reason } = parsed.data;

  const comment = await prisma.comment.findUnique({ where: { id: commentId } });
  if (!comment) return NextResponse.json({ error: "Comment not found" }, { status: 404 });

  const existing = await prisma.moderationFlag.findFirst({
    where: { commentId, reporterId: session.user.id },
  });
  if (existing) return NextResponse.json({ error: "Already reported" }, { status: 409 });

  await prisma.moderationFlag.create({
    data: { commentId, reporterId: session.user.id, reason },
  });

  return NextResponse.json({ ok: true });
}
