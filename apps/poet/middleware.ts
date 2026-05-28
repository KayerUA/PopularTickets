import { NextResponse, type NextRequest } from "next/server";
import createIntlMiddleware from "next-intl/middleware";
import { routing } from "@/i18n/routing";
import { POET_KURSY_LEGACY_SLUG_REDIRECTS } from "@/lib/poetKursyLegacySlugRedirects";

const intlMiddleware = createIntlMiddleware(routing);

/** next-intl отдаёт 307 — для SEO/GSC каноничнее постоянный 308. */
function permanentRedirectIfTemporary(req: NextRequest, res: NextResponse): NextResponse {
  if (res.status !== 307) return res;
  const location = res.headers.get("Location");
  if (!location) return res;
  try {
    return NextResponse.redirect(new URL(location, req.url), 308);
  } catch {
    return res;
  }
}

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

  /** Канон как у sitemap/SEO: `/ru`, не `/ru/` (снимает дубли в GSC). */
  const localeHomeTrailing = pathname.match(/^\/(pl|uk|ru)\/$/);
  if (localeHomeTrailing) {
    const url = req.nextUrl.clone();
    url.pathname = `/${localeHomeTrailing[1]}`;
    return NextResponse.redirect(url, 308);
  }

  /** IndexNow key file — не отдавать как `[locale]`. */
  if (/^\/[a-f0-9]{32}\.txt$/.test(pathname)) {
    return NextResponse.next();
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

  return permanentRedirectIfTemporary(req, intlMiddleware(req));
}

export const config = {
  matcher: [
    "/",
    "/(pl|uk|ru)/:path*",
    "/((?!_next|_vercel|.*\\..*).*)",
    /** IndexNow key file — middleware matcher по умолчанию исключает пути с точкой. */
    "/:key([a-f0-9]{32}).txt",
  ],
};
