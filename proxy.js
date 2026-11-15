import { NextResponse } from "next/server";

import { DEFAULT_LOCALE, LOCALES } from "./content/locales";

function pickLocale(request) {
  const explicit = request.nextUrl.searchParams.get("lang");
  if (LOCALES.includes(explicit)) return explicit;
  const cookie = request.cookies.get("ntx-lang")?.value;
  if (LOCALES.includes(cookie)) return cookie;
  const header = (request.headers.get("accept-language") || "").toLowerCase();
  if (header.startsWith("zh") || header.includes("zh-")) return "zh";
  if (header.startsWith("en") || header.includes("en-") || header.includes("en;")) return "en";
  return DEFAULT_LOCALE;
}

// Next.js 16 renamed Middleware to Proxy; the proxy runs on the Node.js runtime,
// which is what Vercel accepts now that the Edge runtime is deprecated.
export default function proxy(request) {
  const { pathname } = request.nextUrl;
  const hasLocale = LOCALES.some((l) => pathname === `/${l}` || pathname.startsWith(`/${l}/`));
  if (hasLocale) return NextResponse.next();

  const url = request.nextUrl.clone();
  url.pathname = `/${pickLocale(request)}${pathname === "/" ? "" : pathname}`;
  url.searchParams.delete("lang"); // the locale now lives in the path
  return NextResponse.redirect(url, 307);
}

export const config = {
  // everything except API routes, the standalone card, Next internals and static files
  matcher: ["/((?!api|_next|card|.*\\.[a-zA-Z0-9]+$).*)"],
};
