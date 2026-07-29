import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const name = req.nextUrl.searchParams.get("name")?.trim();
  if (!name || name.length < 1) return NextResponse.json({ available: false });

  const existing = await prisma.user.findUnique({ where: { name }, select: { id: true } });
  return NextResponse.json({ available: !existing });
}
