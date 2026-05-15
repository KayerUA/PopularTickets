import type { MetadataRoute } from "next";
import { getPublicAppUrl } from "@/lib/publicAppUrl";

const DISALLOW_PATHS = ["/admin", "/check-in", "/api/"];

const publicAllow = {
  userAgent: "*",
  allow: "/",
  disallow: DISALLOW_PATHS,
};

/** Явные правила для поисковых и AI-краулеров (документация; не дублировать случайный Disallow). */
const namedBotsAllow = [
  "Googlebot",
  "Bingbot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "PerplexityBot",
  "ClaudeBot",
] as const;

export default function robots(): MetadataRoute.Robots {
  const base = getPublicAppUrl()?.replace(/\/$/, "");
  return {
    rules: [
      publicAllow,
      ...namedBotsAllow.map((userAgent) => ({
        userAgent,
        allow: "/",
        disallow: DISALLOW_PATHS,
      })),
      /** Обучение OpenAI: отдельно от OAI-SearchBot (поиск). */
      { userAgent: "GPTBot", disallow: "/" },
    ],
    sitemap: base ? `${base}/sitemap.xml` : undefined,
  };
}
