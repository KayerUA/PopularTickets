import type { AppLocale } from "@/i18n/routing";
import { getPublicAppUrl } from "@/lib/publicAppUrl";
import { canonicalPath } from "@/lib/seo";
import { routing } from "@/i18n/routing";

/** PL/RU: /o-populartickets; UK: /pro-populartickets */
export function ticketsFactsHreflangUrls(): Record<string, string> | undefined {
  const base = getPublicAppUrl()?.replace(/\/$/, "");
  if (!base) return undefined;
  const out: Record<string, string> = {};
  for (const loc of routing.locales) {
    const path = loc === "uk" ? "/pro-populartickets" : "/o-populartickets";
    out[loc] = `${base}${canonicalPath(loc, path)}`;
  }
  out["x-default"] = `${base}${canonicalPath(routing.defaultLocale, "/o-populartickets")}`;
  return out;
}

export function ticketsFactsPathForLocale(locale: AppLocale): "/o-populartickets" | "/pro-populartickets" {
  return locale === "uk" ? "/pro-populartickets" : "/o-populartickets";
}
