"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

type NextModeChoiceWidgetProps = {
  eventHref: string;
  imageUrl: string;
};

const OPTION_COUNT = 3;

export function NextModeChoiceWidget({ eventHref, imageUrl }: NextModeChoiceWidgetProps) {
  const t = useTranslations("NextModeWidget");
  const [choices, setChoices] = useState([0, 0, 0]);
  const [revision, setRevision] = useState(0);
  const [shuffleRevision, setShuffleRevision] = useState(0);

  const groups = [
    { label: t("whoLabel"), options: [t("who1"), t("who2"), t("who3")] },
    { label: t("whereLabel"), options: [t("where1"), t("where2"), t("where3")] },
    { label: t("twistLabel"), options: [t("twist1"), t("twist2"), t("twist3")] },
  ];

  const choose = (groupIndex: number, optionIndex: number) => {
    setChoices((current) => current.map((value, index) => (index === groupIndex ? optionIndex : value)));
    setRevision((current) => current + 1);
  };

  const randomize = () => {
    setChoices((current) =>
      current.map((value) => (value + 1 + Math.floor(Math.random() * (OPTION_COUNT - 1))) % OPTION_COUNT),
    );
    setRevision((current) => current + 1);
    setShuffleRevision((current) => current + 1);
  };

  const scenario = t("scenario", {
    who: groups[0].options[choices[0]],
    where: groups[1].options[choices[1]],
    twist: groups[2].options[choices[2]],
  });

  return (
    <section
      className="next-mode-widget relative isolate mt-8 overflow-hidden rounded-[1.75rem] border border-violet-400/40 bg-[#07050d] shadow-[0_28px_80px_-38px_rgba(168,85,247,0.75)] sm:mt-12 sm:rounded-[2rem]"
      aria-label={t("ariaLabel")}
    >
      <div
        className="next-mode-widget__backdrop pointer-events-none absolute inset-y-0 right-0 -z-20 hidden w-[60%] bg-cover bg-[center_55%] opacity-35 lg:block"
        style={{ backgroundImage: `url(${JSON.stringify(imageUrl)})` }}
        aria-hidden
      />
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_78%_12%,rgba(236,72,153,0.22),transparent_30%),radial-gradient(circle_at_88%_82%,rgba(14,165,233,0.18),transparent_32%),linear-gradient(100deg,#07050d_0%,rgba(7,5,13,0.98)_48%,rgba(7,5,13,0.68)_100%)]" />
      <div className="next-mode-widget__orb pointer-events-none absolute -left-12 top-20 -z-10 h-44 w-44 rounded-full bg-fuchsia-500/20 blur-3xl" />

      <div className="relative h-44 overflow-hidden border-b border-violet-300/15 lg:hidden">
        <div
          className="next-mode-widget__mobile-image absolute inset-0 bg-no-repeat"
          aria-hidden
          style={{
            backgroundImage: `url(${JSON.stringify(imageUrl)})`,
            backgroundPosition: "center 48%",
            backgroundSize: "cover",
          }}
        />
        <div aria-hidden className="absolute inset-0 bg-[linear-gradient(180deg,rgba(7,5,13,0.04),rgba(7,5,13,0.18)_52%,#07050d_100%)]" />
        <div className="absolute inset-x-4 bottom-4 flex items-end justify-between gap-3">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/60 px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.18em] text-white backdrop-blur-md">
            <span className="next-mode-widget__signal h-1.5 w-1.5 rounded-full bg-emerald-300 shadow-[0_0_12px_rgba(110,231,183,0.9)]" />
            {t("onSale")}
          </span>
          <span className="max-w-[55%] rounded-full border border-cyan-300/20 bg-cyan-950/55 px-3 py-1.5 text-right text-[9px] font-bold uppercase tracking-[0.12em] text-cyan-100 backdrop-blur-md">
            {t("date")}
          </span>
        </div>
      </div>

      <div className="grid gap-5 p-4 sm:p-6 lg:grid-cols-[minmax(0,0.88fr)_minmax(0,1.12fr)] lg:gap-7 lg:p-8 xl:gap-9 xl:p-10">
        <div className="flex min-w-0 flex-col lg:py-1">
          <div className="flex flex-wrap items-center gap-2 text-[9px] font-bold uppercase tracking-[0.16em] sm:text-[10px] sm:tracking-[0.2em]">
            <span className="rounded-full border border-fuchsia-400/60 bg-fuchsia-950/65 px-3 py-1.5 text-fuchsia-200">
              {t("eyebrow")}
            </span>
            <span className="hidden text-cyan-300 lg:inline">{t("date")}</span>
            <span className="ml-auto hidden items-center gap-1.5 rounded-full border border-emerald-300/25 bg-emerald-400/10 px-2.5 py-1.5 text-emerald-200 lg:inline-flex">
              <span className="next-mode-widget__signal h-1.5 w-1.5 rounded-full bg-emerald-300" />
              {t("onSale")}
            </span>
          </div>
          <h2 className="mt-4 max-w-xl text-pretty font-display text-[1.85rem] font-semibold leading-[1.04] tracking-tight text-white sm:text-4xl lg:mt-5 xl:text-[2.65rem]">
            {t("title")}
          </h2>
          <p className="mt-3 max-w-lg text-pretty text-sm leading-[1.65] text-zinc-300 sm:mt-4 sm:text-base">{t("lead")}</p>

          <div className="mt-5 rounded-2xl border border-violet-300/20 bg-gradient-to-br from-violet-500/10 to-black/40 p-4 backdrop-blur-sm sm:mt-6 sm:p-5">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-violet-200">{t("scenarioLabel")}</p>
            <p className="mt-2 min-h-[3.25rem] text-pretty text-base font-semibold leading-snug text-white sm:text-lg lg:min-h-[4.5rem]" aria-live="polite">
              <span key={revision} className="animate-fade-up block">{scenario}</span>
            </p>
          </div>

          <p className="mt-3 text-pretty text-[11px] leading-relaxed text-zinc-400 sm:mt-4 sm:text-xs lg:max-w-md">{t("hint")}</p>
        </div>

        <div className="next-mode-widget__controls rounded-[1.4rem] border border-violet-300/25 bg-black/65 p-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] backdrop-blur-xl sm:p-5 lg:p-6">
          <div className="space-y-5 sm:space-y-6">
            {groups.map((group, groupIndex) => (
              <fieldset key={group.label} className="next-mode-widget__group min-w-0">
                <legend className="mb-2.5 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.17em] text-zinc-300">
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-md border border-cyan-300/25 bg-cyan-400/10 font-mono text-[9px] text-cyan-200">0{groupIndex + 1}</span>
                  {group.label}
                </legend>
                <div className="grid grid-cols-3 gap-2">
                  {group.options.map((option, optionIndex) => {
                    const selected = choices[groupIndex] === optionIndex;
                    return (
                      <button
                        key={option}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => choose(groupIndex, optionIndex)}
                        className={`next-mode-widget__choice flex min-h-[5.25rem] min-w-0 flex-col items-start justify-between gap-2 rounded-xl border px-2.5 py-3 text-left text-[11px] font-medium leading-[1.35] transition duration-300 active:scale-[0.97] sm:min-h-[4.75rem] sm:px-3 sm:text-xs ${
                          selected
                            ? "border-fuchsia-300/75 bg-gradient-to-br from-fuchsia-500/25 to-violet-500/20 text-white shadow-[0_0_22px_-10px_rgba(232,121,249,0.9)]"
                            : "border-white/10 bg-white/[0.04] text-zinc-400 hover:-translate-y-0.5 hover:border-violet-300/45 hover:bg-violet-500/10 hover:text-zinc-100"
                        }`}
                      >
                        <span
                          aria-hidden
                          className={`inline-block h-1.5 w-1.5 shrink-0 rounded-full transition ${selected ? "bg-fuchsia-300 shadow-[0_0_10px_rgba(240,171,252,0.95)]" : "bg-zinc-700"}`}
                        />
                        <span className="min-w-0 [overflow-wrap:anywhere]">{option}</span>
                      </button>
                    );
                  })}
                </div>
              </fieldset>
            ))}
          </div>

          <div className="mt-5 grid grid-cols-[3.25rem_minmax(0,1fr)] gap-2.5 border-t border-white/10 pt-4 sm:mt-6 sm:pt-5">
            <button
              type="button"
              onClick={randomize}
              aria-label={t("randomize")}
              title={t("randomize")}
              className="inline-flex min-h-12 items-center justify-center rounded-xl border border-cyan-300/35 bg-cyan-500/10 px-3 py-2.5 text-sm font-semibold text-cyan-100 transition active:scale-[0.96] hover:border-cyan-200/70 hover:bg-cyan-400/15"
            >
              <span key={shuffleRevision} aria-hidden className="next-mode-widget__shuffle text-lg">↻</span>
              <span className="sr-only">{t("randomize")}</span>
            </button>
            <a
              href={eventHref}
              className="poet-shine flex min-h-12 min-w-0 items-center justify-center gap-2 rounded-xl border border-fuchsia-300/70 bg-gradient-to-r from-fuchsia-600 to-violet-600 px-3 py-2.5 text-center text-xs font-bold leading-tight text-white shadow-[0_0_28px_-10px_rgba(217,70,239,0.9)] transition duration-300 active:scale-[0.98] hover:-translate-y-0.5 hover:border-white hover:text-white sm:px-4 sm:text-sm"
            >
              <span className="min-w-0">{t("cta")}</span>
              <span aria-hidden className="next-mode-widget__arrow shrink-0">→</span>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
