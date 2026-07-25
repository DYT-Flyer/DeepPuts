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
    const totalUsers = await prisma.user.count();
    
    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);
    
    const users24h = await prisma.user.count({
      where: { createdAt: { gte: twentyFourHoursAgo } },
    });

    const users = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: { comments: true, votes: true },
        },
      },
    });

    const formattedUsers = users.map(user => ({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      createdAt: user.createdAt,
      onboardedAt: user.onboardedAt,
      commentsCount: user._count.comments,
      votesCount: user._count.votes,
    }));

    return NextResponse.json({
      stats: {
        totalUsers,
        users24h,
      },
      users: formattedUsers,
    });
  } catch (error) {
    console.error("[api/admin/users] Error fetching users:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
