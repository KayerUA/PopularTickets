import type { SupabaseClient } from "@supabase/supabase-js";
import { getPoetSupabase } from "@/lib/supabasePoet";
import type { AppLocale } from "@/i18n/routing";
import { resolveEventCopy } from "@/lib/contentI18n";
import type { PoetIntentHubExpansion } from "@/lib/poetIntentHubTypes";

export type PoetIntentTicketEvent = {
  slug: string;
  title: string;
  startsAt: string;
  venue: string;
  href: string;
};

function improvMatch(text: string): boolean {
  const t = text.toLowerCase();
  return t.includes("impro") || t.includes("импров") || t.includes("імпров");
}

function playbackMatch(text: string): boolean {
  const t = text.toLowerCase();
  return t.includes("playback") || t.includes("play-back") || t.includes("плей");
}

export async function fetchPoetIntentTicketEvents(
  locale: AppLocale,
  cluster: PoetIntentHubExpansion["ticketsCluster"],
  ticketsBase: string,
  limit = 4,
): Promise<PoetIntentTicketEvent[]> {
  const supabase = getPoetSupabase();
  if (!supabase || !ticketsBase) return [];

  const listingKind = cluster === "trial" ? "trial" : "performance";
  const { data, error } = await supabase
    .from("events")
    .select("slug,title,description,title_pl,description_pl,title_uk,description_uk,venue,starts_at,listing_kind")
    .eq("visibility", "published")
    .eq("listing_kind", listingKind)
    .gte("starts_at", new Date().toISOString())
    .order("starts_at", { ascending: true })
    .limit(20);

  if (error || !data?.length) return [];

  const filtered = data.filter((row) => {
    const title = String(row.title ?? "");
    const desc = String(row.description ?? "");
    const blob = `${title} ${desc}`;
    if (cluster === "improv") return improvMatch(blob);
    if (cluster === "playback") return playbackMatch(blob);
    if (cluster === "trial") return true;
    return !playbackMatch(blob) || improvMatch(blob) || cluster === "theatre";
  });

  const rows = (cluster === "theatre" ? data : filtered.length ? filtered : data).slice(0, limit);

  return rows.flatMap((row) => {
    const copy = resolveEventCopy(
      {
        title: row.title as string,
        description: row.description as string | undefined,
        title_pl: row.title_pl as string | null,
        description_pl: row.description_pl as string | null,
        title_uk: row.title_uk as string | null,
        description_uk: row.description_uk as string | null,
      },
      locale,
    );
    if (!copy) return [];
    const slug = row.slug as string;
    return [
      {
        slug,
        title: copy.title,
        startsAt: row.starts_at as string,
        venue: row.venue as string,
        href: `${ticketsBase.replace(/\/+$/, "")}/${locale}/events/${encodeURIComponent(slug)}`,
      },
    ];
  });
}

/** Тестовый хелпер с переданным клиентом (заглушка для unit-тестов). */
export async function fetchPoetIntentTicketEventsWithClient(
  _supabase: SupabaseClient,
  _locale: AppLocale,
  _cluster: PoetIntentHubExpansion["ticketsCluster"],
  _ticketsBase: string,
  _limit = 4,
): Promise<PoetIntentTicketEvent[]> {
  return [];
}
