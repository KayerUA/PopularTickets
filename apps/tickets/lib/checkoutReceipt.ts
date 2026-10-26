import type { SupabaseClient } from "@supabase/supabase-js";

export type PaidOrderReceipt = {
  email: string;
  eventTitle: string;
  venue: string;
  startsAt: string;
  listingKind: string | null;
  seatingAttention: boolean;
  tickets: { id: string; ticket_number: string; seat_id: string | null }[];
  orderId: string;
  eventSlug: string;
  amountGrosze: number;
  quantity: number;
};

export type OrderReceiptState =
  | { kind: "paid"; receipt: PaidOrderReceipt }
  | { kind: "pending" }
  | { kind: "unpaid"; status: string }
  | { kind: "not_found" };

/**
 * Данные заказа для страницы «спасибо» (только по id из URL после оплаты).
 */
export async function loadOrderReceiptState(
  supabase: SupabaseClient,
  orderId: string
): Promise<OrderReceiptState> {
  const { data: order, error: oErr } = await supabase
    .from("orders")
    .select("id,status,email,event_id,seating_attention,amount_grosze,quantity")
    .eq("id", orderId)
    .maybeSingle();

  if (oErr || !order) {
    return { kind: "not_found" };
  }

  const status = order.status as string;
  if (status === "pending") {
    return { kind: "pending" };
  }
  if (status !== "paid") {
    return { kind: "unpaid", status };
  }

  const { data: ev, error: eErr } = await supabase
    .from("events")
    .select("slug,title,venue,starts_at,listing_kind")
    .eq("id", order.event_id as string)
    .maybeSingle();

  if (eErr || !ev) {
    return { kind: "not_found" };
  }

  const { data: tickets, error: tErr } = await supabase
    .from("tickets")
    .select("id,ticket_number,seat_id")
    .eq("order_id", orderId)
    .order("ticket_number", { ascending: true });

  if (tErr) {
    return { kind: "not_found" };
  }

  const list = (tickets ?? []) as { id: string; ticket_number: string; seat_id: string | null }[];

  return {
    kind: "paid",
    receipt: {
      email: order.email as string,
      seatingAttention: Boolean(order.seating_attention),
      eventTitle: ev.title as string,
      venue: ev.venue as string,
      startsAt: ev.starts_at as string,
      listingKind: typeof ev.listing_kind === "string" ? ev.listing_kind : null,
      tickets: list,
      orderId,
      eventSlug: String(ev.slug ?? ""),
      amountGrosze: Number(order.amount_grosze ?? 0),
      quantity: Number(order.quantity ?? list.length) || list.length,
    },
  };
}
