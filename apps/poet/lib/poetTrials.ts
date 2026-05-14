import type { SupabaseClient } from "@supabase/supabase-js";
import { getPoetSupabase } from "@/lib/supabasePoet";

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
};

type PoetCourseJoin = { id: string; slug: string; title: string };

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

function mapEventRow(r: Record<string, unknown>, mode: "full" | "basic" | "idOnly"): PoetTrialDisplay {
  const desc = (r.description as string | null)?.trim();
  let courseId: string | null = null;
  let courseSlug: string | null = null;
  let courseLine: string | null = null;
  if (mode === "full") {
    const pc = nestedOne(r.poet_course as PoetCourseJoin | PoetCourseJoin[] | null);
    courseId = (r.poet_course_id as string | null) ?? pc?.id ?? null;
    courseSlug = pc?.slug ?? null;
    courseLine = pc?.title ? String(pc.title) : null;
  } else if (mode === "idOnly") {
    courseId = (r.poet_course_id as string | null) ?? null;
  }
  return {
    id: `event:${r.id as string}`,
    title: normalizeTrialTitle(r.title as string),
    body: normalizeTrialBody(desc && desc.length > 0 ? desc : null),
    starts_at: r.starts_at as string,
    slug: r.slug as string,
    courseId,
    courseSlug,
    courseLine,
  };
}

function mapSlotRow(raw: Record<string, unknown>, withCourse: boolean, implicitCourseId?: string | null): PoetTrialDisplay {
  const slug = raw.tickets_checkout_event_slug as string;
  let courseId: string | null = null;
  let courseSlug: string | null = null;
  let courseLine: string | null = null;
  if (withCourse) {
    const pc = nestedOne(raw.poet_course as PoetCourseJoin | PoetCourseJoin[] | null);
    courseId = pc?.id ?? null;
    courseSlug = pc?.slug ?? null;
    courseLine = pc?.title ? String(pc.title) : null;
  } else if (implicitCourseId) {
    courseId = implicitCourseId;
  }
  return {
    id: `slot:${raw.id as string}`,
    title: normalizeTrialTitle(raw.title as string),
    body: normalizeTrialBody((raw.body as string | null) ?? null),
    starts_at: (raw.starts_at as string | null) ?? null,
    slug,
    courseId,
    courseSlug,
    courseLine,
  };
}

/** Якщо ще не застосовано SQL з poet_course_id / embed — повертаємо події без join, щоб пробні знову з'явились на popularpoet.pl. */
async function loadPublishedTrialEventRows(supabase: SupabaseClient): Promise<{
  rows: Record<string, unknown>[];
  mode: "full" | "basic";
}> {
  const full = await supabase
    .from("events")
    .select("id, slug, title, description, starts_at, poet_course_id, poet_course ( id, slug, title )")
    .eq("visibility", "published")
    .eq("listing_kind", "trial")
    .order("starts_at", { ascending: true });

  if (!full.error) {
    return { rows: (full.data ?? []) as Record<string, unknown>[], mode: "full" };
  }

  console.warn("[poetTrials] events select with poet_course failed, fallback without FK/join:", full.error.message);

  const basic = await supabase
    .from("events")
    .select("id, slug, title, description, starts_at")
    .eq("visibility", "published")
    .eq("listing_kind", "trial")
    .order("starts_at", { ascending: true });

  if (basic.error) {
    console.error("[poetTrials events]", basic.error.message);
    return { rows: [], mode: "basic" };
  }

  return { rows: (basic.data ?? []) as Record<string, unknown>[], mode: "basic" };
}

