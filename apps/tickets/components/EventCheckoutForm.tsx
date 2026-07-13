"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { unstable_rethrow } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { createPendingOrder } from "@/app/actions/checkout";
import type { AppLocale } from "@/i18n/routing";
import { formatPlnFromGrosze } from "@/lib/format";
import { P24_FOOTER_GRAPHICS } from "@/lib/p24FooterAssets";
import { CHECKOUT_FORM_ID, CHECKOUT_SUBMIT_ID } from "@/components/EventMobileStickyCta";
import {
  firstCheckoutFieldError,
  validateCheckoutFormData,
  type CheckoutFieldKey,
} from "@/lib/checkoutFormValidation";
import { previewPromoCode } from "@/app/actions/promo-codes";

type Props = {
  eventSlug: string;
  remaining: number;
  locale: AppLocale;
  unitPriceGrosze: number;
  bypassPayment?: boolean;
  compact?: boolean;
  initialPromoCode?: string;
  initialPromoDiscountPercent?: number;
};

function fieldBorder(hasError: boolean): string {
  return hasError ? "border-red-400/70 focus:border-red-400/90" : "border-poet-gold/20";
}

export function EventCheckoutForm({
  eventSlug,
  remaining,
  locale,
  unitPriceGrosze,
  bypassPayment,
  compact = false,
  initialPromoCode = "",
  initialPromoDiscountPercent = 0,
}: Props) {
  const t = useTranslations("CheckoutForm");
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<CheckoutFieldKey, string>>>({});
  const [pending, setPending] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [promoCode, setPromoCode] = useState(initialPromoCode);
  const [promoDiscountPercent, setPromoDiscountPercent] = useState(initialPromoDiscountPercent);
  const [promoMessage, setPromoMessage] = useState<string | null>(
    initialPromoDiscountPercent > 0 ? `Промокод применён: −${initialPromoDiscountPercent}%` : null,
  );
  const formRef = useRef<HTMLFormElement>(null);
  const max = Math.min(20, remaining);

  const discountedUnitPriceGrosze = Math.round(unitPriceGrosze * (1 - promoDiscountPercent / 100));
  const totalGrosze = discountedUnitPriceGrosze * quantity;

  const applyPromoCode = async () => {
    const result = await previewPromoCode({ code: promoCode, eventSlug, unitPriceGrosze });
    if (!result) {
      setPromoDiscountPercent(0);
      setPromoMessage(null);
    } else if ("error" in result) {
      setPromoDiscountPercent(0);
      setPromoMessage(result.error);
    } else {
      setPromoCode(result.code);
      setPromoDiscountPercent(result.discountPercent);
      setPromoMessage(`Промокод применён: −${result.discountPercent}%`);
    }
  };

  const fieldClass = (key: CheckoutFieldKey) =>
    `mt-1.5 w-full min-h-11 rounded-xl border bg-zinc-900/80 px-3 py-2.5 text-base text-white transition placeholder:text-zinc-600 disabled:opacity-50 sm:min-h-10 sm:py-2 sm:text-sm ${fieldBorder(Boolean(fieldErrors[key]))}`;

  const validationMessages = {
    nameRequired: t("nameRequired"),
    emailInvalid: t("emailInvalid"),
    phoneRequired: t("phoneRequired"),
    phoneInvalid: t("phoneInvalid"),
    quantityInvalid: t("quantityInvalid", { max }),
    legalRequired: t("legalRequired"),
  };

  const scrollToField = (key: CheckoutFieldKey) => {
    const el = formRef.current?.querySelector(`[data-checkout-field="${key}"]`);
    if (el instanceof HTMLElement) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      const focusable = el.querySelector("input, select, textarea") as HTMLElement | null;
      focusable?.focus();
    }
  };

  const runClientValidation = (formData: FormData): boolean => {
    const errors = validateCheckoutFormData(formData, max, validationMessages, { phoneRequired: !compact });
    setFieldErrors(errors);
    const first = firstCheckoutFieldError(errors);
    if (first) {
      scrollToField(first);
      return false;
    }
    return true;
  };

  const submitOrder = async (formData: FormData) => {
    setError(null);
    setPending(true);
    try {
      const result = await createPendingOrder(formData);
      if (result && typeof result === "object" && "p24Url" in result && typeof result.p24Url === "string") {
        window.location.assign(result.p24Url);
        return;
      }
    } catch (e: unknown) {
      unstable_rethrow(e);
      setError(e instanceof Error ? e.message : t("errorGeneric"));
    } finally {
      setPending(false);
    }
  };

  return (
    <form
      ref={formRef}
      id={CHECKOUT_FORM_ID}
      noValidate
      className={`relative mt-6 space-y-4 rounded-2xl border border-poet-gold/25 bg-gradient-to-b from-[#1a0c12]/90 via-poet-bg/85 to-zinc-950/90 p-4 shadow-[0_0_0_1px_rgba(197,160,89,0.12),inset_0_1px_0_rgba(255,230,200,0.06)] sm:p-5${compact ? " mt-4" : ""}`}
      onSubmit={async (e) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        if (!runClientValidation(formData)) return;
        await submitOrder(formData);
      }}
    >
      <input type="hidden" name="eventSlug" value={eventSlug} />
      <input type="hidden" name="locale" value={locale} />
      <div className="pointer-events-none absolute left-3 top-2 h-5 w-px border-l border-dashed border-poet-gold/35 sm:left-4" aria-hidden />
      <div className="pointer-events-none absolute right-3 top-2 h-5 w-px border-r border-dashed border-poet-gold/35 sm:right-4" aria-hidden />

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="block text-sm" data-checkout-field="buyerName">
          <label htmlFor="checkout-buyerName" className="text-zinc-400">
            {t("name")}
            <span className="ml-1 text-red-400/90" aria-hidden>
              *
            </span>
          </label>
          <input
            id="checkout-buyerName"
            name="buyerName"
            disabled={pending}
            className={fieldClass("buyerName")}
            autoComplete="name"
            aria-invalid={fieldErrors.buyerName ? true : undefined}
            aria-describedby={fieldErrors.buyerName ? "checkout-buyerName-error" : undefined}
            onChange={() => {
              if (fieldErrors.buyerName) setFieldErrors((prev) => ({ ...prev, buyerName: undefined }));
            }}
          />
          {fieldErrors.buyerName ? (
            <p id="checkout-buyerName-error" className="mt-1.5 text-xs text-red-400" role="alert">
              {fieldErrors.buyerName}
            </p>
          ) : null}
        </div>
        <div className="block text-sm" data-checkout-field="email">
          <label htmlFor="checkout-email" className="text-zinc-400">
            {t("email")}
            <span className="ml-1 text-red-400/90" aria-hidden>
              *
            </span>
          </label>
          <input
            id="checkout-email"
            name="email"
            type="email"
            disabled={pending}
            className={fieldClass("email")}
            autoComplete="email"
            inputMode="email"
            aria-invalid={fieldErrors.email ? true : undefined}
            aria-describedby={fieldErrors.email ? "checkout-email-error" : undefined}
            onChange={() => {
              if (fieldErrors.email) setFieldErrors((prev) => ({ ...prev, email: undefined }));
            }}
          />
          {fieldErrors.email ? (
            <p id="checkout-email-error" className="mt-1.5 text-xs text-red-400" role="alert">
              {fieldErrors.email}
            </p>
          ) : null}
        </div>
        {!compact ? <div className="block text-sm" data-checkout-field="phone">
          <label htmlFor="checkout-phone" className="text-zinc-400">
            {t("phone")}
            <span className="ml-1 text-red-400/90" aria-hidden>
              *
            </span>
          </label>
          <input
            id="checkout-phone"
            name="phone"
            type="tel"
            disabled={pending}
            className={fieldClass("phone")}
            autoComplete="tel"
            inputMode="tel"
            placeholder="+48 …"
            aria-invalid={fieldErrors.phone ? true : undefined}
            aria-describedby={
              fieldErrors.phone ? "checkout-phone-error checkout-phone-hint" : "checkout-phone-hint"
            }
            onChange={() => {
              if (fieldErrors.phone) setFieldErrors((prev) => ({ ...prev, phone: undefined }));
            }}
          />
          {fieldErrors.phone ? (
            <p id="checkout-phone-error" className="mt-1.5 text-xs text-red-400" role="alert">
              {fieldErrors.phone}
            </p>
          ) : null}
          <span id="checkout-phone-hint" className="mt-1 block text-[11px] leading-snug text-zinc-500">
            {t("phoneHint")}
          </span>
        </div> : null}
        <div className="block text-sm" data-checkout-field="quantity">
          <label htmlFor="checkout-quantity" className="text-zinc-400">
            {t("quantity")}
          </label>
          <input
            id="checkout-quantity"
            name="quantity"
            type="number"
            min={1}
            max={max}
            value={quantity}
            onChange={(e) => {
              const v = Number(e.target.value);
              if (Number.isNaN(v)) return;
              setQuantity(Math.min(max, Math.max(1, Math.floor(v))));
              if (fieldErrors.quantity) setFieldErrors((prev) => ({ ...prev, quantity: undefined }));
            }}
            disabled={pending}
            className={fieldClass("quantity")}
            inputMode="numeric"
            aria-invalid={fieldErrors.quantity ? true : undefined}
            aria-describedby={fieldErrors.quantity ? "checkout-quantity-error" : undefined}
          />
          {fieldErrors.quantity ? (
            <p id="checkout-quantity-error" className="mt-1.5 text-xs text-red-400" role="alert">
              {fieldErrors.quantity}
            </p>
          ) : null}
        </div>
        <div className="block text-sm" data-checkout-field="promoCode">
          <label htmlFor="checkout-promoCode" className="text-zinc-400">Промокод</label>
          <input
            id="checkout-promoCode"
            name="promoCode"
            value={promoCode}
            disabled={pending}
            onChange={(e) => {
              setPromoCode(e.target.value.toUpperCase());
              setPromoDiscountPercent(0);
              setPromoMessage(null);
            }}
            onBlur={() => void applyPromoCode()}
            className={fieldClass("quantity")}
            autoComplete="off"
            placeholder="PARTNER15"
          />
          {promoMessage ? <p className={`mt-1.5 text-xs ${promoDiscountPercent ? "text-emerald-300" : "text-red-400"}`}>{promoMessage}</p> : null}
        </div>
      </div>

      <div className="rounded-xl border border-poet-gold/15 bg-black/25 px-3 py-3 text-sm sm:px-4">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-poet-gold/75">{t("summaryTitle")}</p>
        <dl className="mt-2 space-y-1.5 text-zinc-300">
          <div className="flex justify-between gap-3">
            <dt>{t("totalLabel")}</dt>
            <dd className="font-medium text-poet-gold-bright">{formatPlnFromGrosze(totalGrosze)}</dd>
          </div>
          {promoDiscountPercent > 0 ? (
            <div className="flex justify-between gap-3 text-xs text-zinc-500">
              <dt>Без промокода</dt>
              <dd className="line-through">{formatPlnFromGrosze(unitPriceGrosze * quantity)}</dd>
            </div>
          ) : null}
        </dl>
        <p className="mt-2 text-[11px] leading-relaxed text-zinc-500">{t("taxExemptionNote")}</p>
      </div>

      {error ? (
        <p className="break-words text-sm text-red-400" role="alert">
          {error}
        </p>
      ) : null}
      <div data-checkout-field="acceptLegal">
        <label className="flex cursor-pointer items-start gap-3 text-sm text-zinc-400">
          <input
            type="checkbox"
            name="acceptLegal"
            value="on"
            disabled={pending}
            className="mt-1 h-4 w-4 shrink-0 rounded border border-poet-gold/40 bg-zinc-950 text-poet-gold focus:ring-poet-gold/50"
            aria-invalid={fieldErrors.acceptLegal ? true : undefined}
            aria-describedby={fieldErrors.acceptLegal ? "checkout-legal-error" : undefined}
            onChange={() => {
              if (fieldErrors.acceptLegal) setFieldErrors((prev) => ({ ...prev, acceptLegal: undefined }));
            }}
          />
          <span className="leading-relaxed">
            {t.rich("legalConsent", {
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
        {fieldErrors.acceptLegal ? (
          <p id="checkout-legal-error" className="mt-1.5 text-xs text-red-400" role="alert">
            {fieldErrors.acceptLegal}
          </p>
        ) : null}
      </div>
      {!compact ? <label className="flex cursor-pointer items-start gap-3 text-sm text-zinc-400">
        <input
          type="checkbox"
          name="marketingEmailOptIn"
          value="on"
          disabled={pending}
          className="mt-1 h-4 w-4 shrink-0 rounded border border-poet-gold/40 bg-zinc-950 text-poet-gold focus:ring-poet-gold/50"
        />
        <span className="leading-relaxed">
          {t.rich("marketingEmailConsent", {
            privacy: (chunks) => (
              <Link href="/polityka-prywatnosci" className="text-poet-gold underline decoration-poet-gold/40 underline-offset-2 hover:text-poet-gold-bright">
                {chunks}
              </Link>
            ),
          })}
        </span>
      </label> : null}
      {!compact ? <p className="text-xs leading-relaxed text-zinc-500 sm:mt-1">{bypassPayment ? t("hintBypass") : t("hint")}</p> : null}
      {!compact && !bypassPayment ? (
        <div className="flex items-start gap-3 rounded-xl border border-poet-gold/15 bg-black/25 px-3 py-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element -- lokalne SVG z public/ */}
          <img
            src={P24_FOOTER_GRAPHICS.mark}
            alt=""
            width={48}
            height={48}
            className="mt-0.5 h-10 w-10 shrink-0 rounded-md object-contain sm:h-11 sm:w-11"
          />
          <p className="min-w-0 flex-1 text-[11px] leading-relaxed text-zinc-500/95">{t("p24CheckoutTrust")}</p>
        </div>
      ) : null}

      <button
        id={CHECKOUT_SUBMIT_ID}
        type="submit"
        disabled={pending}
        className="btn-poet btn-poet-theatre flex w-full scroll-mt-28 py-3.5 text-sm font-semibold tracking-wide md:inline-flex md:w-auto md:px-12 md:py-3"
      >
        {pending ? t("submitting") : bypassPayment ? t("submitBypass") : t("submit")}
      </button>
    </form>
  );
}
