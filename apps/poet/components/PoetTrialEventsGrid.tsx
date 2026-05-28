import type { AppLocale } from "@/i18n/routing";
import type { PoetTrialDisplay } from "@/lib/poetTrials";
import { PoetTrialEventCard } from "@/components/PoetTrialEventCard";

export function PoetTrialEventsGrid({
  locale,
  trials,
  showCourseBadge = false,
}: {
  locale: AppLocale;
  trials: PoetTrialDisplay[];
  showCourseBadge?: boolean;
}) {
  return (
    <ul className="grid auto-rows-[minmax(0,1fr)] items-stretch gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {trials.map((slot) => (
        <li key={slot.id} className="flex h-full min-h-0 w-full min-w-0 flex-col">
          <PoetTrialEventCard slot={slot} locale={locale} showCourseBadge={showCourseBadge} />
        </li>
      ))}
    </ul>
  );
}
