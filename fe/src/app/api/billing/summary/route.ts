import { auth } from "@/lib/auth";
import { callBackend } from "@/lib/backend-client";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const res = await callBackend("/api/billing/summary", { method: "GET" }, req);
  return NextResponse.json(await res.json(), { status: res.status });
}
