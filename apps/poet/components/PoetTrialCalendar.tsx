import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { getTicketsSiteBase, ticketsEventPage, ticketsHome } from "@/lib/ticketsSite";
import type { PoetTrialDisplay } from "@/lib/poetTrials";
import { formatPoetTrialDayHeading, formatPoetTrialWhen, poetTrialDayKeyWarsaw } from "@/lib/formatPoetTrialDate";

function groupTrialsByDay(trials: PoetTrialDisplay[]): Map<string, PoetTrialDisplay[]> {
  const map = new Map<string, PoetTrialDisplay[]>();
  for (const t of trials) {
    const key = poetTrialDayKeyWarsaw(t.starts_at);
    const list = map.get(key) ?? [];
    list.push(t);
    map.set(key, list);
  }
  for (const list of map.values()) {
    list.sort((a, b) => {
      const ta = a.starts_at ? new Date(a.starts_at).getTime() : 0;
      const tb = b.starts_at ? new Date(b.starts_at).getTime() : 0;
      return ta - tb;
    });
  }
  return map;
}

function sortDayKeys(keys: string[]): string[] {
  return [...keys].sort((a, b) => {
    if (a === "_unknown") return 1;
    if (b === "_unknown") return -1;
    return a.localeCompare(b);
  });
}

export async function PoetTrialCalendar({ locale, trials }: { locale: AppLocale; trials: PoetTrialDisplay[] }) {
  const t = await getTranslations("Poet");
  const tickets = getTicketsSiteBase();
  const grouped = groupTrialsByDay(trials);
  const dayKeys = sortDayKeys([...grouped.keys()]);

  if (trials.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-poet-gold/25 bg-zinc-950/25 px-5 py-8 text-center sm:px-8">
        <p className="text-sm leading-relaxed text-zinc-400">{t("calendarEmpty")}</p>
        {tickets ? (
          <a href={ticketsHome(locale)} className="btn-poet-theatre btn-poet mt-6 inline-flex no-underline">
            {t("trialsCta")}
          </a>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {dayKeys.map((dayKey) => {
        const slots = grouped.get(dayKey) ?? [];
        const firstIso = slots[0]?.starts_at;
        const dayTitle =
          dayKey === "_unknown" || !firstIso ? t("calendarDateTbd") : formatPoetTrialDayHeading(firstIso, locale);

        return (
          <section key={dayKey} className="space-y-4">
            <h3 className="border-b border-poet-gold/20 pb-2 font-display text-lg font-medium text-poet-gold-bright/95 sm:text-xl">
              {dayTitle}
            </h3>
            <ul className="grid gap-4 sm:grid-cols-2">
              {slots.map((slot) => {
                const when = formatPoetTrialWhen(slot.starts_at, locale);
                return (
                  <li
                    key={slot.id}
                    className="flex flex-col rounded-2xl border border-poet-gold/25 bg-gradient-to-b from-zinc-900/50 to-poet-surface/30 p-5 shadow-gold-sm backdrop-blur-sm"
                  >
                    <div className="flex flex-1 flex-col gap-2">
                      {slot.courseLine ? (
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-poet-gold/75">
                          {t("trialCourseLabel")}:{" "}
                          {slot.courseSlug ? (
                            <Link href={`/kursy/${slot.courseSlug}`} className="text-poet-gold-bright underline-offset-2 hover:underline">
                              {slot.courseLine}
                            </Link>
                          ) : (
                            slot.courseLine
                          )}
                        </p>
                      ) : null}
                      <h4 className="font-display text-lg font-medium text-zinc-100">{slot.title}</h4>
                      {when ? <p className="text-xs font-medium text-emerald-300/90">{when}</p> : null}
                      {slot.body ? <p className="text-sm leading-relaxed text-zinc-500">{slot.body}</p> : null}
                    </div>
                    {tickets ? (
                      <a
                        href={ticketsEventPage(locale, slot.slug)}
                        className="btn-poet-theatre btn-poet mt-5 inline-flex w-full justify-center no-underline sm:w-auto"
                      >
                        {t("trialBuyCta")}
                      </a>
                    ) : (
                      <span className="mt-5 text-xs text-amber-200/80">{t("envMissing")}</span>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
