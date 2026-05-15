import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { routing, type AppLocale } from "@/i18n/routing";
import { buildPoetPageMetadata, poetCanonicalPath } from "@/lib/seoPoet";
import { getPoetSiteUrl } from "@/lib/poetPublicUrl";
import { getTicketsSiteBase, ticketsHome } from "@/lib/ticketsSite";
import { THEATRE_INSTAGRAM_URL, THEATRE_TELEGRAM_URL, THEATRE_YOUTUBE_URL } from "@/lib/social";
import { PoetJsonLd } from "@/components/PoetJsonLd";
import { buildWebPageJsonLd } from "@/lib/poetJsonLd";

export const revalidate = 3600;

type PageProps = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: PageProps) {
  const { locale } = await params;
  if (!routing.locales.includes(locale as AppLocale)) return {};

  const tFacts = await getTranslations({ locale, namespace: "FactsPage" });
  const tMeta = await getTranslations({ locale, namespace: "metadata" });
  const base = getPoetSiteUrl();
  const ogImages =
    base && tMeta("ogImagePath")
      ? [{ url: `${base}${tMeta("ogImagePath")}`, width: 1200, height: 630, alt: tMeta("ogImageAlt") }]
      : undefined;

  return buildPoetPageMetadata({
    locale: locale as AppLocale,
    path: "/o-popular-poet",
    title: tFacts("metaTitle"),
    description: tFacts("metaDescription"),
    keywords: tMeta("keywords")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
    ogImages,
  });
}

export default async function PoetFactsPage({ params }: PageProps) {
  const { locale } = await params;
  if (!routing.locales.includes(locale as AppLocale)) notFound();
  setRequestLocale(locale);

  const t = await getTranslations("FactsPage");
  const tickets = getTicketsSiteBase();
  const base = getPoetSiteUrl()?.replace(/\/$/, "");
  const pagePath = "/o-popular-poet";
  const pageUrl = base ? `${base}${poetCanonicalPath(locale as AppLocale, pagePath)}` : undefined;
  const webPageLd =
    pageUrl && base
      ? buildWebPageJsonLd({
          url: pageUrl,
          name: t("h1"),
          description: t("metaDescription"),
        })
      : null;

  return (
    <div className="poet-safe-x mx-auto max-w-3xl pb-12 pt-6 sm:pb-16 sm:pt-8">
      {webPageLd ? <PoetJsonLd data={webPageLd} /> : null}

      <nav className="text-sm text-zinc-500">
        <Link href="/" className="text-poet-gold/90 hover:text-poet-gold-bright">
          {t("breadcrumbHome")}
        </Link>
        <span className="mx-2 text-zinc-600">/</span>
        <span className="text-zinc-400">{t("h1")}</span>
      </nav>

      <header className="mt-8">
        <h1 className="font-display text-3xl font-semibold tracking-tight text-gradient-gold sm:text-4xl">{t("h1")}</h1>
        <p className="mt-4 text-sm leading-relaxed text-zinc-400 sm:text-base">{t("intro")}</p>
      </header>

      <section className="mt-10 space-y-8 rounded-2xl border border-poet-gold/15 bg-poet-surface/20 p-6 sm:p-8" aria-labelledby="facts-heading">
        <h2 id="facts-heading" className="font-display text-lg font-medium text-zinc-100 sm:text-xl">
          {t("sectionFacts")}
        </h2>

        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-poet-gold/90">{t("whatTitle")}</h3>
          <p className="mt-2 text-sm leading-relaxed text-zinc-400 sm:text-base">{t("whatBody")}</p>
        </div>

        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-poet-gold/90">{t("whereTitle")}</h3>
          <p className="mt-2 text-sm leading-relaxed text-zinc-300">
            {t("whereLine1")}
            <br />
            {t("whereLine2")}
          </p>
        </div>

        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-poet-gold/90">{t("languagesTitle")}</h3>
          <p className="mt-2 text-sm leading-relaxed text-zinc-400 sm:text-base">{t("languagesBody")}</p>
        </div>

        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-poet-gold/90">{t("ticketsTitle")}</h3>
          <p className="mt-2 text-sm leading-relaxed text-zinc-400 sm:text-base">
            {t("ticketsBodyBefore")}
            {tickets ? (
              <a href={ticketsHome(locale as AppLocale)} className="font-medium text-poet-gold/90 hover:text-poet-gold-bright">
                {t("ticketsCta")}
              </a>
            ) : (
              <strong className="text-zinc-300">PopularTickets</strong>
            )}
            {t("ticketsBodyAfter")}
          </p>
        </div>

        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-poet-gold/90">{t("socialTitle")}</h3>
          <ul className="mt-3 list-inside list-disc space-y-1.5 text-sm text-poet-gold/90">
            <li>
              <a href={THEATRE_INSTAGRAM_URL} className="hover:text-poet-gold-bright" target="_blank" rel="noopener noreferrer">
                {t("socialInstagramLine")}
              </a>
            </li>
            <li>
              <a href={THEATRE_YOUTUBE_URL} className="hover:text-poet-gold-bright" target="_blank" rel="noopener noreferrer">
                {t("socialYoutubeLine")}
              </a>
            </li>
            <li>
              <a href={THEATRE_TELEGRAM_URL} className="hover:text-poet-gold-bright" target="_blank" rel="noopener noreferrer">
                {t("socialTelegramLine")}
              </a>
            </li>
          </ul>
        </div>
      </section>

      <p className="mt-10">
        <Link href="/" className="text-sm font-medium text-poet-gold/90 hover:text-poet-gold-bright">
          ← {t("backHome")}
        </Link>
      </p>
    </div>
  );
}
