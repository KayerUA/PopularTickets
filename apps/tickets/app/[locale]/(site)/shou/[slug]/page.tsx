import Image from "next/image";
import { notFound } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { routing, type AppLocale } from "@/i18n/routing";
import { fetchShows, showText } from "@/lib/shows";
import { getServiceSupabase } from "@/lib/supabase/admin";
import { buildPublicPageMetadata } from "@/lib/seo";
import { formatEventDateTime, formatPlnFromGrosze } from "@/lib/format";
import { resolveEventCopy } from "@/lib/contentI18n";
import { JsonLd } from "@/components/JsonLd";
import { buildBreadcrumbListJsonLd, buildEventItemListJsonLd } from "@/lib/seo/eventJsonLd";
import { getPublicAppUrl } from "@/lib/publicAppUrl";
import { POPULAR_POET_SITE_URL } from "@/lib/theatre";
import { effectiveEventPriceGrosze } from "@/lib/eventPrice";

export const revalidate = 60;
type Props = { params: Promise<{ locale: AppLocale; slug: string }> };

export async function generateMetadata({ params }: Props) {
  const { locale, slug } = await params;
  if (!routing.locales.includes(locale)) return {};
  const show = (await fetchShows()).find((row) => row.slug === slug);
  if (!show) return {};
  return buildPublicPageMetadata({ locale, path: `/shou/${slug}`, title: `${show.title} · ${showText[locale].formats[show.format]} · Warszawa`, description: `${show.title}. ${showText[locale].description}` });
}

export default async function ShowPage({ params }: Props) {
  const { locale, slug } = await params;
  if (!routing.locales.includes(locale)) notFound();
  const show = (await fetchShows()).find((row) => row.slug === slug);
  if (!show) notFound();
  const db = getServiceSupabase();
  if (!db) throw new Error("Не удалось загрузить события");
  const { data, error } = await db.from("events").select("id,slug,title,title_pl,title_uk,description,venue,starts_at,ends_at,image_url,price_grosze,day_of_event_price_grosze,discount_periods,total_tickets,listing_kind,event_language").eq("show_id", show.id).eq("visibility", "published").order("starts_at");
  if (error) throw new Error("Не удалось загрузить показы");
  const events = data ?? [];
  const now = Date.now();
  const upcoming = events.filter((row) => Date.parse(row.starts_at) > now);
  const past = events.filter((row) => Date.parse(row.starts_at) <= now).reverse();
  const { data: tickets, error: ticketError } = upcoming.length ? await db.from("tickets").select("event_id").in("event_id", upcoming.map((row) => row.id)) : { data: [], error: null };
  if (ticketError) throw new Error("Не удалось проверить билеты");
  const sold = new Map<string, number>();
  for (const ticket of tickets ?? []) sold.set(ticket.event_id, (sold.get(ticket.event_id) ?? 0) + 1);
  const t = showText[locale];
  const base = getPublicAppUrl();
  const image = [...events].reverse().find((row) => row.image_url)?.image_url;
  const eventList = buildEventItemListJsonLd(locale, show.title, base ? `${base}/${locale}/shou/${slug}` : undefined, upcoming.map((event) => ({ event: { ...event, title: resolveEventCopy(event, locale)?.title ?? event.title, price_grosze: effectiveEventPriceGrosze(event) }, remaining: Math.max(0, event.total_tickets - (sold.get(event.id) ?? 0)), soldOut: (sold.get(event.id) ?? 0) >= event.total_tickets })));
  return <div className="poet-safe-x mx-auto max-w-5xl py-8 sm:py-12">
    {base ? <><JsonLd data={buildBreadcrumbListJsonLd([{ name: "PopularTickets", item: `${base}/${locale}` }, { name: t.repertoire, item: `${base}/${locale}/shou` }, { name: show.title, item: `${base}/${locale}/shou/${slug}` }])} /><JsonLd data={{ "@context": "https://schema.org", "@type": "CreativeWork", "@id": `${base}/shou/${slug}#work`, name: show.title, url: `${base}/${locale}/shou/${slug}` }} /></> : null}
    {eventList ? <JsonLd data={eventList} /> : null}
    <nav aria-label={t.repertoire} className="flex flex-wrap gap-4 text-sm text-zinc-300"><Link className="inline-flex min-h-11 items-center underline" href="/shou">{t.repertoire}</Link><Link className="inline-flex min-h-11 items-center underline" href="/events">{t.afisha}</Link></nav>
    <header className="mt-6 grid items-start gap-6 sm:grid-cols-[minmax(0,1fr)_220px] lg:grid-cols-[minmax(0,1fr)_280px]">
      <div><p className="text-sm text-poet-gold-bright">{t.formats[show.format]}</p><h1 className="mt-3 break-words font-display text-3xl text-zinc-50 sm:text-4xl">{show.title}</h1><p className="mt-5 max-w-xl leading-relaxed text-zinc-300">{t.description}</p></div>
      {image ? <Image src={image} alt={show.title} width={700} height={1000} sizes="(max-width: 639px) 100vw, 280px" className="max-h-96 w-full rounded-xl object-contain sm:max-h-none" /> : null}
    </header>
    <section className="mt-10"><h2 className="font-display text-2xl text-zinc-50">{t.upcoming}</h2>{upcoming.length ? <ul className="mt-5 divide-y divide-white/15">{upcoming.map((event) => <li key={event.id} className="py-5"><h3 className="text-lg text-zinc-100">{formatEventDateTime(event.starts_at, locale)}</h3><p className="mt-1 text-zinc-300">{event.venue}</p><p className="mt-1 text-zinc-300">{formatPlnFromGrosze(effectiveEventPriceGrosze(event))}</p><Link href={`/events/${event.slug}`} className="mt-3 inline-flex min-h-11 items-center rounded-lg bg-poet-gold px-5 font-semibold text-zinc-950">{t.ticket}</Link></li>)}</ul> : <p className="mt-4 text-zinc-300">{t.empty} <Link href="/events" className="underline">{t.afisha}</Link></p>}</section>
    {past.length ? <section className="mt-10"><h2 className="font-display text-2xl text-zinc-50">{t.past}</h2><ul className="mt-4 divide-y divide-white/15">{past.map((event) => <li key={event.id}><Link href={`/events/${event.slug}`} className="block min-h-11 py-4 text-zinc-300 underline">{formatEventDateTime(event.starts_at, locale)} · {event.venue}</Link></li>)}</ul></section> : null}
    <section className="mt-10 border-t border-white/15 pt-6"><h2 className="font-display text-xl text-zinc-100">{t.course}</h2><a className="mt-3 inline-flex min-h-11 items-center text-poet-gold-bright underline" href={`${POPULAR_POET_SITE_URL}/${locale}/kursy/${show.format === "theatre" ? "acting" : "improv"}`}>{show.format === "theatre" ? t.acting : t.learn}</a></section>
  </div>;
}
