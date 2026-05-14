import type { SupabaseClient } from "@supabase/supabase-js";

export type PaidOrderReceipt = {
  email: string;
  eventTitle: string;
  venue: string;
  startsAt: string;
  tickets: { id: string; ticket_number: string }[];
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
    .select("id,status,email,event_id")
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
    .select("title,venue,starts_at")
    .eq("id", order.event_id as string)
    .maybeSingle();

  if (eErr || !ev) {
    return { kind: "not_found" };
  }

  const { data: tickets, error: tErr } = await supabase
    .from("tickets")
    .select("id,ticket_number")
    .eq("order_id", orderId)
    .order("ticket_number", { ascending: true });

  if (tErr) {
    return { kind: "not_found" };
  }

  const list = (tickets ?? []) as { id: string; ticket_number: string }[];

  return {
    kind: "paid",
    receipt: {
      email: order.email as string,
      eventTitle: ev.title as string,
      venue: ev.venue as string,
      startsAt: ev.starts_at as string,
      tickets: list,
    },
  };
}
