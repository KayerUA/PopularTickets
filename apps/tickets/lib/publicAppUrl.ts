const CANONICAL_HOST_BY_ALIAS: Record<string, string> = {
  "populartickets.pl": "www.populartickets.pl",
};

function normalizePublicUrl(raw: string): string {
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
 * Публичный базовый URL сайта (без завершающего слэша).
 *
 * Приоритет:
 * 1. `NEXT_PUBLIC_APP_URL` — явно задайте свой домен (Production / Preview в Vercel).
 * 2. На **production**-деплое Vercel: `VERCEL_PROJECT_PRODUCTION_URL` — короткий production-домен
 *    (после привязки своего домена Vercel подставляет его автоматически, без переменной).
 * 3. `VERCEL_URL` — URL конкретного деплоя (*.vercel.app или preview).
 */
export function getPublicAppUrl(): string | null {
  const explicit = process.env.NEXT_PUBLIC_APP_URL ? normalizePublicUrl(process.env.NEXT_PUBLIC_APP_URL) : "";
  if (explicit) return explicit;

  const prodHost = process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? normalizePublicUrl(process.env.VERCEL_PROJECT_PRODUCTION_URL)
    : "";
  if (prodHost && process.env.VERCEL_ENV === "production") {
    return prodHost.startsWith("http") ? prodHost : `https://${prodHost}`;
  }

  const vercel = process.env.VERCEL_URL ? normalizePublicUrl(process.env.VERCEL_URL) : "";
  if (vercel) return vercel.startsWith("http") ? vercel : `https://${vercel}`;
  return null;
}

export function requirePublicAppUrlForP24(): string {
  const url = getPublicAppUrl();
  if (!url) throw new Error("APP_URL_MISSING");
  return url;
}
