import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { normalizeBuyerEmail } from "@/lib/ratings/audience";
import { eventRatingOrderId } from "@/lib/ratings/server";
import { requireServiceSupabase } from "@/lib/supabase/admin";
import { EventRatingForm } from "@/components/EventRatingForm";
import { RatingUpcomingShows } from "@/components/RatingUpcomingShows";
import { ratingText } from "@/lib/ratings/i18n";
import { formatEventDateTime } from "@/lib/format";
import type { AppLocale } from "@/i18n/routing";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Оценка мероприятия — PopularTickets",
  robots: { index: false, follow: false, googleBot: { index: false, follow: false, noimageindex: true, nosnippet: true } },
  referrer: "no-referrer",
};

export default async function EventRatingPage({
  params,
}: {
  params: Promise<{ locale: string; token: string }>;
}) {
  const { locale: raw, token } = await params;
  if (raw !== "pl" && raw !== "uk" && raw !== "ru") notFound();
  const locale: AppLocale = raw;
  const t = ratingText[locale];
  const id = await eventRatingOrderId(token);
  if (!id) return <p className="poet-safe-x mx-auto max-w-xl py-12 text-amber-200">{t.invalid}</p>;

  const db = requireServiceSupabase();
  const { data: order } = await db.from("orders").select("id,event_id,status,email").eq("id", id).maybeSingle();
  if (!order || order.status !== "paid") {
    return <p className="poet-safe-x mx-auto max-w-xl py-12 text-amber-200">{t.invalid}</p>;
  }

  const [{ data: event }, ratingRes] = await Promise.all([
    db.from("events").select("title,starts_at,venue").eq("id", order.event_id).single(),
    db
      .from("event_ratings")
      .select("score,comment")
      .eq("event_id", order.event_id)
      .ilike("buyer_email", normalizeBuyerEmail(order.email))
      .maybeSingle(),
  ]);
  if (!event) notFound();
  const rating = ratingRes.error ? null : ratingRes.data;

  const started = Date.parse(event.starts_at) <= Date.now();

  return (
    <div className="poet-safe-x mx-auto max-w-xl py-10 sm:py-14">
      <h1 className="font-display text-2xl font-semibold text-poet-gold-bright sm:text-3xl">{event.title}</h1>
      <p className="mt-2 text-zinc-400">{formatEventDateTime(event.starts_at, locale)}</p>
      <p className="mt-1 text-sm text-zinc-500">{event.venue}</p>
      <h2 className="mt-8 font-display text-xl text-zinc-100">{t.title}</h2>
      <p className="mt-3 text-sm leading-relaxed text-zinc-400">{t.intro}</p>
      <div className="mt-8">
        {!started ? (
          <p className="text-amber-200">{t.tooEarly}</p>
        ) : rating ? (
          <p className="text-emerald-300">{t.already}</p>
        ) : (
          <EventRatingForm token={token} locale={locale} />
        )}
      </div>
      <RatingUpcomingShows db={db} locale={locale} />
    </div>
  );
}
