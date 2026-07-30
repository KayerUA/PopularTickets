import { NextRequest, NextResponse } from "next/server";
import { requireServiceSupabase } from "@/lib/supabase/admin";
import { authorizeCrmRequest } from "@/lib/crmAuth";
import { clientIp, rateLimit } from "@/lib/security";

export async function GET(request: NextRequest) {
  if (!authorizeCrmRequest(request)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  if (!(await rateLimit(`crm-trials:${clientIp(request.headers)}`, 60, 60_000))) {
    return NextResponse.json({ ok: false, error: "rate limited" }, { status: 429 });
  }

  const supabase = requireServiceSupabase();
  const nowIso = new Date().toISOString();

  const { data: events, error } = await supabase
    .from("events")
    .select("id, slug, title, starts_at, venue, total_tickets, price_grosze, listing_kind, visibility")
    .eq("listing_kind", "trial")
    .eq("visibility", "published")
    .gte("starts_at", nowIso)
    .order("starts_at", { ascending: true })
    .limit(80);

  if (error) {
    console.error("[crm trials] list", error);
    return NextResponse.json({ ok: false, error: "lookup failed" }, { status: 500 });
  }

  const ids = (events ?? []).map((e) => e.id);
  const soldByEvent = new Map<string, number>();
  if (ids.length) {
    const { data: tickets, error: tErr } = await supabase
      .from("tickets")
      .select("event_id")
      .in("event_id", ids);
    if (tErr) {
      console.error("[crm trials] tickets count", tErr);
      return NextResponse.json({ ok: false, error: "capacity lookup failed" }, { status: 500 });
    }
    for (const row of tickets ?? []) {
      soldByEvent.set(row.event_id, (soldByEvent.get(row.event_id) ?? 0) + 1);
    }
  }

  const trials = (events ?? []).map((event) => {
    const sold = soldByEvent.get(event.id) ?? 0;
    const remaining = Math.max(0, Number(event.total_tickets) - sold);
    return {
      id: event.id,
      slug: event.slug,
      title: event.title,
      starts_at: event.starts_at,
      venue: event.venue,
      total_tickets: event.total_tickets,
      remaining,
      price_grosze: event.price_grosze,
    };
  }).filter((t) => t.remaining > 0);

  return NextResponse.json({ ok: true, trials });
}
