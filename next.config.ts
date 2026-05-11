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

/** TTF читаются через fs в `renderTicketLayoutPdf` — явный include для Vercel serverless trace. */
const dejavuTicketTtf = ["DejaVuSans.ttf", "DejaVuSans-Bold.ttf"].map(
  (f) => `./node_modules/dejavu-fonts-ttf/ttf/${f}`
);

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    "/*/checkout/return": dejavuTicketTtf,
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
