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
  };

  const scenario = t("scenario", {
    who: groups[0].options[choices[0]],
    where: groups[1].options[choices[1]],
    twist: groups[2].options[choices[2]],
  });

  return (
    <section
      className="relative isolate mt-10 overflow-hidden rounded-[1.75rem] border border-violet-400/45 bg-[#07050d] shadow-[0_0_55px_-22px_rgba(139,92,246,0.9)] sm:mt-12"
      aria-label={t("ariaLabel")}
    >
      <div
        className="pointer-events-none absolute inset-y-0 right-0 -z-20 w-full bg-cover bg-[center_58%] opacity-35 sm:w-[58%]"
        style={{ backgroundImage: `url(${JSON.stringify(imageUrl)})` }}
        aria-hidden
      />
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_76%_16%,rgba(236,72,153,0.25),transparent_28%),radial-gradient(circle_at_82%_76%,rgba(14,165,233,0.22),transparent_30%),linear-gradient(90deg,#07050d_0%,rgba(7,5,13,0.97)_49%,rgba(7,5,13,0.55)_100%)]" />
      <div className="pointer-events-none absolute -left-10 top-16 -z-10 h-36 w-36 rounded-full bg-fuchsia-500/20 blur-3xl" />

      <div className="grid gap-6 p-5 sm:p-7 lg:grid-cols-[0.86fr_1.14fr] lg:gap-8 lg:p-9">
        <div className="flex flex-col">
          <div className="flex flex-wrap items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em]">
            <span className="rounded-full border border-fuchsia-400/60 bg-fuchsia-950/65 px-3 py-1.5 text-fuchsia-200">
              {t("eyebrow")}
            </span>
            <span className="text-cyan-300">{t("date")}</span>
          </div>
          <h2 className="mt-5 max-w-xl font-display text-3xl font-semibold leading-[1.02] tracking-tight text-white sm:text-4xl">
            {t("title")}
          </h2>
          <p className="mt-4 max-w-lg text-sm leading-relaxed text-zinc-300 sm:text-base">{t("lead")}</p>

          <div className="mt-6 rounded-2xl border border-white/10 bg-black/45 p-4 backdrop-blur-sm">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-violet-300">{t("scenarioLabel")}</p>
            <p className="mt-2 text-lg font-semibold leading-snug text-white" aria-live="polite">
              <span key={revision} className="animate-fade-up block">{scenario}</span>
            </p>
          </div>

          <p className="mt-4 text-xs leading-relaxed text-zinc-400">{t("hint")}</p>
        </div>

        <div className="rounded-2xl border border-violet-300/20 bg-black/55 p-4 backdrop-blur-md sm:p-5">
          <div className="space-y-5">
            {groups.map((group, groupIndex) => (
              <fieldset key={group.label}>
                <legend className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-400">
                  <span className="mr-2 text-cyan-300">0{groupIndex + 1}</span>
                  {group.label}
                </legend>
                <div className="flex flex-wrap gap-2">
                  {group.options.map((option, optionIndex) => {
                    const selected = choices[groupIndex] === optionIndex;
                    return (
                      <button
                        key={option}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => choose(groupIndex, optionIndex)}
                        className={`rounded-xl border px-3 py-2 text-left text-xs font-medium leading-snug transition sm:text-sm ${
                          selected
                            ? "border-fuchsia-300/80 bg-gradient-to-r from-fuchsia-500/25 to-violet-500/25 text-white shadow-[0_0_20px_-8px_rgba(232,121,249,0.85)]"
                            : "border-white/10 bg-white/[0.04] text-zinc-400 hover:border-violet-300/45 hover:bg-violet-500/10 hover:text-zinc-100"
                        }`}
                      >
                        {option}
                      </button>
                    );
                  })}
                </div>
              </fieldset>
            ))}
          </div>

          <div className="mt-6 flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={randomize}
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-cyan-300/35 bg-cyan-500/10 px-4 py-2.5 text-sm font-semibold text-cyan-100 transition hover:border-cyan-200/70 hover:bg-cyan-400/15"
            >
              <span aria-hidden className="mr-2">↻</span>
              {t("randomize")}
            </button>
            <a
              href={eventHref}
              className="poet-shine inline-flex min-h-11 flex-1 items-center justify-center rounded-xl border border-fuchsia-300/70 bg-gradient-to-r from-fuchsia-600 to-violet-600 px-4 py-2.5 text-center text-sm font-bold text-white shadow-[0_0_28px_-10px_rgba(217,70,239,0.9)] hover:border-white hover:text-white"
            >
              {t("cta")} <span aria-hidden className="ml-2">→</span>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
