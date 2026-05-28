import type { SupabaseClient } from "@supabase/supabase-js";
import { getPoetSupabase } from "@/lib/supabasePoet";
import type { AppLocale } from "@/i18n/routing";
import { resolveCourseCopy, resolveEventCopy } from "@/lib/contentI18n";
import type { EventLanguage } from "@/lib/eventLanguage";
import { normalizeEventLanguage } from "@/lib/eventLanguage";
import {
  resolveEventMarketingStatus,
  sortEventsForMarketing,
  type EventMarketingStatus,
} from "@/lib/eventMarketingStatus";
import {
  DEFAULT_TRIAL_PRICE_GROSZE,
  DEFAULT_TRIAL_TOTAL_TICKETS,
  POPULAR_POET_TRIAL_VENUE_PL,
} from "@/lib/theatreVenueDefaults";

export type PoetTrialDisplay = {
  id: string;
  title: string;
  body: string | null;
  starts_at: string | null;
  slug: string;
  /** Зв'язок з курсом (подія trial + `poet_course_id` або legacy slot). */
  courseId: string | null;
  courseSlug: string | null;
  /** Рядок «Курс: …» для картки. */
  courseLine: string | null;
  venue: string;
  priceGrosze: number;
  imageUrl: string | null;
  imageFocalX: number | null;
  imageFocalY: number | null;
  eventLanguage: EventLanguage | null;
  status: EventMarketingStatus;
  totalTickets: number;
  remainingTickets: number;
};

type PoetCourseJoin = { id: string; slug: string; title: string; title_pl?: string | null; title_uk?: string | null };

function courseLineFromJoin(pc: PoetCourseJoin | null, locale: AppLocale): string | null {
  if (!pc) return null;
  const copy = resolveCourseCopy(
    {
      title: pc.title,
      title_pl: pc.title_pl,
      title_uk: pc.title_uk,
    },
    locale,
  );
  return copy?.title ?? null;
}

function tidyText(value: string): string {
  return value.replace(/\s+/g, " ").replace(/\s+([,.!?;:])/g, "$1").trim();
}

function normalizeTrialTitle(value: string): string {
  const title = tidyText(value);

  return tidyText(
    title
      .replace(/^пробное\s+занятие\s+по\s+/i, "Открытое занятие: ")
      .replace(/^пробное\s+занятие\b/i, "Открытое занятие")
      .replace(/^пробный\s+урок\b/i, "Открытое занятие")
      .replace(/^пробное\s*[:—-]\s*/i, "Открытое занятие: ")
      .replace(/^пробне\s+заняття\s+з\s+/i, "Відкрите заняття: ")
      .replace(/^пробне\s+заняття\b/i, "Відкрите заняття")
      .replace(/^пробний\s+урок\b/i, "Відкрите заняття")
      .replace(/^пробне\s*[:—-]\s*/i, "Відкрите заняття: ")
      .replace(/^zaj[eę]cia\s+pr[oó]bne\s+z\s+/i, "Zajęcia otwarte: ")
      .replace(/^zaj[eę]cia\s+pr[oó]bne\b/i, "Zajęcia otwarte")
      .replace(/^lekcja\s+pr[oó]bna\b/i, "Zajęcia otwarte")
      .replace(/^pr[oó]bne\s*[:—-]\s*/i, "Zajęcia otwarte: "),
  );
}

