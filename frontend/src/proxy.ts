import { type NextRequest, NextResponse } from "next/server";

import { defaultLocale, isLocale, LOCALE_COOKIE, locales } from "@/lib/i18n/config";

/**
 * Every page lives under app/[lang], but URLs stay unprefixed (/home, not /en/home): the
 * language cookie picks the tree with a rewrite, so links, bookmarks and shared URLs work in
 * either language. An explicit /id/… or /en/… URL is served as is.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (locales.some((l) => pathname === `/${l}` || pathname.startsWith(`/${l}/`))) return;

  const cookie = request.cookies.get(LOCALE_COOKIE)?.value;
  const url = request.nextUrl.clone();
  url.pathname = `/${isLocale(cookie) ? cookie : defaultLocale}${pathname === "/" ? "" : pathname}`;
  return NextResponse.rewrite(url);
}

export const config = {
  // Pages only: not Next's own files, nor anything with an extension (icons, public/ assets).
  matcher: ["/((?!_next/|.*\\..*).*)"],
};
