import { auth } from "@/lib/auth";
import { callBackend } from "@/lib/backend-client";
import { NextRequest, NextResponse } from "next/server";
import { SessionUser } from "@/types/auth";

async function guardAdmin() {
  const session = await auth();
  const user = session?.user as SessionUser | undefined;
  if (!session?.user || !user?.roles?.includes("admin"))
    return { error: "Forbidden", status: 403 };
  return { error: null, status: 200 };
}

/** GET /api/admin/configs/semaphore/projects — Semaphore 프로젝트 목록 */
export async function GET(req: NextRequest) {
  const { error, status } = await guardAdmin();
  if (error) return NextResponse.json({ error }, { status });
  const res = await callBackend("/api/admin/configs/semaphore/projects", undefined, req);
  return NextResponse.json(await res.json(), { status: res.status });
}
