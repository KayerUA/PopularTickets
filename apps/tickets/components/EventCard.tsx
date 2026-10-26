"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { EventOfferPrice, wholeZlotyLabel } from "@/components/EventOfferPrice";
import type { AppLocale } from "@/i18n/routing";
import type { EventMarketingStatus, EventListingKind } from "@/lib/eventMarketingStatus";
import { EventStatusBadge } from "@/components/EventStatusBadge";
import { EventDateTimeDisplay } from "@/components/EventDateTimeDisplay";
import { eventCoverObjectPosition } from "@/lib/eventCoverFocal";
import { MediaCoverBlurred } from "@/components/MediaCoverBlurred";
import { eventLanguageLabel, normalizeEventLanguage, type EventLanguage } from "@/lib/eventLanguage";
import { isOptimizableEventImage } from "@/lib/imageOptimization";

export type EventCardProps = {
  slug: string;
  title: string;
  venue: string;
  startsAt: string;
  priceGrosze: number;
  dayOfEventPriceGrosze?: number | null;
  isEventDayPrice?: boolean;
  imageUrl: string | null;
  /** 0–100 для object-position (центр 50). */
  imageFocalX?: number | null;
  imageFocalY?: number | null;
  locale: AppLocale;
  status: EventMarketingStatus;
  /** Афиша (билет) или пробное/вводное — влияет на CTA и бейдж «скоро». */
  listingKind?: EventListingKind;
  eventLanguage?: EventLanguage | null;
};

export function EventCard(e: EventCardProps) {
  const t = useTranslations("EventCard");
  const listingKind = e.listingKind ?? "performance";
  const language = normalizeEventLanguage(e.eventLanguage);
  const href = listingKind === "special" ? `/special/${e.slug}` : `/events/${e.slug}`;
  const cta =
    e.status === "past"
      ? t("ctaPast")
      : e.status === "sold_out"
        ? t("ctaSoldOut")
        : listingKind === "trial"
          ? t("buyTrial")
          : t("buyTicket");
  const label = `${e.title} — ${cta}`;

  return (
    <Link
      href={href}
      aria-label={label}
      className="group flex h-full min-h-0 flex-col rounded-2xl no-underline outline-none transition duration-500 ease-out focus-visible:ring-2 focus-visible:ring-poet-gold/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--poet-bg)]"
    >
      <article
        className={`flex h-full min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-poet-gold/20 bg-poet-surface/55 shadow-gold-sm backdrop-blur-sm transition duration-500 ease-out group-hover:-translate-y-0.5 group-hover:border-poet-gold/45 group-hover:shadow-gold sm:group-hover:-translate-y-1 ${e.status === "past" ? "opacity-[0.88]" : ""} ${e.status === "sold_out" ? "opacity-95 saturate-[0.85]" : ""}`}
      >
        <div className={`relative w-full overflow-hidden bg-zinc-950 ${e.imageUrl ? "" : "aspect-[4/3]"}`}>
          {e.imageUrl ? (
            <MediaCoverBlurred
              src={e.imageUrl}
              alt=""
              sizes="(max-width:640px) 100vw, (max-width:1024px) 50vw, 33vw"
              unoptimized={!isOptimizableEventImage(e.imageUrl)}
              coverObjectPosition={eventCoverObjectPosition(e.imageFocalX, e.imageFocalY)}
              frameClassName="relative w-full"
              fit="natural"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-poet-gold-dim/35 via-poet-bg to-zinc-950" />
          )}
        </div>
        <div className="flex min-h-0 flex-1 flex-col justify-between gap-5 p-4 text-zinc-100 sm:p-5">
          <div className="flex shrink-0 flex-col gap-3">
            <EventStatusBadge status={e.status} listingKind={listingKind} />
            <h2 className="font-display text-xl font-semibold leading-[1.22] tracking-tight text-zinc-50 transition [overflow-wrap:anywhere] group-hover:text-poet-gold-bright sm:text-[1.35rem]">
              {e.title}
            </h2>
            <div className="space-y-2 text-sm">
              <div className="flex items-start gap-2.5 rounded-xl border border-poet-gold/15 bg-black/25 px-3 py-2.5">
                <svg aria-hidden viewBox="0 0 24 24" className="mt-1 h-4 w-4 shrink-0 fill-none stroke-poet-gold" strokeWidth="1.8">
                  <path d="M7 3v3m10-3v3M4.5 9.5h15M6 5h12a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" />
                </svg>
                <EventDateTimeDisplay iso={e.startsAt} locale={e.locale} size="card" />
              </div>
              <p className="flex items-start gap-2.5 px-3 text-sm leading-snug text-zinc-400 [overflow-wrap:anywhere]">
                <svg aria-hidden viewBox="0 0 24 24" className="mt-0.5 h-4 w-4 shrink-0 fill-none stroke-zinc-500" strokeWidth="1.8">
                  <path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" />
                  <circle cx="12" cy="10" r="2.5" />
                </svg>
                <span className="line-clamp-2">{e.venue}</span>
              </p>
            </div>
            <p className="w-fit rounded-full border border-poet-gold/20 bg-poet-gold/5 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-poet-gold/85">
              {t("languageLabel")}: {eventLanguageLabel(language, e.locale)}
            </p>
          </div>
          <div className="flex shrink-0 flex-col gap-2.5 border-t border-poet-gold/15 pt-4">
            <div className="flex items-end justify-between gap-3">
              <EventOfferPrice
                priceGrosze={e.priceGrosze}
                dayPriceGrosze={e.dayOfEventPriceGrosze}
                isEventDay={e.isEventDayPrice}
                discountLabel=""
                eventDayLabel=""
                showCaption={false}
              />
              <span
                className={`min-h-11 shrink-0 justify-center whitespace-nowrap px-5 py-2.5 text-center text-xs font-semibold uppercase tracking-wide ${
                  e.status === "past" || e.status === "sold_out"
                    ? "inline-flex rounded-full border border-poet-gold/25 bg-zinc-900/60 text-zinc-200"
                    : "btn-poet poet-shine inline-flex"
                }`}
              >
                {cta}
              </span>
            </div>
            {(e.dayOfEventPriceGrosze ?? 0) > e.priceGrosze && !e.isEventDayPrice ? (
              <p className="text-xs font-medium leading-snug text-poet-gold">
                {t("earlyDiscount", {
                  discount: wholeZlotyLabel((e.dayOfEventPriceGrosze ?? 0) - e.priceGrosze),
                })}
              </p>
            ) : e.isEventDayPrice && e.dayOfEventPriceGrosze ? (
              <p className="text-[11px] leading-snug text-poet-gold/85">{t("eventDayPriceActive")}</p>
            ) : null}
          </div>
        </div>
      </article>
    </Link>
  );
}
