import createNextIntlPlugin from "next-intl/plugin";
import type { NextConfig } from "next";

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
const imageHosts = [...new Set([storageHost, "pynbtuvhrratjqlweyas.supabase.co"].filter(Boolean) as string[])];

/** IndexNow key file — runtime-проверка в /api/indexnow/[key]; rewrite не зависит от env на build. */
function indexNowRewrites(): { source: string; destination: string }[] {
  return [{ source: "/:key([a-f0-9]{32}).txt", destination: "/api/indexnow/:key" }];
}

const nextConfig: NextConfig = {
  async rewrites() {
    return indexNowRewrites();
  },
  images: {
    remotePatterns: imageHosts.map((hostname) => ({
      protocol: "https",
      hostname,
      pathname: "/storage/v1/object/public/**",
    })),
  },
};

export default withNextIntl(nextConfig);
