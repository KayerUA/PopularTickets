export type EventMarketingStatus = "past" | "sold_out" | "last_tickets" | "starting_soon" | "this_week" | null;

/** Афиша (спектакль/шоу) или пробное/вводное занятие — влияет на CTA и текст бейджей. */
export type EventListingKind = "performance" | "trial";

export function normalizeEventListingKind(raw: string | null | undefined): EventListingKind {
  return raw === "trial" ? "trial" : "performance";
}

const MS_HOUR = 60 * 60 * 1000;
const MS_DAY = 24 * MS_HOUR;

/** Min. liczba „ostatnich” biletów (albo procent — patrz niżej). */
const LAST_TICKETS_MIN_ABS = 4;
const LAST_TICKETS_PCT = 0.12;

const STARTING_SOON_HOURS = 48;
const THIS_WEEK_DAYS = 7;

/**
 * Status marketingowy wydarzenia (lista / karta / nagłówek).
 * Kolejność priorytetów: przeszłość → wyprzedane → ostatnie bilety → start w 48h → w tym tygodniu → brak plakietki.
 */
export function resolveEventMarketingStatus(input: {
  startsAt: string;
  remaining: number;
  totalTickets: number;
  now?: Date;
}): EventMarketingStatus {
  const now = input.now ?? new Date();
  const start = new Date(input.startsAt);
  if (Number.isNaN(start.getTime())) return null;

  if (start.getTime() < now.getTime()) {
    return "past";
  }

  if (input.remaining <= 0) {
    return "sold_out";
  }

  const threshold = Math.max(LAST_TICKETS_MIN_ABS, Math.ceil(input.totalTickets * LAST_TICKETS_PCT));
  if (input.remaining <= threshold) {
    return "last_tickets";
  }

  const msUntil = start.getTime() - now.getTime();
  if (msUntil <= STARTING_SOON_HOURS * MS_HOUR) {
    return "starting_soon";
  }
  if (msUntil <= THIS_WEEK_DAYS * MS_DAY) {
    return "this_week";
  }

  return null;
}

/** Sortowanie listy: najpierw przyszłe (najbliższe pierwsze), potem przeszłe (najnowsze przeszłe pierwsze). */
export function sortEventsForMarketing<T extends { startsAt: string }>(events: T[]): T[] {
  const now = Date.now();
  const future: T[] = [];
  const past: T[] = [];
  for (const e of events) {
    const t = new Date(e.startsAt).getTime();
    if (Number.isNaN(t)) future.push(e);
    else if (t >= now) future.push(e);
    else past.push(e);
  }
  future.sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
  past.sort((a, b) => new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime());
  return [...future, ...past];
}
