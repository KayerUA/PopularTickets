import type { NextConfig } from "next";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const ticketsAppDir = path.dirname(fileURLToPath(import.meta.url));
const monorepoRoot = path.resolve(ticketsAppDir, "../..");
const localDejavuSans = path.join(ticketsAppDir, "node_modules/dejavu-fonts-ttf/ttf/DejaVuSans.ttf");
const hoistedDejavuSans = path.join(monorepoRoot, "node_modules/dejavu-fonts-ttf/ttf/DejaVuSans.ttf");
const useMonorepoTracingRoot = !fs.existsSync(localDejavuSans) && fs.existsSync(hoistedDejavuSans);

/** Ресурсы для `renderTicketLayoutPdf` (fs) — Vercel / monorepo trace. */
const ticketPdfAssetsMonorepo: string[] = [
  "./node_modules/dejavu-fonts-ttf/ttf/DejaVuSans.ttf",
  "./node_modules/dejavu-fonts-ttf/ttf/DejaVuSans-Bold.ttf",
  "./apps/tickets/public/brand/popular-poet-logo.png",
  "./apps/tickets/app/icon.png",
];

const ticketPdfAssetsAppOnly: string[] = [
  "./node_modules/dejavu-fonts-ttf/ttf/DejaVuSans.ttf",
  "./node_modules/dejavu-fonts-ttf/ttf/DejaVuSans-Bold.ttf",
  "./public/brand/popular-poet-logo.png",
  "./app/icon.png",
];

const ticketPdfTracingIncludes: Record<string, string[]> = {
  "/*/checkout/return": useMonorepoTracingRoot ? ticketPdfAssetsMonorepo : ticketPdfAssetsAppOnly,
  "/[locale]/checkout/return": useMonorepoTracingRoot ? ticketPdfAssetsMonorepo : ticketPdfAssetsAppOnly,
};

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
