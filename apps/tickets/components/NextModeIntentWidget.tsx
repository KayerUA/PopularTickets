"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export type NextModeIntentVariant = "general" | "improv" | "language" | "social" | "theatre";

export type NextModeFormatId =
  | "infection"
  | "options"
  | "court"
  | "teleshop"
  | "sports"
  | "dates"
  | "twins"
  | "talents";

type Props = {
  eventHref: string;
  initialFormat: NextModeFormatId;
  variant: NextModeIntentVariant;
};

const FORMAT_IDS: NextModeFormatId[] = [
  "infection",
  "options",
  "court",
  "teleshop",
  "sports",
  "dates",
  "twins",
  "talents",
];

export function NextModeIntentWidget({ eventHref, initialFormat, variant }: Props) {
  const t = useTranslations("NextModeIntentWidget");
  const initialIndex = Math.max(0, FORMAT_IDS.indexOf(initialFormat));
  const [formatIndex, setFormatIndex] = useState(initialIndex);
  const format = FORMAT_IDS[formatIndex];

  const showNextFormat = () => {
    setFormatIndex((current) => (current + 1) % FORMAT_IDS.length);
  };

  return (
    <section
      className="relative mt-8 max-w-4xl overflow-hidden rounded-2xl border border-violet-400/30 bg-[#09060f] shadow-[0_22px_60px_-38px_rgba(192,132,252,0.9)]"
      aria-label={t("ariaLabel")}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_15%,rgba(217,70,239,0.2),transparent_32%),radial-gradient(circle_at_88%_85%,rgba(34,211,238,0.13),transparent_34%)]" />
      <div className="relative grid sm:grid-cols-[9.5rem_minmax(0,1fr)]">
        <div className="relative hidden min-h-56 overflow-hidden border-r border-white/10 bg-zinc-950 sm:block">
          <div
            className="absolute inset-0 scale-105 bg-cover bg-[center_47%]"
            style={{ backgroundImage: "url('/og/next-mode-comedy-2026-08-15-v2.jpg')" }}
            aria-hidden
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#09060f] via-transparent to-black/15" aria-hidden />
          <span className="absolute inset-x-3 bottom-3 rounded-full border border-white/15 bg-black/65 px-2.5 py-1.5 text-center text-[9px] font-bold uppercase tracking-[0.14em] text-white backdrop-blur">
            {t("date")}
          </span>
        </div>

        <div className="min-w-0 p-4 sm:p-5 lg:p-6">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-fuchsia-300/35 bg-fuchsia-400/10 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.16em] text-fuchsia-100">
              {t(`variant.${variant}.eyebrow`)}
            </span>
            <span className="rounded-full border border-emerald-300/20 bg-emerald-400/10 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.14em] text-emerald-200">
              {t("onSale")}
            </span>
            <span className="ml-auto text-[10px] font-semibold text-cyan-200 sm:hidden">{t("date")}</span>
          </div>

          <div className="mt-3 grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(15rem,1.1fr)] lg:items-end">
            <div>
              <h2 className="text-pretty font-display text-xl font-semibold leading-tight text-white sm:text-2xl">
                {t("title")}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-zinc-300">{t(`variant.${variant}.lead`)}</p>
              <Link
                href={eventHref}
                className="mt-4 inline-flex min-h-10 items-center justify-center rounded-xl border border-fuchsia-300/60 bg-gradient-to-r from-fuchsia-600 to-violet-600 px-4 py-2 text-xs font-bold text-white shadow-[0_0_24px_-12px_rgba(232,121,249,0.9)] transition hover:-translate-y-0.5 hover:border-white hover:text-white"
              >
                {t("cta")} <span className="ml-2" aria-hidden>→</span>
              </Link>
            </div>

            <div className="rounded-xl border border-violet-300/20 bg-black/45 p-3.5 backdrop-blur-sm">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[9px] font-bold uppercase tracking-[0.17em] text-violet-200">{t("formatLabel")}</p>
                <button
                  type="button"
                  onClick={showNextFormat}
                  className="inline-flex min-h-9 shrink-0 items-center rounded-lg border border-cyan-300/25 bg-cyan-400/10 px-2.5 py-1.5 text-[10px] font-bold text-cyan-100 transition hover:border-cyan-200/60 hover:bg-cyan-400/15"
                >
                  <span aria-hidden className="mr-1.5 text-sm">↻</span>
                  {t("nextFormat")}
                </button>
              </div>
              <div className="mt-2 min-h-[4.6rem]" aria-live="polite">
                <p className="font-display text-lg font-semibold text-white">{t(`format.${format}.title`)}</p>
                <p className="mt-1 text-xs leading-relaxed text-zinc-400">{t(`format.${format}.description`)}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
