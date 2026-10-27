import type { Metadata } from "next";
import type { AppLocale } from "@/i18n/routing";

export const notFoundCopy = {
  ru: { title: "Страница не найдена", body: "Возможно, ссылка устарела. Выберите ближайшее мероприятие в афише.", events: "Афиша", courses: "Курсы" },
  uk: { title: "Сторінку не знайдено", body: "Можливо, посилання застаріло. Оберіть найближчу подію в афіші.", events: "Афіша", courses: "Курси" },
  pl: { title: "Nie znaleziono strony", body: "Link mógł się zdezaktualizować. Wybierz najbliższe wydarzenie w kalendarzu.", events: "Wydarzenia", courses: "Kursy" },
};
export function notFoundPageMetadata(locale: AppLocale): Metadata {
  return { title: { absolute: `${notFoundCopy[locale].title} · PopularTickets` }, description: notFoundCopy[locale].body, robots: { index: false, follow: true } };
}
