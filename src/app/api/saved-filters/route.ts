import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";
import { parseBody } from "@/lib/validation/parse";

const CreateSchema = z.object({
  name: z.string().min(1).max(60),
  filters: z.object({
    minScore: z.string().optional(),
    signal: z.string().optional(),
    sector: z.string().optional(),
    asset: z.string().optional(),
    sort: z.string().optional(),
  }),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const filters = await prisma.savedFilter.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(
    filters.map((f) => ({
      id: f.id,
      name: f.name,
      filters: JSON.parse(f.filters),
      createdAt: f.createdAt.toISOString(),
    }))
  );
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = await parseBody(req, CreateSchema);
  if (!parsed.ok) return parsed.response;

  const count = await prisma.savedFilter.count({ where: { userId: session.user.id } });
  if (count >= 10) return NextResponse.json({ error: "Max 10 saved filters" }, { status: 400 });

  const saved = await prisma.savedFilter.create({
    data: {
      userId: session.user.id,
      name: parsed.data.name,
      filters: JSON.stringify(parsed.data.filters),
    },
  });

  return NextResponse.json({
    id: saved.id,
    name: saved.name,
    filters: parsed.data.filters,
    createdAt: saved.createdAt.toISOString(),
  });
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const filter = await prisma.savedFilter.findUnique({ where: { id } });
  if (!filter || filter.userId !== session.user.id)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.savedFilter.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
