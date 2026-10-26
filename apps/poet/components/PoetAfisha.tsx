import { getTranslations } from "next-intl/server";
import type { AppLocale } from "@/i18n/routing";
import { getTicketsSiteBase, ticketsHome } from "@/lib/ticketsSite";
import type { PoetTrialDisplay } from "@/lib/poetTrials";
import { PoetTrialEventsGrid } from "@/components/PoetTrialEventsGrid";

export async function PoetAfisha({ locale, shows }: { locale: AppLocale; shows: PoetTrialDisplay[] }) {
  const t = await getTranslations("Poet");
  const tickets = getTicketsSiteBase();

  return (
    <section id="afisha" className="mt-14 scroll-mt-32 sm:mt-20 sm:scroll-mt-28">
      <h2 className="font-display text-xl font-medium text-zinc-100 sm:text-2xl">{t("afishaTitle")}</h2>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-500">{t("afishaIntro")}</p>
      {shows.length ? (
        <div className="mt-8">
          <PoetTrialEventsGrid locale={locale} trials={shows} listingKind="performance" />
        </div>
      ) : (
        <p className="mt-6 text-sm leading-relaxed text-zinc-400">{t("afishaEmpty")}</p>
      )}
      {tickets ? (
        <p className="mt-6">
          <a
            href={ticketsHome(locale)}
            className="inline-flex items-center justify-center rounded-full border border-poet-gold/35 bg-black/30 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-poet-gold-bright no-underline transition hover:border-poet-gold/55 hover:bg-poet-gold/10 sm:text-sm sm:normal-case sm:tracking-normal"
          >
            {t("afishaAllCta")}
          </a>
        </p>
      ) : null}
    </section>
  );
}