function normalizeTrialBody(value: string | null): string | null {
  if (!value) return null;

  const body = tidyText(value)
    .replace(/^Пробное:\s*оплата\s+на\s+PopularTickets\.?\s*/i, "")
    .replace(/^Пробний:\s*оплата\s+на\s+PopularTickets\.?\s*/i, "")
    .replace(/^Pr[oó]bne:\s*płatność\s+na\s+PopularTickets\.?\s*/i, "")
    .replace(/^Пробный\s+слот\s+Popular Poet\s+в\s+Варшаве\.?\s*/i, "")
    .replace(/^Пробний\s+слот\s+Popular Poet\s+у\s+Варшаві\.?\s*/i, "")
    .replace(/^Pr[oó]bny\s+slot\s+Popular Poet\s+w\s+Warszawie\.?\s*/i, "")
    .replace(/Вы\s+оформляете\s+билет\s+на\s+PopularTickets:\s*оплата\s+Przelewy24,\s*подтверждение\s+на\s+email\.?\s*/i, "")
    .replace(/Ви\s+оформлюєте\s+квиток\s+на\s+PopularTickets:\s*оплата\s+Przelewy24,\s*підтвердження\s+на\s+email\.?\s*/i, "")
    .replace(/Bilet\s+kupujesz\s+na\s+PopularTickets:\s*płatność\s+Przelewy24,\s*potwierdzenie\s+na\s+email\.?\s*/i, "");

  const clean = tidyText(body);
  return clean.length > 0 ? clean : null;
}

