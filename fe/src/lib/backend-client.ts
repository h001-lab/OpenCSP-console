import { getToken } from "next-auth/jwt";
import { headers } from "next/headers";
import { NextRequest } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:8080";

export async function callBackend(
  path: string,
  options?: RequestInit,
  req?: NextRequest
): Promise<Response> {
  const token = await getToken({
    req: req ?? ({ headers: Object.fromEntries(await headers()) } as { headers: Record<string, string> }),
    secret: process.env.AUTH_SECRET,
  });

  const reqHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options?.headers as Record<string, string> ?? {}),
    ...(token?.accessToken ? { Authorization: `Bearer ${token.accessToken}` } : {}),
  };

  return fetch(`${BACKEND_URL}${path}`, { ...options, headers: reqHeaders });
}
