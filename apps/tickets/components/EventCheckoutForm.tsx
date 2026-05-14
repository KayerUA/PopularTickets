"use client";

import { useTransition, useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import { unstable_rethrow } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { createPendingOrder } from "@/app/actions/checkout";
import type { AppLocale } from "@/i18n/routing";
import { splitTheatreTicketTotalGrosze } from "@/lib/plVatTheatreTicket";
import { formatPlnFromGrosze } from "@/lib/format";
import { P24_FOOTER_GRAPHICS } from "@/lib/p24FooterAssets";

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
  const [pending, startTransition] = useTransition();
  const [quantity, setQuantity] = useState(1);
  const max = Math.min(20, remaining);

  const totals = useMemo(() => splitTheatreTicketTotalGrosze(unitPriceGrosze, quantity), [unitPriceGrosze, quantity]);

  const fieldClass =
    "mt-1.5 w-full min-h-11 rounded-xl border border-poet-gold/20 bg-zinc-900/80 px-3 py-2.5 text-base text-white transition placeholder:text-zinc-600 disabled:opacity-50 sm:min-h-10 sm:py-2 sm:text-sm";

  return (
    <form
      className="relative mt-6 space-y-4 rounded-2xl border border-poet-gold/25 bg-gradient-to-b from-[#1a0c12]/90 via-poet-bg/85 to-zinc-950/90 p-4 pb-28 shadow-[0_0_0_1px_rgba(197,160,89,0.12),inset_0_1px_0_rgba(255,230,200,0.06)] sm:p-5 sm:pb-5"
      action={(formData) => {
        setError(null);
        startTransition(async () => {
          try {
            await createPendingOrder(formData);
          } catch (e: unknown) {
            /* Next 15: redirect() из action приходит как ошибка; digest на клиенте может быть обёрнут — см. unstable_rethrow */
            unstable_rethrow(e);
            setError(e instanceof Error ? e.message : t("errorGeneric"));
          }
        });
      }}
    >
      <input type="hidden" name="eventSlug" value={eventSlug} />
      <input type="hidden" name="locale" value={locale} />
      <div className="pointer-events-none absolute left-3 top-2 h-5 w-px border-l border-dashed border-poet-gold/35 sm:left-4" aria-hidden />
      <div className="pointer-events-none absolute right-3 top-2 h-5 w-px border-r border-dashed border-poet-gold/35 sm:right-4" aria-hidden />

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="text-zinc-400">{t("name")}</span>
          <input name="buyerName" required disabled={pending} className={fieldClass} autoComplete="name" />
        </label>
        <label className="block text-sm">
          <span className="text-zinc-400">{t("email")}</span>
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
          <input name="phone" type="tel" disabled={pending} className={fieldClass} autoComplete="tel" inputMode="tel" />
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
      {bypassPayment ? (
        <p className="rounded-xl border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-xs leading-relaxed text-amber-100/90">
          {t("bypassHint")}
        </p>
      ) : null}

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

      {/* Mobile: przyklejony pasek z CTA; desktop: zwykły blok w formularzu */}
      <div className="fixed inset-x-0 bottom-0 z-50 border-t border-poet-gold/25 bg-poet-bg/92 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))] pt-3 backdrop-blur-md supports-[backdrop-filter]:bg-poet-bg/88 sm:static sm:z-auto sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none">
        <div className="poet-safe-x mx-auto max-w-3xl sm:mx-0 sm:max-w-none">
          <button
            type="submit"
            disabled={pending}
            className="btn-poet btn-poet-theatre w-full py-3.5 text-sm font-semibold tracking-wide sm:w-auto sm:px-12 sm:py-3"
          >
            {pending ? t("submitting") : bypassPayment ? t("submitBypass") : t("submit")}
          </button>
        </div>
      </div>
    </form>
  );
}
