import { getPoetSupabase } from "@/lib/supabasePoet";

export type PoetTrialDisplay = {
  id: string;
  title: string;
  body: string | null;
  starts_at: string | null;
  slug: string;
  /** Рядок «Курс: …» з legacy `poet_trial_slot`, якщо є зв'язок. */
  courseLine: string | null;
};

/**
 * Пробні слоти: події з `listing_kind = trial` + legacy `poet_trial_slot` (без дубля по slug).
 */
export async function fetchPublishedTrials(): Promise<PoetTrialDisplay[]> {
  const supabase = getPoetSupabase();
  if (!supabase) return [];

  const { data: evRows, error: evErr } = await supabase
    .from("events")
    .select("id, slug, title, description, starts_at")
    .eq("is_published", true)
    .eq("listing_kind", "trial")
    .order("starts_at", { ascending: true });

  if (evErr) {
    console.error("[poetTrials events]", evErr.message);
  }

  const fromEvents: PoetTrialDisplay[] = (evRows ?? []).map((r) => {
    const desc = (r.description as string | null)?.trim();
    return {
      id: `event:${r.id as string}`,
      title: r.title as string,
      body: desc && desc.length > 0 ? desc : null,
      starts_at: r.starts_at as string,
      slug: r.slug as string,
      courseLine: null,
    };
  });

  const seenSlugs = new Set(fromEvents.map((e) => e.slug));

  const { data: slotRows, error: slotErr } = await supabase
    .from("poet_trial_slot")
    .select("id, title, body, starts_at, tickets_checkout_event_slug, poet_course ( title )")
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
    const pc = raw.poet_course as { title: string } | { title: string }[] | null;
    const courseTitle = Array.isArray(pc) ? pc[0]?.title : pc?.title;
    fromSlots.push({
      id: `slot:${raw.id as string}`,
      title: raw.title as string,
      body: (raw.body as string | null) ?? null,
      starts_at: (raw.starts_at as string | null) ?? null,
      slug,
      courseLine: courseTitle ? String(courseTitle) : null,
    });
  }

  return [...fromEvents, ...fromSlots].sort(sortByDate);
}

function sortByDate(a: PoetTrialDisplay, b: PoetTrialDisplay): number {
  const ta = a.starts_at ? new Date(a.starts_at).getTime() : 0;
  const tb = b.starts_at ? new Date(b.starts_at).getTime() : 0;
  return ta - tb;
}
