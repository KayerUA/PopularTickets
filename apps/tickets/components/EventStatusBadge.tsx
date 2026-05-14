import { useTranslations } from "next-intl";
import type { EventMarketingStatus, EventListingKind } from "@/lib/eventMarketingStatus";

/** Тёмная «таблетка» + blur — иначе на ярком фото бейдж сливается (особенно this_week / starting_soon). */
const STYLES: Record<Exclude<EventMarketingStatus, null>, string> = {
  past: "border-zinc-500/90 bg-zinc-950/90 text-zinc-300 shadow-lg shadow-black/50",
  sold_out: "border-red-400/55 bg-red-950/90 text-red-100 shadow-lg shadow-black/50",
  last_tickets: "border-amber-400/70 bg-amber-950/92 text-amber-50 shadow-lg shadow-black/50",
  starting_soon:
    "border-poet-gold/70 bg-zinc-950/92 text-poet-gold-bright shadow-lg shadow-black/55 ring-1 ring-inset ring-poet-gold/20",
  this_week:
    "border-poet-gold/65 bg-zinc-950/92 text-poet-gold-bright shadow-lg shadow-black/55 ring-1 ring-inset ring-poet-gold/15",
};

type Props = {
  status: EventMarketingStatus;
  listingKind?: EventListingKind;
  className?: string;
};

export function EventStatusBadge({ status, listingKind = "performance", className = "" }: Props) {
  const t = useTranslations("EventStatus");
  if (!status) return null;
  const label =
    status === "starting_soon"
      ? listingKind === "trial"
        ? t("starting_soon_trial")
        : t("starting_soon_show")
      : t(status);
  const base =
    "inline-flex max-w-full items-center rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] backdrop-blur-md sm:text-xs sm:px-3.5 sm:py-1.5 [text-shadow:0_1px_1px_rgba(0,0,0,0.65)]";
  return (
    <span className={`${base} ${STYLES[status]} ${className}`.trim()} data-event-status={status}>
      {label}
    </span>
  );
}
