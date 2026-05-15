import { notFound } from "next/navigation";
import { getServiceSupabase } from "@/lib/supabase/admin";
import { SupabaseSetupHint } from "@/components/SupabaseSetupHint";
import { PoetCourseForm, type AdminPoetCourseRow } from "@/components/PoetCourseForm";
import { parseContentVisibilityFromForm } from "@/lib/contentVisibility";

const SELECT =
  "id,slug,title,body,visibility,sort_order,card_image_url,hero_image_url,card_variant,card_tag" as const;

export default async function EditPoetCoursePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = getServiceSupabase();
  if (!supabase) {
    return <SupabaseSetupHint variant="setup" />;
  }

  const { data: row, error } = await supabase.from("poet_course").select(SELECT).eq("id", id).maybeSingle();

  if (error || !row) notFound();

  const course: AdminPoetCourseRow = {
    id: row.id as string,
    slug: row.slug as string,
    title: row.title as string,
    body: row.body as string | null,
    visibility: parseContentVisibilityFromForm(row.visibility),
    sort_order: row.sort_order as number,
    card_image_url: String((row as { card_image_url?: unknown }).card_image_url ?? "/courses/theatre.jpg"),
    hero_image_url: (() => {
      const h = (row as { hero_image_url?: unknown }).hero_image_url;
      return typeof h === "string" && h.trim() ? h.trim() : null;
    })(),
    card_variant: String((row as { card_variant?: unknown }).card_variant ?? "improv"),
    card_tag: typeof (row as { card_tag?: unknown }).card_tag === "string" ? (row as { card_tag: string }).card_tag : "",
  };

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-semibold text-zinc-50">Редактирование курса</h1>
      <PoetCourseForm course={course} />
    </div>
  );
}
