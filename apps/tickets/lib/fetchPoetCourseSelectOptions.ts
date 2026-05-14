import { getServiceSupabase } from "@/lib/supabase/admin";

export type PoetCourseSelectOption = {
  id: string;
  slug: string;
  title: string;
};

/** Для форми події: прив'язка пробного до курсу на popularpoet.pl (усі курси, включно з чернетками). */
export async function fetchPoetCourseSelectOptions(): Promise<PoetCourseSelectOption[]> {
  const supabase = getServiceSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("poet_course")
    .select("id, slug, title, is_published")
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("[fetchPoetCourseSelectOptions]", error.message);
    return [];
  }

  return (data ?? []).map((row) => ({
    id: row.id as string,
    slug: row.slug as string,
    title: row.is_published ? (row.title as string) : `${row.title as string} (чернетка)`,
  }));
}
