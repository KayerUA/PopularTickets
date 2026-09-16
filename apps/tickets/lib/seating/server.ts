import "server-only";
import { requireServiceSupabase } from "@/lib/supabase/admin";
import { seatingToken } from "./tokens";
export { seatingOrderId } from "./tokens";
import type { AppLocale } from "@/i18n/routing";
import { getPublicAppUrl } from "@/lib/publicAppUrl";
import type { SeatMapState } from "./types";

export async function seatingLink(orderId: string, locale: AppLocale) {
  const base = getPublicAppUrl();
  if (!base) throw new Error("NEXT_PUBLIC_APP_URL не задан");
  return `${base}/${locale}/seats/${await seatingToken(orderId)}`;
}
export async function loadSeatMap(eventId: string): Promise<SeatMapState | null> {
  const db = requireServiceSupabase();
  const { data: config, error } = await db.from("event_seating").select("mode").eq("event_id", eventId).maybeSingle();
  if (error) throw new Error("seating_unavailable");
  if (!config) return null;
  const [{ data: seats, error: se }, { data: tickets, error: te }] = await Promise.all([
    db.from("event_seats").select("seat_id,row_label,seat_number,row_index,column_index,blocked,hold_until").eq("event_id", eventId).order("row_index").order("column_index"),
    db.from("tickets").select("seat_id").eq("event_id", eventId),
  ]);
  if (se || te || !seats?.length) throw new Error("seating_unavailable");
  const occupied = new Set((tickets ?? []).map(t => t.seat_id));
  return { mode: config.mode, seats: seats.map(s => ({
    id: s.seat_id, row: s.row_label, number: s.seat_number, column: s.column_index,
    status: s.blocked ? "blocked" : occupied.has(s.seat_id) || (s.hold_until && Date.parse(s.hold_until) > Date.now()) ? "occupied" : "free",
  })) };
}
