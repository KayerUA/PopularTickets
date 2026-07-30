import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireServiceSupabase } from "@/lib/supabase/admin";
import { authorizeCrmRequest } from "@/lib/crmAuth";
import { clientIp, rateLimit } from "@/lib/security";

const BookSchema = z.object({
  crm_makeup_credit_id: z.string().uuid(),
  event_id: z.string().uuid(),
  buyer_email: z.string().trim().email().max(254),
  buyer_name: z.string().trim().min(1).max(160).optional(),
});

function ticketNumber() {
  return `MK-${randomUUID().replace(/-/g, "").slice(0, 12).toUpperCase()}`;
}

/**
 * Free CRM makeup seat on a published trial: creates paid complimentary order + ticket
 * so remaining capacity drops like a normal sale.
 */
export async function POST(request: NextRequest) {
  if (!authorizeCrmRequest(request)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  if (!(await rateLimit(`crm-makeup-trial:${clientIp(request.headers)}`, 30, 60_000))) {
    return NextResponse.json({ ok: false, error: "rate limited" }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid json" }, { status: 400 });
  }
  const parsed = BookSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "validation failed", details: parsed.error.flatten() }, { status: 400 });
  }
  const input = parsed.data;
  const supabase = requireServiceSupabase();

  // Idempotent: same makeup already booked
  const { data: existingOrders } = await supabase
    .from("orders")
    .select("id, event_id, status, p24_session_id")
    .eq("p24_session_id", `crm-makeup-${input.crm_makeup_credit_id}`)
    .maybeSingle();

  if (existingOrders?.status === "paid") {
    const { data: existingTicket } = await supabase
      .from("tickets")
      .select("id, event_id")
      .eq("order_id", existingOrders.id)
      .maybeSingle();
    const { count } = await supabase
      .from("tickets")
      .select("*", { count: "exact", head: true })
      .eq("event_id", existingOrders.event_id);
    const { data: event } = await supabase
      .from("events")
      .select("id, starts_at, total_tickets, title, slug")
      .eq("id", existingOrders.event_id)
      .maybeSingle();
    return NextResponse.json({
      ok: true,
      already: true,
      ticket_id: existingTicket?.id,
      order_id: existingOrders.id,
      event_id: existingOrders.event_id,
      starts_at: event?.starts_at,
      title: event?.title,
      slug: event?.slug,
      remaining: Math.max(0, Number(event?.total_tickets ?? 0) - (count ?? 0)),
    });
  }

  const { data: event, error: eventErr } = await supabase
    .from("events")
    .select("id, slug, title, starts_at, total_tickets, price_grosze, listing_kind, visibility")
    .eq("id", input.event_id)
    .maybeSingle();
  if (eventErr || !event) {
    return NextResponse.json({ ok: false, error: "event_not_found" }, { status: 404 });
  }
  if (event.listing_kind !== "trial" || event.visibility !== "published") {
    return NextResponse.json({ ok: false, error: "not_a_published_trial" }, { status: 400 });
  }
  if (new Date(event.starts_at).getTime() < Date.now()) {
    return NextResponse.json({ ok: false, error: "event_started" }, { status: 400 });
  }

  const { count: sold } = await supabase
    .from("tickets")
    .select("*", { count: "exact", head: true })
    .eq("event_id", event.id);
  if ((sold ?? 0) >= Number(event.total_tickets)) {
    return NextResponse.json({ ok: false, error: "no_capacity" }, { status: 409 });
  }

  const orderId = randomUUID();
  const sessionId = `crm-makeup-${input.crm_makeup_credit_id}`;
  const { error: orderErr } = await supabase.from("orders").insert({
    id: orderId,
    event_id: event.id,
    buyer_name: input.buyer_name || "CRM makeup",
    email: input.buyer_email,
    quantity: 1,
    // Complimentary seat still carries catalog price (check amount_grosze > 0).
    amount_grosze: event.price_grosze,
    currency: "PLN",
    status: "paid",
    locale: "ru",
    p24_session_id: sessionId,
  });
  if (orderErr) {
    console.error("[crm makeup-trial] order", orderErr);
    return NextResponse.json({ ok: false, error: "order_failed", message: orderErr.message }, { status: 500 });
  }

  const { data: ticket, error: ticketErr } = await supabase
    .from("tickets")
    .insert({
      order_id: orderId,
      event_id: event.id,
      ticket_number: ticketNumber(),
    })
    .select("id")
    .single();
  if (ticketErr || !ticket) {
    console.error("[crm makeup-trial] ticket", ticketErr);
    await supabase.from("orders").update({ status: "failed" }).eq("id", orderId);
    return NextResponse.json({ ok: false, error: "ticket_failed" }, { status: 500 });
  }

  const remaining = Math.max(0, Number(event.total_tickets) - (sold ?? 0) - 1);
  return NextResponse.json({
    ok: true,
    ticket_id: ticket.id,
    order_id: orderId,
    event_id: event.id,
    starts_at: event.starts_at,
    title: event.title,
    slug: event.slug,
    remaining,
    crm_makeup_credit_id: input.crm_makeup_credit_id,
  });
}
