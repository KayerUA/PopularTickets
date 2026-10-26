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
        <p className="text-sm leading-relaxed text-zinc-300">{locale === "pl" ? "Nowe terminy pojawią się wkrótce. Napisz do Stepana w Telegramie." : locale === "uk" ? "Нові дати з’являться незабаром. Напишіть Степану в Telegram." : "Новые даты появятся скоро. Напишите Степану в Telegram."}</p>
        <a className="mt-3 inline-flex min-h-11 items-center text-poet-gold-bright underline" href="https://t.me/Stefan_stepp">Telegram</a>
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
