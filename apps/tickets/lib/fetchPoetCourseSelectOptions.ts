import { getServiceSupabase } from "@/lib/supabase/admin";

export type PoetCourseSelectOption = {
  id: string;
  slug: string;
  title: string;
};

function optionLabel(title: string, visibility: string): string {
  if (visibility === "published") return title;
  if (visibility === "unlisted") return `${title} (только ссылка)`;
  return `${title} (не активен)`;
}

/** Для формы события: привязка пробного к курсу на popularpoet.pl (все курсы). */
export async function fetchPoetCourseSelectOptions(): Promise<PoetCourseSelectOption[]> {
  const supabase = getServiceSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("poet_course")
    .select("id, slug, title, visibility")
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("[fetchPoetCourseSelectOptions]", error.message);
    return [];
  }

  return (data ?? []).map((row) => ({
    id: row.id as string,
    slug: row.slug as string,
    title: optionLabel(row.title as string, String(row.visibility ?? "inactive")),
  }));
}
