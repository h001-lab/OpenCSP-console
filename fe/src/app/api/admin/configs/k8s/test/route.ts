import { auth } from "@/lib/auth";
import { callBackend } from "@/lib/backend-client";
import { NextRequest, NextResponse } from "next/server";
import { SessionUser } from "@/types/auth";

export async function POST(req: NextRequest) {
  const session = await auth();
  const user = session?.user as SessionUser | undefined;
  if (!session?.user || !user?.roles?.includes("admin")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  try {
    const res = await callBackend("/api/admin/configs/k8s/test", {
      method: "POST",
      body: JSON.stringify(body),
    }, req);
    return NextResponse.json(await res.json(), { status: res.status });
  } catch {
    return NextResponse.json({ error: "Backend unreachable", code: "BACKEND_UNREACHABLE" }, { status: 503 });
  }
}
