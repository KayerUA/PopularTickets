"use client";

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import { unstable_rethrow } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { createPendingOrder } from "@/app/actions/checkout";
import type { AppLocale } from "@/i18n/routing";
import { splitTheatreTicketTotalGrosze } from "@/lib/plVatTheatreTicket";
import { formatPlnFromGrosze } from "@/lib/format";
import { P24_FOOTER_GRAPHICS } from "@/lib/p24FooterAssets";
import { CHECKOUT_FORM_ID } from "@/components/EventMobileStickyCta";

type Props = {
  eventSlug: string;
  remaining: number;
  locale: AppLocale;
  /** Cena jednego biletu w groszach (brutto, z VAT 8%). */
  unitPriceGrosze: number;
  /** MVP: bez Przelewy24 — natychmiastowe potwierdzenie */
  bypassPayment?: boolean;
};

export function EventCheckoutForm({ eventSlug, remaining, locale, unitPriceGrosze, bypassPayment }: Props) {
  const t = useTranslations("CheckoutForm");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const max = Math.min(20, remaining);

  const totals = useMemo(() => splitTheatreTicketTotalGrosze(unitPriceGrosze, quantity), [unitPriceGrosze, quantity]);

  const fieldClass =
    "mt-1.5 w-full min-h-11 rounded-xl border border-poet-gold/20 bg-zinc-900/80 px-3 py-2.5 text-base text-white transition placeholder:text-zinc-600 disabled:opacity-50 sm:min-h-10 sm:py-2 sm:text-sm";

  return (
    <form
      id={CHECKOUT_FORM_ID}
      className="relative mt-6 space-y-4 rounded-2xl border border-poet-gold/25 bg-gradient-to-b from-[#1a0c12]/90 via-poet-bg/85 to-zinc-950/90 p-4 shadow-[0_0_0_1px_rgba(197,160,89,0.12),inset_0_1px_0_rgba(255,230,200,0.06)] sm:p-5"
      action={async (formData) => {
        setError(null);
        setPending(true);
        try {
          const result = await createPendingOrder(formData);
          if (result && typeof result === "object" && "p24Url" in result && typeof result.p24Url === "string") {
            window.location.assign(result.p24Url);
            return;
          }
        } catch (e: unknown) {
          /* Next 15: redirect() из server action — внутренний редирект на return; внешний P24 — через p24Url выше */
          unstable_rethrow(e);
          setError(e instanceof Error ? e.message : t("errorGeneric"));
        } finally {
          setPending(false);
        }
      }}
    >
      <input type="hidden" name="eventSlug" value={eventSlug} />
      <input type="hidden" name="locale" value={locale} />
      <div className="pointer-events-none absolute left-3 top-2 h-5 w-px border-l border-dashed border-poet-gold/35 sm:left-4" aria-hidden />
      <div className="pointer-events-none absolute right-3 top-2 h-5 w-px border-r border-dashed border-poet-gold/35 sm:right-4" aria-hidden />

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="text-zinc-400">{t("name")}</span>
          <span className="ml-1 text-red-400/90" aria-hidden>
            *
          </span>
          <input name="buyerName" required disabled={pending} className={fieldClass} autoComplete="name" />
        </label>
        <label className="block text-sm">
          <span className="text-zinc-400">{t("email")}</span>
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
          <span className="text-zinc-400">{t("phone")}</span>
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
            aria-describedby="checkout-phone-hint"
          />
          <span id="checkout-phone-hint" className="mt-1 block text-[11px] leading-snug text-zinc-500">
            {t("phoneHint")}
          </span>
        </label>
        <label className="block text-sm">
          <span className="text-zinc-400">{t("quantity")}</span>
          <input
            name="quantity"
            type="number"
            min={1}
            max={max}
            value={quantity}
            onChange={(e) => {
              const v = Number(e.target.value);
              if (Number.isNaN(v)) return;
              setQuantity(Math.min(max, Math.max(1, Math.floor(v))));
            }}
            required
            disabled={pending}
            className={fieldClass}
            inputMode="numeric"
          />
        </label>
      </div>

      <div className="rounded-xl border border-poet-gold/15 bg-black/25 px-3 py-3 text-sm sm:px-4">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-poet-gold/75">{t("summaryTitle")}</p>
        <dl className="mt-2 space-y-1.5 text-zinc-300">
          <div className="flex justify-between gap-3">
            <dt>{t("bruttoLabel")}</dt>
            <dd className="font-medium text-poet-gold-bright">{formatPlnFromGrosze(totals.grossGrosze)}</dd>
          </div>
          <div className="flex justify-between gap-3 text-zinc-400">
            <dt>{t("nettoLabel")}</dt>
            <dd>{formatPlnFromGrosze(totals.netGrosze)}</dd>
          </div>
          <div className="flex justify-between gap-3 text-zinc-400">
            <dt>{t("vatLabel")}</dt>
            <dd>{formatPlnFromGrosze(totals.vatGrosze)}</dd>
          </div>
        </dl>
        <p className="mt-2 text-[11px] leading-relaxed text-zinc-500">{t("vatLegalNote")}</p>
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
      <label className="flex cursor-pointer items-start gap-3 text-sm text-zinc-400">
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
      </label>
      <p className="text-xs leading-relaxed text-zinc-500 sm:mt-1">{bypassPayment ? t("hintBypass") : t("hint")}</p>
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
          <p className="min-w-0 flex-1 text-[11px] leading-relaxed text-zinc-500/95">{t("p24CheckoutTrust")}</p>
        </div>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="btn-poet btn-poet-theatre hidden w-full py-3.5 text-sm font-semibold tracking-wide sm:inline-flex sm:w-auto sm:px-12 sm:py-3"
      >
        {pending ? t("submitting") : bypassPayment ? t("submitBypass") : t("submit")}
      </button>
    </form>
  );
}
