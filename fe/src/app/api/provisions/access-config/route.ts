import { auth } from "@/lib/auth";
import { callBackend } from "@/lib/backend-client";
import { NextRequest, NextResponse } from "next/server";

/** GET /api/provisions/access-config — SSH 접근에 필요한 Teleport proxy URL 반환 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const res = await callBackend("/api/provisions/access-config", {}, req);
  return NextResponse.json(await res.json(), { status: res.status });
}
