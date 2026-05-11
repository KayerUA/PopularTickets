import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchMapsUrlRpc } from "@/lib/supabase/mapsUrlRpc";

/** maps_url через RPC (см. supabase/add-maps-url.sql). */
export async function fetchOptionalMapsUrl(
  supabase: SupabaseClient,
  eventId: string
): Promise<string | null> {
  return fetchMapsUrlRpc(supabase, eventId);
}
