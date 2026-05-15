import { getPoetSupabase } from "@/lib/supabasePoet";
import { POET_KURSY_LEGACY_SLUG_REDIRECTS } from "@/lib/poetKursyLegacySlugRedirects";

export type PoetCourseRow = {
  id: string;
  slug: string;
  title: string;
  body: string | null;
  visibility: "published" | "unlisted" | "inactive";
  card_image_url: string;
  hero_image_url: string | null;
  card_variant: string;
  card_tag: string;
};

const POET_COURSE_SELECT =
  "id, slug, title, body, visibility, card_image_url, hero_image_url, card_variant, card_tag" as const;

export async function fetchPublishedPoetCourses(): Promise<PoetCourseRow[]> {
  const supabase = getPoetSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("poet_course")
    .select(POET_COURSE_SELECT)
    .eq("visibility", "published")
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("[poetCourses]", error.message);
    return [];
  }

  return (data ?? []) as PoetCourseRow[];
}

async function fetchPoetCourseRowBySlugOnce(
  supabase: NonNullable<ReturnType<typeof getPoetSupabase>>,
  slug: string,
): Promise<PoetCourseRow | null> {
  const { data, error } = await supabase
    .from("poet_course")
    .select(POET_COURSE_SELECT)
    .in("visibility", ["published", "unlisted"])
    .eq("slug", slug)
    .maybeSingle();

  if (error) {
    console.error("[poetCourses by slug]", error.message);
    return null;
  }

  return (data as PoetCourseRow | null) ?? null;
}

export async function fetchPublishedPoetCourseBySlug(slug: string): Promise<PoetCourseRow | null> {
  const supabase = getPoetSupabase();
  if (!supabase) return null;

  const direct = await fetchPoetCourseRowBySlugOnce(supabase, slug);
  if (direct) return direct;

  const canonical = POET_KURSY_LEGACY_SLUG_REDIRECTS[slug];
  if (canonical && canonical !== slug) {
    return fetchPoetCourseRowBySlugOnce(supabase, canonical);
  }

  return null;
}
