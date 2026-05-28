import type { MetadataRoute } from "next";
import { getPublicAppUrl } from "@/lib/publicAppUrl";

const DISALLOW_PATHS = ["/admin", "/check-in", "/api/"];

/** Search / citation bots — разрешить публичный контент (Gusarov AI SEO 2026). */
const SEARCH_AND_AI_BOTS_ALLOW = [
  "Googlebot",
  "Bingbot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "PerplexityBot",
  "Perplexity-User",
  "Claude-Web",
  "anthropic-ai",
] as const;

/** Обучение моделей — не search traffic. */
const TRAINING_BOTS_DISALLOW = ["GPTBot", "ClaudeBot", "Google-Extended"] as const;

export default function robots(): MetadataRoute.Robots {
  const base = getPublicAppUrl()?.replace(/\/$/, "");
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: DISALLOW_PATHS },
      ...SEARCH_AND_AI_BOTS_ALLOW.map((userAgent) => ({
        userAgent,
        allow: "/",
        disallow: DISALLOW_PATHS,
      })),
      ...TRAINING_BOTS_DISALLOW.map((userAgent) => ({
        userAgent,
        disallow: "/",
      })),
    ],
    sitemap: base ? `${base}/sitemap.xml` : undefined,
  };
}
