import { Link } from "@/i18n/navigation";
import { fetchShows, showText } from "@/lib/shows";
import { buildPublicPageMetadata } from "@/lib/seo";
import type { AppLocale } from "@/i18n/routing";

export const revalidate = 60;
export async function generateMetadata({ params }: { params: Promise<{ locale: AppLocale }> }) {
  const { locale } = await params;
  return buildPublicPageMetadata({ locale, path: "/shou", title: showText[locale].repertoire, description: showText[locale].description });
}
export default async function RepertoirePage({ params }: { params: Promise<{ locale: AppLocale }> }) {
  const { locale } = await params;
  const shows = await fetchShows();
  const t = showText[locale];
  return <div className="poet-safe-x mx-auto max-w-4xl py-10"><h1 className="font-display text-3xl text-zinc-50">{t.repertoire}</h1>{shows.length === 0 ? <p className="mt-5 text-zinc-300">{t.empty}</p> : null}<ul className="mt-7 divide-y divide-white/15">{shows.map((show) => <li key={show.id}><Link className="block min-h-11 py-5 text-xl text-zinc-100 underline" href={`/shou/${show.slug}`}>{show.title}<span className="mt-1 block text-sm text-zinc-300">{t.formats[show.format]}</span></Link></li>)}</ul><Link className="mt-6 inline-flex min-h-11 items-center text-poet-gold-bright underline" href="/events/arhiv">{t.archive}</Link></div>;
}
