import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { MediaCoverBlurred } from "@/components/MediaCoverBlurred";
import { capitalizeWeekday, formatEventDateTimeParts, formatPlnFromGrosze } from "@/lib/format";
import { isOptimizableEventImage } from "@/lib/imageOptimization";
import { poetCourseUrl, trialHubHref, type TrialHubGroup } from "@/lib/trialCourseHub";

const MAX_DATES_PER_COURSE = 4;

export async function TrialCourseGroups({
  groups,
  locale,
}: {
  groups: TrialHubGroup[];
  locale: AppLocale;
}) {
  const t = await getTranslations({ locale, namespace: "TrialHub" });

  return (
    <ul className="grid gap-5 sm:grid-cols-2" role="list">
      {groups.map(({ course, dates }) => {
        const visible = dates.slice(0, MAX_DATES_PER_COURSE);
        const hidden = dates.length - visible.length;
        const cover = course.heroImageUrl?.trim() || null;
        return (
          <li
            key={course.id}
            className="flex flex-col overflow-hidden rounded-2xl border border-poet-gold/20 bg-poet-surface/25 shadow-gold-sm backdrop-blur-sm"
          >
            {cover ? (
              <div className="relative aspect-[16/10] w-full overflow-hidden bg-zinc-950">
                <MediaCoverBlurred
                  src={cover}
                  alt={course.title}
                  sizes="(max-width:640px) 100vw, 50vw"
                  unoptimized={!isOptimizableEventImage(cover)}
                  frameClassName="absolute inset-0"
                />
              </div>
            ) : null}
            <div className="flex flex-1 flex-col p-5 sm:p-6">
              <h3 className="font-display text-xl font-semibold tracking-tight text-zinc-50">{course.title}</h3>
              <ul className="mt-4 flex-1 space-y-2" role="list">
                {visible.map((date) => {
                  const parts = formatEventDateTimeParts(date.startsAt, locale);
                  return (
                    <li key={date.slug}>
                      <Link
                        href={trialHubHref(course.slug, date.slug)}
                        className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 rounded-xl border border-poet-gold/15 bg-black/25 px-3 py-2.5 text-sm no-underline transition hover:border-poet-gold/45 hover:bg-poet-gold/[0.06]"
                      >
                        <span className="font-medium text-zinc-200">
                          {parts ? `${parts.date}, ${parts.time}` : date.startsAt}
                          {parts ? (
                            <span className="ml-2 text-xs text-zinc-500">{capitalizeWeekday(parts.weekday, locale)}</span>
                          ) : null}
                        </span>
                        <span className="text-xs text-zinc-400">
                          {date.soldOut ? t("soldOutBadge") : formatPlnFromGrosze(date.priceGrosze)}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
              {hidden > 0 ? <p className="mt-3 text-xs text-zinc-500">{t("moreDates", { count: hidden })}</p> : null}
              <div className="mt-5 flex flex-wrap gap-3">
                <Link href={trialHubHref(course.slug)} className="btn-poet btn-poet-theatre inline-flex no-underline">
                  {t("allDatesCta")}
                </Link>
                <a
                  href={poetCourseUrl(locale, course.slug)}
                  className="inline-flex items-center text-sm text-poet-gold-bright underline decoration-poet-gold/40 underline-offset-2 hover:text-poet-gold"
                >
                  {t("courseCta")} ↗
                </a>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
