import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { capitalizeWeekday, formatEventDateTimeParts, formatPlnFromGrosze } from "@/lib/format";
import { EventCheckoutForm } from "@/components/EventCheckoutForm";
import { EventMobileStickyCta } from "@/components/EventMobileStickyCta";
import { RelatedEventsSection } from "@/components/RelatedEventsSection";
import type { EventCardProps } from "@/components/EventCard";
import { COMPANY } from "@/lib/company";
import type { ApplicablePromo } from "@/lib/promoCodes";

export const PIMPRO_PARTY_SLUG = "pimpro-shou-vecherinka-2026-11-15";

const RUN = {
  ru: { kicker: "Шоу + вечеринка", impro: "Импровизация", dj: "DJ-сет" },
  uk: { kicker: "Шоу + вечірка", impro: "Імпровізація", dj: "DJ-сет" },
  pl: { kicker: "Show + impreza", impro: "Improwizacja", dj: "DJ set" },
} as const;

function faqHowToGet(locale: AppLocale, venue: string): string {
  if (locale === "pl") return `Adres i link do mapy są na tej stronie: ${venue}.`;
  if (locale === "uk") return `Адреса та посилання на карту вказані на цій сторінці: ${venue}.`;
  return `Адрес и ссылка на карту указаны на этой странице: ${venue}.`;
}

type Props = {
  locale: AppLocale;
  title: string;
  description: string;
  imageUrl: string | null;
  startsAt: string;
  venue: string;
  priceGrosze: number;
  remaining: number;
  mapsHref: string | null;
  showCheckout: boolean;
  isPast: boolean;
  eventSlug: string;
  bypassPayment: boolean;
  promo: ApplicablePromo | null;
  related: EventCardProps[];
  ticketsIntentPath: string | null;
  poetHubUrl: string | null;
};

