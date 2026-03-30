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

/** DELETE /api/admin/provisions/[crName] */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ crName: string }> }
) {
  try {
    const { error, status } = await guardAdmin();
    if (error) return NextResponse.json({ error }, { status });

    const { crName } = await params;
    const res = await callBackend(`/api/provisions/${crName}`, { method: "DELETE" }, req);
    if (res.status === 204) return new NextResponse(null, { status: 204 });
    return NextResponse.json(await res.json(), { status: res.status });
  } catch (e) {
    console.error("[DELETE /api/admin/provisions] error:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
