import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { getTicketsSiteBase, ticketsEventPage, ticketsHome } from "@/lib/ticketsSite";
import type { PoetTrialDisplay } from "@/lib/poetTrials";
import { formatPoetTrialWhen } from "@/lib/formatPoetTrialDate";

function sortTrials(trials: PoetTrialDisplay[]): PoetTrialDisplay[] {
  return [...trials].sort((a, b) => {
    const ta = a.starts_at ? new Date(a.starts_at).getTime() : Number.POSITIVE_INFINITY;
    const tb = b.starts_at ? new Date(b.starts_at).getTime() : Number.POSITIVE_INFINITY;
    return ta - tb;
  });
}

export async function PoetTrialCalendar({ locale, trials }: { locale: AppLocale; trials: PoetTrialDisplay[] }) {
  const t = await getTranslations("Poet");
  const tickets = getTicketsSiteBase();
  const sortedTrials = sortTrials(trials);

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

  return (
    <ul className="grid items-stretch gap-4 md:grid-cols-2 lg:grid-cols-3">
      {sortedTrials.map((slot) => {
        const when = formatPoetTrialWhen(slot.starts_at, locale) ?? t("calendarDateTbd");
        return (
          <li
            key={slot.id}
            className="group relative flex h-full min-h-[18rem] flex-col overflow-hidden rounded-2xl border border-poet-gold/20 bg-gradient-to-br from-zinc-900/70 via-poet-surface/45 to-black/35 p-5 shadow-gold-sm backdrop-blur-sm transition duration-500 hover:-translate-y-0.5 hover:border-poet-gold/40 hover:shadow-gold sm:p-6"
          >
            <div
              className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-poet-gold/55 to-transparent opacity-70"
              aria-hidden
            />
            <div className="mb-4 flex min-h-[2.75rem] shrink-0 flex-wrap content-center items-center gap-2">
              <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-200">
                {when}
              </span>
              {slot.courseLine ? (
                <span className="rounded-full border border-poet-gold/20 bg-poet-gold/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-poet-gold-bright">
                  {t("trialCourseLabel")}:{" "}
                  {slot.courseSlug ? (
                    <Link href={`/kursy/${slot.courseSlug}`} className="text-poet-gold-bright underline-offset-2 hover:underline">
                      {slot.courseLine}
                    </Link>
                  ) : (
                    slot.courseLine
                  )}
                </span>
              ) : (
                <span
                  className="pointer-events-none invisible rounded-full border border-transparent px-3 py-1 text-[11px] font-semibold uppercase tracking-wider"
                  aria-hidden
                >
                  {t("trialCourseLabel")}: —
                </span>
              )}
            </div>
            <div className="flex min-h-0 flex-1 flex-col">
              <h4 className="font-display text-xl font-medium leading-snug text-zinc-100 transition group-hover:text-poet-gold-bright sm:text-2xl">
                {slot.title}
              </h4>
              {slot.body ? (
                <p className="mt-3 line-clamp-6 text-sm leading-relaxed text-zinc-400 sm:line-clamp-5">{slot.body}</p>
              ) : null}
            </div>
            {tickets ? (
              <a
                href={ticketsEventPage(locale, slot.slug)}
                className="btn-poet-theatre btn-poet mt-auto flex w-full shrink-0 items-center justify-center pt-6 text-center no-underline"
              >
                {t("trialBuyCta")}
              </a>
            ) : (
              <span className="mt-auto pt-6 text-xs text-amber-200/80">{t("envMissing")}</span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
