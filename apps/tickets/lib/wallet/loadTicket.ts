import type { SupabaseClient } from "@supabase/supabase-js";
import type { AppLocale } from "@/i18n/routing";
import { seatLabel } from "@/lib/seating/i18n";
import type { WalletTicket } from "./types";

export async function loadWalletTicket(
  supabase: SupabaseClient,
  ticketId: string,
  locale: AppLocale,
): Promise<WalletTicket | null> {
  const { data: ticket, error } = await supabase
    .from("tickets")
    .select("id,order_id,event_id,ticket_number,seat_id,used_at")
    .eq("id", ticketId)
    .maybeSingle();
  if (error) throw new Error("Wallet ticket lookup failed");
  if (!ticket || ticket.used_at) return null;

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select("status,event_id")
    .eq("id", ticket.order_id)
    .maybeSingle();
  if (orderError) throw new Error("Wallet order lookup failed");
  if (!order || order.status !== "paid" || order.event_id !== ticket.event_id) return null;

  const { data: event, error: eventError } = await supabase
    .from("events")
    .select("id,title,venue,starts_at")
    .eq("id", ticket.event_id)
    .maybeSingle();
  if (eventError) throw new Error("Wallet event lookup failed");
  if (!event) return null;
  return {
    id: ticket.id,
    ticketNumber: ticket.ticket_number,
    eventId: event.id,
    eventTitle: event.title,
    venue: event.venue,
    startsAt: event.starts_at,
    seatLabel: seatLabel(ticket.seat_id, locale) ?? "",
    locale,
    usedAt: ticket.used_at,
  };
}
