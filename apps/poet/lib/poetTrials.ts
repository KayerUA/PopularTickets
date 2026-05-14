import { getPoetSupabase } from "@/lib/supabasePoet";

export type PoetTrialSlotRow = {
  id: string;
  title: string;
  body: string | null;
  starts_at: string | null;
  tickets_checkout_event_slug: string;
  poet_course: { slug: string; title: string; kind: string } | null;
};

export async function fetchPublishedTrialSlots(): Promise<PoetTrialSlotRow[]> {
  const supabase = getPoetSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("poet_trial_slot")
    .select(
      "id, title, body, starts_at, tickets_checkout_event_slug, poet_course ( slug, title, kind )",
    )
    .eq("is_published", true)
    .order("sort_order", { ascending: true })
    .order("starts_at", { ascending: true, nullsFirst: false });

  if (error) {
    console.error("[poetTrials]", error.message);
    return [];
  }

  const rows = (data ?? []) as {
    id: string;
    title: string;
    body: string | null;
    starts_at: string | null;
    tickets_checkout_event_slug: string;
    poet_course: { slug: string; title: string; kind: string } | { slug: string; title: string; kind: string }[] | null;
  }[];

  return rows.map((row) => {
    const pc = row.poet_course;
    const poet_course = Array.isArray(pc) ? pc[0] ?? null : pc;
    return {
      id: row.id,
      title: row.title,
      body: row.body,
      starts_at: row.starts_at,
      tickets_checkout_event_slug: row.tickets_checkout_event_slug,
      poet_course,
    };
  });
}
