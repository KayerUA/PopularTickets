import type { AppLocale } from "@/i18n/routing";

/** Kanoniczny URL serwisu PopularTickets (bez końcowego `/`). */
export function getTicketsSiteBase(): string {
  return (process.env.NEXT_PUBLIC_TICKETS_SITE_URL ?? "").trim().replace(/\/+$/, "");
}

export function ticketsHome(locale: AppLocale = "uk"): string {
  const b = getTicketsSiteBase();
  if (!b) return "#";
  return `${b}/${locale}`;
}

export function ticketsFirma(locale: AppLocale): string {
  const b = getTicketsSiteBase();
  if (!b) return "#";
  return `${b}/${locale}/firma`;
}

/** Политика конфиденциальности кассы PopularTickets (тот же домен, что и firma). */
export function ticketsPrivacyPolicy(locale: AppLocale): string {
  const b = getTicketsSiteBase();
  if (!b) return "#";
  return `${b}/${locale}/polityka-prywatnosci`;
}

/** Сторінка події з формою оплати (Przelewy24 тощо). */
export function ticketsEventPage(locale: AppLocale, eventSlug: string): string {
  const b = getTicketsSiteBase();
  if (!b) return "#";
  return `${b}/${locale}/events/${encodeURIComponent(eventSlug)}`;
}

