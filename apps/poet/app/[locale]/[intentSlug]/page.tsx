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

  const base = getPoetSiteUrl()?.replace(/\/$/, "");
  const pageUrl = base ? `${base}${poetCanonicalPath(loc, `/${intentSlug}`)}` : "";
  const homeUrl = base ? `${base}${poetCanonicalPath(loc, "/")}` : "";
  const faqLd = buildFaqPageJsonLd(page.faq.map((item) => ({ name: item.q, acceptedAnswer: { text: item.a } })));
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

  const breadcrumbLd =
    pageUrl && homeUrl
      ? buildBreadcrumbListJsonLd([
          { name: homeLabel, item: homeUrl },
          { name: page.h1, item: pageUrl },
        ])
      : null;

  return (
    <div className="poet-safe-x mx-auto max-w-5xl pb-12 pt-8 sm:pb-16 sm:pt-12">
      {pageLd ? <PoetJsonLd data={pageLd} /> : null}
      {breadcrumbLd ? <PoetJsonLd data={breadcrumbLd} /> : null}
      <PoetJsonLd data={faqLd} />

      <nav className="text-sm text-zinc-500">
        <Link href="/" className="text-poet-gold/90 hover:text-poet-gold-bright">
          {homeLabel}
        </Link>
      </nav>

      <header className="mt-8 max-w-3xl">
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

      <section className="mt-12 max-w-3xl">
        <h2 className="font-display text-xl font-medium text-zinc-100">{faqTitle}</h2>
        <dl className="mt-6 space-y-6 border-t border-poet-gold/10 pt-6">
          {page.faq.map((item) => (
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
