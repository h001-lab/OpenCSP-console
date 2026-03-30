import { auth } from "@/lib/auth";
import { callBackend } from "@/lib/backend-client";
import { NextRequest, NextResponse } from "next/server";

/** GET /api/provisions/next-vm-id — 기존과 겹치지 않는 다음 VM ID */
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const res = await callBackend("/api/provisions/next-vm-id", undefined, req);
    return NextResponse.json(await res.json(), { status: res.status });
  } catch (e) {
    console.error("[GET /api/provisions/next-vm-id] error:", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
