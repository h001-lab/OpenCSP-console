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

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ uuid: string }> }) {
  const { error, status } = await guardAdmin();
  if (error) return NextResponse.json({ error }, { status });
  const { uuid } = await params;
  const { searchParams } = new URL(req.url);
  const nodeStatus = searchParams.get("status");
  const res = await callBackend(
    `/api/admin/nodes/${uuid}/status?status=${nodeStatus}`,
    { method: "PATCH" },
    req
  );
  return NextResponse.json(await res.json(), { status: res.status });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ uuid: string }> }) {
  const { error, status } = await guardAdmin();
  if (error) return NextResponse.json({ error }, { status });
  const { uuid } = await params;
  const res = await callBackend(`/api/admin/nodes/${uuid}`, { method: "DELETE" }, req);
  if (res.status === 204) return new NextResponse(null, { status: 204 });
  return NextResponse.json(await res.json(), { status: res.status });
}
