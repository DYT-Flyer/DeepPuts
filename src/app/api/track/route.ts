import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { path } = body;

    if (!path) {
      return NextResponse.json({ error: "Path is required" }, { status: 400 });
    }

    const session = await auth();
    const userAgent = req.headers.get("user-agent") || undefined;

    // Log the page view asynchronously without awaiting to avoid blocking response
    prisma.pageView.create({
      data: {
        path,
        userAgent,
        userId: session?.user?.id || null,
      },
    }).catch(console.error);

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
