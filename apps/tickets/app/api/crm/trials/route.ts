import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { routing } from "@/i18n/routing";
import { requireServiceSupabase } from "@/lib/supabase/admin";
import { authorizeCrmRequest } from "@/lib/crmAuth";
import { clientIp, rateLimit } from "@/lib/security";
import { createEventFromParsed } from "@/lib/telegram/createEventDraft";
import {
  TRIAL_COPY,
  type TrialCourseSlug,
} from "@/lib/telegram/trialSchedule";
import { POPULAR_POET_TRIAL_VENUE_PL } from "@/lib/theatreVenueDefaults";
import {
  EVENT_ADMIN_TIMEZONE,
  parseStartsAtFromAdminForm,
} from "@/lib/warsawEventDatetime";
import { TRIAL_HUB_SEGMENT } from "@/lib/trialCourseHub";
import { DateTime } from "luxon";

const CreateSchema = z.object({
  course: z.enum(["improv", "acting"]),
  starts_at_warsaw: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, "expected YYYY-MM-DDTHH:mm"),
});

function revalidateTrialHub(course: TrialCourseSlug, eventSlug: string) {
  for (const loc of routing.locales) {
    revalidatePath(`/${loc}/${TRIAL_HUB_SEGMENT}/${course}`);
    revalidatePath(`/${loc}/events/${eventSlug}`);
  }
  revalidatePath("/admin");
}

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

/**
 * POST /api/crm/trials
 * Create a published trial listing for improv/acting hub from PopularCRM calendar.
 */
export async function POST(request: NextRequest) {
  if (!authorizeCrmRequest(request)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  if (!(await rateLimit(`crm-trials-create:${clientIp(request.headers)}`, 20, 60_000))) {
    return NextResponse.json({ ok: false, error: "rate limited" }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid json" }, { status: 400 });
  }

  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "validation failed", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { course, starts_at_warsaw } = parsed.data;
  let startsAtIso: string;
  try {
    startsAtIso = parseStartsAtFromAdminForm(starts_at_warsaw);
  } catch {
    return NextResponse.json({ ok: false, error: "invalid starts_at_warsaw" }, { status: 400 });
  }

  const when = DateTime.fromISO(startsAtIso, { zone: "utc" }).setZone(EVENT_ADMIN_TIMEZONE);
  if (!when.isValid || when < DateTime.now().setZone(EVENT_ADMIN_TIMEZONE).minus({ hours: 1 })) {
    return NextResponse.json({ ok: false, error: "starts_at must be in the future" }, { status: 400 });
  }

  const supabase = requireServiceSupabase();

  const { data: courseRow, error: courseErr } = await supabase
    .from("poet_course")
    .select("id")
    .eq("slug", course)
    .maybeSingle();
  if (courseErr) {
    console.error("[crm trials] poet_course", courseErr);
    return NextResponse.json({ ok: false, error: "course lookup failed" }, { status: 500 });
  }
  if (!courseRow?.id) {
    return NextResponse.json({ ok: false, error: `unknown course: ${course}` }, { status: 400 });
  }

  // Idempotent: same course + exact start → return existing
  const { data: existing, error: existingErr } = await supabase
    .from("events")
    .select("id, slug, title, starts_at, venue, total_tickets, price_grosze")
    .eq("listing_kind", "trial")
    .eq("poet_course_id", courseRow.id)
    .eq("starts_at", startsAtIso)
    .maybeSingle();
  if (existingErr) {
    console.error("[crm trials] idempotent lookup", existingErr);
    return NextResponse.json({ ok: false, error: "lookup failed" }, { status: 500 });
  }
  if (existing) {
    const { count } = await supabase
      .from("tickets")
      .select("id", { count: "exact", head: true })
      .eq("event_id", existing.id);
    const sold = count ?? 0;
    return NextResponse.json({
      ok: true,
      already: true,
      trial: {
        id: existing.id,
        slug: existing.slug,
        title: existing.title,
        starts_at: existing.starts_at,
        venue: existing.venue,
        total_tickets: existing.total_tickets,
        remaining: Math.max(0, Number(existing.total_tickets) - sold),
        price_grosze: existing.price_grosze,
        course,
        hub_path: `/ru/${TRIAL_HUB_SEGMENT}/${course}`,
      },
    });
  }

  const copy = TRIAL_COPY[course];
  try {
    const created = await createEventFromParsed(
      supabase,
      {
        title: copy.title,
        titlePl: copy.titlePl,
        titleUk: copy.titleUk,
        description: copy.description,
        descriptionPl: copy.descriptionPl,
        descriptionUk: copy.descriptionUk,
        startsAtWarsaw: starts_at_warsaw,
        pricePln: 70,
        dayOfEventPricePln: null,
        totalTickets: 12,
        venue: POPULAR_POET_TRIAL_VENUE_PL,
        listingKind: "trial",
        eventLanguage: "ru",
        poetCourseSlug: course,
      },
      { visibility: "published" },
    );

    revalidateTrialHub(course, created.slug);

    return NextResponse.json({
      ok: true,
      already: false,
      trial: {
        id: created.id,
        slug: created.slug,
        title: created.title,
        starts_at: created.startsAtIso,
        venue: created.venue,
        total_tickets: created.totalTickets,
        remaining: created.totalTickets,
        price_grosze: Math.round(created.pricePln * 100),
        course,
        hub_path: `/ru/${TRIAL_HUB_SEGMENT}/${course}`,
      },
    });
  } catch (e) {
    console.error("[crm trials] create", e);
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "create failed" },
      { status: 500 },
    );
  }
}
