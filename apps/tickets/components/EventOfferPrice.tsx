import { formatPlnFromGrosze } from "@/lib/format";

export function wholeZlotyLabel(grosze: number): string {
  const value = Math.max(0, grosze);
  if (value % 100 === 0) return `${value / 100} zł`;
  return formatPlnFromGrosze(value);
}

export function EventOfferPrice({
  priceGrosze,
  dayPriceGrosze,
  isEventDay,
  discountLabel,
  eventDayLabel,
  priceClassName = "text-2xl",
  showCaption = true,
}: {
  priceGrosze: number;
  dayPriceGrosze?: number | null;
  isEventDay?: boolean;
  discountLabel: string;
  eventDayLabel: string;
  priceClassName?: string;
  showCaption?: boolean;
}) {
  const discount = dayPriceGrosze && !isEventDay ? dayPriceGrosze - priceGrosze : 0;
  return (
    <div className="min-w-0">
      {discount > 0 ? (
        <p className="text-sm leading-none text-zinc-400 line-through decoration-zinc-500">
          {formatPlnFromGrosze(dayPriceGrosze!)}
        </p>
      ) : null}
      <p className={`font-semibold leading-none text-poet-gold-bright ${discount > 0 ? "mt-1.5" : ""} ${priceClassName}`}>
        {formatPlnFromGrosze(priceGrosze)}
      </p>
      {showCaption && discount > 0 ? (
        <p className="mt-2 text-xs font-medium leading-snug text-poet-gold">{discountLabel}</p>
      ) : null}
      {showCaption && discount <= 0 && isEventDay && dayPriceGrosze ? (
        <p className="mt-1.5 text-[11px] leading-snug text-poet-gold/85">{eventDayLabel}</p>
      ) : null}
    </div>
  );
}
