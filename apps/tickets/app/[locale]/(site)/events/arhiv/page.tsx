import { Link } from "@/i18n/navigation";
import { getServiceSupabase } from "@/lib/supabase/admin";
import { showText } from "@/lib/shows";
import { buildPublicPageMetadata } from "@/lib/seo";
import { resolveEventCopy } from "@/lib/contentI18n";
import { formatEventDateTime } from "@/lib/format";
import type { AppLocale } from "@/i18n/routing";

export const revalidate = 60;
export async function generateMetadata({ params }: { params: Promise<{ locale: AppLocale }> }) {
  const { locale } = await params;
  return buildPublicPageMetadata({ locale, path: "/events/arhiv", title: showText[locale].archive, description: showText[locale].description });
}
export default async function ArchivePage({ params }: { params: Promise<{ locale: AppLocale }> }) {
  const { locale } = await params;
  const db = getServiceSupabase();
  if (!db) throw new Error("Не удалось загрузить архив");
  const { data, error } = await db.from("events").select("id,slug,title,title_pl,title_uk,starts_at,venue").eq("visibility", "published").eq("listing_kind", "performance").lte("starts_at", new Date().toISOString()).order("starts_at", { ascending: false });
  if (error) throw new Error("Не удалось загрузить архив");
  const t = showText[locale];
  return <div className="poet-safe-x mx-auto max-w-4xl py-10"><h1 className="font-display text-3xl text-zinc-50">{t.archive}</h1>{!data?.length ? <p className="mt-5 text-zinc-300">{locale === "pl" ? "Archiwum jest jeszcze puste." : locale === "uk" ? "В архіві поки немає подій." : "В архиве пока нет событий."}</p> : null}<ul className="mt-7 divide-y divide-white/15">{(data ?? []).map((event) => <li key={event.id}><Link className="block min-h-11 py-5 text-zinc-100 underline" href={`/events/${event.slug}`}>{resolveEventCopy(event, locale)?.title ?? event.title}<span className="mt-1 block text-sm text-zinc-300">{formatEventDateTime(event.starts_at, locale)} · {event.venue}</span></Link></li>)}</ul><Link className="mt-6 inline-flex min-h-11 items-center text-poet-gold-bright underline" href="/events">{t.afisha}</Link></div>;
}
