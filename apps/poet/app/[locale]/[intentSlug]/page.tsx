import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { routing, type AppLocale } from "@/i18n/routing";
import { buildPoetPageMetadata, poetCanonicalPath } from "@/lib/seoPoet";
import { poetIntentHreflangUrls } from "@/lib/poetIntentClusters";
import { getPoetSiteUrl } from "@/lib/poetPublicUrl";
import { PoetJsonLd } from "@/components/PoetJsonLd";
import { buildBreadcrumbListJsonLd, buildFaqPageJsonLd, buildWebPageJsonLd } from "@/lib/poetJsonLd";
import { allPoetIntentPages, poetIntentPage } from "@/lib/poetIntentRoutes";
import { getPoetIntentHubExpansion } from "@/lib/poetIntentHubExpansions";
import { fetchPoetIntentTicketEvents } from "@/lib/poetIntentEvents";
import { filterTrialsForIntentCluster } from "@/lib/poetIntentTrialFilter";
import { fetchPublishedTrials } from "@/lib/poetTrials";
import { buildPoetTrialItemListJsonLd } from "@/lib/poetTrialJsonLd";
import { getTicketsSiteBase } from "@/lib/ticketsSite";
import { formatEventDateTime } from "@/lib/formatEventDateTime";

type PageProps = { params: Promise<{ locale: string; intentSlug: string }> };

export function generateStaticParams() {
  return allPoetIntentPages().map(({ locale, page }) => ({
    locale,
    intentSlug: page.slug,
  }));
}

export const dynamicParams = true;

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, intentSlug } = await params;
  if (!routing.locales.includes(locale as AppLocale)) return {};
  const loc = locale as AppLocale;
  const page = poetIntentPage(loc, intentSlug);
  if (!page) return {};
  return buildPoetPageMetadata({
    locale: loc,
    path: `/${intentSlug}`,
    title: page.title,
    description: page.description,
    hreflangAlternateUrls: poetIntentHreflangUrls(loc, intentSlug),
    keywords: [
      page.h1,
      "Popular Poet",
      loc === "pl" ? "Warszawa" : "Варшава",
      loc === "pl" ? "kurs aktorski" : loc === "ru" ? "актёрские курсы" : "акторські курси",
      loc === "pl" ? "warsztaty aktorskie" : loc === "ru" ? "актёрское мастерство" : "акторська майстерність",
      loc === "pl" ? "improwizacja" : loc === "ru" ? "импровизация" : "імпровізація",
    ],
  });
}

