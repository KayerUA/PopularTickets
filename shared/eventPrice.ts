import { discountedPriceGrosze, resolveActiveDiscount, type ActiveDiscount } from "./specialDiscounts";

const EVENT_TIME_ZONE = "Europe/Warsaw";

type EventPriceInput = {
  starts_at: string;
  price_grosze: number;
  day_of_event_price_grosze?: number | null;
  listing_kind?: string | null;
  discount_periods?: unknown;
};

export type EventPriceDetails = {
  effectivePriceGrosze: number;
  regularPriceGrosze: number;
  dayOfEventPriceGrosze: number | null;
  hasDayOfEventIncrease: boolean;
  isEventDay: boolean;
  activeDiscount: ActiveDiscount | null;
};

function dateKeyInWarsaw(value: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: EVENT_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(value);
}

/**
 * Scheduled discounts expire at Warsaw midnight. Outside a discount period,
 * the day-of-event price applies on that Warsaw date, or the regular price.
 */
export function effectiveEventPriceGrosze(event: EventPriceInput, now = new Date()): number {
  return eventPriceDetails(event, now).effectivePriceGrosze;
}

export function eventPriceDetails(event: EventPriceInput, now = new Date()): EventPriceDetails {
  const startsAt = new Date(event.starts_at);
  const dayPrice = event.day_of_event_price_grosze;
  const validDates = Number.isFinite(startsAt.getTime()) && Number.isFinite(now.getTime());
  const hasDayOfEventIncrease = typeof dayPrice === "number" && dayPrice > event.price_grosze;
  const isEventDay = validDates && dateKeyInWarsaw(now) === dateKeyInWarsaw(startsAt);
  const activeDiscount = event.listing_kind === "special" || event.listing_kind === "performance"
    ? resolveActiveDiscount(event.discount_periods, now)
    : null;

  return {
    effectivePriceGrosze: activeDiscount
      ? discountedPriceGrosze(event.price_grosze, activeDiscount)
      : hasDayOfEventIncrease && isEventDay
        ? dayPrice
        : event.price_grosze,
    regularPriceGrosze: event.price_grosze,
    dayOfEventPriceGrosze: hasDayOfEventIncrease ? dayPrice : null,
    hasDayOfEventIncrease,
    isEventDay,
    activeDiscount,
  };
}
