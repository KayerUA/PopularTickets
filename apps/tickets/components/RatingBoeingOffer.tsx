import { Link } from "@/i18n/navigation";
import { formatEventDateTime } from "@/lib/format";
import { eventCoverObjectPosition } from "@/lib/eventCoverFocal";
import { isOptimizableEventImage } from "@/lib/imageOptimization";
import { MediaCoverBlurred } from "@/components/MediaCoverBlurred";
import { ratingText } from "@/lib/ratings/i18n";
import { formatOfferZloty, ratingOfferHref, shortOfferVenue, type RatingBoeingOfferView } from "@/lib/ratings/offer";
import type { AppLocale } from "@/i18n/routing";

export function RatingBoeingOffer({
  offer,
  locale,
}: {
  offer: RatingBoeingOfferView;
  locale: AppLocale;
}) {
  const t = ratingText[locale];
  const sale = formatOfferZloty(offer.saleGrosze);
  const regular = formatOfferZloty(offer.regularGrosze);

  return (
    <aside className="overflow-hidden rounded-2xl border border-poet-gold/45 bg-zinc-950 shadow-[0_18px_40px_-24px_rgba(197,160,89,0.55)]">
      {offer.imageUrl ? (
        <div className="relative">
          <MediaCoverBlurred
            src={offer.imageUrl}
            alt={offer.title}
            sizes="(max-width:640px) 100vw, 36rem"
            unoptimized={!isOptimizableEventImage(offer.imageUrl)}
            coverObjectPosition={eventCoverObjectPosition(offer.imageFocalX, offer.imageFocalY)}
            frameClassName="relative aspect-[16/10] w-full overflow-hidden bg-zinc-950 sm:aspect-[2/1]"
          />
          <p className="pointer-events-none absolute left-3 top-3 z-[4] rounded-full bg-poet-gold px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-950">
            {t.offerKicker}
          </p>
        </div>
      ) : (
        <p className="bg-poet-gold px-4 py-1.5 text-center text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-950">
          {t.offerKicker}
        </p>
      )}
      <div className="space-y-4 px-4 py-5 sm:px-5">
        <div>
          <h3 className="font-display text-xl font-semibold leading-tight text-poet-gold-bright sm:text-2xl">
            {offer.title}
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-zinc-300">{t.offerLead}</p>
          <ul className="mt-3 space-y-1.5 text-sm leading-snug text-zinc-400">
            {t.offerPerks.map((perk) => (
              <li key={perk} className="flex gap-2">
                <span className="mt-[0.35em] h-1.5 w-1.5 shrink-0 rounded-full bg-poet-gold" aria-hidden />
                <span>{perk}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-sm text-zinc-400">
            {formatEventDateTime(offer.startsAt, locale)}
            <span className="text-zinc-600"> · </span>
            {shortOfferVenue(offer.venue)}
          </p>
        </div>
        <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="text-3xl font-semibold tracking-tight text-poet-gold-bright">{sale}</span>
          <span className="text-sm text-zinc-500">
            {t.offerInstead} <s className="text-zinc-400">{regular}</s>
          </span>
        </p>
        <Link href={ratingOfferHref(offer.slug)} className="btn-poet btn-poet-theatre w-full no-underline">
          {t.offerCta.replace("{price}", sale)}
        </Link>
      </div>
    </aside>
  );
}
