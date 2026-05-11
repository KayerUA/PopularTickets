import type { SupabaseClient } from "@supabase/supabase-js";

/** Чтение maps_url через SQL (RPC), без REST select по колонке — обход schema cache PostgREST. */
export async function fetchMapsUrlRpc(
  supabase: SupabaseClient,
  eventId: string
): Promise<string | null> {
  const { data, error } = await supabase.rpc("pt_event_maps_url", { p_event_id: eventId });
  if (error) {
    console.warn("[PopularTickets][pt_event_maps_url]", error.message);
    return null;
  }
  if (data == null) return null;
  if (typeof data !== "string") return null;
  const t = data.trim();
  return t || null;
}

/** Запись maps_url через SQL (RPC). Выполнять после insert/update остальных полей без maps_url. */
export async function setMapsUrlRpc(
  supabase: SupabaseClient,
  eventId: string,
  mapsUrl: string | null | undefined
): Promise<{ error: string | null }> {
  const raw = typeof mapsUrl === "string" ? mapsUrl : "";
  const { error } = await supabase.rpc("pt_event_set_maps_url", {
    p_event_id: eventId,
    p_maps_url: raw,
  });
  if (error) {
    console.warn("[PopularTickets][pt_event_set_maps_url]", error.message);
    return { error: error.message };
  }
  return { error: null };
}
