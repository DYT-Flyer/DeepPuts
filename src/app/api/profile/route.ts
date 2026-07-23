import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { parseBody } from "@/lib/validation/parse";
import { ProfileUpdateSchema } from "@/lib/validation/schemas";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [user, voteCount] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        comments: {
          include: {
            analysis: { include: { canonicalEvent: true } },
          },
          orderBy: { createdAt: "desc" },
          take: 20,
        },
      },
    }),
    prisma.vote.count({ where: { userId: session.user.id } }),
  ]);

  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({
    id: user.id,
    email: user.email,
    name: user.name,
    createdAt: user.createdAt.toISOString(),
    voteCount,
    comments: user.comments.map((c) => ({
      id: c.id,
      content: c.content,
      createdAt: c.createdAt.toISOString(),
      analysis: {
        id: c.analysis.id,
        convictionScore: c.analysis.convictionScore,
        headline: c.analysis.canonicalEvent.primaryHeadline,
      },
    })),
  });
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = await parseBody(req, ProfileUpdateSchema);
  if (!parsed.ok) return parsed.response;
  const updated = await prisma.user.update({
    where: { id: session.user.id },
    data: { name: parsed.data.name ?? null },
  });

  return NextResponse.json({ id: updated.id, name: updated.name });
}
