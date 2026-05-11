import { useTranslations } from "next-intl";
import type { EventMarketingStatus } from "@/lib/eventMarketingStatus";

const STYLES: Record<Exclude<EventMarketingStatus, null>, string> = {
  past: "border-zinc-600/80 bg-zinc-900/80 text-zinc-400",
  sold_out: "border-red-500/40 bg-red-950/40 text-red-200/95",
  last_tickets: "border-amber-400/50 bg-amber-950/35 text-amber-100",
  starting_soon: "border-poet-gold/55 bg-poet-gold/15 text-poet-gold-bright shadow-[0_0_20px_-8px_rgba(197,160,89,0.45)]",
  this_week: "border-poet-gold/35 bg-poet-gold/10 text-poet-gold-bright",
};

type Props = {
  status: EventMarketingStatus;
  className?: string;
};

export function EventStatusBadge({ status, className = "" }: Props) {
  const t = useTranslations("EventStatus");
  if (!status) return null;
  const base =
    "inline-flex max-w-full items-center rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] sm:text-xs";
  return (
    <span className={`${base} ${STYLES[status]} ${className}`.trim()} data-event-status={status}>
      {t(status)}
    </span>
  );
}
