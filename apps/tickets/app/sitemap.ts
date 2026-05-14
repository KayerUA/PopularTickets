import type { MetadataRoute } from "next";
import { getServiceSupabase } from "@/lib/supabase/admin";
import { getPublicAppUrl } from "@/lib/publicAppUrl";
import { routing } from "@/i18n/routing";

const STATIC_PATHS = ["", "/firma", "/regulamin", "/zwroty", "/polityka-prywatnosci"] as const;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getPublicAppUrl()?.replace(/\/$/, "");
  if (!base) return [];

  const out: MetadataRoute.Sitemap = [];
  const supabase = getServiceSupabase();
  let eventRows: { slug: string; updated_at: string }[] = [];
  if (supabase) {
    const { data } = await supabase.from("events").select("slug,updated_at").eq("visibility", "published");
    eventRows = (data ?? []) as { slug: string; updated_at: string }[];
  }

  for (const locale of routing.locales) {
    for (const p of STATIC_PATHS) {
      const path = p === "" ? "" : p;
      out.push({
        url: `${base}/${locale}${path}`,
        lastModified: new Date(),
        changeFrequency: p === "" ? "daily" : "monthly",
        priority: p === "" ? 1 : 0.6,
      });
    }
    for (const ev of eventRows) {
      out.push({
        url: `${base}/${locale}/events/${ev.slug}`,
        lastModified: ev.updated_at ? new Date(ev.updated_at) : new Date(),
        changeFrequency: "weekly",
        priority: 0.85,
      });
    }
  }

  return out;
}
