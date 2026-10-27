import type { AppLocale } from "@/i18n/routing";
import { getTicketsSiteBase } from "@/lib/ticketsSite";

export function CourseStageLinks({ locale, slug }: { locale: AppLocale; slug: string }) {
  const base = getTicketsSiteBase();
  if (!base || (slug !== "improv" && slug !== "acting")) return null;
  const labels = { ru: ["Ближайшие шоу и спектакли", "Прошедшие выступления"], uk: ["Найближчі шоу та вистави", "Минулі виступи"], pl: ["Najbliższe show i spektakle", "Poprzednie występy"] }[locale];
  return <nav className="mt-12 flex flex-wrap gap-x-6" aria-label="PopularTickets"><a className="inline-flex min-h-11 items-center text-sm text-poet-gold-bright underline underline-offset-4" href={`${base}/${locale}/events`}>{labels[0]}</a><a className="inline-flex min-h-11 items-center text-sm text-poet-gold-bright underline underline-offset-4" href={`${base}/${locale}/events/arhiv`}>{labels[1]}</a></nav>;
}
