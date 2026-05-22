import { z } from "zod";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import type { AppLocale } from "@/i18n/routing";
import { getServiceSupabase } from "@/lib/supabase/admin";
import { buildPublicPageMetadata } from "@/lib/seo";
import { Link } from "@/i18n/navigation";
import { ScrollToTopOnMount } from "@/components/ScrollToTopOnMount";
import { isOrderReceiptSigningConfigured, verifyOrderReceiptToken } from "@/lib/orderReceiptToken";
import { formatPlnFromGrosze } from "@/lib/format";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: AppLocale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata" });
  return buildPublicPageMetadata({
    locale,
    path: "/podarok/dziekujemy",
    title: t("giftThanksTitle"),
    description: t("giftThanksDescription"),
    robots: {
      index: false,
      follow: false,
      googleBot: { index: false, follow: false, noimageindex: true, nosnippet: true },
    },
  });
}

export default async function GiftThanksPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: AppLocale }>;
  searchParams: Promise<{ order?: string; rt?: string }>;
}) {
  const { locale } = await params;
  const sp = await searchParams;
  const t = await getTranslations({ locale, namespace: "GiftThanks" });

  const rtRaw = typeof sp.rt === "string" ? sp.rt.trim() : "";
  const orderRaw = typeof sp.order === "string" ? sp.order.trim() : "";

  let orderId: string | null = null;
  let strictBlocked = false;

  if (isOrderReceiptSigningConfigured()) {
    if (rtRaw) {
      orderId = await verifyOrderReceiptToken(rtRaw);
      if (!orderId) strictBlocked = true;
    } else if (orderRaw && z.string().uuid().safeParse(orderRaw).success) {
      strictBlocked = true;
    }
  } else {
    const orderParsed = z.string().uuid().safeParse(orderRaw);
    if (orderParsed.success) orderId = orderParsed.data;
  }

  let status: "paid" | "pending" | "unknown" = "unknown";
  let buyerName: string | null = null;
  let amountGrosze: number | null = null;

  if (!strictBlocked && orderId) {
    const supabase = getServiceSupabase();
    if (supabase) {
      const { data } = await supabase
        .from("gift_orders")
        .select("status,buyer_name,amount_grosze")
        .eq("id", orderId)
        .maybeSingle();
      if (data) {
        buyerName = data.buyer_name as string;
        amountGrosze = data.amount_grosze as number;
        if (data.status === "paid") status = "paid";
        else if (data.status === "pending") status = "pending";
      }
    }
  }

  const refreshHref =
    rtRaw && isOrderReceiptSigningConfigured()
      ? `/podarok/dziekujemy?rt=${encodeURIComponent(rtRaw)}`
      : orderId
        ? `/podarok/dziekujemy?order=${encodeURIComponent(orderId)}`
        : "/podarok";

  return (
    <div className="poet-safe-x mx-auto max-w-2xl py-16 sm:py-24">
      <ScrollToTopOnMount />
      <div className="animate-fade-up rounded-2xl border border-poet-gold/25 bg-poet-surface/50 px-5 py-10 text-center shadow-gold-sm backdrop-blur-md sm:rounded-3xl sm:px-8 sm:py-12">
        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-poet-gold/80">{t("brand")}</p>
        <h1 className="font-display mt-3 text-2xl font-semibold text-zinc-50 sm:mt-4 sm:text-3xl">
          <span className="text-gradient-gold">{status === "paid" ? t("titlePaid") : t("title")}</span>
        </h1>
        <p className="mt-5 leading-relaxed text-zinc-400">
          {strictBlocked
            ? t("accessDenied")
            : status === "paid"
              ? t("bodyPaid", { name: buyerName ?? "" })
              : status === "pending"
                ? t("bodyPending")
                : t("body")}
        </p>
        {status === "paid" && amountGrosze != null ? (
          <p className="mt-3 text-sm font-medium text-poet-gold-bright">{formatPlnFromGrosze(amountGrosze)}</p>
        ) : null}
        {status === "pending" ? (
          <div className="mt-8 space-y-3 border-t border-poet-gold/20 pt-8">
            <p className="text-xs text-zinc-500">{t("pendingHint")}</p>
            <Link
              href={refreshHref}
              className="inline-flex min-h-10 items-center justify-center rounded-full border border-poet-gold/35 px-4 py-2 text-sm text-poet-gold-bright transition hover:bg-poet-gold/10"
            >
              {t("refresh")}
            </Link>
          </div>
        ) : null}
        <div className="mt-8 border-t border-poet-gold/20 pt-8">
          <Link href="/" className="text-sm text-poet-gold hover:text-poet-gold-bright">
            {t("backEvents")}
          </Link>
        </div>
      </div>
    </div>
  );
}
