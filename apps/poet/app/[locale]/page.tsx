import { PoetMarquee } from "@/components/PoetMarquee";
import { PoetCourseShowcase, PoetTrialsAndFlow } from "@/components/PoetCoursesAndTrials";
import { PoetTrialCalendar } from "@/components/PoetTrialCalendar";
import { getLocale, getTranslations } from "next-intl/server";
import { fetchPublishedTrials } from "@/lib/poetTrials";
import { fetchPublishedPoetCourses } from "@/lib/poetCourses";
import { getTicketsSiteBase, ticketsHome } from "@/lib/ticketsSite";
import type { AppLocale } from "@/i18n/routing";

export const revalidate = 60;

export default async function HomePage() {
  const tickets = getTicketsSiteBase();
  const locale = (await getLocale()) as AppLocale;
  const t = await getTranslations("Poet");
  const [trials, dbCourses] = await Promise.all([fetchPublishedTrials(), fetchPublishedPoetCourses()]);

  return (
    <div className="poet-safe-x mx-auto max-w-5xl pb-12 pt-6 sm:pb-16 sm:pt-8">
      <div className="relative overflow-hidden rounded-2xl border border-poet-gold/15">
        <div
          className="pointer-events-none absolute inset-0 bg-cover bg-center opacity-[0.14]"
          style={{ backgroundImage: "url(/courses/theatre-photo.jpg)" }}
          aria-hidden
        />
        <div className="relative bg-poet-bg/75 px-3 py-6 sm:px-8 sm:py-10">
          <PoetMarquee />

          <header className="animate-fade-up text-center sm:text-left">
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-poet-gold/80">{t("heroEyebrow")}</p>
            <h1 className="font-display mt-2 text-3xl font-semibold tracking-tight text-gradient-gold sm:text-4xl md:text-5xl">
              {t("heroTitle")}
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-zinc-400 sm:mx-0 sm:text-base">
              {t("heroLeadBefore")}
              <strong className="text-zinc-200">{t("heroLeadBrand")}</strong>
              {t("heroLeadMiddle")}
              {tickets ? (
                <a href={ticketsHome(locale)} className="font-medium">
                  {t("heroLeadTickets")}
                </a>
              ) : (
                <strong className="text-zinc-300">{t("heroLeadTickets")}</strong>
              )}
              {t("heroLeadAfter")}
            </p>
          </header>
        </div>
      </div>

      <section id="kursy" className="mt-12 scroll-mt-32 sm:mt-16 sm:scroll-mt-28">
        <h2 className="font-display text-xl font-medium text-zinc-100 sm:text-2xl">{t("coursesTitle")}</h2>
        <p className="mt-2 max-w-2xl text-sm text-zinc-500">{t("coursesIntro")}</p>
        <PoetCourseShowcase dbCourses={dbCourses} />
      </section>

      <section id="probny-kalendar" className="mt-14 scroll-mt-32 sm:mt-20 sm:scroll-mt-28">
        <h2 className="font-display text-xl font-medium text-zinc-100 sm:text-2xl">{t("calendarTitle")}</h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-500">{t("calendarIntro")}</p>
        <div className="mt-8">
          <PoetTrialCalendar locale={locale} trials={trials} />
        </div>
      </section>

      <section id="proby" className="mt-14 scroll-mt-32 sm:mt-20 sm:scroll-mt-28">
        <h2 className="font-display text-xl font-medium text-zinc-100 sm:text-2xl">{t("trialsBuyerTitle")}</h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-500">{t("trialsSectionLead")}</p>
        <div className="mt-8">
          <PoetTrialsAndFlow locale={locale} />
        </div>
      </section>
    </div>
  );
}
