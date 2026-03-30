import { callBackend } from "@/lib/backend-client";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

/** DELETE /api/provisions/[crName] */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ crName: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { crName } = await params;
    const res = await callBackend(`/api/provisions/${crName}`, { method: "DELETE" }, req);
    if (res.status === 204) return new NextResponse(null, { status: 204 });
    return NextResponse.json(await res.json(), { status: res.status });
  } catch (e) {
    console.error("[DELETE /api/provisions/[crName]] error:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
