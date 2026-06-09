import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { runRefreshCycle } from "@/lib/scheduler/pipeline";

export async function POST() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Run in background — don't await so the response returns immediately
  runRefreshCycle().catch(console.error);

  return NextResponse.json({ status: "Refresh cycle started" });
}
