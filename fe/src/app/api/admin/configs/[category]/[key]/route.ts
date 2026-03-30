import { auth } from "@/lib/auth";
import { callBackend } from "@/lib/backend-client";
import { NextRequest, NextResponse } from "next/server";
import { SessionUser } from "@/types/auth";

/** DELETE /api/admin/configs/{category}/{key} */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ category: string; key: string }> }
) {
  const session = await auth();
  const user = session?.user as SessionUser | undefined;
  if (user && !user.roles?.includes("admin")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { category, key } = await params;
  const res = await callBackend(
    `/api/admin/configs/${category}/${encodeURIComponent(key)}`,
    { method: "DELETE" },
    req
  );

  if (res.status === 204) return new NextResponse(null, { status: 204 });
  return NextResponse.json(await res.json(), { status: res.status });
}
