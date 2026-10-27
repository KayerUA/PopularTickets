import { CONTENT_UPDATED_AT, latestContentDate } from "@/lib/contentRevision";
import { getPoetSupabase } from "@/lib/supabasePoet";
import { poetIntentRedirect } from "@/lib/intentRedirects";
import type { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";
import { getPoetSiteUrl } from "@/lib/poetPublicUrl";
import { fetchPublishedPoetCourses } from "@/lib/poetCourses";
import { POET_STATIC_COURSE_SLUGS } from "@/lib/poetStaticCourses";
import { allPoetIntentPages } from "@/lib/poetIntentRoutes";

const FACTS_PATH = "/o-popular-poet";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getPoetSiteUrl()?.replace(/\/$/, "");
  if (!base) return [];

  const courses = await fetchPublishedPoetCourses();
  const db = getPoetSupabase();
  const { data: eventUpdates } = db ? await db.from("events").select("updated_at,poet_course_id").eq("visibility", "published") : { data: [] };
  const liveModified = latestContentDate(...courses.map(course => course.updated_at), ...(eventUpdates ?? []).map(event => event.updated_at));
  const slugs =
    courses.length > 0
      ? [...new Set(courses.map((c) => c.slug))]
      : [...(POET_STATIC_COURSE_SLUGS as readonly string[])].filter((slug) => slug !== "masterclass");

  const entries: MetadataRoute.Sitemap = [];

  for (const locale of routing.locales) {
    entries.push({ url: `${base}/${locale}/grupa-teatralna-dla-doroslych-warszawa`, changeFrequency: "monthly", priority: 0.8, lastModified: new Date(CONTENT_UPDATED_AT) });
    entries.push({
      url: `${base}/${locale}`,
      lastModified: liveModified,
      changeFrequency: "weekly",
      priority: 1,
    });
    entries.push({
      url: `${base}/${locale}${FACTS_PATH}`,
      lastModified: new Date(CONTENT_UPDATED_AT),
      changeFrequency: "monthly",
      priority: 0.85,
    });
    for (const { page } of allPoetIntentPages().filter((x) => x.locale === locale && !poetIntentRedirect(locale, x.page.slug))) {
      entries.push({
        url: `${base}/${locale}/${page.slug}`,
        lastModified: page.cluster === "trial" || page.cluster === "acting-course" ? liveModified : new Date(CONTENT_UPDATED_AT),
        changeFrequency: "monthly",
        priority: 0.82,
      });
    }
    for (const slug of slugs) {
      entries.push({
        url: `${base}/${locale}/kursy/${encodeURIComponent(slug)}`,
        lastModified: latestContentDate(courses.find(course => course.slug === slug)?.updated_at, ...(eventUpdates ?? []).filter(event => event.poet_course_id === courses.find(course => course.slug === slug)?.id).map(event => event.updated_at)),
        changeFrequency: "weekly",
        priority: 0.75,
      });
    }
  }

  return entries;
}
