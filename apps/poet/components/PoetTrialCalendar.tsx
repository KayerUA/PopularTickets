import { getTranslations } from "next-intl/server";
import type { AppLocale } from "@/i18n/routing";
import { getTicketsSiteBase, ticketsHome } from "@/lib/ticketsSite";
import type { PoetTrialDisplay } from "@/lib/poetTrials";
import { PoetTrialEventsGrid } from "@/components/PoetTrialEventsGrid";

export async function PoetTrialCalendar({ locale, trials }: { locale: AppLocale; trials: PoetTrialDisplay[] }) {
  const t = await getTranslations("Poet");
  const tickets = getTicketsSiteBase();

  if (trials.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-poet-gold/25 bg-zinc-950/25 px-5 py-8 text-center sm:px-8">
        <p className="text-sm leading-relaxed text-zinc-400">{t("calendarEmpty")}</p>
        {tickets ? (
          <a href={ticketsHome(locale)} className="btn-poet-theatre btn-poet mt-6 flex items-center justify-center no-underline">
            {t("trialsCta")}
          </a>
        ) : null}
      </div>
    );
  }

  return <PoetTrialEventsGrid locale={locale} trials={trials} showCourseBadge />;
}
