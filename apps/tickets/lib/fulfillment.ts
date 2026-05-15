import { z } from "zod";
import { requireServiceSupabase } from "@/lib/supabase/admin";
import {
  getMerchantId,
  getPosId,
  p24Verify,
  signNotification,
  signVerify,
} from "@/lib/p24";
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

type FulfilledTicketRow = {
  id: string;
  ticket_number: string;
  created_now: boolean;
};

async function ensureTicketsAndEmail(params: {
  order: {
    id: string;
    event_id: string;
    quantity: number;
    email: string;
    locale: string;
  };
  p24OrderId?: number | null;
}): Promise<void> {
  const supabase = requireServiceSupabase();

  const { data: tickets, error: fulfillErr } = await supabase.rpc("pt_fulfill_paid_order", {
    p_order_id: params.order.id,
    p_p24_order_id: params.p24OrderId ?? null,
  });

  if (fulfillErr) {
    console.error("pt_fulfill_paid_order", fulfillErr);
    throw new Error(fulfillErr.message || "fulfillment failed");
  }

  const allTickets = (tickets ?? []) as FulfilledTicketRow[];
  if (!allTickets.length) {
    throw new Error("no_capacity");
  }
  const createdTickets = allTickets.some((ticket) => ticket.created_now);
  if (!createdTickets) {
    return;
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

  if (!allTickets.length) return;

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

async function recordPaymentCallback(params: {
  orderId: string | null;
  sessionId: string;
  providerOrderId: number | null;
  status: string;
  payload: unknown;
}): Promise<void> {
  const supabase = requireServiceSupabase();
  const { error } = await supabase.from("payment_callbacks").insert({
    provider: "p24",
    order_id: params.orderId,
    provider_order_id: params.providerOrderId === null ? null : String(params.providerOrderId),
    session_id: params.sessionId,
    status: params.status,
    payload: params.payload,
  });
  if (error) {
    console.warn("[payment_callbacks] audit insert skipped:", error.message);
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
    await recordPaymentCallback({
      orderId: null,
      sessionId: n.sessionId,
      providerOrderId: n.orderId,
      status: "order_not_found",
      payload: n,
    });
    return { status: 404, body: "order not found" };
  }

  await recordPaymentCallback({
    orderId: order.id,
    sessionId: n.sessionId,
    providerOrderId: n.orderId,
    status: "received",
    payload: n,
  });

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

  try {
    await ensureTicketsAndEmail({
      order: {
        id: order.id,
        event_id: order.event_id,
        quantity: order.quantity,
        email: order.email,
        locale: (order as { locale?: string }).locale ?? "pl",
      },
      p24OrderId: n.orderId,
    });
  } catch (e) {
    console.error("fulfillment", e);
    if (e instanceof Error && e.message.includes("no_capacity")) {
      return { status: 200, body: "no capacity" };
    }
    return { status: 500, body: "fulfillment failed" };
  }

  return { status: 200, body: "ok" };
}
