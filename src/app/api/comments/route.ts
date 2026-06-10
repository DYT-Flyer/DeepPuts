import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { parseBody } from "@/lib/validation/parse";
import { CommentCreateSchema } from "@/lib/validation/schemas";
import { checkRateLimit } from "@/lib/rate-limit";

export async function GET(req: NextRequest) {
  const analysisId = req.nextUrl.searchParams.get("analysisId");
  if (!analysisId) return NextResponse.json({ error: "analysisId required" }, { status: 400 });

  const comments = await prisma.comment.findMany({
    where: { analysisId, parentId: null },
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
  });

  return NextResponse.json(comments.map(serialize));
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Sign in to comment" }, { status: 401 });
  if (!checkRateLimit(`comment:${session.user.id}`, 5, 60_000))
    return NextResponse.json({ error: "Too many comments — please wait a moment" }, { status: 429 });

  const parsed = await parseBody(req, CommentCreateSchema);
  if (!parsed.ok) return parsed.response;
  const { analysisId, content, parentId } = parsed.data;

  const comment = await prisma.comment.create({
    data: {
      analysisId,
      userId: session.user.id,
      content: content.trim(),
      ...(parentId ? { parentId } : {}),
    },
    include: {
      user: { select: { id: true, name: true, email: true } },
      replies: {
        include: { user: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  return NextResponse.json(serialize(comment), { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const comment = await prisma.comment.findUnique({ where: { id } });
  if (!comment) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (comment.userId !== session.user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await prisma.comment.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

type PrismaComment = {
  id: string; content: string; createdAt: Date; parentId: string | null;
  user: { id: string; name: string | null; email: string };
  replies?: PrismaComment[];
};

function serialize(c: PrismaComment): object {
  return {
    id: c.id,
    content: c.content,
    createdAt: c.createdAt.toISOString(),
    parentId: c.parentId,
    user: c.user,
    replies: (c.replies ?? []).map(serialize),
  };
}
