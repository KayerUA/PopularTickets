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
  const explicit = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "");
  if (explicit) return explicit;

  const prodHost = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim().replace(/\/$/, "");
  if (prodHost && process.env.VERCEL_ENV === "production") {
    return `https://${prodHost}`;
  }

  const vercel = process.env.VERCEL_URL?.trim().replace(/\/$/, "");
  if (vercel) return `https://${vercel}`;
  return null;
}

export function requirePublicAppUrlForP24(): string {
  const url = getPublicAppUrl();
  if (!url) throw new Error("APP_URL_MISSING");
  return url;
}
