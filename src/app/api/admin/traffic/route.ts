import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET() {
  const session = await auth();

  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Ensure user is admin
  const currentUser = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { role: true },
  });

  if (currentUser?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const totalViews = await prisma.pageView.count();
    
    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);
    
    const views24h = await prisma.pageView.count({
      where: { createdAt: { gte: twentyFourHoursAgo } },
    });

    const topPagesRaw = await prisma.pageView.groupBy({
      by: ["path"],
      _count: {
        path: true,
      },
      orderBy: {
        _count: {
          path: "desc",
        },
      },
      take: 5,
    });

    const topPages = topPagesRaw.map((p) => ({
      path: p.path,
      views: p._count.path,
    }));

    return NextResponse.json({
      stats: {
        totalViews,
        views24h,
      },
      topPages,
    });
  } catch (error) {
    console.error("[api/admin/traffic] Error fetching traffic:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
