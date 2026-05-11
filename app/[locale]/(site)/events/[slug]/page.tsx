import { notFound } from "next/navigation";
import Image from "next/image";
import type { Metadata } from "next";
import { getServiceSupabase } from "@/lib/supabase/admin";
import { fetchPublishedEventBySlug } from "@/lib/supabase/fetchPublishedEventBySlug";
import { SupabaseSetupHint } from "@/components/SupabaseSetupHint";
import { SupabaseQueryErrorPanel } from "@/components/SupabaseQueryErrorPanel";
import { formatPlnFromGrosze, formatEventDateTime } from "@/lib/format";
import { EventCheckoutForm } from "@/components/EventCheckoutForm";
import { getTranslations } from "next-intl/server";
import type { AppLocale } from "@/i18n/routing";
import { isCheckoutBypassPayment } from "@/lib/checkoutBypass";
import { resolveEventMapsUrl } from "@/lib/mapsUrl";
import { resolveEventMarketingStatus } from "@/lib/eventMarketingStatus";
import { EventStatusBadge } from "@/components/EventStatusBadge";

export const revalidate = 30;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: AppLocale; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const supabase = getServiceSupabase();
  const tMeta = await getTranslations({ locale, namespace: "metadata" });
  if (!supabase) {
    return { title: tMeta("homeTitle") };
  }
  const { data: event } = await supabase
    .from("events")
    .select("title")
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();
  if (!event) {
    return { title: tMeta("homeTitle") };
  }
  return { title: `${event.title}${tMeta("eventTitleSuffix")}` };
}

export default async function EventPage({
  params,
}: {
  params: Promise<{ locale: AppLocale; slug: string }>;
}) {
  const { slug, locale } = await params;
  const t = await getTranslations({ locale, namespace: "EventPage" });
  const supabase = getServiceSupabase();
  if (!supabase) {
    return <SupabaseSetupHint variant="disconnected" locale={locale} />;
  }

  const { data: event, error } = await fetchPublishedEventBySlug(supabase, slug);

  if (error) {
    return <SupabaseQueryErrorPanel locale={locale} error={error} titleNamespace="EventPage" titleKey="loadQueryError" />;
  }
  if (!event) notFound();

  const { count: sold, error: cErr } = await supabase
    .from("tickets")
    .select("id", { count: "exact", head: true })
    .eq("event_id", event.id);

  if (cErr) {
    return <div className="poet-safe-x p-6 text-red-400 sm:p-8">{t("loadRemainingError")}</div>;
  }

  const remaining = event.total_tickets - (sold ?? 0);
  const marketingStatus = resolveEventMarketingStatus({
    startsAt: event.starts_at,
    remaining,
    totalTickets: event.total_tickets,
  });
  const mapsHref = resolveEventMapsUrl({
    maps_url: event.maps_url,
    description: event.description,
  });

  return (
    <div className="poet-safe-x mx-auto max-w-3xl py-8 sm:py-14">
      <div className="animate-fade-up overflow-hidden rounded-2xl border border-poet-gold/25 bg-poet-surface/50 shadow-gold backdrop-blur-md sm:rounded-3xl">
        <div className="relative aspect-[4/3] w-full bg-zinc-950 sm:aspect-[21/9]">
          {event.image_url ? (
            <Image
              src={event.image_url}
              alt=""
              fill
              className="object-cover"
              priority
              unoptimized
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-poet-gold-dim/35 via-poet-bg to-zinc-950" />
          )}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-poet-bg via-poet-bg/20 to-transparent" />
        </div>
        <div className="space-y-4 p-4 sm:p-8">
          <div>
            <h1 className="font-display text-2xl font-semibold tracking-tight text-zinc-50 sm:text-4xl">
              <span className="text-gradient-gold [overflow-wrap:anywhere]">{event.title}</span>
            </h1>
            {marketingStatus ? (
              <div className="mt-3">
                <EventStatusBadge status={marketingStatus} />
              </div>
            ) : null}
            <p className="mt-2 break-words text-sm text-zinc-500 sm:text-base">
              {formatEventDateTime(event.starts_at, locale)}
            </p>
            <p className="break-words text-sm text-zinc-500 sm:text-base">{event.venue}</p>
            {mapsHref ? (
              <p className="mt-2">
                <a
                  href={mapsHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-10 items-center gap-2 rounded-full border border-poet-gold/30 bg-poet-gold/10 px-4 py-2 text-sm font-medium text-poet-gold-bright transition hover:border-poet-gold/50 hover:bg-poet-gold/15"
                >
                  {t("openInMaps")}
                  <span aria-hidden className="text-xs opacity-80">
                    ↗
                  </span>
                </a>
              </p>
            ) : null}
          </div>
          <p className="whitespace-pre-wrap break-words text-[0.9375rem] leading-relaxed text-zinc-300 sm:text-base">
            {event.description}
          </p>
          <div className="flex flex-col gap-4 border-t border-poet-gold/15 pt-5 sm:flex-row sm:flex-wrap sm:items-center sm:gap-6 sm:pt-6">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">{t("priceLabel")}</p>
              <p className="text-xl font-semibold text-poet-gold-bright">{formatPlnFromGrosze(event.price_grosze)}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">{t("remainingLabel")}</p>
              <p className="text-xl font-semibold text-zinc-100">{remaining}</p>
            </div>
          </div>

          {marketingStatus === "past" ? (
            <p className="mt-4 text-poet-gold-bright/90">
              {remaining > 0 ? t("purchaseClosedPast") : t("soldOut")}
            </p>
          ) : remaining > 0 ? (
            <EventCheckoutForm
              eventSlug={event.slug}
              remaining={remaining}
              locale={locale}
              bypassPayment={isCheckoutBypassPayment()}
            />
          ) : (
            <p className="mt-4 text-poet-gold-bright/90">{t("soldOut")}</p>
          )}
        </div>
      </div>
    </div>
  );
}
