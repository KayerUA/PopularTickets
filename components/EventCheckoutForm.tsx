"use client";

import { useTransition, useState } from "react";
import { useTranslations } from "next-intl";
import { unstable_rethrow } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { createPendingOrder } from "@/app/actions/checkout";
import type { AppLocale } from "@/i18n/routing";

type Props = {
  eventSlug: string;
  remaining: number;
  locale: AppLocale;
  /** MVP: bez Przelewy24 — natychmiastowe potwierdzenie */
  bypassPayment?: boolean;
};

export function EventCheckoutForm({ eventSlug, remaining, locale, bypassPayment }: Props) {
  const t = useTranslations("CheckoutForm");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const max = Math.min(20, remaining);

  const fieldClass =
    "mt-1.5 w-full min-h-11 rounded-xl border border-poet-gold/20 bg-zinc-900/80 px-3 py-2.5 text-base text-white transition placeholder:text-zinc-600 disabled:opacity-50 sm:min-h-10 sm:py-2 sm:text-sm";

  return (
    <form
      className="mt-6 space-y-4 rounded-2xl border border-poet-gold/20 bg-poet-bg/70 p-4 shadow-gold-sm sm:p-5"
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
            defaultValue={1}
            required
            disabled={pending}
            className={fieldClass}
            inputMode="numeric"
          />
        </label>
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
      {bypassPayment ? (
        <p className="rounded-xl border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-xs leading-relaxed text-amber-100/90">
          {t("bypassHint")}
        </p>
      ) : null}
      <button type="submit" disabled={pending} className="btn-poet poet-shine w-full py-3.5 text-sm sm:w-auto sm:px-10 sm:py-3">
        {pending ? t("submitting") : bypassPayment ? t("submitBypass") : t("submit")}
      </button>
      <p className="text-xs leading-relaxed text-zinc-500">{bypassPayment ? t("hintBypass") : t("hint")}</p>
    </form>
  );
}
