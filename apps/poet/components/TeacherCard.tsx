import Image from "next/image";
import type { AppLocale } from "@/i18n/routing";
import { COURSE_LANGUAGE } from "@/lib/courseDetails";

const copy = {
  ru: { title: "Ведёт курс: Степан Баранцов", role: "Режиссёр и педагог актёрского мастерства из Минска, руководитель театра «Популярный поэт».", education: "Окончил Белорусский государственный университет культуры и искусств: пять лет режиссуры и актёрского мастерства, педагогическое образование.", experience: "Преподаёт взрослым и детям больше десяти лет. С детским театром выступил около 300 раз на гастролях по Беларуси.", contact: "Написать Степану в Telegram" },
  uk: { title: "Веде курс: Степан Баранцов", role: "Режисер і педагог акторської майстерності з Мінська, керівник театру «Популярний поет».", education: "Закінчив Білоруський державний університет культури і мистецтв: п’ять років режисури й акторської майстерності, педагогічна освіта.", experience: "Викладає дорослим і дітям понад десять років. Із дитячим театром виступив близько 300 разів на гастролях Білоруссю.", contact: "Написати Степану в Telegram" },
  pl: { title: "Prowadzący: Stepan Barantsov", role: "Reżyser i pedagog aktorstwa z Mińska, kierownik teatru Popular Poet.", education: "Absolwent Białoruskiego Państwowego Uniwersytetu Kultury i Sztuki: pięć lat reżyserii i aktorstwa oraz wykształcenie pedagogiczne.", experience: "Uczy dorosłych i dzieci od ponad dziesięciu lat. Wystąpił z teatrem dziecięcym około 300 razy podczas tournée po Białorusi.", contact: "Napisz do Stepana na Telegramie" },
};

export function TeacherCard({ locale }: { locale: AppLocale }) {
  const t = copy[locale];
  return <section className="mt-10 grid items-start gap-6 border-t border-white/15 pt-7 sm:grid-cols-[160px_minmax(0,1fr)] lg:grid-cols-[200px_minmax(0,1fr)]" aria-labelledby="teacher-stepan">
    <Image src="/images/teachers/stepan-barantsov.webp" alt="Степан Баранцов" width={1400} height={2489} className="h-auto w-40 rounded-xl sm:w-full" sizes="(min-width:1024px) 200px,160px" />
    <div><h2 id="teacher-stepan" className="font-display text-2xl text-zinc-100">{t.title}</h2><p className="mt-3 leading-relaxed text-zinc-300">{t.role}</p><p className="mt-3 leading-relaxed text-zinc-300">{t.education}</p><p className="mt-3 leading-relaxed text-zinc-300">{t.experience}</p><p className="mt-3 leading-relaxed text-zinc-300">{COURSE_LANGUAGE[locale]}</p><a href="https://t.me/Stefan_stepp" className="mt-3 inline-flex min-h-11 items-center text-poet-gold-bright underline">{t.contact}</a></div>
  </section>;
}
