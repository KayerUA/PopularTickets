import type { Metadata } from "next";

export const metadata: Metadata = { title: "Страница не найдена · PopularTickets", robots: { index: false, follow: true } };
export default function NotFound() {
  return <div className="mx-auto max-w-3xl px-5 py-16 text-zinc-100"><h1 className="font-display text-3xl">Страница не найдена</h1><p className="mt-4 text-zinc-300">Возможно, ссылка устарела. Выберите ближайшее мероприятие в афише.</p><nav className="mt-6 flex flex-wrap gap-5"><a className="inline-flex min-h-11 items-center text-poet-gold-bright underline" href="/ru/events">Афиша</a><a className="inline-flex min-h-11 items-center text-poet-gold-bright underline" href="/ru/shou/pimpro">P!MPRO</a><a className="inline-flex min-h-11 items-center text-poet-gold-bright underline" href="https://www.popularpoet.pl/ru">Курсы</a></nav></div>;
}
