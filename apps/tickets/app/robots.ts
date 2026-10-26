import type { MetadataRoute } from "next";
import { getPublicAppUrl } from "@/lib/publicAppUrl";

const DISALLOW_PATHS = ["/admin", "/check-in", "/api/", "/ru/rate/", "/pl/rate/", "/uk/rate/"];

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
  "Google-Extended",
  "Google-CloudVertexBot",
] as const;

/** Обучение моделей без поисковой выдачи. Google-Extended / Vertex grounding — разрешены выше (AIEO). */
const TRAINING_BOTS_DISALLOW = ["GPTBot", "ClaudeBot"] as const;

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
