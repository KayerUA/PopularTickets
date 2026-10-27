import { notFound, permanentRedirect } from "next/navigation";
import { routing, type AppLocale } from "@/i18n/routing";
import { LEGACY_SHOW_EVENT_SLUGS } from "@/lib/legacyShowEventRoutes";
import { preserveAttributionQuery } from "@/lib/orderAttribution";
import { notFoundPageMetadata } from "@/lib/notFoundMetadata";

export async function generateMetadata({ params }: { params: Promise<{ locale: AppLocale }> }) {
  return notFoundPageMetadata((await params).locale);
}

export default async function LegacyShowPage({ params, searchParams }: {
  params: Promise<{ locale: AppLocale; slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale, slug } = await params;
  if (!routing.locales.includes(locale)) notFound();
  const eventSlug = LEGACY_SHOW_EVENT_SLUGS[slug];
  if (!eventSlug) notFound();
  permanentRedirect(preserveAttributionQuery(`/${locale}/events/${eventSlug}`, await searchParams));
}
