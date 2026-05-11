import { notFound } from "next/navigation";
import Image from "next/image";
import type { Metadata } from "next";
import { getServiceSupabase } from "@/lib/supabase/admin";
import { SupabaseSetupHint } from "@/components/SupabaseSetupHint";
import { SupabaseQueryErrorPanel } from "@/components/SupabaseQueryErrorPanel";
import { formatPlnFromGrosze, formatEventDateTime } from "@/lib/format";
import { EventCheckoutForm } from "@/components/EventCheckoutForm";
import { getTranslations } from "next-intl/server";
import type { AppLocale } from "@/i18n/routing";
import { isCheckoutBypassPayment } from "@/lib/checkoutBypass";

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

  const { data: event, error } = await supabase
    .from("events")
    .select("id,slug,title,description,image_url,venue,starts_at,price_grosze,total_tickets")
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();

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
            <p className="mt-2 break-words text-sm text-zinc-500 sm:text-base">
              {formatEventDateTime(event.starts_at, locale)}
            </p>
            <p className="break-words text-sm text-zinc-500 sm:text-base">{event.venue}</p>
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

          {remaining > 0 ? (
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