async function loadPublishedTrialSlotRows(supabase: SupabaseClient): Promise<{
  rows: Record<string, unknown>[];
  mode: "full" | "basic";
}> {
  const full = await supabase
    .from("poet_trial_slot")
    .select("id, title, body, starts_at, tickets_checkout_event_slug, poet_course ( id, slug, title )")
    .eq("is_published", true)
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
export async function fetchPublishedTrials(): Promise<PoetTrialDisplay[]> {
  const supabase = getPoetSupabase();
  if (!supabase) return [];

  const { rows: evRows, mode: evMode } = await loadPublishedTrialEventRows(supabase);
  const fromEvents: PoetTrialDisplay[] = evRows.map((r) => mapEventRow(r, evMode));
  const seenSlugs = new Set(fromEvents.map((e) => e.slug));

  const { rows: slotRows, mode: slotMode } = await loadPublishedTrialSlotRows(supabase);
  const fromSlots: PoetTrialDisplay[] = [];
  for (const raw of slotRows) {
    const slot = mapSlotRow(raw, slotMode === "full");
    if (seenSlugs.has(slot.slug)) continue;
    seenSlugs.add(slot.slug);
    fromSlots.push(slot);
  }

  return [...fromEvents, ...fromSlots].sort(sortByDate);
}

async function loadTrialEventsForCourse(supabase: SupabaseClient, courseId: string): Promise<{
  rows: Record<string, unknown>[];
  mode: "full" | "idOnly" | "none";
}> {
  const fullSel =
    "id, slug, title, description, starts_at, poet_course_id, poet_course ( id, slug, title )" as const;
  const full = await supabase
    .from("events")
    .select(fullSel)
    .in("visibility", ["published", "unlisted"])
    .eq("listing_kind", "trial")
    .eq("poet_course_id", courseId)
    .order("starts_at", { ascending: true });

  if (!full.error) {
    return { rows: (full.data ?? []) as Record<string, unknown>[], mode: "full" };
  }

  console.warn("[poetTrials] events by course (full) failed:", full.error.message);

  const idOnly = await supabase
    .from("events")
    .select("id, slug, title, description, starts_at, poet_course_id")
    .in("visibility", ["published", "unlisted"])
    .eq("listing_kind", "trial")
    .eq("poet_course_id", courseId)
    .order("starts_at", { ascending: true });

  if (!idOnly.error) {
    return { rows: (idOnly.data ?? []) as Record<string, unknown>[], mode: "idOnly" };
  }

  console.warn("[poetTrials] events by course (id only) failed — column poet_course_id may be missing:", idOnly.error.message);
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
    .order("sort_order", { ascending: true })
    .order("starts_at", { ascending: true, nullsFirst: false });

  if (basic.error) {
    console.error("[poetTrials slots by course]", basic.error.message);
    return { rows: [], mode: "basic" };
  }

  return { rows: (basic.data ?? []) as Record<string, unknown>[], mode: "basic" };
}

/** Пробні лише для сторінки курсу (подія з `poet_course_id` + legacy slot з `course_id`). */
export async function fetchTrialsForCourse(courseId: string): Promise<PoetTrialDisplay[]> {
  const supabase = getPoetSupabase();
  if (!supabase) return [];

  const { rows: evRows, mode: evMode } = await loadTrialEventsForCourse(supabase, courseId);
  const fromEvents: PoetTrialDisplay[] = evRows.map((r) =>
    mapEventRow(r, evMode === "full" ? "full" : evMode === "idOnly" ? "idOnly" : "basic"),
  );
  const seenSlugs = new Set(fromEvents.map((e) => e.slug));

  const { rows: slotRows, mode: slotMode } = await loadTrialSlotsForCourse(supabase, courseId);
  const fromSlots: PoetTrialDisplay[] = [];
  for (const raw of slotRows) {
    const slot = mapSlotRow(raw, slotMode === "full", slotMode === "full" ? null : courseId);
    if (seenSlugs.has(slot.slug)) continue;
    seenSlugs.add(slot.slug);
    fromSlots.push(slot);
  }

  return [...fromEvents, ...fromSlots].sort(sortByDate);
}

export function filterTrialsByCourseSlug(trials: PoetTrialDisplay[], courseSlug: string): PoetTrialDisplay[] {
  return trials.filter((t) => t.courseSlug === courseSlug).sort(sortByDate);
}

function sortByDate(a: PoetTrialDisplay, b: PoetTrialDisplay): number {
  const ta = a.starts_at ? new Date(a.starts_at).getTime() : 0;
  const tb = b.starts_at ? new Date(b.starts_at).getTime() : 0;
  return ta - tb;
}
