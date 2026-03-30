import { NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:8080";

/** GET /api/public/banner — 인증 없이 현재 배너 상태 조회 (클라이언트 polling용) */
export async function GET() {
  try {
    const res = await fetch(`${BACKEND_URL}/api/public/banner`);
    return NextResponse.json(await res.json(), { status: res.status });
  } catch {
    return NextResponse.json({ enabled: false, message: "", link: "", updatedAt: "" });
  }
}
