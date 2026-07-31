import { NextRequest, NextResponse } from "next/server";
import { requireServiceSupabase } from "@/lib/supabase/admin";
import { authorizeCrmRequest } from "@/lib/crmAuth";
import { clientIp, rateLimit } from "@/lib/security";

/**
 * GET /api/crm/events?month=YYYY-MM
 * All published Tickets listings (trial / performance / special) for CRM calendar.
 * Covers what appears on populartickets.pl and is marketed via popularpoet.pl.
 */
export async function GET(request: NextRequest) {
  if (!authorizeCrmRequest(request)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  if (!(await rateLimit(`crm-events:${clientIp(request.headers)}`, 60, 60_000))) {
    return NextResponse.json({ ok: false, error: "rate limited" }, { status: 429 });
  }

  const month = request.nextUrl.searchParams.get("month");
  let rangeStart: string | null = null;
  let rangeEnd: string | null = null;
  if (month) {
    if (!/^\d{4}-\d{2}$/.test(month)) {
      return NextResponse.json(
        { ok: false, error: "Invalid month, expected YYYY-MM" },
        { status: 400 },
      );
    }
    const [y, m] = month.split("-").map(Number);
    const start = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0));
    const end = new Date(Date.UTC(m === 12 ? y + 1 : y, m === 12 ? 0 : m, 1, 0, 0, 0));
    // Widen by 1 day for Warsaw TZ edge
    rangeStart = new Date(start.getTime() - 24 * 3600_000).toISOString();
    rangeEnd = new Date(end.getTime() + 24 * 3600_000).toISOString();
  }

  const supabase = requireServiceSupabase();
  let q = supabase
    .from("events")
    .select(
      "id, slug, title, starts_at, venue, total_tickets, price_grosze, listing_kind, visibility",
    )
    .eq("visibility", "published")
    .in("listing_kind", ["trial", "performance", "special"])
    .order("starts_at", { ascending: true })
    .limit(200);

  if (rangeStart && rangeEnd) {
    q = q.gte("starts_at", rangeStart).lt("starts_at", rangeEnd);
  } else {
    // Default: from 14 days ago forward (calendar + upcoming)
    const from = new Date(Date.now() - 14 * 24 * 3600_000).toISOString();
    q = q.gte("starts_at", from);
  }

  const { data: events, error } = await q;
  if (error) {
    console.error("[crm events] list", error);
    return NextResponse.json({ ok: false, error: "lookup failed" }, { status: 500 });
  }

  const ids = (events ?? []).map((e) => e.id as string);
  const soldByEvent = new Map<string, number>();
  if (ids.length) {
    const { data: tickets, error: tErr } = await supabase
      .from("tickets")
      .select("event_id")
      .in("event_id", ids);
    if (tErr) {
      console.error("[crm events] tickets count", tErr);
      return NextResponse.json({ ok: false, error: "capacity lookup failed" }, { status: 500 });
    }
    for (const row of tickets ?? []) {
      soldByEvent.set(row.event_id as string, (soldByEvent.get(row.event_id as string) ?? 0) + 1);
    }
  }

  const list = (events ?? []).map((event) => {
    const sold = soldByEvent.get(event.id as string) ?? 0;
    const total = Number(event.total_tickets) || 0;
    const remaining = Math.max(0, total - sold);
    const kind = (event.listing_kind as string) || "performance";
    return {
      id: event.id as string,
      slug: event.slug as string,
      title: event.title as string,
      starts_at: event.starts_at as string,
      venue: (event.venue as string) || "",
      total_tickets: total,
      remaining,
      price_grosze: Number(event.price_grosze) || 0,
      listing_kind: kind as "trial" | "performance" | "special",
      source: "populartickets.pl",
    };
  });

  return NextResponse.json({ ok: true, events: list, month: month || null });
}
