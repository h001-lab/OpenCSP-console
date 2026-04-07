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

/** POST /api/admin/configs/semaphore/resources?type=repository|variable-group */
export async function POST(req: NextRequest) {
  const { error, status } = await guardAdmin();
  if (error) return NextResponse.json({ error }, { status });
  const type = new URL(req.url).searchParams.get("type");
  if (type !== "repository" && type !== "variable-group")
    return NextResponse.json({ error: "type must be repository or variable-group" }, { status: 400 });
  const body = await req.json();
  const res = await callBackend(`/api/admin/configs/semaphore/${type}`, {
    method: "POST",
    body: JSON.stringify(body),
  }, req);
  return NextResponse.json(await res.json(), { status: res.status });
}