export default async function PoetIntentPage({ params }: PageProps) {
  const { locale, intentSlug } = await params;
  if (!routing.locales.includes(locale as AppLocale)) notFound();
  const loc = locale as AppLocale;
  setRequestLocale(loc);
  const page = poetIntentPage(loc, intentSlug);
  if (!page) notFound();

  const expansion = getPoetIntentHubExpansion(loc, intentSlug);
  const allFaq = [...page.faq, ...(expansion?.extraFaq ?? [])];

  const base = getPoetSiteUrl()?.replace(/\/$/, "");
  const pageUrl = base ? `${base}${poetCanonicalPath(loc, `/${intentSlug}`)}` : "";
  const homeUrl = base ? `${base}${poetCanonicalPath(loc, "/")}` : "";
  const faqLd = buildFaqPageJsonLd(allFaq.map((item) => ({ name: item.q, acceptedAnswer: { text: item.a } })));
  const pageLd = pageUrl
    ? buildWebPageJsonLd({
        url: pageUrl,
        name: page.h1,
        description: page.description,
      })
    : null;

  const homeLabel = loc === "pl" ? "Strona główna" : loc === "ru" ? "Главная" : "Головна";
  const cityLabel = loc === "pl" ? "Popular Poet · Warszawa" : "Popular Poet · Варшава";
  const bulletsAria = loc === "pl" ? "Najważniejsze informacje" : loc === "ru" ? "Коротко" : "Коротко";
  const faqTitle = loc === "pl" ? "Najczęstsze pytania" : loc === "ru" ? "Частые вопросы" : "Часті запитання";
  const ticketsHeading =
    loc === "pl"
      ? "Najbliższe wydarzenia na PopularTickets"
      : loc === "ru"
        ? "Ближайшие события на PopularTickets"
        : "Найближні події на PopularTickets";
  const relatedHeading =
    loc === "pl" ? "Powiązane tematy" : loc === "ru" ? "Похожие темы" : "Схожі теми";
  const ticketsEmpty =
    loc === "pl"
      ? "Brak opublikowanych terminów — sprawdź kalendarz później."
      : loc === "ru"
        ? "Нет опубликованных дат — загляните позже."
        : "Немає опублікованих дат — зайдіть пізніше.";

  const breadcrumbLd =
    pageUrl && homeUrl
      ? buildBreadcrumbListJsonLd([
          { name: homeLabel, item: homeUrl },
          { name: page.h1, item: pageUrl },
        ])
      : null;

  const ticketsBase = getTicketsSiteBase();
  const ticketEvents = expansion
    ? await fetchPoetIntentTicketEvents(loc, expansion.ticketsCluster, ticketsBase)
    : [];

  const allTrials = expansion ? await fetchPublishedTrials(loc) : [];
  const intentTrials = expansion ? filterTrialsForIntentCluster(allTrials, expansion.ticketsCluster) : [];
  const eventsListLd =
    pageUrl && intentTrials.length
      ? buildPoetTrialItemListJsonLd({
          trials: intentTrials,
          locale: loc,
          listName: ticketsHeading,
          listUrl: pageUrl,
          poetBaseUrl: base ?? undefined,
        })
      : null;

  const relatedHubs = (expansion?.relatedHubSlugs ?? [])
    .map((hubSlug) => {
      const hub = poetIntentPage(loc, hubSlug);
      return hub ? { slug: hubSlug, label: hub.h1 } : null;
    })
    .filter((x): x is { slug: string; label: string } => x !== null);

  return (
    <div className="poet-safe-x mx-auto max-w-5xl pb-12 pt-8 sm:pb-16 sm:pt-12">
      {pageLd ? <PoetJsonLd data={pageLd} /> : null}
      {breadcrumbLd ? <PoetJsonLd data={breadcrumbLd} /> : null}
      {eventsListLd ? <PoetJsonLd data={eventsListLd} /> : null}
      <PoetJsonLd data={faqLd} />

      <nav className="mb-6 text-sm text-zinc-500" aria-label="Breadcrumb">
        <ol className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <li>
            <Link href="/" className="text-zinc-400 underline decoration-zinc-600 underline-offset-2 hover:text-zinc-200">
              {homeLabel}
            </Link>
          </li>
          <li aria-hidden className="text-zinc-600">
            /
          </li>
          <li className="max-w-[min(100%,28rem)] truncate text-zinc-300" title={page.h1}>
            {page.h1}
          </li>
        </ol>
      </nav>

      <header className="max-w-3xl">
        <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-poet-gold/80">{cityLabel}</p>
        <h1 className="font-display mt-3 text-3xl font-semibold tracking-tight text-gradient-gold sm:text-5xl">
          {page.h1}
        </h1>
        <p className="mt-5 text-base leading-relaxed text-zinc-300 sm:text-lg">{page.lead}</p>
        <div className="mt-7 flex flex-wrap gap-3">
          <Link href={page.courseHref} className="btn-poet-theatre btn-poet inline-flex no-underline">
            {page.courseCta}
          </Link>
          <Link
            href="/#schedule"
            className="inline-flex items-center justify-center rounded-full border border-zinc-600/80 px-5 py-2.5 text-sm font-medium text-zinc-200 no-underline transition hover:border-zinc-500 hover:text-white"
          >
            {page.scheduleCta}
          </Link>
        </div>
      </header>

      <section className="mt-10 grid gap-4 sm:grid-cols-2" aria-label={bulletsAria}>
        {page.bullets.map((item) => (
          <div key={item} className="rounded-2xl border border-poet-gold/15 bg-poet-surface/30 px-5 py-4 text-sm leading-relaxed text-zinc-300">
            {item}
          </div>
        ))}
      </section>

      {expansion?.sections.map((section) => (
        <section key={section.heading} className="mt-12 max-w-3xl">
          <h2 className="font-display text-xl font-medium text-zinc-100 sm:text-2xl">{section.heading}</h2>
          <div className="mt-5 space-y-4">
            {section.paragraphs.map((paragraph) => (
              <p key={paragraph.slice(0, 48)} className="text-base leading-relaxed text-zinc-300">
                {paragraph}
              </p>
            ))}
          </div>
        </section>
      ))}

      {expansion ? (
        <section className="mt-12 max-w-3xl" aria-labelledby="intent-tickets-heading">
          <h2 id="intent-tickets-heading" className="font-display text-xl font-medium text-zinc-100 sm:text-2xl">
            {ticketsHeading}
          </h2>
          {ticketEvents.length ? (
            <ul className="mt-5 space-y-3 border-t border-poet-gold/10 pt-5">
              {ticketEvents.map((ev) => (
                <li key={ev.slug}>
                  <a
                    href={ev.href}
                    className="block rounded-xl border border-poet-gold/15 bg-poet-surface/30 px-4 py-3 no-underline transition hover:border-poet-gold/35"
                  >
                    <p className="font-medium text-poet-gold-bright">{ev.title}</p>
                    <p className="mt-1 text-sm text-zinc-400">{formatEventDateTime(ev.startsAt, loc)}</p>
                    <p className="mt-0.5 text-sm text-zinc-500">{ev.venue}</p>
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-sm text-zinc-500">{ticketsEmpty}</p>
          )}
        </section>
      ) : null}

      {relatedHubs.length ? (
        <section className="mt-10 max-w-3xl">
          <h2 className="font-display text-lg font-medium text-zinc-100">{relatedHeading}</h2>
          <ul className="mt-4 flex flex-wrap gap-2">
            {relatedHubs.map((hub) => (
              <li key={hub.slug}>
                <Link
                  href={`/${hub.slug}`}
                  className="inline-flex rounded-full border border-poet-gold/25 px-3 py-1.5 text-sm text-poet-gold-bright no-underline transition hover:border-poet-gold/45"
                >
                  {hub.label}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="mt-12 max-w-3xl">
        <h2 className="font-display text-xl font-medium text-zinc-100">{faqTitle}</h2>
        <dl className="mt-6 space-y-6 border-t border-poet-gold/10 pt-6">
          {allFaq.map((item) => (
            <div key={item.q}>
              <dt className="text-sm font-semibold text-zinc-200">{item.q}</dt>
              <dd className="mt-2 text-sm leading-relaxed text-zinc-400">{item.a}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}
