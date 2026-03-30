import { auth } from "@/lib/auth";
import { callBackend } from "@/lib/backend-client";
import { NextRequest, NextResponse } from "next/server";
import { SessionUser } from "@/types/auth";

async function guardAdmin() {
  const session = await auth();
  if (!session?.user) return { error: "Unauthorized", status: 401 };
  const user = session.user as SessionUser;
  if (!user.roles?.includes("admin")) return { error: "Forbidden", status: 403 };
  return { error: null, status: 200 };
}

/** POST /api/admin/provisions — 클러스터 CR 동기화 */
export async function POST(req: NextRequest) {
  try {
    const { error, status } = await guardAdmin();
    if (error) return NextResponse.json({ error }, { status });

    const res = await callBackend("/api/admin/provisions/sync", { method: "POST" }, req);
    const json = await res.json();
    return NextResponse.json(json, { status: res.status });
  } catch (e) {
    console.error("[POST /api/admin/provisions] error:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/** GET /api/admin/provisions — 프로비저닝 목록 (BE: /api/provisions) */
export async function GET(req: NextRequest) {
  try {
    const { error, status } = await guardAdmin();
    if (error) return NextResponse.json({ error }, { status });

    const res = await callBackend("/api/admin/provisions", undefined, req);
    if (!res.ok) {
      const body = await res.text();
      console.error("[GET /api/admin/provisions] BE error:", res.status, body);
      return NextResponse.json({ code: "ERROR", data: [], message: body }, { status: res.status });
    }
    return NextResponse.json(await res.json(), { status: res.status });
  } catch (e) {
    console.error("[GET /api/admin/provisions] error:", e);
    return NextResponse.json({ code: "SUCCESS", data: [] });
  }
}
