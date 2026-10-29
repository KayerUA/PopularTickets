import { notFound } from "next/navigation";
import { routing, type AppLocale } from "@/i18n/routing";
import { Link } from "@/i18n/navigation";
import { buildPoetPageMetadata } from "@/lib/seoPoet";
import { fetchPublishedTrials } from "@/lib/poetTrials";
import { TeacherCard } from "@/components/TeacherCard";
import { CourseFacts } from "@/components/CourseFacts";
import { StudioLocation } from "@/components/StudioLocation";
import { PoetTrialCalendar } from "@/components/PoetTrialCalendar";
import { COURSE_LANGUAGE } from "@/lib/courseDetails";

export const revalidate = 60;
const copy = {
  pl: { title: "Grupa teatralna dla dorosłych w Warszawie po rosyjsku", description: "Amatorska grupa teatralna na Mokotowie: improwizacja i aktorstwo po rosyjsku. Można mówić po ukraińsku. Grupy do 12 osób, zajęcia próbne 100 zł.", intro: "Możesz zacząć bez doświadczenia scenicznego. Wybierz improwizację, jeśli chcesz tworzyć sceny bez gotowego tekstu, albo aktorstwo, jeśli interesują Cię głos, postać i praca nad spektaklem.", improv: "Improwizacja: 16 zajęć", acting: "Aktorstwo: 32 zajęcia", schedule: "Najbliższe zajęcia próbne" },
  ru: { title: "Театральная группа для взрослых в Варшаве на русском", description: "Любительская театральная группа на Мокотове: импровизация и актёрское мастерство на русском. Можно говорить по-украински. Пробное 100 zł.", intro: "Можно начать без сценического опыта. Выбирайте импровизацию, если хотите создавать сцены без готового текста, или актёрское мастерство, если интересны голос, персонаж и работа над спектаклем.", improv: "Импровизация: 16 занятий", acting: "Актёрское мастерство: 32 занятия", schedule: "Ближайшие пробные занятия" },
  uk: { title: "Театральна група для дорослих у Варшаві російською", description: "Аматорська театральна група на Мокотові: імпровізація та акторська майстерність російською. Можна говорити українською. Пробне 100 zł.", intro: "Можна почати без сценічного досвіду. Обирайте імпровізацію, якщо хочете створювати сцени без готового тексту, або акторську майстерність, якщо цікавлять голос, персонаж і робота над виставою.", improv: "Імпровізація: 16 занять", acting: "Акторська майстерність: 32 заняття", schedule: "Найближчі пробні заняття" },
};
type Props = { params: Promise<{ locale: AppLocale }> };
export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  if (!routing.locales.includes(locale)) return {};
  return buildPoetPageMetadata({ locale, path: "/grupa-teatralna-dla-doroslych-warszawa", title: `${copy[locale].title} | Popular Poet`, description: copy[locale].description });
}
export default async function TheatreGroupPage({ params }: Props) {
  const { locale } = await params;
  if (!routing.locales.includes(locale)) notFound();
  const t = copy[locale];
  const trials = await fetchPublishedTrials(locale);
  return <div className="poet-safe-x mx-auto max-w-5xl py-10">
    <h1 className="font-display text-3xl text-zinc-100 sm:text-4xl">{t.title}</h1>
    <p className="mt-5 max-w-3xl leading-relaxed text-zinc-300">{t.intro}</p>
    <p className="mt-3 text-zinc-100">{COURSE_LANGUAGE[locale]}</p>
    <nav className="mt-5 flex flex-wrap gap-5"><Link className="inline-flex min-h-11 items-center text-poet-gold-bright underline" href="/kursy/improv">{t.improv}</Link><Link className="inline-flex min-h-11 items-center text-poet-gold-bright underline" href="/kursy/acting">{t.acting}</Link></nav>
    <CourseFacts locale={locale} slug="improv" /><CourseFacts locale={locale} slug="acting" />
    <TeacherCard locale={locale} />
    <section className="mt-10"><h2 className="mb-5 font-display text-2xl text-zinc-100">{t.schedule}</h2><PoetTrialCalendar locale={locale} trials={trials} /></section>
    <StudioLocation locale={locale} />
  </div>;
}
