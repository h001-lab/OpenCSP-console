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

/** GET /api/admin/configs/semaphore/repositories?projectId=N */
export async function GET(req: NextRequest) {
  const { error, status } = await guardAdmin();
  if (error) return NextResponse.json({ error }, { status });
  const projectId = new URL(req.url).searchParams.get("projectId");
  if (!projectId) return NextResponse.json({ error: "projectId required" }, { status: 400 });
  const res = await callBackend(`/api/admin/configs/semaphore/repositories?projectId=${projectId}`, undefined, req);
  return NextResponse.json(await res.json(), { status: res.status });
}
