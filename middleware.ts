import { NextResponse, type NextRequest } from "next/server";
import createIntlMiddleware from "next-intl/middleware";
import { verifyAdminToken } from "@/lib/adminSession";
import { routing } from "@/i18n/routing";

const intlMiddleware = createIntlMiddleware(routing);

/** next-intl читает локаль из заголовка; без него корневой layout с getLocale() падает на /admin и /check-in. */
const NEXT_INTL_LOCALE_HEADER = "X-NEXT-INTL-LOCALE";

function nextWithDefaultLocale(req: NextRequest) {
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set(NEXT_INTL_LOCALE_HEADER, routing.defaultLocale);
  return NextResponse.next({ request: { headers: requestHeaders } });
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith("/api")) {
    if (pathname.startsWith("/api/admin")) {
      const token = req.cookies.get("admin_session")?.value;
      if (!token) {
        return new NextResponse("Unauthorized", { status: 401 });
      }
      const ok = await verifyAdminToken(token);
      if (!ok) {
        return new NextResponse("Unauthorized", { status: 401 });
      }
    }
    return NextResponse.next();
  }

  if (pathname.startsWith("/admin/login")) {
    return nextWithDefaultLocale(req);
  }

  if (pathname.startsWith("/admin")) {
    const token = req.cookies.get("admin_session")?.value;
    if (!token) {
      const url = req.nextUrl.clone();
      url.pathname = "/admin/login";
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
    const ok = await verifyAdminToken(token);
    if (!ok) {
      const url = req.nextUrl.clone();
      url.pathname = "/admin/login";
      return NextResponse.redirect(url);
    }
    return nextWithDefaultLocale(req);
  }

  if (pathname.startsWith("/check-in")) {
    return nextWithDefaultLocale(req);
  }

  return intlMiddleware(req);
}

export const config = {
  matcher: ["/", "/(pl|uk|ru)/:path*", "/((?!_next|_vercel|.*\\..*).*)"],
};
