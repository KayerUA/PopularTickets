import { permanentRedirect } from "next/navigation";
import type { AppLocale } from "@/i18n/routing";
import { preserveAttributionQuery } from "@/lib/orderAttribution";

export default async function LegacyRepertoirePage({ params, searchParams }: {
  params: Promise<{ locale: AppLocale }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await params;
  permanentRedirect(preserveAttributionQuery(`/${locale}/events`, await searchParams));
}
