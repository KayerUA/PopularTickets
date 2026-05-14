import { z } from "zod";
import { requireServiceSupabase } from "@/lib/supabase/admin";
import {
  getMerchantId,
  getPosId,
  p24Verify,
  signNotification,
  signVerify,
} from "@/lib/p24";
import { randomTicketNumber } from "@/lib/tickets";
import { sendTicketsEmail } from "@/lib/email/sendTickets";
import { formatEventDateTime } from "@/lib/format";
import type { AppLocale } from "@/i18n/routing";

const NotifySchema = z.object({
  merchantId: z.number(),
  posId: z.number(),
  sessionId: z.string(),
  amount: z.number(),
  originAmount: z.number(),
  currency: z.string(),
  orderId: z.number(),
  methodId: z.number(),
  statement: z.string(),
  sign: z.string(),
});

function orderLocale(raw: string | null | undefined): AppLocale {
  return raw === "uk" || raw === "ru" || raw === "pl" ? raw : "pl";
}

async function ensureTicketsAndEmail(params: {
  order: {
    id: string;
    event_id: string;
    quantity: number;
    email: string;
    locale: string;
  };
}): Promise<void> {
  const supabase = requireServiceSupabase();
  const { data: existing, error: exErr } = await supabase
    .from("tickets")
    .select("id,ticket_number")
    .eq("order_id", params.order.id);

  if (exErr) throw new Error("tickets select");

  const have = existing?.length ?? 0;
  if (have >= params.order.quantity) {
    return;
  }

  const need = params.order.quantity - have;
  const ticketsToInsert: {
    id: string;
    order_id: string;
    event_id: string;
    ticket_number: string;
  }[] = [];

  for (let i = 0; i < need; i++) {
    let ticketNumber = randomTicketNumber();
    for (let attempt = 0; attempt < 8; attempt++) {
      const { data: clash } = await supabase
        .from("tickets")
        .select("id")
        .eq("ticket_number", ticketNumber)
        .maybeSingle();
      if (!clash) break;
      ticketNumber = randomTicketNumber();
    }
    ticketsToInsert.push({
      id: crypto.randomUUID(),
      order_id: params.order.id,
      event_id: params.order.event_id,
      ticket_number: ticketNumber,
    });
  }

  const { error: insErr } = await supabase.from("tickets").insert(ticketsToInsert);
  if (insErr) {
    console.error(insErr);
    throw new Error("ticket insert");
  }

  if (process.env.SKIP_ORDER_EMAIL === "true") {
    return;
  }

  const { data: event, error: eErr } = await supabase
    .from("events")
    .select("title,venue,starts_at")
    .eq("id", params.order.event_id)
    .single();

  if (eErr || !event) {
    console.error("event load for email", eErr);
    return;
  }

  const { data: allTickets, error: allErr } = await supabase
    .from("tickets")
    .select("id,ticket_number")
    .eq("order_id", params.order.id);

  if (allErr || !allTickets?.length) return;

  if (need > 0) {
    try {
      const loc = orderLocale(params.order.locale);
      await sendTicketsEmail({
        to: params.order.email,
        eventTitle: event.title,
        venue: event.venue,
        startsAt: formatEventDateTime(event.starts_at as string, loc),
        tickets: allTickets.map((t) => ({ id: t.id, ticketNumber: t.ticket_number })),
        locale: loc,
      });
    } catch (e) {
      console.error("email failed", e);
    }
  }
}

/**
 * MVP без Przelewy24: заказ уже в `pending`, сразу переводим в `paid`,
 * создаём билеты и шлём письмо (если Resend и не задан SKIP_ORDER_EMAIL).
 */
