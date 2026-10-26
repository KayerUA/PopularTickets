import type { AppLocale } from "@/i18n/routing";
import { courseDetails, COURSE_LANGUAGE } from "@/lib/courseDetails";

const copy = {
  ru: { title: "Коротко о курсе", programme: "Программа", lessons: "занятий по 2 часа", price: "Оплата", total: "Весь курс", trial: "Пробное занятие", group: "Группа", people: "до 8 человек", rhythm: "Раз в неделю по 2 часа. День группы согласуем после пробного занятия.", block: "за 4 занятия", where: "Адрес" },
  uk: { title: "Коротко про курс", programme: "Програма", lessons: "заняття по 2 години", price: "Оплата", total: "Увесь курс", trial: "Пробне заняття", group: "Група", people: "до 8 людей", rhythm: "Раз на тиждень по 2 години. День групи узгодимо після пробного заняття.", block: "за 4 заняття", where: "Адреса" },
  pl: { title: "Kurs w skrócie", programme: "Program", lessons: "zajęć po 2 godziny", price: "Płatność", total: "Cały kurs", trial: "Zajęcia próbne", group: "Grupa", people: "do 8 osób", rhythm: "Raz w tygodniu po 2 godziny. Dzień zajęć grupy ustalamy po zajęciach próbnych.", block: "za 4 zajęcia", where: "Adres" },
};

export function CourseFacts({ slug, locale }: { slug: string; locale: AppLocale }) {
  const details = courseDetails(slug);
  if (!details) return null;
  const t = copy[locale];
  const rows = [[t.programme, `${details.lessons} ${t.lessons}`], [t.price, `${details.pricePerBlock} zł ${t.block}`], [t.total, `${details.lessons / details.lessonsPerBlock * details.pricePerBlock} zł`], [t.trial, `${details.trialPrice} zł`], [t.group, t.people], [t.where, "ul. Domaniewska 37, Centrum Zepter, 5 piętro, lok. 42, Warszawa"]];
  return <section className="mt-8" aria-labelledby={`course-facts-${slug}`}><h2 id={`course-facts-${slug}`} className="font-display text-2xl text-zinc-100">{t.title}</h2><p className="mt-3 text-zinc-300">{COURSE_LANGUAGE[locale]}</p><dl className="mt-4 divide-y divide-white/15">{rows.map(([label, value]) => <div key={label} className="grid gap-1 py-3 sm:grid-cols-[180px_minmax(0,1fr)]"><dt className="text-zinc-300">{label}</dt><dd className="text-zinc-100">{value}</dd></div>)}</dl><p className="mt-3 text-zinc-300">{t.rhythm}</p><a href="https://maps.app.goo.gl/BtaKyKYvp6nGZbx37" className="mt-2 inline-flex min-h-11 items-center text-poet-gold-bright underline">Google Maps</a></section>;
}
