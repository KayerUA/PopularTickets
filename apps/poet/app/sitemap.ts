import type { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";
import { getPoetSiteUrl } from "@/lib/poetPublicUrl";
import { fetchPublishedPoetCourses } from "@/lib/poetCourses";
import { POET_STATIC_COURSE_SLUGS } from "@/lib/poetStaticCourses";

const FACTS_PATH = "/o-popular-poet";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getPoetSiteUrl()?.replace(/\/$/, "");
  if (!base) return [];

  const courses = await fetchPublishedPoetCourses();
  const slugs =
    courses.length > 0
      ? [...new Set(courses.map((c) => c.slug))]
      : [...(POET_STATIC_COURSE_SLUGS as readonly string[])];

  const last = new Date();
  const entries: MetadataRoute.Sitemap = [];

  for (const locale of routing.locales) {
    entries.push({
      url: `${base}/${locale}`,
      lastModified: last,
      changeFrequency: "weekly",
      priority: 1,
    });
    entries.push({
      url: `${base}/${locale}${FACTS_PATH}`,
      lastModified: last,
      changeFrequency: "monthly",
      priority: 0.85,
    });
    for (const slug of slugs) {
      entries.push({
        url: `${base}/${locale}/kursy/${encodeURIComponent(slug)}`,
        lastModified: last,
        changeFrequency: "weekly",
        priority: 0.75,
      });
    }
  }

  return entries;
}
