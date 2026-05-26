import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { EventCardProps } from "@/components/EventCard";
import { HomeEventsGrid } from "@/components/HomeEventsGrid";
import type { AppLocale } from "@/i18n/routing";

type Props = {
  locale: AppLocale;
  related: EventCardProps[];
  ticketsIntentPath: string | null;
  poetHubUrl: string | null;
};

export async function RelatedEventsSection({ locale, related, ticketsIntentPath, poetHubUrl }: Props) {
  const t = await getTranslations({ locale, namespace: "EventPage" });

  if (!related.length && !ticketsIntentPath && !poetHubUrl) return null;

  return (
    <section className="mt-12 max-w-3xl" aria-labelledby="related-events-heading">
      <h2 id="related-events-heading" className="font-display text-lg font-medium text-zinc-100 sm:text-xl">
        {t("relatedEventsTitle")}
      </h2>
      {related.length ? (
        <div className="mt-6">
          <HomeEventsGrid events={related} />
        </div>
      ) : null}
      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        {ticketsIntentPath ? (
          <Link
            href={ticketsIntentPath}
            className="inline-flex min-h-10 items-center justify-center rounded-full border border-poet-gold/35 px-4 py-2 text-sm font-medium text-poet-gold-bright no-underline transition hover:border-poet-gold/55 hover:bg-poet-gold/10"
          >
            {t("relatedHubCta")}
          </Link>
        ) : null}
        {poetHubUrl ? (
          <a
            href={poetHubUrl}
            className="inline-flex min-h-10 items-center justify-center rounded-full border border-zinc-600/80 px-4 py-2 text-sm font-medium text-zinc-200 no-underline transition hover:border-zinc-500 hover:bg-zinc-800/60"
          >
            {t("relatedPoetCta")}
          </a>
        ) : null}
      </div>
    </section>
  );
}
