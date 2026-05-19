import { notFound } from "next/navigation";
import { getServiceSupabase } from "@/lib/supabase/admin";
import { SupabaseSetupHint } from "@/components/SupabaseSetupHint";
import { PoetCourseForm, type AdminPoetCourseRow } from "@/components/PoetCourseForm";
import { parseContentVisibilityFromForm } from "@/lib/contentVisibility";
import { isTranslateConfigured, translateProviderLabel } from "@/lib/translateContent";

const SELECT =
  "id,slug,title,body,title_pl,body_pl,title_uk,body_uk,card_tag_pl,card_tag_uk,visibility,sort_order,card_image_url,hero_image_url,card_variant,card_tag" as const;
const SELECT_LEGACY =
  "id,slug,title,body,visibility,sort_order,card_image_url,hero_image_url,card_variant,card_tag" as const;

export default async function EditPoetCoursePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = getServiceSupabase();
  if (!supabase) {
    return <SupabaseSetupHint variant="setup" />;
  }

  const full = await supabase.from("poet_course").select(SELECT).eq("id", id).maybeSingle();

  type Row = Record<string, unknown>;
  let row: Row | null = (full.data as Row | null) ?? null;
  if (full.error?.code === "42703") {
    const legacy = await supabase.from("poet_course").select(SELECT_LEGACY).eq("id", id).maybeSingle();
    if (legacy.error || !legacy.data) notFound();
    row = legacy.data as Row;
  } else if (full.error || !row) {
    notFound();
  }

  const translateProviderHint = isTranslateConfigured()
    ? translateProviderLabel()
    : "не настроен (DEEPL_AUTH_KEY или LIBRETRANSLATE_URL)";

  const course: AdminPoetCourseRow = {
    id: row.id as string,
    slug: row.slug as string,
    title: row.title as string,
    body: row.body as string | null,
    title_pl: (row.title_pl as string | null | undefined) ?? null,
    body_pl: (row.body_pl as string | null | undefined) ?? null,
    title_uk: (row.title_uk as string | null | undefined) ?? null,
    body_uk: (row.body_uk as string | null | undefined) ?? null,
    card_tag_pl: (row.card_tag_pl as string | null | undefined) ?? null,
    card_tag_uk: (row.card_tag_uk as string | null | undefined) ?? null,
    visibility: parseContentVisibilityFromForm(row.visibility),
    sort_order: row.sort_order as number,
    card_image_url: String(row.card_image_url ?? "/courses/theatre.jpg"),
    hero_image_url: (() => {
      const h = row.hero_image_url;
      return typeof h === "string" && h.trim() ? h.trim() : null;
    })(),
    card_variant: String(row.card_variant ?? "improv"),
    card_tag: typeof row.card_tag === "string" ? row.card_tag : "",
  };

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-semibold text-zinc-50">Редактирование курса</h1>
      <PoetCourseForm course={course} translateProviderHint={translateProviderHint} />
    </div>
  );
}
