import { NextResponse, type NextRequest } from "next/server";
import createIntlMiddleware from "next-intl/middleware";
import { routing } from "@/i18n/routing";
import { POET_KURSY_LEGACY_SLUG_REDIRECTS } from "@/lib/poetKursyLegacySlugRedirects";

const intlMiddleware = createIntlMiddleware(routing);

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const dup = pathname.match(/^\/(pl|uk|ru)\/(pl|uk|ru)(\/.*)?$/);
  if (dup) {
    const [, a, b, tail = ""] = dup;
    const nextPath = a === b ? `/${a}${tail}` : `/${b}${tail}`;
    if (nextPath !== pathname) {
      const url = req.nextUrl.clone();
      url.pathname = nextPath;
      return NextResponse.redirect(url);
    }
  }

  const kursyLegacy = pathname.match(/^\/(pl|uk|ru)\/kursy\/([^/]+)\/?$/);
  if (kursyLegacy) {
    const [, loc, rawSlug] = kursyLegacy;
    const targetSlug = POET_KURSY_LEGACY_SLUG_REDIRECTS[rawSlug];
    if (targetSlug && targetSlug !== rawSlug) {
      const url = req.nextUrl.clone();
      url.pathname = `/${loc}/kursy/${targetSlug}`;
      return NextResponse.redirect(url, 308);
    }
  }

  return intlMiddleware(req);
}

export const config = {
  matcher: ["/", "/(pl|uk|ru)/:path*", "/((?!_next|_vercel|.*\\..*).*)"],
};
