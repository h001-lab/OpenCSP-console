import { getToken } from "next-auth/jwt";
import { headers } from "next/headers";
import { NextRequest } from "next/server";
import { getBackendUrl } from "./backend-store";

// NextAuth v5 uses 'authjs' cookie prefix (v4 used 'next-auth').
// Detect HTTPS from x-forwarded-proto rather than NEXTAUTH_URL,
// because NEXTAUTH_URL may be absent behind a reverse proxy.
async function getSessionCookieName(req?: NextRequest): Promise<string> {
  let isHttps = false;
  if (req) {
    isHttps = req.headers.get("x-forwarded-proto") === "https" || req.url.startsWith("https://");
  } else {
    const h = await headers();
    isHttps = h.get("x-forwarded-proto") === "https";
  }
  return isHttps ? "__Secure-authjs.session-token" : "authjs.session-token";
}

export async function callBackend(
  path: string,
  options?: RequestInit,
  req?: NextRequest
): Promise<Response> {
  const secret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;
  const cookieName = await getSessionCookieName(req);
  const token = await getToken({
    req: req ?? ({ headers: Object.fromEntries(await headers()) } as { headers: Record<string, string> }),
    secret,
    cookieName,
    salt: cookieName,
  });

  const reqHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options?.headers as Record<string, string> ?? {}),
    ...(token?.accessToken ? { Authorization: `Bearer ${token.accessToken}` } : {}),
  };

  return fetch(`${getBackendUrl()}${path}`, { ...options, headers: reqHeaders });
}
