import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";
import { fetchOptionalMapsUrl } from "@/lib/supabase/fetchOptionalMapsUrl";

/** Без maps_url — иначе при «schema cache» без колонки падает весь запрос. */
const EVENT_SELECT_PUBLIC =
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
 * Публичное событие по slug. maps_url подгружается отдельно — при ошибке PostgREST (нет колонки в кэше) остаётся null.
 */
export async function fetchPublishedEventBySlug(
  supabase: SupabaseClient,
  slug: string
): Promise<{ data: PublishedEventRow | null; error: PostgrestError | null }> {
  const main = await supabase
    .from("events")
    .select(EVENT_SELECT_PUBLIC)
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();

  if (main.error) {
    return { data: null, error: main.error };
  }
  if (!main.data) {
    return { data: null, error: null };
  }

  const row = main.data as Omit<PublishedEventRow, "maps_url" | "description"> & { description?: unknown };
  const mapsUrl = await fetchOptionalMapsUrl(supabase, row.id);
  const description = typeof row.description === "string" ? row.description : "";

  return { data: { ...row, description, maps_url: mapsUrl }, error: null };
}
