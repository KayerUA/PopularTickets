import Image from "next/image";
import type { SupabaseClient } from "@supabase/supabase-js";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { resolveEventCopy } from "@/lib/contentI18n";
import { formatEventDateTime, formatPlnFromGrosze } from "@/lib/format";
import { isRenderableImageSrc } from "@/lib/safePublicUrl";
import { isOptimizableEventImage } from "@/lib/imageOptimization";
import { NOGA_SHOW_SLUG, NOGA_SHOW_PORTRAIT_IMAGE } from "@/lib/nogaShowImages";

const labels = {
  ru: { heading: "Предстоящие шоу", details: "О шоу" },
  pl: { heading: "Nadchodzące występy", details: "O występie" },
  uk: { heading: "Майбутні шоу", details: "Про шоу" },
};

export async function RatingUpcomingShows({ db, locale }: { db: SupabaseClient; locale: AppLocale }) {
  const { data: shows, error } = await db.from("events")
    .select("id,slug,title,title_pl,title_uk,starts_at,venue,price_grosze,image_url")
    .eq("visibility", "published")
    .in("listing_kind", ["performance", "special"])
    .gt("starts_at", new Date().toISOString())
    .order("starts_at")
    .limit(3);
  if (error || !shows?.length) return null;
  const t = labels[locale];

  return (
    <aside aria-labelledby="upcoming-shows-heading" className="mt-10 border-t border-zinc-800 pt-6">
      <h2 id="upcoming-shows-heading" className="font-display text-lg text-zinc-300">{t.heading}</h2>
      <div className="mt-4 space-y-6">
        {shows.map((show) => {
          const title = resolveEventCopy(show, locale)?.title ?? show.title;
          const imageUrl = show.slug === NOGA_SHOW_SLUG ? NOGA_SHOW_PORTRAIT_IMAGE : show.image_url;
          return (
            <article key={show.id} className="flex items-start gap-4">
              {isRenderableImageSrc(imageUrl) ? (
                <Image src={imageUrl!} alt={title} width={180} height={320}
                  sizes="(max-width:640px) 96px, 120px"
                  unoptimized={!isOptimizableEventImage(imageUrl!)}
                  className="h-auto w-24 shrink-0 rounded-lg sm:w-[120px]" />
              ) : null}
              <div className="min-w-0 space-y-2 text-sm text-zinc-400">
                <h3 className="font-medium text-zinc-200">{title}</h3>
                <p>{formatEventDateTime(show.starts_at, locale)}</p>
                <p>{show.venue}</p>
                <p>{formatPlnFromGrosze(show.price_grosze)}</p>
                <Link href={`/events/${show.slug}`} className="inline-block py-2 text-zinc-200 underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-poet-gold">
                  {t.details}
                </Link>
              </div>
            </article>
          );
        })}
      </div>
    </aside>
  );
}
