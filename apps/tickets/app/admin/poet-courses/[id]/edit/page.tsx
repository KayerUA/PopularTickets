import { notFound } from "next/navigation";
import { getServiceSupabase } from "@/lib/supabase/admin";
import { SupabaseSetupHint } from "@/components/SupabaseSetupHint";
import { PoetCourseForm, type AdminPoetCourseRow } from "@/components/PoetCourseForm";

const SELECT = "id,slug,title,kind,body,is_published,sort_order" as const;

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
    kind: row.kind as AdminPoetCourseRow["kind"],
    body: row.body as string | null,
    is_published: Boolean(row.is_published),
    sort_order: row.sort_order as number,
  };

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-semibold text-zinc-50">Редактирование курса</h1>
      <PoetCourseForm course={course} />
    </div>
  );
}
