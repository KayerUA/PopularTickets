import { getPoetSupabase } from "@/lib/supabasePoet";
import type { AppLocale } from "@/i18n/routing";
import { resolveEventCopy } from "@/lib/contentI18n";
import { normalizeEventLanguage } from "@/lib/eventLanguage";
import { resolveEventMarketingStatus } from "@/lib/eventMarketingStatus";
import type { PoetTrialDisplay } from "@/lib/poetTrials";

const SHOW_SELECT_WITH_LANG =
  "id, slug, title, description, title_pl, description_pl, title_uk, description_uk, starts_at, venue, price_grosze, image_url, image_focal_x, image_focal_y, total_tickets, event_language";

const SHOW_SELECT_CORE =
  "id, slug, title, description, title_pl, description_pl, title_uk, description_uk, starts_at, venue, price_grosze, image_url, image_focal_x, image_focal_y, total_tickets";

function readFocal(raw: unknown): number | null {
  return typeof raw === "number" && !Number.isNaN(raw) ? raw : null;
}

function mapShowRow(r: Record<string, unknown>, locale: AppLocale, soldCount: number): PoetTrialDisplay | null {
  const copy = resolveEventCopy(
    {
      title: r.title as string,
      description: r.description as string | undefined,
      title_pl: r.title_pl as string | null | undefined,
      description_pl: r.description_pl as string | null | undefined,
      title_uk: r.title_uk as string | null | undefined,
      description_uk: r.description_uk as string | null | undefined,
    },
    locale,
  );
  if (!copy) return null;

  const startsAt = r.starts_at as string;
  const totalTickets = typeof r.total_tickets === "number" ? r.total_tickets : 0;
  const remaining = Math.max(0, totalTickets - soldCount);
  const venue = typeof r.venue === "string" ? r.venue.trim() : "";
  const priceGrosze = typeof r.price_grosze === "number" && r.price_grosze > 0 ? r.price_grosze : 0;

  return {
    id: `show:${r.id as string}`,
    title: copy.title,
    body: copy.description?.trim() ? copy.description.trim() : null,
    starts_at: startsAt,
    slug: r.slug as string,
    courseId: null,
    courseSlug: null,
    courseLine: null,
    venue,
    priceGrosze,
    imageUrl: typeof r.image_url === "string" && r.image_url.trim() ? r.image_url.trim() : null,
    imageFocalX: readFocal(r.image_focal_x),
    imageFocalY: readFocal(r.image_focal_y),
    eventLanguage: r.event_language != null ? normalizeEventLanguage(r.event_language) : "ru_uk",
    status: startsAt
      ? resolveEventMarketingStatus({
          startsAt,
          remaining,
          totalTickets,
        })
      : null,
    totalTickets,
    remainingTickets: remaining,
  };
}

/** Опубликованные спектакли и шоу для афиши popularpoet.pl (касса — PopularTickets). */
export async function fetchPublishedPerformances(locale: AppLocale = "ru"): Promise<PoetTrialDisplay[]> {
  const supabase = getPoetSupabase();
  if (!supabase) return [];

  const nowIso = new Date().toISOString();
  const withLang = await supabase
    .from("events")
    .select(SHOW_SELECT_WITH_LANG)
    .eq("visibility", "published")
    .eq("listing_kind", "performance")
    .gte("starts_at", nowIso)
    .order("starts_at", { ascending: true });

  let rows: Record<string, unknown>[] = (withLang.data ?? []) as Record<string, unknown>[];
  let error = withLang.error;

  if (error?.code === "42703") {
    const fallback = await supabase
      .from("events")
      .select(SHOW_SELECT_CORE)
      .eq("visibility", "published")
      .eq("listing_kind", "performance")
      .gte("starts_at", nowIso)
      .order("starts_at", { ascending: true });
    rows = (fallback.data ?? []) as Record<string, unknown>[];
    error = fallback.error;
  }

  if (error || !rows.length) return [];

  const ids = rows.map((row) => row.id as string);
  const soldById = new Map<string, number>();
  const { data: ticketRows } = await supabase.from("tickets").select("event_id").in("event_id", ids);
  for (const row of ticketRows ?? []) {
    const eid = row.event_id as string;
    soldById.set(eid, (soldById.get(eid) ?? 0) + 1);
  }

  return rows.flatMap((row) => {
    const mapped = mapShowRow(row, locale, soldById.get(row.id as string) ?? 0);
    return mapped ? [mapped] : [];
  });
}
