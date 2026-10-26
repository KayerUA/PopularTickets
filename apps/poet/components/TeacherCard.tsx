import Image from "next/image";
import type { AppLocale } from "@/i18n/routing";

const copy = {
  ru: { title: "Ведёт курс: Степан Баранцов", role: "Режиссёр и педагог актёрского мастерства из Минска, руководитель театра «Популярный поэт».", education: "Окончил Белорусский государственный университет культуры и искусств, где учился режиссуре, актёрскому мастерству и педагогике.", experience: "Больше десяти лет ведёт актёрские занятия для взрослых и детей.", contact: "Написать Степану в Telegram" },
  uk: { title: "Веде курс: Степан Баранцов", role: "Режисер і педагог акторської майстерності з Мінська, керівник театру «Популярний поет».", education: "Закінчив Білоруський державний університет культури і мистецтв, де вивчав режисуру, акторську майстерність і педагогіку.", experience: "Понад десять років веде акторські заняття для дорослих і дітей.", contact: "Написати Степану в Telegram" },
  pl: { title: "Prowadzący: Stepan Barantsov", role: "Reżyser i pedagog aktorstwa z Mińska, kierownik teatru Popular Poet.", education: "Absolwent Białoruskiego Państwowego Uniwersytetu Kultury i Sztuki, gdzie studiował reżyserię, aktorstwo i pedagogikę.", experience: "Od ponad dziesięciu lat prowadzi zajęcia aktorskie dla dorosłych i dzieci.", contact: "Napisz do Stepana na Telegramie" },
};

export function TeacherCard({ locale }: { locale: AppLocale }) {
  const t = copy[locale];
  return <section className="mt-12 grid grid-cols-[96px_minmax(0,1fr)] items-start gap-x-5 gap-y-4 rounded-2xl border border-poet-gold/15 bg-poet-surface/20 p-5 sm:grid-cols-[160px_minmax(0,1fr)] sm:gap-x-7 sm:p-7" aria-labelledby="teacher-stepan">
    <Image src="/images/teachers/stepan-barantsov.webp" alt="Степан Баранцов" width={1400} height={2489} className="h-32 w-24 rounded-lg object-cover object-top sm:row-span-2 sm:h-60 sm:w-40" sizes="(min-width:640px) 160px,96px" />
    <div className="self-center sm:self-end"><h2 id="teacher-stepan" className="font-display text-xl leading-snug text-zinc-100 sm:text-2xl">{t.title}</h2><p className="mt-2 text-sm leading-relaxed text-zinc-300">{t.role}</p></div>
    <div className="col-span-2 sm:col-span-1"><p className="text-sm leading-relaxed text-zinc-300">{t.education}</p><p className="mt-2 text-sm leading-relaxed text-zinc-300">{t.experience}</p><a href="https://t.me/Stefan_stepp" className="mt-2 inline-flex min-h-11 items-center text-sm text-poet-gold-bright underline decoration-poet-gold/40 underline-offset-4">{t.contact}</a></div>
  </section>;
}
