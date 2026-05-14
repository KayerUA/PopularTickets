import { NextResponse, type NextRequest } from "next/server";
import createIntlMiddleware from "next-intl/middleware";
import { routing } from "@/i18n/routing";

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

  return intlMiddleware(req);
}

export const config = {
  matcher: ["/", "/(pl|uk|ru)/:path*", "/((?!_next|_vercel|.*\\..*).*)"],
};
