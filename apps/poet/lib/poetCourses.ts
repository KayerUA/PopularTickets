import { getPoetSupabase } from "@/lib/supabasePoet";

export type PoetCourseRow = {
  id: string;
  slug: string;
  title: string;
  kind: "improvisation" | "acting" | "playback" | "other";
  body: string | null;
};

export async function fetchPublishedPoetCourses(): Promise<PoetCourseRow[]> {
  const supabase = getPoetSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("poet_course")
    .select("id, slug, title, kind, body")
    .eq("is_published", true)
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("[poetCourses]", error.message);
    return [];
  }

  return (data ?? []) as PoetCourseRow[];
}
