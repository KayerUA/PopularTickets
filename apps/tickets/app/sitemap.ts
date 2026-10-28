import { CONTENT_UPDATED_AT, latestContentDate } from "@/lib/contentRevision";
import { ticketsIntentRedirect } from "@/lib/intentRedirects";
import type { MetadataRoute } from "next";
import { getServiceSupabase } from "@/lib/supabase/admin";
import { getPublicAppUrl } from "@/lib/publicAppUrl";
import { routing } from "@/i18n/routing";
import { allIntentSlugs } from "@/lib/ticketsIntentRoutes";
import { ticketsFactsPathForLocale } from "@/lib/ticketsFactsHreflang";
import { eventSitemapTier } from "@/lib/eventSeoPolicy";
import { INDEXABLE_TRIAL_HUB_COURSE_SLUGS, TRIAL_HUB_SEGMENT } from "@/lib/trialCourseHub";

const STATIC_PATHS = ["", "/events", "/events/arhiv", "/firma", "/regulamin", "/zwroty", "/polityka-prywatnosci", "/podarok"] as const;

export const revalidate = 60;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getPublicAppUrl()?.replace(/\/$/, "");
  if (!base) return [];

  const out: MetadataRoute.Sitemap = [];
  const supabase = getServiceSupabase();
  let eventRows: { slug: string; updated_at: string; starts_at: string }[] = [];
  if (supabase) {
    // trial отдаёт 308 на хаб курса, special — на /special/{slug}: в sitemap только конечные URL.
    const { data } = await supabase
      .from("events")
      .select("slug,updated_at,starts_at")
      .eq("visibility", "published")
      .gt("starts_at", new Date().toISOString())
      .not("listing_kind", "in", '("special","trial")');
    eventRows = (data ?? []) as { slug: string; updated_at: string; starts_at: string }[];
  }

  const { data: latest } = supabase ? await supabase.from("events").select("updated_at").eq("visibility", "published").order("updated_at", { ascending: false }).limit(1) : { data: [] };
  const liveModified = latestContentDate(latest?.[0]?.updated_at);
  for (const locale of routing.locales) {
    for (const p of STATIC_PATHS) {
      const path = p === "" ? "" : p;
      out.push({
        url: `${base}/${locale}${path}`,
        lastModified: path === "" || path === "/events" || path === "/events/arhiv" ? liveModified : new Date(CONTENT_UPDATED_AT),
        changeFrequency: p === "" ? "daily" : "monthly",
        priority: p === "" ? 1 : 0.6,
      });
    }
    for (const courseSlug of INDEXABLE_TRIAL_HUB_COURSE_SLUGS) {
      out.push({
        url: `${base}/${locale}/${TRIAL_HUB_SEGMENT}/${courseSlug}`,
        lastModified: liveModified,
        changeFrequency: "daily",
        priority: 0.85,
      });
    }
    const factsPath = ticketsFactsPathForLocale(locale);
    out.push({
      url: `${base}/${locale}${factsPath}`,
      lastModified: new Date(CONTENT_UPDATED_AT),
      changeFrequency: "monthly",
      priority: 0.75,
    });
    for (const { slug } of allIntentSlugs().filter((x) => x.locale === locale && !ticketsIntentRedirect(locale, x.slug))) {
      out.push({
        url: `${base}/${locale}/${slug}`,
        lastModified: liveModified,
        changeFrequency: "weekly",
        priority: 0.65,
      });
    }
    for (const ev of eventRows) {
      const tier = eventSitemapTier(ev.starts_at);
      out.push({
        url: `${base}/${locale}/events/${ev.slug}`,
        lastModified: latestContentDate(ev.updated_at),
        changeFrequency: tier.changeFrequency,
        priority: tier.priority,
      });
    }
  }

  return out;
}