function nestedOne<T>(v: T | T[] | null | undefined): T | null {
  if (v == null) return null;
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

function readFocal(raw: unknown): number | null {
  return typeof raw === "number" && !Number.isNaN(raw) ? raw : null;
}

function mapEventRow(
  r: Record<string, unknown>,
  mode: "full" | "basic" | "idOnly",
  locale: AppLocale,
  soldCount = 0,
): PoetTrialDisplay | null {
  const copy = resolveEventCopy(
    {
      title: r.title as string,
      description: r.description as string | undefined,
      title_pl: r.title_pl as string | null | undefined,
      description_pl: r.description_pl as string | null | undefined,
      title_uk: r.title_uk as string | null | undefined,
      description_uk: r.description_uk as string | null | undefined,
    },
    locale,
  );
  if (!copy) return null;

  let courseId: string | null = null;
  let courseSlug: string | null = null;
  let courseLine: string | null = null;
  if (mode === "full") {
    const pc = nestedOne(r.poet_course as PoetCourseJoin | PoetCourseJoin[] | null);
    courseId = (r.poet_course_id as string | null) ?? pc?.id ?? null;
    courseSlug = pc?.slug ?? null;
    courseLine = courseLineFromJoin(pc, locale);
  } else if (mode === "idOnly") {
    courseId = (r.poet_course_id as string | null) ?? null;
  }
  const title = locale === "pl" ? copy.title : normalizeTrialTitle(copy.title);
  const body = locale === "pl" ? copy.description || null : normalizeTrialBody(copy.description || null);
  const startsAt = r.starts_at as string;
  const totalTickets = typeof r.total_tickets === "number" ? r.total_tickets : DEFAULT_TRIAL_TOTAL_TICKETS;
  const venue =
    typeof r.venue === "string" && r.venue.trim().length > 0 ? r.venue.trim() : POPULAR_POET_TRIAL_VENUE_PL;
  const priceGrosze =
    typeof r.price_grosze === "number" && r.price_grosze > 0 ? r.price_grosze : DEFAULT_TRIAL_PRICE_GROSZE;
  const status = startsAt
    ? resolveEventMarketingStatus({
        startsAt,
        remaining: Math.max(0, totalTickets - soldCount),
        totalTickets,
      })
    : null;

  return {
    id: `event:${r.id as string}`,
    title,
    body: body && body.length > 0 ? body : null,
    starts_at: startsAt,
    slug: r.slug as string,
    courseId,
    courseSlug,
    courseLine,
    venue,
    priceGrosze,
    imageUrl: typeof r.image_url === "string" && r.image_url.trim() ? r.image_url.trim() : null,
    imageFocalX: readFocal(r.image_focal_x),
    imageFocalY: readFocal(r.image_focal_y),
    eventLanguage:
      r.event_language != null ? normalizeEventLanguage(r.event_language) : mode === "full" ? "ru_uk" : null,
    status,
    totalTickets,
    remainingTickets: Math.max(0, totalTickets - soldCount),
  };
}

function mapSlotRow(
  raw: Record<string, unknown>,
  withCourse: boolean,
  locale: AppLocale,
  implicitCourseId?: string | null,
  soldCount = 0,
): PoetTrialDisplay | null {
  const copy = resolveEventCopy(
    {
      title: raw.title as string,
      description: raw.body as string | undefined,
      title_pl: raw.title_pl as string | null | undefined,
      description_pl: raw.body_pl as string | null | undefined,
      title_uk: raw.title_uk as string | null | undefined,
      description_uk: raw.body_uk as string | null | undefined,
    },
    locale,
  );
  if (!copy) return null;

  const slug = raw.tickets_checkout_event_slug as string;
  let courseId: string | null = null;
  let courseSlug: string | null = null;
  let courseLine: string | null = null;
  if (withCourse) {
    const pc = nestedOne(raw.poet_course as PoetCourseJoin | PoetCourseJoin[] | null);
    courseId = pc?.id ?? null;
    courseSlug = pc?.slug ?? null;
    courseLine = courseLineFromJoin(pc, locale);
  } else if (implicitCourseId) {
    courseId = implicitCourseId;
  }
  const title = locale === "pl" ? copy.title : normalizeTrialTitle(copy.title);
  const body = locale === "pl" ? copy.description || null : normalizeTrialBody(copy.description || null);
  const startsAt = (raw.starts_at as string | null) ?? null;
  const totalTickets = DEFAULT_TRIAL_TOTAL_TICKETS;
  const remainingTickets = Math.max(0, totalTickets - soldCount);
  const status = startsAt
    ? resolveEventMarketingStatus({
        startsAt,
        remaining: remainingTickets,
        totalTickets,
      })
    : null;

  return {
    id: `slot:${raw.id as string}`,
    title,
    body: body && body.length > 0 ? body : null,
    starts_at: startsAt,
    slug,
    courseId,
    courseSlug,
    courseLine,
    venue: POPULAR_POET_TRIAL_VENUE_PL,
    priceGrosze: DEFAULT_TRIAL_PRICE_GROSZE,
    imageUrl: null,
    imageFocalX: null,
    imageFocalY: null,
    eventLanguage: "ru_uk",
    status,
    totalTickets,
    remainingTickets,
  };
}

/** Нижня межа `starts_at` для публічних списків пробних (UTC, як у timestamptz). */
function trialListingStartsFromIso(): string {
  return new Date().toISOString();
}

async function loadSoldCountsByEventSlug(
  supabase: SupabaseClient,
  slugs: string[],
): Promise<Map<string, number>> {
  const soldBySlug = new Map<string, number>();
  if (!slugs.length) return soldBySlug;

  const { data: events, error } = await supabase.from("events").select("id, slug").in("slug", slugs);
  if (error || !events?.length) return soldBySlug;

  const idToSlug = new Map(events.map((row) => [row.id as string, row.slug as string]));
  const ids = events.map((row) => row.id as string);
  const { data: ticketRows } = await supabase.from("tickets").select("event_id").in("event_id", ids);
  for (const row of ticketRows ?? []) {
    const slug = idToSlug.get(row.event_id as string);
    if (!slug) continue;
    soldBySlug.set(slug, (soldBySlug.get(slug) ?? 0) + 1);
  }
  return soldBySlug;
}

const TRIAL_EVENT_CORE_SELECT =
  "id, slug, title, description, title_pl, description_pl, title_uk, description_uk, starts_at, venue, price_grosze, image_url, image_focal_x, image_focal_y, total_tickets";

const TRIAL_EVENT_COURSE_EMBED = "poet_course ( id, slug, title, title_pl, title_uk )";

function fetchPublishedTrialEvents(supabase: SupabaseClient, select: string) {
  return supabase
    .from("events")
    .select(select)
    .eq("visibility", "published")
    .eq("listing_kind", "trial")
    .gte("starts_at", trialListingStartsFromIso())
    .order("starts_at", { ascending: true });
}

function fetchTrialEventsForCourse(supabase: SupabaseClient, courseId: string, select: string) {
  return supabase
    .from("events")
    .select(select)
    .in("visibility", ["published", "unlisted"])
    .eq("listing_kind", "trial")
    .eq("poet_course_id", courseId)
    .gte("starts_at", trialListingStartsFromIso())
    .order("starts_at", { ascending: true });
}

/** Якщо ще не застосовано SQL з poet_course_id / event_language — каскад fallback, але завжди з image_url. */
async function loadPublishedTrialEventRows(supabase: SupabaseClient): Promise<{
  rows: Record<string, unknown>[];
  mode: "full" | "basic";
}> {
  const full = await fetchPublishedTrialEvents(
    supabase,
    `${TRIAL_EVENT_CORE_SELECT}, event_language, poet_course_id, ${TRIAL_EVENT_COURSE_EMBED}`,
  );

  if (!full.error) {
    return { rows: (full.data ?? []) as Record<string, unknown>[], mode: "full" };
  }

  console.warn("[poetTrials] events select (full) failed, trying fallbacks:", full.error.message);

  const withCourseNoLang = await fetchPublishedTrialEvents(
    supabase,
    `${TRIAL_EVENT_CORE_SELECT}, poet_course_id, ${TRIAL_EVENT_COURSE_EMBED}`,
  );
  if (!withCourseNoLang.error) {
    const rows = ((withCourseNoLang.data ?? []) as Record<string, unknown>[]).map((r) => ({
      ...r,
      event_language: null,
    }));
    return { rows, mode: "full" };
  }

  const noJoinWithLang = await fetchPublishedTrialEvents(
    supabase,
    `${TRIAL_EVENT_CORE_SELECT}, event_language, poet_course_id`,
  );
  if (!noJoinWithLang.error) {
    return { rows: (noJoinWithLang.data ?? []) as Record<string, unknown>[], mode: "basic" };
  }

  const noJoinNoLang = await fetchPublishedTrialEvents(
    supabase,
    `${TRIAL_EVENT_CORE_SELECT}, poet_course_id`,
  );
  if (!noJoinNoLang.error) {
    const rows = ((noJoinNoLang.data ?? []) as Record<string, unknown>[]).map((r) => ({
      ...r,
      event_language: null,
    }));
    return { rows, mode: "basic" };
  }

  const coreOnly = await fetchPublishedTrialEvents(supabase, TRIAL_EVENT_CORE_SELECT);
  if (coreOnly.error) {
    console.error("[poetTrials events]", coreOnly.error.message);
    return { rows: [], mode: "basic" };
  }

  const rows = ((coreOnly.data ?? []) as Record<string, unknown>[]).map((r) => ({
    ...r,
    event_language: null,
    poet_course_id: null,
  }));
  return { rows, mode: "basic" };
}

async function loadPublishedTrialSlotRows(supabase: SupabaseClient): Promise<{
  rows: Record<string, unknown>[];
  mode: "full" | "basic";
}> {
  const full = await supabase
    .from("poet_trial_slot")
    .select("id, title, body, starts_at, tickets_checkout_event_slug, poet_course ( id, slug, title )")
    .eq("is_published", true)
    .gte("starts_at", trialListingStartsFromIso())
    .order("sort_order", { ascending: true })
    .order("starts_at", { ascending: true, nullsFirst: false });

  if (!full.error) {
    return { rows: (full.data ?? []) as Record<string, unknown>[], mode: "full" };
  }

  console.warn("[poetTrials] slots select with poet_course failed, fallback:", full.error.message);

  const basic = await supabase
    .from("poet_trial_slot")
    .select("id, title, body, starts_at, tickets_checkout_event_slug")
    .eq("is_published", true)
    .gte("starts_at", trialListingStartsFromIso())
    .order("sort_order", { ascending: true })
    .order("starts_at", { ascending: true, nullsFirst: false });

  if (basic.error) {
    console.error("[poetTrials slots]", basic.error.message);
    return { rows: [], mode: "basic" };
  }

  return { rows: (basic.data ?? []) as Record<string, unknown>[], mode: "basic" };
}

/**
 * Пробні слоти: події з `listing_kind = trial` + legacy `poet_trial_slot` (без дубля по slug).
 */
export async function fetchPublishedTrials(locale: AppLocale = "ru"): Promise<PoetTrialDisplay[]> {
  const supabase = getPoetSupabase();
  if (!supabase) return [];

  const { rows: evRows, mode: evMode } = await loadPublishedTrialEventRows(supabase);
  const eventIds = evRows.map((r) => r.id as string);
  const soldByEventId = new Map<string, number>();
  if (eventIds.length) {
    const { data: ticketRows } = await supabase.from("tickets").select("event_id").in("event_id", eventIds);
    for (const row of ticketRows ?? []) {
      const eid = row.event_id as string;
      soldByEventId.set(eid, (soldByEventId.get(eid) ?? 0) + 1);
    }
  }

  const fromEvents: PoetTrialDisplay[] = evRows
    .map((r) => mapEventRow(r, evMode, locale, soldByEventId.get(r.id as string) ?? 0))
    .filter((t): t is PoetTrialDisplay => t !== null);
  const seenSlugs = new Set(fromEvents.map((e) => e.slug));

  const { rows: slotRows, mode: slotMode } = await loadPublishedTrialSlotRows(supabase);
  const slotSlugs = slotRows
    .map((raw) => raw.tickets_checkout_event_slug as string)
    .filter((slug) => slug && !seenSlugs.has(slug));
  const soldBySlug = await loadSoldCountsByEventSlug(supabase, slotSlugs);

  const fromSlots: PoetTrialDisplay[] = [];
  for (const raw of slotRows) {
    const slug = raw.tickets_checkout_event_slug as string;
    const slot = mapSlotRow(raw, slotMode === "full", locale, undefined, soldBySlug.get(slug) ?? 0);
    if (!slot || seenSlugs.has(slot.slug)) continue;
    seenSlugs.add(slot.slug);
    fromSlots.push(slot);
  }

  return sortEventsForMarketing([...fromEvents, ...fromSlots]);
}

async function loadTrialEventsForCourse(supabase: SupabaseClient, courseId: string): Promise<{
  rows: Record<string, unknown>[];
  mode: "full" | "idOnly" | "none";
}> {
  const full = await fetchTrialEventsForCourse(
    supabase,
    courseId,
    `${TRIAL_EVENT_CORE_SELECT}, event_language, poet_course_id, ${TRIAL_EVENT_COURSE_EMBED}`,
  );

  if (!full.error) {
    return { rows: (full.data ?? []) as Record<string, unknown>[], mode: "full" };
  }

  console.warn("[poetTrials] events by course (full) failed:", full.error.message);

  const withCourseNoLang = await fetchTrialEventsForCourse(
    supabase,
    courseId,
    `${TRIAL_EVENT_CORE_SELECT}, poet_course_id, ${TRIAL_EVENT_COURSE_EMBED}`,
  );
  if (!withCourseNoLang.error) {
    const rows = ((withCourseNoLang.data ?? []) as Record<string, unknown>[]).map((r) => ({
      ...r,
      event_language: null,
    }));
    return { rows, mode: "full" };
  }

  const noJoinNoLang = await fetchTrialEventsForCourse(
    supabase,
    courseId,
    `${TRIAL_EVENT_CORE_SELECT}, poet_course_id`,
  );
  if (!noJoinNoLang.error) {
    const rows = ((noJoinNoLang.data ?? []) as Record<string, unknown>[]).map((r) => ({
      ...r,
      event_language: null,
    }));
    return { rows, mode: "idOnly" };
  }

  const coreOnly = await fetchTrialEventsForCourse(supabase, courseId, TRIAL_EVENT_CORE_SELECT);
  if (!coreOnly.error) {
    const rows = ((coreOnly.data ?? []) as Record<string, unknown>[]).map((r) => ({
      ...r,
      event_language: null,
      poet_course_id: courseId,
    }));
    return { rows, mode: "idOnly" };
  }

  console.warn("[poetTrials] events by course failed — poet_course_id may be missing:", coreOnly.error.message);
  return { rows: [], mode: "none" };
}

async function loadTrialSlotsForCourse(supabase: SupabaseClient, courseId: string): Promise<{
  rows: Record<string, unknown>[];
  mode: "full" | "basic";
}> {
  const full = await supabase
    .from("poet_trial_slot")
    .select("id, title, body, starts_at, tickets_checkout_event_slug, poet_course ( id, slug, title )")
    .eq("is_published", true)
    .eq("course_id", courseId)
    .gte("starts_at", trialListingStartsFromIso())
    .order("sort_order", { ascending: true })
    .order("starts_at", { ascending: true, nullsFirst: false });

  if (!full.error) {
    return { rows: (full.data ?? []) as Record<string, unknown>[], mode: "full" };
  }

  console.warn("[poetTrials] slots by course (with join) failed, fallback:", full.error.message);

  const basic = await supabase
    .from("poet_trial_slot")
    .select("id, title, body, starts_at, tickets_checkout_event_slug")
    .eq("is_published", true)
    .eq("course_id", courseId)
    .gte("starts_at", trialListingStartsFromIso())
    .order("sort_order", { ascending: true })
    .order("starts_at", { ascending: true, nullsFirst: false });

  if (basic.error) {
    console.error("[poetTrials slots by course]", basic.error.message);
    return { rows: [], mode: "basic" };
  }

  return { rows: (basic.data ?? []) as Record<string, unknown>[], mode: "basic" };
}

/** Пробні лише для сторінки курсу (подія з `poet_course_id` + legacy slot з `course_id`). */
export async function fetchTrialsForCourse(courseId: string, locale: AppLocale = "ru"): Promise<PoetTrialDisplay[]> {
  const supabase = getPoetSupabase();
  if (!supabase) return [];

  const { rows: evRows, mode: evMode } = await loadTrialEventsForCourse(supabase, courseId);
  const eventIds = evRows.map((r) => r.id as string);
  const soldByEventId = new Map<string, number>();
  if (eventIds.length) {
    const { data: ticketRows } = await supabase.from("tickets").select("event_id").in("event_id", eventIds);
    for (const row of ticketRows ?? []) {
      const eid = row.event_id as string;
      soldByEventId.set(eid, (soldByEventId.get(eid) ?? 0) + 1);
    }
  }

  const fromEvents: PoetTrialDisplay[] = evRows
    .map((r) =>
      mapEventRow(
        r,
        evMode === "full" ? "full" : evMode === "idOnly" ? "idOnly" : "basic",
        locale,
        soldByEventId.get(r.id as string) ?? 0,
      ),
    )
    .filter((t): t is PoetTrialDisplay => t !== null);
  const seenSlugs = new Set(fromEvents.map((e) => e.slug));

  const { rows: slotRows, mode: slotMode } = await loadTrialSlotsForCourse(supabase, courseId);
  const slotSlugs = slotRows
    .map((raw) => raw.tickets_checkout_event_slug as string)
    .filter((slug) => slug && !seenSlugs.has(slug));
  const soldBySlug = await loadSoldCountsByEventSlug(supabase, slotSlugs);

  const fromSlots: PoetTrialDisplay[] = [];
  for (const raw of slotRows) {
    const slug = raw.tickets_checkout_event_slug as string;
    const slot = mapSlotRow(
      raw,
      slotMode === "full",
      locale,
      slotMode === "full" ? undefined : courseId,
      soldBySlug.get(slug) ?? 0,
    );
    if (!slot || seenSlugs.has(slot.slug)) continue;
    seenSlugs.add(slot.slug);
    fromSlots.push(slot);
  }

  return sortEventsForMarketing([...fromEvents, ...fromSlots]);
}

export function filterTrialsByCourseSlug(trials: PoetTrialDisplay[], courseSlug: string): PoetTrialDisplay[] {
  return trials.filter((t) => t.courseSlug === courseSlug).sort(sortByDate);
}

function sortByDate(a: PoetTrialDisplay, b: PoetTrialDisplay): number {
  const ta = a.starts_at ? new Date(a.starts_at).getTime() : 0;
  const tb = b.starts_at ? new Date(b.starts_at).getTime() : 0;
  return ta - tb;
}
