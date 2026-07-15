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
      className="next-mode-widget relative isolate mt-8 overflow-hidden rounded-[1.65rem] border border-violet-400/45 bg-[#07050d] shadow-[0_0_55px_-22px_rgba(139,92,246,0.9)] sm:mt-12 sm:rounded-[1.75rem]"
      aria-label={t("ariaLabel")}
    >
      <div
        className="next-mode-widget__backdrop pointer-events-none absolute inset-y-0 right-0 -z-20 hidden w-[62%] bg-cover bg-[center_58%] opacity-40 sm:block"
        style={{ backgroundImage: `url(${JSON.stringify(imageUrl)})` }}
        aria-hidden
      />
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_76%_16%,rgba(236,72,153,0.25),transparent_28%),radial-gradient(circle_at_82%_76%,rgba(14,165,233,0.22),transparent_30%),linear-gradient(90deg,#07050d_0%,rgba(7,5,13,0.97)_49%,rgba(7,5,13,0.55)_100%)]" />
      <div className="next-mode-widget__orb pointer-events-none absolute -left-10 top-16 -z-10 h-36 w-36 rounded-full bg-fuchsia-500/20 blur-3xl" />

      <div className="relative h-36 overflow-hidden border-b border-violet-300/15 sm:hidden">
        <div
          className="next-mode-widget__mobile-image absolute inset-0 bg-no-repeat"
          aria-hidden
          style={{
            backgroundImage: `url(${JSON.stringify(imageUrl)})`,
            backgroundPosition: "right 53%",
            backgroundSize: "155% auto",
          }}
        />
        <div aria-hidden className="absolute inset-0 bg-[linear-gradient(180deg,rgba(7,5,13,0.05),rgba(7,5,13,0.15)_48%,#07050d_100%)]" />
        <div className="absolute bottom-3 left-4 flex items-center gap-2 rounded-full border border-white/15 bg-black/55 px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.2em] text-white backdrop-blur-md">
          <span className="next-mode-widget__signal h-1.5 w-1.5 rounded-full bg-emerald-300 shadow-[0_0_12px_rgba(110,231,183,0.9)]" />
          {t("onSale")}
        </div>
      </div>

      <div className="grid gap-5 p-4 pt-3 sm:gap-6 sm:p-7 lg:grid-cols-[0.86fr_1.14fr] lg:gap-8 lg:p-9">
        <div className="flex flex-col">
          <div className="flex flex-wrap items-center gap-2 text-[9px] font-bold uppercase tracking-[0.18em] sm:text-[10px] sm:tracking-[0.2em]">
            <span className="rounded-full border border-fuchsia-400/60 bg-fuchsia-950/65 px-3 py-1.5 text-fuchsia-200">
              {t("eyebrow")}
            </span>
            <span className="text-cyan-300">{t("date")}</span>
            <span className="ml-auto hidden items-center gap-1.5 rounded-full border border-emerald-300/25 bg-emerald-400/10 px-2.5 py-1.5 text-emerald-200 sm:inline-flex">
              <span className="next-mode-widget__signal h-1.5 w-1.5 rounded-full bg-emerald-300" />
              {t("onSale")}
            </span>
          </div>
          <h2 className="mt-4 max-w-xl text-pretty font-display text-[1.7rem] font-semibold leading-[1.03] tracking-tight text-white sm:mt-5 sm:text-4xl">
            {t("title")}
          </h2>
          <p className="mt-3 max-w-lg text-pretty text-sm leading-relaxed text-zinc-300 sm:mt-4 sm:text-base">{t("lead")}</p>

          <div className="mt-4 rounded-2xl border border-white/10 bg-black/45 p-3.5 backdrop-blur-sm sm:mt-6 sm:p-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-violet-300">{t("scenarioLabel")}</p>
            <p className="mt-2 min-h-[3rem] text-pretty text-base font-semibold leading-snug text-white sm:min-h-0 sm:text-lg" aria-live="polite">
              <span key={revision} className="animate-fade-up block">{scenario}</span>
            </p>
          </div>

          <p className="mt-3 text-pretty text-[11px] leading-relaxed text-zinc-400 sm:mt-4 sm:text-xs">{t("hint")}</p>
        </div>

        <div className="next-mode-widget__controls rounded-[1.35rem] border border-violet-300/20 bg-black/55 p-3 backdrop-blur-md sm:rounded-2xl sm:p-5">
          <div className="space-y-4 sm:space-y-5">
            {groups.map((group, groupIndex) => (
              <fieldset key={group.label} className="next-mode-widget__group min-w-0">
                <legend className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-400">
                  <span className="mr-2 text-cyan-300">0{groupIndex + 1}</span>
                  {group.label}
                </legend>
                <div className="-mx-1 flex snap-x snap-mandatory gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0">
                  {group.options.map((option, optionIndex) => {
                    const selected = choices[groupIndex] === optionIndex;
                    return (
                      <button
                        key={option}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => choose(groupIndex, optionIndex)}
                        className={`next-mode-widget__choice min-h-11 max-w-[82vw] shrink-0 snap-start rounded-xl border px-3 py-2.5 text-left text-xs font-medium leading-snug transition duration-300 active:scale-[0.97] sm:min-h-0 sm:max-w-none sm:py-2 sm:text-sm ${
                          selected
                            ? "border-fuchsia-300/80 bg-gradient-to-r from-fuchsia-500/25 to-violet-500/25 text-white shadow-[0_0_20px_-8px_rgba(232,121,249,0.85)]"
                            : "border-white/10 bg-white/[0.04] text-zinc-400 hover:-translate-y-0.5 hover:border-violet-300/45 hover:bg-violet-500/10 hover:text-zinc-100"
                        }`}
                      >
                        <span
                          aria-hidden
                          className={`mr-2 inline-block h-1.5 w-1.5 rounded-full align-middle transition ${selected ? "bg-fuchsia-300 shadow-[0_0_10px_rgba(240,171,252,0.95)]" : "bg-zinc-700"}`}
                        />
                        <span className="align-middle">{option}</span>
                      </button>
                    );
                  })}
                </div>
              </fieldset>
            ))}
          </div>

          <div className="mt-5 grid grid-cols-[3rem_minmax(0,1fr)] gap-2 sm:mt-6 sm:flex sm:flex-row">
            <button
              type="button"
              onClick={randomize}
              aria-label={t("randomize")}
              title={t("randomize")}
              className="inline-flex min-h-12 items-center justify-center rounded-xl border border-cyan-300/35 bg-cyan-500/10 px-3 py-2.5 text-sm font-semibold text-cyan-100 transition active:scale-[0.96] hover:border-cyan-200/70 hover:bg-cyan-400/15 sm:min-h-11 sm:px-4"
            >
              <span key={shuffleRevision} aria-hidden className="next-mode-widget__shuffle text-lg sm:mr-2 sm:text-base">↻</span>
              <span className="sr-only sm:not-sr-only">{t("randomize")}</span>
            </button>
            <a
              href={eventHref}
              className="poet-shine flex min-h-12 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl border border-fuchsia-300/70 bg-gradient-to-r from-fuchsia-600 to-violet-600 px-3 py-2.5 text-center text-xs font-bold leading-tight text-white shadow-[0_0_28px_-10px_rgba(217,70,239,0.9)] transition duration-300 active:scale-[0.98] hover:-translate-y-0.5 hover:border-white hover:text-white sm:min-h-11 sm:flex-row sm:gap-2 sm:px-4 sm:text-sm sm:whitespace-nowrap"
            >
              <span className="block max-w-full">{t("cta")}</span>
              <span aria-hidden className="next-mode-widget__arrow shrink-0 sm:ml-2">→</span>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
