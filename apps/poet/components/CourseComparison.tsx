import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { COURSE_DETAILS } from "@/lib/courseDetails";
const copy = {
  ru: { title: "Два курса", improv: "Импровизация", acting: "Актёрское мастерство", improvBody: "Придумываем сцены на ходу, играем с партнёром и пробуем разные форматы импро.", actingBody: "Работаем с голосом, текстом, камерой и персонажем. Вторая половина курса посвящена постановке спектакля.", lessons: "занятий по 2 часа", price: "590 zł за 4 занятия", programme: "Программа курса" },
  uk: { title: "Два курси", improv: "Імпровізація", acting: "Акторська майстерність", improvBody: "Придумуємо сцени на ходу, граємо з партнером і пробуємо різні формати імпровізації.", actingBody: "Працюємо з голосом, текстом, камерою і персонажем. Друга половина курсу присвячена постановці вистави.", lessons: "заняття по 2 години", price: "590 zł за 4 заняття", programme: "Програма курсу" },
  pl: { title: "Dwa kursy", improv: "Improwizacja", acting: "Aktorstwo", improvBody: "Wymyślamy sceny na bieżąco, gramy z partnerem i próbujemy różnych formatów impro.", actingBody: "Pracujemy z głosem, tekstem, kamerą i postacią. Drugą połowę kursu poświęcamy przygotowaniu spektaklu.", lessons: "zajęć po 2 godziny", price: "590 zł za 4 zajęcia", programme: "Program kursu" },
};
export function CourseComparison({ locale }: { locale: AppLocale }) {
  const t = copy[locale];
  return <section className="mt-10" aria-labelledby="course-comparison"><h2 id="course-comparison" className="font-display text-2xl text-zinc-100">{t.title}</h2><div className="mt-5 grid gap-7 sm:grid-cols-2 sm:gap-10">{(["improv", "acting"] as const).map(slug => <div key={slug} className="border-t border-poet-gold/20 pt-5"><h3 className="font-display text-xl text-zinc-100">{t[slug]}</h3><p className="mt-3 max-w-md text-sm leading-relaxed text-zinc-300">{slug === "improv" ? t.improvBody : t.actingBody}</p><p className="mt-4 text-sm text-zinc-300">{COURSE_DETAILS[slug].lessons} {t.lessons}</p><p className="mt-1 font-medium text-poet-gold-bright">{t.price}</p><Link href={`/kursy/${slug}`} className="mt-3 inline-flex min-h-11 items-center text-sm text-zinc-100 underline underline-offset-4">{t.programme}</Link></div>)}</div></section>;
}
