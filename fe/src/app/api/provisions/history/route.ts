import { auth } from "@/lib/auth";
import { callBackend } from "@/lib/backend-client";
import { NextRequest, NextResponse } from "next/server";
import { SessionUser } from "@/types/auth";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const user = session.user as SessionUser;
    const userId = user.id ?? user.email ?? null;
    const extraHeaders: Record<string, string> = userId ? { "X-User-Id": userId } : {};
    const res = await callBackend("/api/provisions/history", { headers: extraHeaders }, req);
    return NextResponse.json(await res.json(), { status: res.status });
  } catch (e) {
    console.error("[GET /api/provisions/history] error:", e);
    return NextResponse.json({ code: "ERROR", data: [] }, { status: 500 });
  }
}
