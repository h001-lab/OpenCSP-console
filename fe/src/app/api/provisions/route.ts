import { auth } from "@/lib/auth";
import { callBackend } from "@/lib/backend-client";
import { NextRequest, NextResponse } from "next/server";
import { SessionUser } from "@/types/auth";

async function guardUser() {
  const session = await auth();
  if (!session?.user) return { error: "Unauthorized", status: 401, userId: null };
  const user = session.user as SessionUser;
  // user.id = Zitadel sub (OIDC subject), BE IAM none-mode에서 사용자 식별용
  const userId = user.id ?? user.email ?? null;
  return { error: null, status: 200, userId };
}

/** GET /api/provisions — 내 프로비저닝 목록 */
export async function GET(req: NextRequest) {
  try {
    const { error, status, userId } = await guardUser();
    if (error) return NextResponse.json({ error }, { status });

    const extraHeaders: Record<string, string> = userId ? { "X-User-Id": userId } : {};
    const res = await callBackend("/api/provisions", { headers: extraHeaders }, req);
    if (!res.ok) {
      const body = await res.text();
      console.error("[GET /api/provisions] BE error:", res.status, body);
      return NextResponse.json({ code: "ERROR", data: [], message: body }, { status: res.status });
    }
    return NextResponse.json(await res.json());
  } catch (e) {
    console.error("[GET /api/provisions] error:", e);
    return NextResponse.json({ code: "ERROR", data: [] }, { status: 500 });
  }
}

/** POST /api/provisions — 프로비저닝 시작 */
export async function POST(req: NextRequest) {
  try {
    const { error, status, userId } = await guardUser();
    if (error) return NextResponse.json({ error }, { status });

    const body = await req.json();
    const extraHeaders: Record<string, string> = userId ? { "X-User-Id": userId } : {};
    const res = await callBackend("/api/provisions", {
      method: "POST",
      body: JSON.stringify(body),
      headers: extraHeaders,
    }, req);
    const json = await res.json();
    return NextResponse.json(json, { status: res.status });
  } catch (e) {
    console.error("[POST /api/provisions] error:", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
