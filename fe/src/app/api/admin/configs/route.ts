import { auth } from "@/lib/auth";
import { callBackend } from "@/lib/backend-client";
import { NextRequest, NextResponse } from "next/server";
import { SessionUser } from "@/types/auth";

/**
 * 세션이 없으면 forbidden=false 반환 — setup 모드(iam.provider=none)에서는
 * token 없이 BE를 호출해도 통과되므로 FE에서 추가로 차단하지 않는다.
 */
async function getAdminGuard(): Promise<{ forbidden: boolean }> {
  const session = await auth();
  if (!session?.user) return { forbidden: false };
  const user = session.user as SessionUser;
  if (!user.roles?.includes("admin")) return { forbidden: true };
  return { forbidden: false };
}

/** GET /api/admin/configs — 전체 설정 조회 */
export async function GET(req: NextRequest) {
  const { forbidden } = await getAdminGuard();
  if (forbidden) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const res = await callBackend("/api/admin/configs", undefined, req);
  return NextResponse.json(await res.json(), { status: res.status });
}

/** PUT /api/admin/configs — 설정 저장/수정 */
export async function PUT(req: NextRequest) {
  const { forbidden } = await getAdminGuard();
  if (forbidden) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const res = await callBackend("/api/admin/configs", { method: "PUT", body: JSON.stringify(body) }, req);
  return NextResponse.json(await res.json(), { status: res.status });
}
