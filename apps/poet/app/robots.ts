import type { MetadataRoute } from "next";
import { getPoetSiteUrl } from "@/lib/poetPublicUrl";

export default function robots(): MetadataRoute.Robots {
  const base = getPoetSiteUrl()?.replace(/\/$/, "");
  const allowAll: MetadataRoute.Robots["rules"] = [
    { userAgent: "*", allow: "/" },
    { userAgent: "Googlebot", allow: "/" },
    { userAgent: "Bingbot", allow: "/" },
    /** ChatGPT Search / browsing — не путать с GPTBot (обучение моделей). */
    { userAgent: "OAI-SearchBot", allow: "/" },
    { userAgent: "ChatGPT-User", allow: "/" },
    { userAgent: "PerplexityBot", allow: "/" },
    { userAgent: "Perplexity-User", allow: "/" },
    /** Обучение foundation models — продуктовое решение: не индексировать для training. */
    { userAgent: "GPTBot", disallow: "/" },
  ];
  return {
    rules: allowAll,
    sitemap: base ? `${base}/sitemap.xml` : undefined,
  };
}
