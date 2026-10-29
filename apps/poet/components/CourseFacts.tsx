import type { AppLocale } from "@/i18n/routing";
import { courseDetails, COURSE_LANGUAGE } from "@/lib/courseDetails";

const copy = {
  ru: { title: "Коротко о курсе", programme: "Программа", lessons: "занятий по 2 часа", price: "Оплата", total: "Весь курс", trial: "Пробное занятие", group: "Группа", upTo: "до", people: "человек", rhythm: "Раз в неделю по 2 часа. День группы согласуем после пробного занятия.", block: "за 4 занятия", where: "Адрес" },
  uk: { title: "Коротко про курс", programme: "Програма", lessons: "заняття по 2 години", price: "Оплата", total: "Увесь курс", trial: "Пробне заняття", group: "Група", upTo: "до", people: "людей", rhythm: "Раз на тиждень по 2 години. День групи узгодимо після пробного заняття.", block: "за 4 заняття", where: "Адреса" },
  pl: { title: "Kurs w skrócie", programme: "Program", lessons: "zajęć po 2 godziny", price: "Płatność", total: "Cały kurs", trial: "Zajęcia próbne", group: "Grupa", upTo: "do", people: "osób", rhythm: "Raz w tygodniu po 2 godziny. Dzień zajęć grupy ustalamy po zajęciach próbnych.", block: "za 4 zajęcia", where: "Adres" },
};

export function CourseFacts({ slug, locale }: { slug: string; locale: AppLocale }) {
  const details = courseDetails(slug);
  if (!details) return null;
  const t = copy[locale];
  return <section className="mt-6 px-1 sm:mt-8" aria-label={t.title}>
    <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2">
      <p className="text-base text-zinc-200"><strong className="text-xl font-semibold text-poet-gold-bright">{details.pricePerBlock} zł</strong> {t.block}</p>
      <p className="text-sm text-zinc-300">{t.trial}: {details.trialPrice} zł</p>
    </div>
    <p className="mt-3 text-sm leading-relaxed text-zinc-300">{details.lessons} {t.lessons} · {t.upTo} {details.groupSize} {t.people}</p>
    <p className="mt-1 text-sm leading-relaxed text-zinc-300">{COURSE_LANGUAGE[locale]}</p>
  </section>;
}
