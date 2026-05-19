import { getPoetSupabase } from "@/lib/supabasePoet";
import { POET_KURSY_LEGACY_SLUG_REDIRECTS } from "@/lib/poetKursyLegacySlugRedirects";

export type PoetCourseRow = {
  id: string;
  slug: string;
  title: string;
  body: string | null;
  title_pl: string | null;
  body_pl: string | null;
  title_uk: string | null;
  body_uk: string | null;
  card_tag_pl: string | null;
  card_tag_uk: string | null;
  visibility: "published" | "unlisted" | "inactive";
  card_image_url: string;
  hero_image_url: string | null;
  card_variant: string;
  card_tag: string;
};

const POET_COURSE_SELECT =
  "id, slug, title, body, title_pl, body_pl, title_uk, body_uk, card_tag_pl, card_tag_uk, visibility, card_image_url, hero_image_url, card_variant, card_tag" as const;

export async function fetchPublishedPoetCourses(): Promise<PoetCourseRow[]> {
  const supabase = getPoetSupabase();
  if (!supabase) return [];

  const full = await supabase
    .from("poet_course")
    .select(POET_COURSE_SELECT)
    .eq("visibility", "published")
    .order("sort_order", { ascending: true });

  if (!full.error) return (full.data ?? []) as PoetCourseRow[];

  const basicSel =
    "id, slug, title, body, visibility, card_image_url, hero_image_url, card_variant, card_tag" as const;
  const basic = await supabase
    .from("poet_course")
    .select(basicSel)
    .eq("visibility", "published")
    .order("sort_order", { ascending: true });

  if (basic.error) {
    console.error("[poetCourses]", basic.error.message);
    return [];
  }

  return ((basic.data ?? []) as Omit<PoetCourseRow, "title_pl" | "body_pl" | "title_uk" | "body_uk" | "card_tag_pl" | "card_tag_uk">[]).map(
    (row) => ({
      ...row,
      title_pl: null,
      body_pl: null,
      title_uk: null,
      body_uk: null,
      card_tag_pl: null,
      card_tag_uk: null,
    }),
  );
}

async function fetchPoetCourseRowBySlugOnce(
  supabase: NonNullable<ReturnType<typeof getPoetSupabase>>,
  slug: string,
): Promise<PoetCourseRow | null> {
  const full = await supabase
    .from("poet_course")
    .select(POET_COURSE_SELECT)
    .in("visibility", ["published", "unlisted"])
    .eq("slug", slug)
    .maybeSingle();

  if (!full.error && full.data) return full.data as PoetCourseRow;

  const basicSel =
    "id, slug, title, body, visibility, card_image_url, hero_image_url, card_variant, card_tag" as const;
  const basic = await supabase
    .from("poet_course")
    .select(basicSel)
    .in("visibility", ["published", "unlisted"])
    .eq("slug", slug)
    .maybeSingle();

  if (basic.error) {
    console.error("[poetCourses by slug]", basic.error.message);
    return null;
  }
  if (!basic.data) return null;

  return {
    ...(basic.data as Omit<PoetCourseRow, "title_pl" | "body_pl" | "title_uk" | "body_uk" | "card_tag_pl" | "card_tag_uk">),
    title_pl: null,
    body_pl: null,
    title_uk: null,
    body_uk: null,
    card_tag_pl: null,
    card_tag_uk: null,
  };
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
