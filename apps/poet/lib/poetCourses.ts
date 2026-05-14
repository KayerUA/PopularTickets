import { getPoetSupabase } from "@/lib/supabasePoet";

export type PoetCourseRow = {
  id: string;
  slug: string;
  title: string;
  kind: "improvisation" | "acting" | "playback" | "masterclass" | "other";
  body: string | null;
  visibility: "published" | "unlisted" | "inactive";
};

export async function fetchPublishedPoetCourses(): Promise<PoetCourseRow[]> {
  const supabase = getPoetSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("poet_course")
    .select("id, slug, title, kind, body, visibility")
    .eq("visibility", "published")
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("[poetCourses]", error.message);
    return [];
  }

  return (data ?? []) as PoetCourseRow[];
}

export async function fetchPublishedPoetCourseBySlug(slug: string): Promise<PoetCourseRow | null> {
  const supabase = getPoetSupabase();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("poet_course")
    .select("id, slug, title, kind, body, visibility")
    .in("visibility", ["published", "unlisted"])
    .eq("slug", slug)
    .maybeSingle();

  if (error) {
    console.error("[poetCourses by slug]", error.message);
    return null;
  }

  return (data as PoetCourseRow | null) ?? null;
}
