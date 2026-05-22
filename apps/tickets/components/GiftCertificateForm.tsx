"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { unstable_rethrow } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { createPendingGiftOrder } from "@/app/actions/giftCheckout";
import type { AppLocale } from "@/i18n/routing";
import type { GiftProductCode } from "@/lib/giftProducts";
import { formatPlnFromGrosze } from "@/lib/format";
import { P24_FOOTER_GRAPHICS } from "@/lib/p24FooterAssets";

type ProductOption = {
  code: GiftProductCode;
  priceGrosze: number;
  titleKey: string;
  bodyKey: string;
};

type Props = {
  locale: AppLocale;
  products: ProductOption[];
  bypassPayment?: boolean;
  defaultProduct?: GiftProductCode;
};

export function GiftCertificateForm({ locale, products, bypassPayment, defaultProduct = "trial_gift" }: Props) {
  const t = useTranslations("GiftPage");
  const tCheckout = useTranslations("CheckoutForm");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [productCode, setProductCode] = useState<GiftProductCode>(defaultProduct);

  const selected = products.find((p) => p.code === productCode) ?? products[0]!;

  const fieldClass =
    "mt-1.5 w-full min-h-11 rounded-xl border border-poet-gold/20 bg-zinc-900/80 px-3 py-2.5 text-base text-white transition placeholder:text-zinc-600 disabled:opacity-50 sm:min-h-10 sm:py-2 sm:text-sm";

  return (
    <form
      className="mt-8 space-y-5 rounded-2xl border border-poet-gold/25 bg-gradient-to-b from-[#1a0c12]/90 via-poet-bg/85 to-zinc-950/90 p-4 shadow-[0_0_0_1px_rgba(197,160,89,0.12),inset_0_1px_0_rgba(255,230,200,0.06)] sm:p-6"
      action={async (formData) => {
        setError(null);
        setPending(true);
        try {
          const result = await createPendingGiftOrder(formData);
          if (result && typeof result === "object" && "p24Url" in result && typeof result.p24Url === "string") {
            window.location.assign(result.p24Url);
            return;
          }
        } catch (e: unknown) {
          unstable_rethrow(e);
          setError(e instanceof Error ? e.message : tCheckout("errorGeneric"));
        } finally {
          setPending(false);
        }
      }}
    >
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="productCode" value={productCode} />

      <fieldset className="space-y-3" disabled={pending}>
        <legend className="text-xs font-semibold uppercase tracking-[0.18em] text-poet-gold/75">{t("chooseProduct")}</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {products.map((p) => {
            const active = p.code === productCode;
            return (
              <label
                key={p.code}
                className={`cursor-pointer rounded-xl border px-4 py-4 transition ${
                  active
                    ? "border-poet-gold/50 bg-poet-gold/10 shadow-[inset_0_0_0_1px_rgba(197,160,89,0.25)]"
                    : "border-poet-gold/15 bg-black/20 hover:border-poet-gold/30"
                }`}
              >
                <input
                  type="radio"
                  name="productChoice"
                  value={p.code}
                  checked={active}
                  onChange={() => setProductCode(p.code)}
                  className="sr-only"
                />
                <p className="font-display text-base font-medium text-zinc-100">{t(p.titleKey)}</p>
                <p className="mt-1 text-sm leading-relaxed text-zinc-400">{t(p.bodyKey)}</p>
                <p className="mt-2 text-sm font-semibold text-poet-gold-bright">{formatPlnFromGrosze(p.priceGrosze)}</p>
              </label>
            );
          })}
        </div>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm sm:col-span-2">
          <span className="text-zinc-400">{tCheckout("name")}</span>
          <span className="ml-1 text-red-400/90" aria-hidden>
            *
          </span>
          <input name="buyerName" required disabled={pending} className={fieldClass} autoComplete="name" />
        </label>
        <label className="block text-sm">
          <span className="text-zinc-400">{tCheckout("email")}</span>
          <span className="ml-1 text-red-400/90" aria-hidden>
            *
          </span>
          <input
            name="email"
            type="email"
            required
            disabled={pending}
            className={fieldClass}
            autoComplete="email"
            inputMode="email"
          />
        </label>
        <label className="block text-sm">
          <span className="text-zinc-400">{tCheckout("phone")}</span>
          <span className="ml-1 text-red-400/90" aria-hidden>
            *
          </span>
          <input
            name="phone"
            type="tel"
            required
            disabled={pending}
            className={fieldClass}
            autoComplete="tel"
            inputMode="tel"
            placeholder="+48 …"
          />
        </label>
        <label className="block text-sm">
          <span className="text-zinc-400">{t("recipientName")}</span>
          <input name="recipientName" disabled={pending} className={fieldClass} autoComplete="name" />
        </label>
        <label className="block text-sm sm:col-span-2">
          <span className="text-zinc-400">{t("giftMessage")}</span>
          <textarea
            name="giftMessage"
            rows={3}
            maxLength={500}
            disabled={pending}
            className={`${fieldClass} resize-y`}
            placeholder={t("giftMessagePlaceholder")}
          />
        </label>
      </div>

      <div className="rounded-xl border border-poet-gold/15 bg-black/25 px-3 py-3 text-sm sm:px-4">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-poet-gold/75">{t("summaryTitle")}</p>
        <p className="mt-2 font-medium text-poet-gold-bright">{formatPlnFromGrosze(selected.priceGrosze)}</p>
        <p className="mt-2 text-[11px] leading-relaxed text-zinc-500">{t("summaryNote")}</p>
      </div>

      {error ? <p className="break-words text-sm text-red-400">{error}</p> : null}

      <label className="flex cursor-pointer items-start gap-3 text-sm text-zinc-400">
        <input
          type="checkbox"
          name="acceptLegal"
          value="on"
          required
          disabled={pending}
          className="mt-1 h-4 w-4 shrink-0 rounded border border-poet-gold/40 bg-zinc-950 text-poet-gold focus:ring-poet-gold/50"
        />
        <span className="leading-relaxed">
          {tCheckout.rich("legalConsent", {
            terms: (chunks) => (
              <Link href="/regulamin" className="text-poet-gold underline decoration-poet-gold/40 underline-offset-2 hover:text-poet-gold-bright">
                {chunks}
              </Link>
            ),
            privacy: (chunks) => (
              <Link href="/polityka-prywatnosci" className="text-poet-gold underline decoration-poet-gold/40 underline-offset-2 hover:text-poet-gold-bright">
                {chunks}
              </Link>
            ),
          })}
        </span>
      </label>

      <p className="text-xs leading-relaxed text-zinc-500">{bypassPayment ? t("hintBypass") : t("hint")}</p>

      {!bypassPayment ? (
        <div className="flex items-start gap-3 rounded-xl border border-poet-gold/15 bg-black/25 px-3 py-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element -- lokalne SVG z public/ */}
          <img
            src={P24_FOOTER_GRAPHICS.mark}
            alt=""
            width={48}
            height={48}
            className="mt-0.5 h-10 w-10 shrink-0 rounded-md object-contain sm:h-11 sm:w-11"
          />
          <p className="min-w-0 flex-1 text-[11px] leading-relaxed text-zinc-500/95">{tCheckout("p24CheckoutTrust")}</p>
        </div>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="btn-poet btn-poet-theatre w-full py-3.5 text-sm font-semibold tracking-wide sm:w-auto sm:px-12 sm:py-3"
      >
        {pending ? t("submitting") : bypassPayment ? t("submitBypass") : t("submit")}
      </button>
    </form>
  );
}
