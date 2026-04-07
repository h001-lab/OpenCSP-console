import { NextResponse } from "next/server";
import { getBackendUrl, getEnvDefault, saveBackendUrl } from "@/lib/backend-store";

/** GET /api/admin/backend — 현재 저장된 백엔드 URL 조회 */
export async function GET() {
  return NextResponse.json({ url: getBackendUrl(), envDefault: getEnvDefault() });
}

/** PUT /api/admin/backend — 백엔드 URL 저장 */
export async function PUT(req: Request) {
  const { url } = await req.json();
  if (!url?.trim()) {
    return NextResponse.json({ error: "URL is required" }, { status: 400 });
  }
  saveBackendUrl(url);
  return NextResponse.json({ url: url.trim() });
}
