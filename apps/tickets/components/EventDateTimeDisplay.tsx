import type { AppLocale } from "@/i18n/routing";
import { capitalizeWeekday, formatEventDateTimeParts } from "@/lib/format";

type EventDateTimeDisplayProps = {
  iso: string;
  locale: AppLocale;
  className?: string;
  /** Карточка в сетке — чуть компактнее, страница события — крупнее. */
  size?: "card" | "page";
};

export function EventDateTimeDisplay({ iso, locale, className = "", size = "card" }: EventDateTimeDisplayProps) {
  const parts = formatEventDateTimeParts(iso, locale);
  if (!parts) {
    return <span className={className}>—</span>;
  }

  const weekday = capitalizeWeekday(parts.weekday, locale);
  const weekdayClass =
    size === "page"
      ? "font-display text-2xl font-semibold tracking-tight text-poet-gold-bright sm:text-3xl"
      : "font-display text-lg font-semibold tracking-tight text-poet-gold-bright sm:text-xl";
  const detailClass = size === "page" ? "text-sm text-zinc-400 sm:text-base" : "text-sm leading-snug text-zinc-300";

  return (
    <div className={className}>
      <p className={weekdayClass}>{weekday}</p>
      <p className={`mt-0.5 ${detailClass}`}>
        {parts.date}
        <span className="mx-1.5 text-zinc-600" aria-hidden>
          ·
        </span>
        <span className="font-medium text-zinc-200">{parts.time}</span>
      </p>
    </div>
  );
}
