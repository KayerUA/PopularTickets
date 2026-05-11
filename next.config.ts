import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

function supabaseStorageImageHost(): string | undefined {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || process.env.SUPABASE_URL?.trim();
  if (!raw) return undefined;
  try {
    return new URL(raw.replace(/\/+$/, "")).hostname;
  } catch {
    return undefined;
  }
}

const storageHost = supabaseStorageImageHost();

/** Синхронно с `lib/ticketPngFontFaces.ts` (только эти WOFF2 читаются через fs). */
const notoTicketWoff2 = [
  "noto-sans-latin-400-normal.woff2",
  "noto-sans-latin-ext-400-normal.woff2",
  "noto-sans-cyrillic-ext-400-normal.woff2",
  "noto-sans-cyrillic-400-normal.woff2",
  "noto-sans-latin-600-normal.woff2",
  "noto-sans-latin-ext-600-normal.woff2",
  "noto-sans-cyrillic-ext-600-normal.woff2",
  "noto-sans-cyrillic-600-normal.woff2",
].map((f) => `./node_modules/@fontsource/noto-sans/files/${f}`);

const nextConfig: NextConfig = {
  /** WOFF2 читаются через fs в `ticketPngFontFaces` — без явного include Vercel иногда не кладёт их в serverless trace → ENOENT на /checkout/return (PNG билетов). */
  outputFileTracingIncludes: {
    "/*/checkout/return": notoTicketWoff2,
  },
  images: {
    remotePatterns: storageHost
      ? [
          {
            protocol: "https",
            hostname: storageHost,
            pathname: "/storage/v1/object/public/**",
          },
        ]
      : [],
  },
};

export default withNextIntl(nextConfig);
