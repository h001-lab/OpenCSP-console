import { NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:8080";

/** GET /api/public/news — 인증 없이 공개 뉴스 목록 조회 */
export async function GET() {
  try {
    const res = await fetch(`${BACKEND_URL}/api/public/news`);
    return NextResponse.json(await res.json(), { status: res.status });
  } catch {
    return NextResponse.json([], { status: 200 });
  }
}
