import type { NextConfig } from "next";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const ticketsAppDir = path.dirname(fileURLToPath(import.meta.url));
const monorepoRoot = path.resolve(ticketsAppDir, "../..");
const useMonorepoTracingRoot =
  fs.existsSync(path.join(monorepoRoot, "package.json")) &&
  fs.existsSync(path.join(monorepoRoot, "apps", "tickets", "package.json"));

/** Ресурсы для `renderTicketLayoutPdf` (шрифты, логотип) — включать в serverless bundle для перечисленных маршрутов. */
const ticketPdfAssetsMonorepo: string[] = [
  "./apps/tickets/public/brand/popular-poet-logo.png",
  "./apps/tickets/app/icon.png",
];

const ticketPdfAssetsAppOnly: string[] = [
  "./public/brand/popular-poet-logo.png",
  "./app/icon.png",
];

const ticketPdfAssets = useMonorepoTracingRoot ? ticketPdfAssetsMonorepo : ticketPdfAssetsAppOnly;

/** PDF/QR билета вызываются со страницы return, из /api/p24/notify и из server actions на странице события. */
const ticketPdfTracingRouteKeys = [
  "/*/checkout/return",
  "/[locale]/checkout/return",
  "/api/p24/notify",
  "/[locale]/events/[slug]",
  "/*/events/[slug]",
] as const;

const ticketPdfTracingIncludes: Record<string, string[]> = Object.fromEntries(
  ticketPdfTracingRouteKeys.map((key) => [key, [...ticketPdfAssets]])
);

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

const nextConfig: NextConfig = {
  ...(useMonorepoTracingRoot ? { outputFileTracingRoot: monorepoRoot } : {}),
  outputFileTracingIncludes: ticketPdfTracingIncludes,
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