export async function PimproTicketPage({
  locale,
  title,
  description,
  imageUrl,
  startsAt,
  venue,
  priceGrosze,
  remaining,
  mapsHref,
  showCheckout,
  isPast,
  eventSlug,
  bypassPayment,
  promo,
  related,
  ticketsIntentPath,
  poetHubUrl,
}: Props) {
  const t = await getTranslations({ locale, namespace: "EventPage" });
  const run = RUN[locale];
  const when = formatEventDateTimeParts(startsAt, locale);
  const lead = description.split(/\n\s*\n/)[0]?.trim() ?? "";
  const faqPairs = [
    ["faqQ1", "faqA1"],
    ["faqQ2", "faqA2"],
    ["faqQ3", "faqA3"],
    ["faqQ4", "faqA4"],
  ] as const;

  return (
    <div className={showCheckout ? "pb-[calc(5.75rem+env(safe-area-inset-bottom,0px))] md:pb-0" : ""}>
      <div className="lg:grid lg:grid-cols-2">
        <section className="flex flex-col justify-end bg-black px-4 pb-2 pt-8 text-[#e6e5e1] sm:px-8 lg:col-start-1 lg:row-start-1 lg:px-10 lg:pb-0 lg:pt-12">
          <nav className="mb-8 text-sm" aria-label={t("breadcrumbAria")}>
            <ol className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <li>
                <Link href="/" className="text-[#e6e5e1] underline decoration-[#e6e5e1]/40 underline-offset-2 hover:text-[#e6e5e1] hover:decoration-[#e6e5e1]">
                  {t("breadcrumbHome")}
                </Link>
              </li>
              <li aria-hidden>/</li>
              <li>
                <Link href="/events" className="text-[#e6e5e1] underline decoration-[#e6e5e1]/40 underline-offset-2 hover:text-[#e6e5e1] hover:decoration-[#e6e5e1]">
                  {t("breadcrumbAfisha")}
                </Link>
              </li>
            </ol>
          </nav>
          <h1>
            <span className="sr-only">{title}</span>
            <img
              src="/brand/pimpro/wordmark-on-black.png"
              alt=""
              width={1232}
              height={328}
              className="h-auto w-full"
            />
          </h1>
        </section>

        <div className="hidden bg-[#e6e5e1] px-4 sm:px-8 lg:col-start-2 lg:row-start-1 lg:flex lg:flex-col lg:justify-end lg:px-10 lg:pt-12" aria-hidden>
          <img
            src="/brand/pimpro/wordmark-on-bone.png"
            alt=""
            width={1232}
            height={332}
            className="h-auto w-full"
          />
        </div>

        <div className="grid grid-cols-2 lg:col-span-2 lg:row-start-2">
          <div className="border-t border-[#e6e5e1] bg-black px-4 py-4 text-[#e6e5e1] sm:px-8 sm:py-6 lg:px-10">
            <p className="text-[15px] font-black tabular-nums leading-none tracking-tight sm:text-3xl lg:text-4xl">19:00–20:30</p>
            <p className="mt-2 text-[10px] font-black uppercase tracking-[0.14em] sm:text-sm">{run.impro}</p>
          </div>
          <div className="border-t border-black bg-[#e6e5e1] px-4 py-4 text-black sm:px-8 sm:py-6 lg:px-10">
            <p className="text-[15px] font-black tabular-nums leading-none tracking-tight sm:text-3xl lg:text-4xl">20:30–22:30</p>
            <p className="mt-2 text-[10px] font-black uppercase tracking-[0.14em] sm:text-sm">{run.dj}</p>
          </div>
        </div>

        <section className="bg-black text-[#e6e5e1] lg:col-start-1 lg:row-start-3">
          <div className="px-4 pb-10 pt-8 sm:px-8 sm:pb-12 lg:px-10 lg:pb-12 lg:pt-12">
          <p className="text-xs font-black uppercase tracking-[0.28em] sm:text-sm">{run.kicker}</p>
          {when ? (
            <p className="mt-4 text-3xl font-black leading-none tracking-tight sm:text-5xl">
              {capitalizeWeekday(when.weekday, locale)}
              <span className="mt-2 block text-base font-bold tracking-normal sm:text-lg">
                {when.date}
                <span className="mx-2" aria-hidden>
                  ·
                </span>
                {when.time}
              </span>
            </p>
          ) : null}
          {lead ? <p className="mt-5 max-w-xl text-base leading-relaxed sm:text-lg">{lead}</p> : null}
          <p className="mt-6 text-base font-bold leading-snug sm:text-lg">{venue}</p>
          {mapsHref ? (
            <a
              href={mapsHref}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex min-h-11 items-center text-sm font-bold text-[#e6e5e1] underline decoration-[#e6e5e1]/50 underline-offset-4 hover:text-[#e6e5e1] hover:decoration-[#e6e5e1]"
            >
              {t("openInMaps")}
              <span aria-hidden className="ml-1">
                ↗
              </span>
            </a>
          ) : null}
          {imageUrl ? (
            <img src={imageUrl} alt={title} width={1122} height={1402} className="mt-8 h-auto w-full" />
          ) : null}
          </div>
        </section>

        <section
          id="event-checkout"
          className="scroll-mt-24 bg-[#e6e5e1] px-4 py-8 text-black [color-scheme:light] sm:px-8 lg:col-start-2 lg:row-start-3 lg:px-10 lg:py-12"
        >
          <div className="lg:sticky lg:top-24">
            <p className="text-xs font-black uppercase tracking-[0.22em]">{t("priceLabel")}</p>
            <p className="mt-1 text-5xl font-black leading-none tracking-tight tabular-nums sm:text-6xl">
              {formatPlnFromGrosze(priceGrosze)}
            </p>
            {!isPast ? (
              <p className="mt-3 text-sm font-bold uppercase tracking-[0.16em]">
                {t("remainingLabel")}
                <span className="ml-2 tabular-nums">{remaining}</span>
              </p>
            ) : null}
            <p className="mt-3 max-w-md text-xs leading-relaxed">{t("taxExemptionNote")}</p>

            {isPast ? (
              <div className="mt-8 border-t border-black pt-5">
                <p className="text-lg font-black">{t("eventEndedTitle")}</p>
                <p className="mt-2 text-sm leading-relaxed">{t("archiveCheckoutHint")}</p>
                <Link
                  href="/events"
                  className="mt-4 inline-flex min-h-11 items-center bg-black px-5 text-sm font-black uppercase tracking-[0.14em] text-[#e6e5e1]"
                >
                  {t("eventEndedCta")}
                </Link>
              </div>
            ) : remaining > 0 ? (
              <>
                <p className="mt-6 text-xs leading-relaxed">
                  {t(bypassPayment ? "prePurchaseNoteBypass" : "prePurchaseNote", {
                    seller: COMPANY.legalNameShort,
                    nip: COMPANY.nip,
                  })}
                </p>
                <EventCheckoutForm
                  appearance="pimpro"
                  eventSlug={eventSlug}
                  remaining={remaining}
                  locale={locale}
                  unitPriceGrosze={priceGrosze}
                  bypassPayment={bypassPayment}
                  initialPromoCode={promo?.code}
                  initialPromoDiscountPercent={promo?.discountPercent}
                  initialPromoDiscountFixedGrosze={promo?.discountFixedGrosze}
                />
              </>
            ) : (
              <p className="mt-8 border-t border-black pt-5 text-lg font-black">{t("soldOut")}</p>
            )}
          </div>
        </section>
      </div>

      <section className="bg-black px-4 py-12 text-[#e6e5e1] sm:px-8 lg:px-10" aria-labelledby="event-faq-heading">
        <div className="mx-auto max-w-3xl">
          <h2 id="event-faq-heading" className="text-lg font-black uppercase tracking-[0.14em]">
            {t("faqTitle")}
          </h2>
          <dl className="mt-6 space-y-5 border-t border-[#e6e5e1] pt-5">
            {faqPairs.map(([qk, ak]) => (
              <div key={qk}>
                <dt className="text-sm font-black">{t(qk)}</dt>
                <dd className="mt-2 text-sm leading-relaxed">{ak === "faqA1" ? faqHowToGet(locale, venue) : t(ak)}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <div className="poet-safe-x mx-auto max-w-3xl py-10">
        <RelatedEventsSection
          locale={locale}
          related={related}
          ticketsIntentPath={ticketsIntentPath}
          poetHubUrl={poetHubUrl}
        />
      </div>

      {showCheckout ? (
        <EventMobileStickyCta
          appearance="pimpro"
          priceGrosze={priceGrosze}
          remaining={remaining}
          bypassPayment={bypassPayment}
          mapsHref={mapsHref ?? undefined}
        />
      ) : null}
    </div>
  );
}
