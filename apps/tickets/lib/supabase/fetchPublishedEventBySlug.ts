import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";
import { fetchOptionalMapsUrl } from "@/lib/supabase/fetchOptionalMapsUrl";
import { clampEventImageFocal } from "@/lib/eventCoverFocal";
import { normalizeEventLanguage, type EventLanguage } from "@/lib/eventLanguage";
import { effectiveEventPriceGrosze } from "@/lib/eventPrice";

/** Без maps_url — иначе при «schema cache» без колонки падает весь запрос. */
const EVENT_SELECT_PUBLIC =
  "id,slug,title,description,title_pl,description_pl,title_uk,description_uk,image_url,image_focal_x,image_focal_y,venue,starts_at,price_grosze,day_of_event_price_grosze,total_tickets,listing_kind,event_language,visibility" as const;

export type PublishedEventRow = {
  id: string;
  slug: string;
  title: string;
  description: string;
  title_pl: string | null;
  description_pl: string | null;
  title_uk: string | null;
  description_uk: string | null;
  image_url: string | null;
  image_focal_x: number;
  image_focal_y: number;
  maps_url: string | null;
  venue: string;
  starts_at: string;
  price_grosze: number;
  regular_price_grosze: number;
  day_of_event_price_grosze: number | null;
  total_tickets: number;
  /** `performance` — спектакль/шоу; `trial` — пробное / вводное занятие. */
  listing_kind: string | null;
  event_language: EventLanguage;
  /** `published` — в афіші; `unlisted` — лише за прямим посиланням; `inactive` — не повинен потрапляти сюди. */
  visibility: string;
};

/**
 * Публичное событие по slug. maps_url подгружается отдельно — при ошибке PostgREST (нет колонки в кэше) остаётся null.
 */
export async function fetchPublishedEventBySlug(
  supabase: SupabaseClient,
  slug: string
): Promise<{ data: PublishedEventRow | null; error: PostgrestError | null }> {
  let main = await supabase
    .from("events")
    .select(EVENT_SELECT_PUBLIC)
    .eq("slug", slug)
    .in("visibility", ["published", "unlisted"])
    .maybeSingle();

  if (main.error?.code === "42703") {
    main = await supabase
      .from("events")
      .select(
        "id,slug,title,description,title_pl,description_pl,title_uk,description_uk,image_url,image_focal_x,image_focal_y,venue,starts_at,price_grosze,day_of_event_price_grosze,total_tickets,listing_kind,visibility"
      )
      .eq("slug", slug)
      .in("visibility", ["published", "unlisted"])
      .maybeSingle();
  }

  if (main.error) {
    return { data: null, error: main.error };
  }
  if (!main.data) {
    return { data: null, error: null };
  }

  const row = main.data as Omit<PublishedEventRow, "maps_url" | "description"> & {
    description?: unknown;
    title_pl?: unknown;
    description_pl?: unknown;
    title_uk?: unknown;
    description_uk?: unknown;
    event_language?: unknown;
  };
  const mapsUrl = await fetchOptionalMapsUrl(supabase, row.id);
  const description = typeof row.description === "string" ? row.description : "";

  const listing_kind =
    typeof (row as { listing_kind?: unknown }).listing_kind === "string"
      ? ((row as { listing_kind: string }).listing_kind as string)
      : null;
  const visibility =
    typeof (row as { visibility?: unknown }).visibility === "string"
      ? String((row as { visibility: string }).visibility)
      : "inactive";
  const image_focal_x = clampEventImageFocal((row as { image_focal_x?: unknown }).image_focal_x);
  const image_focal_y = clampEventImageFocal((row as { image_focal_y?: unknown }).image_focal_y);
  const event_language = normalizeEventLanguage(row.event_language);

  const title_pl = typeof (row as { title_pl?: unknown }).title_pl === "string" ? (row as { title_pl: string }).title_pl : null;
  const description_pl =
    typeof (row as { description_pl?: unknown }).description_pl === "string"
      ? (row as { description_pl: string }).description_pl
      : null;
  const title_uk = typeof (row as { title_uk?: unknown }).title_uk === "string" ? (row as { title_uk: string }).title_uk : null;
  const description_uk =
    typeof (row as { description_uk?: unknown }).description_uk === "string"
      ? (row as { description_uk: string }).description_uk
      : null;

  return {
    data: {
      ...row,
      regular_price_grosze: row.price_grosze,
      price_grosze: effectiveEventPriceGrosze(row),
      description,
      title_pl,
      description_pl,
      title_uk,
      description_uk,
      maps_url: mapsUrl,
      listing_kind,
      event_language,
      visibility,
      image_focal_x,
      image_focal_y,
    },
    error: null,
  };
}
