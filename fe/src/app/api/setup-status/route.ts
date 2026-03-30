import { callBackend } from "@/lib/backend-client";
import { NextRequest, NextResponse } from "next/server";

/** GET /api/setup-status — 인증 없이 BE의 IAM 공급자 설정 조회 (setup 모드 판별용) */
export async function GET(req: NextRequest) {
  try {
    const res = await callBackend("/api/public/status", undefined, req);
    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    // BE 연결 실패 시 none으로 폴백 (서버 시작 초기 등)
    return NextResponse.json({ iamProvider: "none" });
  }
}
