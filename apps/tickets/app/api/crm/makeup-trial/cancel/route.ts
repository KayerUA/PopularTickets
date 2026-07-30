import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireServiceSupabase } from "@/lib/supabase/admin";
import { authorizeCrmRequest } from "@/lib/crmAuth";
import { clientIp, rateLimit } from "@/lib/security";

const CancelSchema = z.object({
  crm_makeup_credit_id: z.string().uuid(),
  ticket_id: z.string().uuid().optional(),
});

/** Cancel complimentary makeup trial seat and free capacity. */
export async function POST(request: NextRequest) {
  if (!authorizeCrmRequest(request)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  if (!(await rateLimit(`crm-makeup-trial-cancel:${clientIp(request.headers)}`, 30, 60_000))) {
    return NextResponse.json({ ok: false, error: "rate limited" }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid json" }, { status: 400 });
  }
  const parsed = CancelSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "validation failed" }, { status: 400 });
  }

  const supabase = requireServiceSupabase();
  const sessionId = `crm-makeup-${parsed.data.crm_makeup_credit_id}`;

  const { data: order } = await supabase
    .from("orders")
    .select("id, event_id, status")
    .eq("p24_session_id", sessionId)
    .maybeSingle();

  if (!order) {
    return NextResponse.json({ ok: true, skipped: true, reason: "order_not_found" });
  }

  const { data: tickets } = await supabase
    .from("tickets")
    .select("id, used_at")
    .eq("order_id", order.id);

  if ((tickets ?? []).some((t) => t.used_at)) {
    return NextResponse.json({ ok: false, error: "already_used" }, { status: 409 });
  }

  if (tickets?.length) {
    await supabase.from("tickets").delete().eq("order_id", order.id);
  }
  await supabase.from("orders").update({ status: "cancelled" }).eq("id", order.id);

  const { data: event } = await supabase
    .from("events")
    .select("total_tickets")
    .eq("id", order.event_id)
    .maybeSingle();
  const { count } = await supabase
    .from("tickets")
    .select("*", { count: "exact", head: true })
    .eq("event_id", order.event_id);

  return NextResponse.json({
    ok: true,
    cancelled: true,
    order_id: order.id,
    event_id: order.event_id,
    remaining: Math.max(0, Number(event?.total_tickets ?? 0) - (count ?? 0)),
  });
}
