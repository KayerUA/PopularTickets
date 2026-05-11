import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Читает только maps_url. Если колонки нет в БД или PostgREST ещё не обновил schema cache
 * после ALTER — запрос вернёт ошибку; тогда возвращаем null (страница не ломается).
 */
export async function fetchOptionalMapsUrl(
  supabase: SupabaseClient,
  eventId: string
): Promise<string | null> {
  const { data, error } = await supabase.from("events").select("maps_url").eq("id", eventId).maybeSingle();
  if (error || !data) return null;
  const raw = (data as { maps_url?: string | null }).maps_url;
  return typeof raw === "string" && raw.trim() ? raw.trim() : null;
}
