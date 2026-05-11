/**
 * Публичный базовый URL сайта (без завершающего слэша).
 * На Vercel без своего домена можно не задавать NEXT_PUBLIC_APP_URL —
 * подставится https://$VERCEL_URL (preview/production *.vercel.app).
 */
export function getPublicAppUrl(): string | null {
  const explicit = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "");
  if (explicit) return explicit;
  const vercel = process.env.VERCEL_URL?.trim().replace(/\/$/, "");
  if (vercel) return `https://${vercel}`;
  return null;
}

export function requirePublicAppUrlForP24(): string {
  const url = getPublicAppUrl();
  if (!url) throw new Error("APP_URL_MISSING");
  return url;
}
