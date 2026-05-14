import type { MetadataRoute } from "next";
import { getPoetSiteUrl } from "@/lib/poetPublicUrl";

export default function robots(): MetadataRoute.Robots {
  const base = getPoetSiteUrl()?.replace(/\/$/, "");
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
      },
    ],
    sitemap: base ? `${base}/sitemap.xml` : undefined,
  };
}
