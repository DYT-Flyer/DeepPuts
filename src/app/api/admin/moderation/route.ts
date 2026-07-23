import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id || (session.user as any).role !== "admin") return null;
  return session;
}

export async function GET() {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const flags = await prisma.moderationFlag.findMany({
    where: { resolved: false },
    include: {
      comment: {
        include: {
          user: { select: { id: true, name: true, email: true } },
          analysis: { select: { id: true, bearThesis: true } },
        },
      },
      reporter: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return NextResponse.json(
    flags.map((f) => ({
      id: f.id,
      reason: f.reason,
      createdAt: f.createdAt.toISOString(),
      reporter: {
        name: f.reporter.name || f.reporter.email.split("@")[0],
        email: f.reporter.email,
      },
      comment: f.comment
        ? {
            id: f.comment.id,
            content: f.comment.content,
            analysisId: f.comment.analysisId,
            analysisSummary: f.comment.analysis?.bearThesis?.slice(0, 80) + "…",
            author: {
              name: f.comment.user.name || f.comment.user.email.split("@")[0],
              email: f.comment.user.email,
            },
          }
        : null,
    }))
  );
}

export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { action, flagId, commentId } = await req.json() as {
    action: "dismiss" | "delete_comment";
    flagId?: string;
    commentId?: string;
  };

  if (action === "dismiss" && flagId) {
    await prisma.moderationFlag.update({ where: { id: flagId }, data: { resolved: true } });
    return NextResponse.json({ ok: true });
  }

  if (action === "delete_comment" && commentId) {
    await prisma.comment.delete({ where: { id: commentId } });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
