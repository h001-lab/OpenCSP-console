import { auth } from "@/lib/auth";
import { callBackend } from "@/lib/backend-client";
import { NextRequest, NextResponse } from "next/server";

async function guardUser() {
  const session = await auth();
  if (!session?.user) return { error: "Unauthorized", status: 401 };
  return { error: null, status: 200 };
}

export async function POST(req: NextRequest) {
  const { error, status } = await guardUser();
  if (error) return NextResponse.json({ error }, { status });
  const body = await req.json();
  const res = await callBackend("/api/console/sessions", {
    method: "POST",
    body: JSON.stringify(body),
  }, req);
  return NextResponse.json(await res.json(), { status: res.status });
}

export async function GET(req: NextRequest) {
  const { error, status } = await guardUser();
  if (error) return NextResponse.json({ error }, { status });
  const res = await callBackend("/api/console/sessions", undefined, req);
  return NextResponse.json(await res.json(), { status: res.status });
}
