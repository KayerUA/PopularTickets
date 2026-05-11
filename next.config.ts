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

/** Ресурсы для `renderTicketLayoutPdf` (fs) — Vercel trace. */
const ticketPdfAssets = [
  "./node_modules/dejavu-fonts-ttf/ttf/DejaVuSans.ttf",
  "./node_modules/dejavu-fonts-ttf/ttf/DejaVuSans-Bold.ttf",
  "./public/brand/popular-poet-logo.png",
  "./app/icon.png",
];

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    "/*/checkout/return": ticketPdfAssets,
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
