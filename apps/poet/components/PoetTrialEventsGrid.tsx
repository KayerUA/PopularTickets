import type { AppLocale } from "@/i18n/routing";
import { galleryPhotosForTrials } from "@/lib/courseGalleryPick";
import type { EventListingKind } from "@/lib/eventMarketingStatus";
import type { PoetTrialDisplay } from "@/lib/poetTrials";
import { PoetTrialEventCard } from "@/components/PoetTrialEventCard";

export function PoetTrialEventsGrid({
  locale,
  trials,
  showCourseBadge = false,
  listingKind = "trial",
}: {
  locale: AppLocale;
  trials: PoetTrialDisplay[];
  showCourseBadge?: boolean;
  listingKind?: EventListingKind;
}) {
  const galleryPhotos = listingKind === "trial" ? galleryPhotosForTrials(trials) : null;

  return (
    <ul className="grid auto-rows-[minmax(0,1fr)] items-stretch gap-5 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
      {trials.map((slot) => (
        <li key={slot.id} className="flex h-full min-h-0 w-full min-w-0 flex-col">
          <PoetTrialEventCard
            slot={slot}
            locale={locale}
            showCourseBadge={showCourseBadge}
            listingKind={listingKind}
            galleryImageUrl={galleryPhotos?.get(slot.id) ?? null}
          />
        </li>
      ))}
    </ul>
  );
}
