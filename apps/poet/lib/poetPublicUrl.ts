/**
 * Канонічний URL сайту popularpoet.pl (без завершального `/`).
 * 1) NEXT_PUBLIC_POET_SITE_URL — явно в Production Vercel (рекомендовано для SEO).
 * 2) На production: VERCEL_PROJECT_PRODUCTION_URL (домен проєкту poet).
 * 3) VERCEL_URL — preview / *.vercel.app.
 */
export function getPoetSiteUrl(): string | null {
  const explicit = process.env.NEXT_PUBLIC_POET_SITE_URL?.trim().replace(/\/$/, "");
  if (explicit) return explicit;

  const prodHost = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim().replace(/\/$/, "");
  if (prodHost && process.env.VERCEL_ENV === "production") {
    return `https://${prodHost}`;
  }

  const vercel = process.env.VERCEL_URL?.trim().replace(/\/$/, "");
  if (vercel) return `https://${vercel}`;
  return null;
}
