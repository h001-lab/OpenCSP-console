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

export async function PUT(req: NextRequest, { params }: { params: Promise<{ uuid: string }> }) {
  const { error, status } = await guardAdmin();
  if (error) return NextResponse.json({ error }, { status });
  const { uuid } = await params;
  const body = await req.json();
  const res = await callBackend(
    `/api/admin/nodes/${uuid}/credentials`,
    { method: "PUT", body: JSON.stringify(body) },
    req
  );
  return NextResponse.json(await res.json(), { status: res.status });
}
