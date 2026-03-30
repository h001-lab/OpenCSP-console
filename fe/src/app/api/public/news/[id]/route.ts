import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:8080";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const res = await fetch(`${BACKEND_URL}/api/public/news/${id}`);
    if (res.status === 404) return NextResponse.json(null, { status: 404 });
    return NextResponse.json(await res.json(), { status: res.status });
  } catch {
    return NextResponse.json(null, { status: 500 });
  }
}
