import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const locales = ["en", "ko", "jp"];
const defaultLocale = "en";

export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  console.log(`[Proxy] Visiting: ${pathname}`); 

  const pathnameHasLocale = locales.some(
    (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
  );

  if (pathnameHasLocale) return NextResponse.next();

  const acceptLanguage = request.headers.get("accept-language") || "";
  const detectedLang = acceptLanguage.split(",")[0].split("-")[0];
  const locale = locales.includes(detectedLang) ? detectedLang : defaultLocale;

  const url = request.nextUrl.clone();
  url.pathname = `/${locale}${pathname}`;
  
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)',
  ],
};