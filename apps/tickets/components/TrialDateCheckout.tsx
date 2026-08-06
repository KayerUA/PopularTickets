"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import type { AppLocale } from "@/i18n/routing";
import { EventCheckoutForm } from "@/components/EventCheckoutForm";
import { capitalizeWeekday, formatEventDateTimeParts, formatPlnFromGrosze } from "@/lib/format";

export type TrialDateOption = {
  slug: string;
  startsAt: string;
  priceGrosze: number;
  remaining: number;
  soldOut: boolean;
};

type Props = {
  locale: AppLocale;
  dates: TrialDateOption[];
  initialSlug: string;
  bypassPayment?: boolean;
  initialPromoCode?: string;
  initialPromoDiscountPercent?: number | null;
  initialPromoDiscountFixedGrosze?: number | null;
};

function DateLabel({ startsAt, locale }: { startsAt: string; locale: AppLocale }) {
  const parts = formatEventDateTimeParts(startsAt, locale);
  if (!parts) return <span>{startsAt}</span>;
  return (
    <>
      <span className="block text-base font-semibold text-zinc-100">{parts.time}</span>
      <span className="mt-0.5 block text-sm text-zinc-300">{parts.date}</span>
      <span className="mt-0.5 block text-xs text-zinc-500">{capitalizeWeekday(parts.weekday, locale)}</span>
    </>
  );
}

export function TrialDateCheckout({
  locale,
  dates,
  initialSlug,
  bypassPayment,
  initialPromoCode,
  initialPromoDiscountPercent,
  initialPromoDiscountFixedGrosze,
}: Props) {
  const t = useTranslations("TrialHub");
  const [selectedSlug, setSelectedSlug] = useState(initialSlug);
  const selected = dates.find((date) => date.slug === selectedSlug) ?? dates[0];

  if (!selected) return null;

  return (
    <div>
      <h2 className="font-display text-xl font-medium text-zinc-100 sm:text-2xl">{t("chooseDate")}</h2>
      <p className="mt-2 text-sm text-zinc-500">{t("chooseDateHint")}</p>

      <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3" role="list">
        {dates.map((date) => {
          const isSelected = date.slug === selected.slug;
          return (
            <li key={date.slug}>
              <button
                type="button"
                disabled={date.soldOut}
                aria-pressed={isSelected}
                onClick={() => setSelectedSlug(date.slug)}
                className={`flex h-full w-full flex-col rounded-2xl border px-4 py-3 text-left transition disabled:cursor-not-allowed disabled:opacity-45 ${
                  isSelected
                    ? "border-poet-gold/70 bg-poet-gold/[0.08] shadow-gold-sm"
                    : "border-poet-gold/20 bg-black/25 hover:border-poet-gold/45 hover:bg-poet-gold/[0.04]"
                }`}
              >
                <DateLabel startsAt={date.startsAt} locale={locale} />
                <span className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-1">
                  <span className="text-sm font-semibold text-poet-gold-bright">
                    {formatPlnFromGrosze(date.priceGrosze)}
                  </span>
                  <span className="text-xs text-zinc-500">
                    {date.soldOut ? t("soldOutBadge") : t("seatsLeft", { count: date.remaining })}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      {selected.soldOut ? (
        <p className="mt-6 rounded-xl border border-poet-gold/20 bg-black/25 px-4 py-3 text-sm text-zinc-300">
          {t("selectedSoldOut")}
        </p>
      ) : (
        <EventCheckoutForm
          eventSlug={selected.slug}
          remaining={selected.remaining}
          locale={locale}
          unitPriceGrosze={selected.priceGrosze}
          bypassPayment={bypassPayment}
          initialPromoCode={initialPromoCode}
          initialPromoDiscountPercent={initialPromoDiscountPercent}
          initialPromoDiscountFixedGrosze={initialPromoDiscountFixedGrosze}
        />
      )}
    </div>
  );
}
