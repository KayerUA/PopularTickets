import { PoetMarquee } from "@/components/PoetMarquee";
import { PoetCourseShowcase, PoetTrialsAndFlow } from "@/components/PoetCoursesAndTrials";
import { getLocale, getTranslations } from "next-intl/server";
import { fetchPublishedTrialSlots } from "@/lib/poetTrials";
import { getTicketsSiteBase, ticketsHome } from "@/lib/ticketsSite";
import type { AppLocale } from "@/i18n/routing";

export default async function HomePage() {
  const tickets = getTicketsSiteBase();
  const locale = (await getLocale()) as AppLocale;
  const t = await getTranslations("Poet");
  const trials = await fetchPublishedTrialSlots();

  return (
    <div className="poet-safe-x mx-auto max-w-5xl pb-12 pt-6 sm:pb-16 sm:pt-8">
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

      <section id="kursy" className="mt-14 scroll-mt-24 sm:mt-16">
        <h2 className="font-display text-xl font-medium text-zinc-100 sm:text-2xl">{t("coursesTitle")}</h2>
        <p className="mt-2 max-w-2xl text-sm text-zinc-500">{t("coursesIntro")}</p>
        <PoetCourseShowcase />
      </section>

      <section id="proby" className="mt-16 scroll-mt-24 sm:mt-20">
        <h2 className="font-display text-xl font-medium text-zinc-100 sm:text-2xl">{t("trialsTitle")}</h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-500">{t("trialsSectionLead")}</p>
        <div className="mt-8">
          <PoetTrialsAndFlow locale={locale} trials={trials} />
        </div>
      </section>
    </div>
  );
}
