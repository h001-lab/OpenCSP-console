import { getToken } from "next-auth/jwt";
import { headers } from "next/headers";
import { NextRequest } from "next/server";
import { getBackendUrl } from "./backend-store";

export async function callBackend(
  path: string,
  options?: RequestInit,
  req?: NextRequest
): Promise<Response> {
  const secret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;
  const token = await getToken({
    req: req ?? ({ headers: Object.fromEntries(await headers()) } as { headers: Record<string, string> }),
    secret,
  });

  const reqHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options?.headers as Record<string, string> ?? {}),
    ...(token?.accessToken ? { Authorization: `Bearer ${token.accessToken}` } : {}),
  };

  return fetch(`${getBackendUrl()}${path}`, { ...options, headers: reqHeaders });
}
