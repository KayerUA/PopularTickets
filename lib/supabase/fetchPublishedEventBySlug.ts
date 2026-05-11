import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";

const EVENT_SELECT_WITH_MAPS =
  "id,slug,title,description,image_url,maps_url,venue,starts_at,price_grosze,total_tickets" as const;

const EVENT_SELECT_LEGACY =
  "id,slug,title,description,image_url,venue,starts_at,price_grosze,total_tickets" as const;

export type PublishedEventRow = {
  id: string;
  slug: string;
  title: string;
  description: string;
  image_url: string | null;
  maps_url: string | null;
  venue: string;
  starts_at: string;
  price_grosze: number;
  total_tickets: number;
};

/**
 * Публичная карточка события. Если в БД ещё нет колонки `maps_url` (старый schema),
 * повторяем запрос без неё — иначе PostgREST падает, а metadata с select("title") выглядит «живой».
 */
export async function fetchPublishedEventBySlug(
  supabase: SupabaseClient,
  slug: string
): Promise<{ data: PublishedEventRow | null; error: PostgrestError | null }> {
  const first = await supabase
    .from("events")
    .select(EVENT_SELECT_WITH_MAPS)
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();

  if (!first.error) {
    return { data: (first.data as PublishedEventRow | null) ?? null, error: null };
  }

  const second = await supabase
    .from("events")
    .select(EVENT_SELECT_LEGACY)
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();

  if (!second.error && second.data) {
    const row = second.data as Omit<PublishedEventRow, "maps_url">;
    return { data: { ...row, maps_url: null }, error: null };
  }

  return { data: null, error: first.error };
}
