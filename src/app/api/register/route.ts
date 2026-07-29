import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import { parseBody } from "@/lib/validation/parse";
import { RegisterSchema } from "@/lib/validation/schemas";

export async function POST(req: NextRequest) {
  const parsed = await parseBody(req, RegisterSchema);
  if (!parsed.ok) return parsed.response;
  const { email, password, name } = parsed.data;

  const [existingEmail, existingName] = await Promise.all([
    prisma.user.findUnique({ where: { email }, select: { id: true } }),
    name ? prisma.user.findUnique({ where: { name }, select: { id: true } }) : null,
  ]);
  if (existingEmail) return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 });
  if (existingName) return NextResponse.json({ error: "That username is already taken" }, { status: 409 });

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: { email, passwordHash, name },
  });

  return NextResponse.json({ id: user.id, email: user.email }, { status: 201 });
}
