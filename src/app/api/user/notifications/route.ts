import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";
import { parseBody } from "@/lib/validation/parse";

const UpdateSchema = z.object({
  emailOnHighConviction: z.boolean().optional(),
  minConvictionThreshold: z.number().int().min(1).max(10).optional(),
  watchlistAlertsOnly: z.boolean().optional(),
  emailDigestFrequency: z.enum(["none", "daily", "weekly"]).optional(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const prefs = await prisma.notificationPreference.findUnique({
    where: { userId: session.user.id },
  });

  if (!prefs) {
    return NextResponse.json({
      emailOnHighConviction: false,
      minConvictionThreshold: 7,
      watchlistAlertsOnly: true,
      emailDigestFrequency: "none",
    });
  }

  return NextResponse.json({
    emailOnHighConviction: prefs.emailOnHighConviction,
    minConvictionThreshold: prefs.minConvictionThreshold,
    watchlistAlertsOnly: prefs.watchlistAlertsOnly,
    emailDigestFrequency: prefs.emailDigestFrequency,
  });
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = await parseBody(req, UpdateSchema);
  if (!parsed.ok) return parsed.response;

  const prefs = await prisma.notificationPreference.upsert({
    where: { userId: session.user.id },
    create: { userId: session.user.id, ...parsed.data },
    update: parsed.data,
  });

  return NextResponse.json({
    emailOnHighConviction: prefs.emailOnHighConviction,
    minConvictionThreshold: prefs.minConvictionThreshold,
    watchlistAlertsOnly: prefs.watchlistAlertsOnly,
    emailDigestFrequency: prefs.emailDigestFrequency,
  });
}