export async function bypassPaymentAndFulfillOrder(orderId: string): Promise<void> {
  const supabase = requireServiceSupabase();

  const { data: order, error: oErr } = await supabase
    .from("orders")
    .select("id,event_id,quantity,amount_grosze,currency,status,email,buyer_name,locale")
    .eq("id", orderId)
    .maybeSingle();

  if (oErr || !order) {
    throw new Error("order not found");
  }
  if (order.status !== "pending") {
    throw new Error("order not pending");
  }

  const { data: event, error: eErr } = await supabase
    .from("events")
    .select("id,title,venue,starts_at,total_tickets")
    .eq("id", order.event_id)
    .single();

  if (eErr || !event) {
    throw new Error("event missing");
  }

  const { count: sold, error: sErr } = await supabase
    .from("tickets")
    .select("id", { count: "exact", head: true })
    .eq("event_id", event.id);

  if (sErr) throw new Error("count error");

  const remaining = event.total_tickets - (sold ?? 0);
  if (remaining < order.quantity) {
    await supabase.from("orders").update({ status: "failed" }).eq("id", order.id);
    throw new Error("no capacity");
  }

  const { data: updated, error: uErr } = await supabase
    .from("orders")
    .update({ status: "paid" })
    .eq("id", order.id)
    .eq("status", "pending")
    .select("id")
    .maybeSingle();

  if (uErr) {
    throw new Error("update error");
  }

  if (!updated) {
    const { data: row } = await supabase.from("orders").select("status").eq("id", order.id).single();
    if (row?.status !== "paid") {
      throw new Error("race");
    }
  }

  await ensureTicketsAndEmail({
    order: {
      id: order.id,
      event_id: order.event_id,
      quantity: order.quantity,
      email: order.email,
      locale: (order as { locale?: string }).locale ?? "pl",
    },
  });
}

export async function handleP24Notification(
  body: unknown
): Promise<{ status: number; body: string }> {
  const parsed = NotifySchema.safeParse(body);
  if (!parsed.success) {
    return { status: 400, body: "invalid payload" };
  }
  const n = parsed.data;

  const expectedSign = signNotification({
    merchantId: n.merchantId,
    posId: n.posId,
    sessionId: n.sessionId,
    amount: n.amount,
    originAmount: n.originAmount,
    currency: n.currency,
    orderId: n.orderId,
    methodId: n.methodId,
    statement: n.statement,
  });

  if (expectedSign !== n.sign) {
    return { status: 401, body: "bad sign" };
  }

  const supabase = requireServiceSupabase();

  const { data: order, error: oErr } = await supabase
    .from("orders")
    .select("id,event_id,quantity,amount_grosze,currency,status,email,buyer_name,locale")
    .eq("p24_session_id", n.sessionId)
    .maybeSingle();

  if (oErr || !order) {
    return { status: 404, body: "order not found" };
  }

  if (order.amount_grosze !== n.amount || order.currency !== n.currency) {
    return { status: 409, body: "amount mismatch" };
  }

  const verifySign = signVerify({
    sessionId: n.sessionId,
    orderId: n.orderId,
    amount: n.amount,
    currency: n.currency,
  });

  try {
    await p24Verify({
      merchantId: getMerchantId(),
      posId: getPosId(),
      sessionId: n.sessionId,
      amount: n.amount,
      currency: n.currency,
      orderId: n.orderId,
      sign: verifySign,
    });
  } catch (e) {
    console.error("p24 verify", e);
    return { status: 502, body: "verify failed" };
  }

  if (order.status !== "pending" && order.status !== "paid") {
    return { status: 200, body: "ignored" };
  }

  const { data: event, error: eErr } = await supabase
    .from("events")
    .select("id,title,venue,starts_at,total_tickets")
    .eq("id", order.event_id)
    .single();

  if (eErr || !event) {
    return { status: 500, body: "event missing" };
  }

  if (order.status === "pending") {
    const { count: sold, error: sErr } = await supabase
      .from("tickets")
      .select("id", { count: "exact", head: true })
      .eq("event_id", event.id);

    if (sErr) return { status: 500, body: "count error" };

    const remaining = event.total_tickets - (sold ?? 0);
    if (remaining < order.quantity) {
      await supabase
        .from("orders")
        .update({ status: "failed", p24_order_id: n.orderId })
        .eq("id", order.id);
      return { status: 200, body: "no capacity" };
    }

    const { data: updated, error: uErr } = await supabase
      .from("orders")
      .update({ status: "paid", p24_order_id: n.orderId })
      .eq("id", order.id)
      .eq("status", "pending")
      .select("id")
      .maybeSingle();

    if (uErr) {
      return { status: 500, body: "update error" };
    }

    if (!updated) {
      const { data: row } = await supabase
        .from("orders")
        .select("status")
        .eq("id", order.id)
        .single();
      if (row?.status !== "paid") {
        return { status: 409, body: "race" };
      }
    }
  }

  try {
    await ensureTicketsAndEmail({
      order: {
        id: order.id,
        event_id: order.event_id,
        quantity: order.quantity,
        email: order.email,
        locale: (order as { locale?: string }).locale ?? "pl",
      },
    });
  } catch (e) {
    console.error("fulfillment", e);
    return { status: 500, body: "fulfillment failed" };
  }

  return { status: 200, body: "ok" };
}
