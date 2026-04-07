import { NextResponse } from "next/server";

/** POST /api/admin/backend/test — 주어진 URL로 백엔드 연결 테스트 */
export async function POST(req: Request) {
  const { url } = await req.json();
  if (!url?.trim()) {
    return NextResponse.json({ success: false, message: "URL is required" }, { status: 400 });
  }

  const base = url.trim().replace(/\/$/, "");

  try {
    const res = await fetch(`${base}/actuator/health`, {
      signal: AbortSignal.timeout(6000),
    });
    // 401/403은 서버에 도달했다는 의미이므로 연결 성공으로 처리
    if (res.ok) {
      const body = await res.json().catch(() => ({}));
      const status = body?.status ?? "UP";
      return NextResponse.json({ success: true, message: `${base} — status: ${status}` });
    }
    if (res.status === 401 || res.status === 403) {
      return NextResponse.json({ success: true, message: `${base} — reachable (HTTP ${res.status})` });
    }
    return NextResponse.json({ success: false, message: `HTTP ${res.status}: ${res.statusText}` });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Connection failed";
    return NextResponse.json({ success: false, message: msg });
  }
}
