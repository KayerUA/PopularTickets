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

function nestedOne<T>(v: T | T[] | null | undefined): T | null {
  if (v == null) return null;
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

/**
 * Пробні слоти: події з `listing_kind = trial` + legacy `poet_trial_slot` (без дубля по slug).
 */
export async function fetchPublishedTrials(): Promise<PoetTrialDisplay[]> {
  const supabase = getPoetSupabase();
  if (!supabase) return [];

  const { data: evRows, error: evErr } = await supabase
    .from("events")
    .select("id, slug, title, description, starts_at, poet_course_id, poet_course ( id, slug, title )")
    .eq("is_published", true)
    .eq("listing_kind", "trial")
    .order("starts_at", { ascending: true });

  if (evErr) {
    console.error("[poetTrials events]", evErr.message);
  }

  const fromEvents: PoetTrialDisplay[] = (evRows ?? []).map((r) => {
    const desc = (r.description as string | null)?.trim();
    const pc = nestedOne(r.poet_course as PoetCourseJoin | PoetCourseJoin[] | null);
    return {
      id: `event:${r.id as string}`,
      title: r.title as string,
      body: desc && desc.length > 0 ? desc : null,
      starts_at: r.starts_at as string,
      slug: r.slug as string,
      courseId: (r.poet_course_id as string | null) ?? pc?.id ?? null,
      courseSlug: pc?.slug ?? null,
      courseLine: pc?.title ? String(pc.title) : null,
    };
  });

  const seenSlugs = new Set(fromEvents.map((e) => e.slug));

  const { data: slotRows, error: slotErr } = await supabase
    .from("poet_trial_slot")
    .select("id, title, body, starts_at, tickets_checkout_event_slug, poet_course ( id, slug, title )")
    .eq("is_published", true)
    .order("sort_order", { ascending: true })
    .order("starts_at", { ascending: true, nullsFirst: false });

  if (slotErr) {
    console.error("[poetTrials slots]", slotErr.message);
    return fromEvents.sort(sortByDate);
  }

  const fromSlots: PoetTrialDisplay[] = [];
  for (const raw of slotRows ?? []) {
    const slug = raw.tickets_checkout_event_slug as string;
    if (seenSlugs.has(slug)) continue;
    seenSlugs.add(slug);
    const pc = nestedOne(raw.poet_course as PoetCourseJoin | PoetCourseJoin[] | null);
    fromSlots.push({
      id: `slot:${raw.id as string}`,
      title: raw.title as string,
      body: (raw.body as string | null) ?? null,
      starts_at: (raw.starts_at as string | null) ?? null,
      slug,
      courseId: pc?.id ?? null,
      courseSlug: pc?.slug ?? null,
      courseLine: pc?.title ? String(pc.title) : null,
    });
  }

  return [...fromEvents, ...fromSlots].sort(sortByDate);
}

/** Пробні лише для сторінки курсу (подія з `poet_course_id` + legacy slot з `course_id`). */
export async function fetchTrialsForCourse(courseId: string): Promise<PoetTrialDisplay[]> {
  const supabase = getPoetSupabase();
  if (!supabase) return [];

  const { data: evRows, error: evErr } = await supabase
    .from("events")
    .select("id, slug, title, description, starts_at, poet_course_id, poet_course ( id, slug, title )")
    .eq("is_published", true)
    .eq("listing_kind", "trial")
    .eq("poet_course_id", courseId)
    .order("starts_at", { ascending: true });

  if (evErr) {
    console.error("[poetTrials events by course]", evErr.message);
  }

  const fromEvents: PoetTrialDisplay[] = (evRows ?? []).map((r) => {
    const desc = (r.description as string | null)?.trim();
    const pc = nestedOne(r.poet_course as PoetCourseJoin | PoetCourseJoin[] | null);
    return {
      id: `event:${r.id as string}`,
      title: r.title as string,
      body: desc && desc.length > 0 ? desc : null,
      starts_at: r.starts_at as string,
      slug: r.slug as string,
      courseId: (r.poet_course_id as string | null) ?? pc?.id ?? null,
      courseSlug: pc?.slug ?? null,
      courseLine: pc?.title ? String(pc.title) : null,
    };
  });

  const seenSlugs = new Set(fromEvents.map((e) => e.slug));

  const { data: slotRows, error: slotErr } = await supabase
    .from("poet_trial_slot")
    .select("id, title, body, starts_at, tickets_checkout_event_slug, poet_course ( id, slug, title )")
    .eq("is_published", true)
    .eq("course_id", courseId)
    .order("sort_order", { ascending: true })
    .order("starts_at", { ascending: true, nullsFirst: false });

  if (slotErr) {
    console.error("[poetTrials slots by course]", slotErr.message);
    return fromEvents.sort(sortByDate);
  }

  const fromSlots: PoetTrialDisplay[] = [];
  for (const raw of slotRows ?? []) {
    const slug = raw.tickets_checkout_event_slug as string;
    if (seenSlugs.has(slug)) continue;
    seenSlugs.add(slug);
    const pc = nestedOne(raw.poet_course as PoetCourseJoin | PoetCourseJoin[] | null);
    fromSlots.push({
      id: `slot:${raw.id as string}`,
      title: raw.title as string,
      body: (raw.body as string | null) ?? null,
      starts_at: (raw.starts_at as string | null) ?? null,
      slug,
      courseId: pc?.id ?? null,
      courseSlug: pc?.slug ?? null,
      courseLine: pc?.title ? String(pc.title) : null,
    });
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
