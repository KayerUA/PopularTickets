import { getTranslations } from "next-intl/server";
import { formatEventDateTime } from "@/lib/formatEventDateTime";
import { formatPlnFromGrosze } from "@/lib/formatPln";
import { eventLanguageLabel, normalizeEventLanguage } from "@/lib/eventLanguage";
import { eventCoverObjectPosition } from "@/lib/eventCoverFocal";
import { isOptimizableEventImage } from "@/lib/imageOptimization";
import { MediaCoverBlurred } from "@/components/MediaCoverBlurred";
import { EventStatusBadge } from "@/components/EventStatusBadge";
import type { PoetTrialDisplay } from "@/lib/poetTrials";
import type { AppLocale } from "@/i18n/routing";
import { ticketsEventPage } from "@/lib/ticketsSite";

type Props = {
  slot: PoetTrialDisplay;
  locale: AppLocale;
  /** Показать бейдж курса (на главной календаре). */
  showCourseBadge?: boolean;
};

export async function PoetTrialEventCard({ slot, locale, showCourseBadge = false }: Props) {
  const t = await getTranslations("EventCard");
  const tPoet = await getTranslations("Poet");
  const href = ticketsEventPage(locale, slot.slug);
  const language = normalizeEventLanguage(slot.eventLanguage);
  const when = slot.starts_at ? formatEventDateTime(slot.starts_at, locale) : null;
  const cta =
    slot.status === "past"
      ? t("ctaPast")
      : slot.status === "sold_out"
        ? t("ctaSoldOut")
        : t("buyTrial");
  const label = `${slot.title} — ${cta}`;

  return (
    <a
      href={href}
      aria-label={label}
      className="group flex h-full min-h-0 flex-col rounded-2xl no-underline outline-none transition duration-500 ease-out focus-visible:ring-2 focus-visible:ring-poet-gold/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--poet-bg)]"
    >
      <article
        className={`flex h-full min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-poet-gold/20 bg-poet-surface/55 shadow-gold-sm backdrop-blur-sm transition duration-500 ease-out group-hover:-translate-y-0.5 group-hover:border-poet-gold/45 group-hover:shadow-gold sm:group-hover:-translate-y-1 ${slot.status === "past" ? "opacity-[0.88]" : ""} ${slot.status === "sold_out" ? "opacity-95 saturate-[0.85]" : ""}`}
      >
        <div className="relative aspect-video w-full overflow-hidden bg-zinc-950">
          {slot.imageUrl ? (
            <MediaCoverBlurred
              src={slot.imageUrl}
              alt=""
              sizes="(max-width:640px) 100vw, (max-width:1024px) 50vw, 33vw"
              unoptimized={!isOptimizableEventImage(slot.imageUrl)}
              coverObjectPosition={eventCoverObjectPosition(slot.imageFocalX, slot.imageFocalY)}
              frameClassName="absolute inset-0"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-poet-gold-dim/35 via-poet-bg to-zinc-950" />
          )}
          <div className="pointer-events-none absolute inset-0 z-[3] bg-gradient-to-t from-poet-bg/80 via-transparent to-transparent opacity-60" />
          <div className="pointer-events-none absolute left-3 top-3 z-[4] flex flex-wrap gap-2 sm:left-4 sm:top-4">
            <EventStatusBadge status={slot.status} listingKind="trial" />
          </div>
        </div>
        <div className="flex min-h-0 flex-1 flex-col justify-between gap-4 p-4 text-zinc-100 sm:p-5">
          <div className="flex shrink-0 flex-col gap-2">
            {showCourseBadge && slot.courseLine ? (
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-poet-gold/75">
                {tPoet("trialCourseLabel")}: {slot.courseLine}
              </p>
            ) : null}
            <h2 className="font-display text-lg font-semibold leading-snug tracking-tight text-zinc-50 transition [overflow-wrap:anywhere] group-hover:text-poet-gold-bright sm:text-xl">
              {slot.title}
            </h2>
            {when ? <p className="text-sm text-zinc-400">{when}</p> : null}
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-poet-gold/80">
              {t("languageLabel")}: {eventLanguageLabel(language, locale)}
            </p>
            <p className="line-clamp-2 text-sm text-zinc-400 [overflow-wrap:anywhere]">{slot.venue}</p>
          </div>
          <div className="flex shrink-0 flex-col gap-3 border-t border-poet-gold/10 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-lg font-medium text-poet-gold-bright sm:text-base">
              {formatPlnFromGrosze(slot.priceGrosze)}
            </span>
            <span
              className={`w-full justify-center px-5 py-2.5 text-center text-xs font-semibold uppercase tracking-wide sm:w-auto sm:py-2 ${
                slot.status === "past" || slot.status === "sold_out"
                  ? "inline-flex rounded-full border border-poet-gold/25 bg-zinc-900/60 text-zinc-200"
                  : "btn-poet poet-shine inline-flex"
              }`}
            >
              {cta}
            </span>
          </div>
        </div>
      </article>
    </a>
  );
}
