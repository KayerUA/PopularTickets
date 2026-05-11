import { z } from "zod";
import type { ReactNode } from "react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import type { AppLocale } from "@/i18n/routing";
import { getServiceSupabase } from "@/lib/supabase/admin";
import { loadOrderReceiptState } from "@/lib/checkoutReceipt";
import { CheckoutPaidReceipt, type CheckoutReceiptLabels } from "@/components/CheckoutPaidReceipt";
import { Link } from "@/i18n/navigation";
import { isOrderReceiptSigningConfigured, verifyOrderReceiptToken } from "@/lib/orderReceiptToken";
import { buildPublicPageMetadata } from "@/lib/seo";

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
    path: "/checkout/return",
    title: t("checkoutReturnTitle"),
    description: t("checkoutReturnDescription"),
    robots: { index: false, follow: false },
  });
}

export default async function CheckoutReturnPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: AppLocale }>;
  searchParams: Promise<{ order?: string; rt?: string }>;
}) {
  const { locale } = await params;
  const sp = await searchParams;
  const t = await getTranslations({ locale, namespace: "CheckoutReturn" });
  const tPdf = await getTranslations({ locale, namespace: "TicketPdf" });

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

  let receiptBlock: ReactNode = null;

  if (!strictBlocked && orderId) {
    const supabase = getServiceSupabase();
    if (supabase) {
      const state = await loadOrderReceiptState(supabase, orderId);
      const labels: CheckoutReceiptLabels = {
        ticketsHeading: t("ticketsHeading"),
        downloadTicket: t("downloadTicket"),
        copyId: t("copyId"),
        copiedId: t("copiedId"),
        emailAlso: t("emailAlso"),
        shareWarning: t("shareWarning"),
        checkInHint: t("checkInHint"),
        ticketLabel: t("ticketLabel"),
        ticketPdfKindSecondary: tPdf("kindSecondary"),
        ticketPdfQrSecondary: tPdf("qrSecondary"),
        ticketPdfDisclaimer: tPdf("translationDisclaimer"),
        ticketPdfNumberCaption: tPdf("ticketNumberCaption"),
      };

      const refreshHref =
        rtRaw && isOrderReceiptSigningConfigured()
          ? `/checkout/return?rt=${encodeURIComponent(rtRaw)}`
          : `/checkout/return?order=${encodeURIComponent(orderId)}`;

      if (state.kind === "paid") {
        receiptBlock = <CheckoutPaidReceipt receipt={state.receipt} locale={locale} labels={labels} />;
      } else if (state.kind === "pending") {
        receiptBlock = (
          <div className="mt-8 space-y-3 border-t border-poet-gold/20 pt-8 text-left">
            <p className="text-sm font-medium text-amber-200/95">{t("pendingTitle")}</p>
            <p className="text-sm leading-relaxed text-zinc-400">{t("pendingBody")}</p>
            <p className="text-xs text-zinc-500">{t("pendingHint")}</p>
            <Link
              href={refreshHref}
              className="inline-flex min-h-10 items-center justify-center rounded-full border border-poet-gold/35 px-4 py-2 text-sm text-poet-gold-bright transition hover:bg-poet-gold/10"
            >
              {t("refresh")}
            </Link>
          </div>
        );
      } else if (state.kind === "unpaid") {
        receiptBlock = (
          <p className="mt-8 border-t border-poet-gold/20 pt-8 text-left text-sm text-zinc-400">{t("unpaidBody")}</p>
        );
      }
    }
  }

  return (
    <div className="poet-safe-x mx-auto max-w-2xl py-16 sm:py-24">
      <div className="animate-fade-up rounded-2xl border border-poet-gold/25 bg-poet-surface/50 px-5 py-10 text-center shadow-gold-sm backdrop-blur-md sm:max-w-2xl sm:rounded-3xl sm:px-8 sm:py-12">
        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-poet-gold/80">{t("brand")}</p>
        <h1 className="font-display mt-3 text-2xl font-semibold text-zinc-50 sm:mt-4 sm:text-3xl">
          <span className="text-gradient-gold">{receiptBlock ? t("titleWithTickets") : t("title")}</span>
        </h1>
        <p className="mt-5 leading-relaxed text-zinc-400">
          {receiptBlock ? t("introWithTickets") : strictBlocked ? t("receiptAccessDenied") : t("body")}
        </p>
        {receiptBlock}
      </div>
    </div>
  );
}
