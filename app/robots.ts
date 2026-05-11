import type { MetadataRoute } from "next";
import { getPublicAppUrl } from "@/lib/publicAppUrl";

export default function robots(): MetadataRoute.Robots {
  const base = getPublicAppUrl()?.replace(/\/$/, "");
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/check-in", "/api/"],
      },
    ],
    sitemap: base ? `${base}/sitemap.xml` : undefined,
  };
}
