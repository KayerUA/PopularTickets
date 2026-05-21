const CANONICAL_HOST_BY_ALIAS: Record<string, string> = {
  "popularpoet.pl": "www.popularpoet.pl",
};

function normalizePoetUrl(raw: string): string {
  const value = raw.trim().replace(/\/$/, "");
  try {
    const url = new URL(value.startsWith("http") ? value : `https://${value}`);
    const canonicalHost = CANONICAL_HOST_BY_ALIAS[url.hostname];
    if (canonicalHost) {
      url.hostname = canonicalHost;
      url.protocol = "https:";
    }
    return url.toString().replace(/\/$/, "");
  } catch {
    return value;
  }
}

/**
 * Канонічний URL сайту popularpoet.pl (без завершального `/`).
 * 1) NEXT_PUBLIC_POET_SITE_URL — явно в Production Vercel (рекомендовано для SEO).
 * 2) На production: VERCEL_PROJECT_PRODUCTION_URL (домен проєкту poet).
 * 3) VERCEL_URL — preview / *.vercel.app.
 */
export function getPoetSiteUrl(): string | null {
  const explicit = process.env.NEXT_PUBLIC_POET_SITE_URL
    ? normalizePoetUrl(process.env.NEXT_PUBLIC_POET_SITE_URL)
    : "";
  if (explicit) return explicit;

  const prodHost = process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? normalizePoetUrl(process.env.VERCEL_PROJECT_PRODUCTION_URL)
    : "";
  if (prodHost && process.env.VERCEL_ENV === "production") {
    return prodHost.startsWith("http") ? prodHost : `https://${prodHost}`;
  }

  const vercel = process.env.VERCEL_URL ? normalizePoetUrl(process.env.VERCEL_URL) : "";
  if (vercel) return vercel.startsWith("http") ? vercel : `https://${vercel}`;
  return null;
}
