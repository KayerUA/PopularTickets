import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { POPULAR_POET_SITE_URL } from "@/lib/theatre";
import { PRZELEWY24_LINKS } from "@/lib/company";

type Props = { locale: AppLocale };

export async function TicketsFactsBody({ locale }: Props) {
  const t = await getTranslations({ locale, namespace: "TicketsFacts" });
  const poet = POPULAR_POET_SITE_URL.replace(/\/$/, "");

  return (
    <div className="poet-safe-x mx-auto max-w-3xl py-8 sm:py-12">
      <p className="text-sm text-zinc-500">
        <Link href="/" className="inline-flex min-h-10 items-center rounded-lg py-1 text-poet-gold hover:text-poet-gold-bright">
          {t("backHome")}
        </Link>
      </p>
      <h1 className="font-display mt-4 text-2xl font-semibold tracking-tight sm:mt-6 sm:text-4xl">
        <span className="text-gradient-gold">{t("h1")}</span>
      </h1>
      <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-zinc-300 sm:text-base">{t("lead")}</p>

      <section className="mt-8 space-y-4 rounded-2xl border border-poet-gold/15 bg-poet-surface/30 p-5 sm:p-8">
        <h2 className="font-display text-lg font-medium text-zinc-100">{t("factsTitle")}</h2>
        <ul className="list-inside list-disc space-y-2 text-sm text-zinc-300">
          <li>{t("factTickets")}</li>
          <li>{t("factPayment")}</li>
          <li>{t("factOperator")}</li>
          <li>{t("factVenue")}</li>
        </ul>
        <p className="text-sm text-zinc-400">
          {t("theatreLinkBefore")}{" "}
          <a href={poet} target="_blank" rel="noopener noreferrer" className="font-medium text-poet-gold hover:text-poet-gold-bright">
            popularpoet.pl
          </a>
          {t("theatreLinkAfter")}
        </p>
        <p className="text-xs text-zinc-500">
          {t("p24LineBefore")}
          <a href={PRZELEWY24_LINKS.site} target="_blank" rel="noopener noreferrer" className="text-poet-gold/90 hover:text-poet-gold-bright">
            Przelewy24
          </a>
          {t("p24LineAfter")}
        </p>
      </section>
    </div>
  );
}
