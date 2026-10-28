import { DateTime } from "luxon";

export const SPECIAL_EVENT_TIME_ZONE = "Europe/Warsaw";

export type DiscountPeriod = {
  name: string;
  until: string;
  percent: number;
};

export type ActiveDiscount = DiscountPeriod & {
  expiresAt: string;
};

function parsePeriod(value: unknown): DiscountPeriod | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;
  const name = typeof raw.name === "string" ? raw.name.trim() : "";
  const until = typeof raw.until === "string" ? raw.until.trim() : "";
  const percent = typeof raw.percent === "number" ? raw.percent : Number(raw.percent);
  const date = DateTime.fromISO(until, { zone: SPECIAL_EVENT_TIME_ZONE });
  if (!name || !date.isValid || !Number.isFinite(percent) || percent <= 0 || percent >= 100) return null;
  return { name, until: date.toISODate()!, percent: Math.round(percent * 100) / 100 };
}

/** Безопасно читает jsonb из Supabase; неверные элементы не участвуют в цене. */
export function normalizeDiscountPeriods(value: unknown): DiscountPeriod[] {
  if (!Array.isArray(value)) return [];
  return value
    .map(parsePeriod)
    .filter((period): period is DiscountPeriod => period !== null)
    .sort((a, b) => a.until.localeCompare(b.until));
}

export function parseDiscountPeriodsJson(value: string): DiscountPeriod[] | null {
  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) return null;
    const normalized = normalizeDiscountPeriods(parsed);
    return normalized.length === parsed.length ? normalized : null;
  } catch {
    return null;
  }
}

function expiresAt(period: DiscountPeriod): DateTime {
  return DateTime.fromISO(period.until, { zone: SPECIAL_EVENT_TIME_ZONE }).endOf("day");
}

export function resolveActiveDiscount(value: unknown, now = new Date()): ActiveDiscount | null {
  const nowDt = DateTime.fromJSDate(now, { zone: SPECIAL_EVENT_TIME_ZONE });
  for (const period of normalizeDiscountPeriods(value)) {
    const expiry = expiresAt(period);
    if (expiry >= nowDt) return { ...period, expiresAt: expiry.toUTC().toISO()! };
  }
  return null;
}

export function discountedPriceGrosze(regularPriceGrosze: number, discount: ActiveDiscount | null): number {
  if (!discount) return regularPriceGrosze;
  return Math.round(regularPriceGrosze * (1 - discount.percent / 100));
}
