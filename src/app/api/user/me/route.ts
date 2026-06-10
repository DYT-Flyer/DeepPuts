import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, role: true, acceptedTermsAt: true, onboardedAt: true },
  });

  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({
    id: user.id,
    role: user.role,
    acceptedTermsAt: user.acceptedTermsAt?.toISOString() ?? null,
    onboardedAt: user.onboardedAt?.toISOString() ?? null,
  });
}
