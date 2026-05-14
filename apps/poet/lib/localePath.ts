import { routing } from "@/i18n/routing";

const LOCALE_SET = new Set<string>(routing.locales);

/** Снимает ведущие сегменты локали, чтобы `router.replace(path, { locale })` не давал `/uk/uk/...`. */
export function stripLocalePrefixSegments(pathname: string): string {
  let rest = pathname && pathname.length > 0 ? pathname : "/";
  if (!rest.startsWith("/")) rest = `/${rest}`;

  while (true) {
    const m = rest.match(/^\/(pl|uk|ru)(?=\/|$)/);
    if (!m?.[1] || !LOCALE_SET.has(m[1])) break;
    const tail = rest.slice(`/${m[1]}`.length);
    rest = tail.length === 0 ? "/" : tail.startsWith("/") ? tail : `/${tail}`;
  }
  return rest || "/";
}
