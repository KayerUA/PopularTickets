import Link from "next/link";
import { getServiceSupabase } from "@/lib/supabase/admin";
import { SupabaseSetupHint } from "@/components/SupabaseSetupHint";

export default async function AdminPoetCoursesPage() {
  const supabase = getServiceSupabase();
  if (!supabase) {
    return <SupabaseSetupHint variant="setup" />;
  }

  const { data: rows, error } = await supabase
    .from("poet_course")
    .select("id,slug,title,kind,sort_order,visibility")
    .order("sort_order", { ascending: true });

  if (error) {
    return (
      <p className="text-red-400">
        {error.message} — выполните SQL <code className="font-mono">supabase/courses-poet.sql</code>, если таблицы ещё
        нет.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-zinc-50">Курсы Popular Poet</h1>
          <p className="text-sm text-zinc-500">Главная popularpoet.pl — направления и текст карточек.</p>
        </div>
        <Link href="/admin/poet-courses/new" className="btn-poet poet-shine px-5 py-2 text-sm">
          Добавить курс
        </Link>
      </div>
      <div className="overflow-x-auto rounded-2xl border border-poet-gold/15">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-zinc-900/80 text-xs uppercase text-zinc-500">
            <tr>
              <th className="px-4 py-3">Порядок</th>
              <th className="px-4 py-3">Название</th>
              <th className="px-4 py-3">Тип</th>
              <th className="px-4 py-3">Slug</th>
              <th className="px-4 py-3">Статус</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-poet-gold/10">
            {(rows ?? []).map((r) => (
              <tr key={r.id as string} className="bg-zinc-950/40">
                <td className="px-4 py-3 text-zinc-400">{r.sort_order as number}</td>
                <td className="px-4 py-3 text-white">{r.title as string}</td>
                <td className="px-4 py-3 text-zinc-400">{r.kind as string}</td>
                <td className="px-4 py-3 font-mono text-xs text-zinc-500">{r.slug as string}</td>
                <td className="px-4 py-3">
                  {(r as { visibility?: string }).visibility === "published" ? (
                    <span className="text-poet-gold-bright">опубликовано</span>
                  ) : (r as { visibility?: string }).visibility === "unlisted" ? (
                    <span className="text-amber-200/90">только ссылка</span>
                  ) : (
                    <span className="text-zinc-500">не активен</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <Link href={`/admin/poet-courses/${r.id}/edit`} className="text-poet-gold hover:text-poet-gold-bright">
                    Изменить
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
