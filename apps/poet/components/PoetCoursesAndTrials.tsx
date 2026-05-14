import Image from "next/image";
import { getTranslations } from "next-intl/server";
import type { AppLocale } from "@/i18n/routing";
import { THEATRE_DIRECTOR_TELEGRAM_HANDLE, THEATRE_DIRECTOR_TELEGRAM_URL } from "@/lib/theatre";
import { getTicketsSiteBase, ticketsEventPage, ticketsFirma, ticketsHome } from "@/lib/ticketsSite";
import type { PoetTrialDisplay } from "@/lib/poetTrials";
import type { PoetCourseRow } from "@/lib/poetCourses";

const STATIC_COURSES: readonly {
  id: string;
  variant: "improv" | "acting" | "playback";
  titleKey: "courseImprovTitle" | "courseActingTitle" | "coursePlaybackTitle";
  bodyKey: "courseImprovBody" | "courseActingBody" | "coursePlaybackBody";
  tagKey: "courseImprovTag" | "courseActingTag" | "coursePlaybackTag";
  image: string;
}[] = [
  {
    id: "improvisation",
    variant: "improv",
    titleKey: "courseImprovTitle",
    bodyKey: "courseImprovBody",
    tagKey: "courseImprovTag",
    image: "/courses/impro.jpg",
  },
  {
    id: "acting",
    variant: "acting",
    titleKey: "courseActingTitle",
    bodyKey: "courseActingBody",
    tagKey: "courseActingTag",
    image: "/courses/akterka.jpg",
  },
  {
    id: "playback",
    variant: "playback",
    titleKey: "coursePlaybackTitle",
    bodyKey: "coursePlaybackBody",
    tagKey: "coursePlaybackTag",
    image: "/courses/play-back.jpg",
  },
];

function variantForKind(kind: string): "improv" | "acting" | "playback" {
  if (kind === "acting") return "acting";
  if (kind === "playback") return "playback";
  return "improv";
}

function courseImageForKind(kind: string): string {
  if (kind === "improvisation") return "/courses/impro.jpg";
  if (kind === "acting") return "/courses/akterka.jpg";
  if (kind === "playback") return "/courses/play-back.jpg";
  return "/courses/theatre.jpg";
}

function tagKeyForKind(
  kind: string,
): "courseImprovTag" | "courseActingTag" | "coursePlaybackTag" | "courseOtherTag" {
  if (kind === "acting") return "courseActingTag";
  if (kind === "playback") return "coursePlaybackTag";
  if (kind === "improvisation") return "courseImprovTag";
  return "courseOtherTag";
}

function bodyKeyForKind(kind: string): "courseImprovBody" | "courseActingBody" | "coursePlaybackBody" | "courseOtherBody" {
  if (kind === "acting") return "courseActingBody";
  if (kind === "playback") return "coursePlaybackBody";
  if (kind === "improvisation") return "courseImprovBody";
  return "courseOtherBody";
}

export async function PoetCourseShowcase({ dbCourses }: { dbCourses: PoetCourseRow[] }) {
  const t = await getTranslations("Poet");
  const useDb = dbCourses.length > 0;

  return (
    <ul className="mt-10 grid gap-5 sm:grid-cols-3">
      {useDb
        ? dbCourses.map((c) => {
            const variant = variantForKind(c.kind);
            const img = courseImageForKind(c.kind);
            const tagKey = tagKeyForKind(c.kind);
            const displayBody = c.body?.trim() ? c.body.trim() : t(bodyKeyForKind(c.kind));
            return (
              <li
                key={c.id}
                className={`poet-course-card poet-course-card--${variant} group relative overflow-hidden rounded-2xl border p-5 shadow-[0_20px_50px_-28px_rgba(0,0,0,0.85)] transition duration-500 hover:-translate-y-0.5 sm:p-6`}
              >
                <div className="poet-shine pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100" aria-hidden />
                <div className="relative -mx-1 -mt-1 mb-3 overflow-hidden rounded-lg border border-poet-gold/15">
                  <Image
                    src={img}
                    alt=""
                    width={640}
                    height={360}
                    className="h-36 w-full object-cover sm:h-40"
                    sizes="(max-width:640px) 100vw, 33vw"
                  />
                </div>
                <p className="relative text-[10px] font-semibold uppercase tracking-[0.28em] text-zinc-500">{t(tagKey)}</p>
                <h3 className="relative mt-2 font-display text-xl font-semibold tracking-tight text-gradient-gold sm:text-[1.35rem]">
                  {c.title}
                </h3>
                <p className="relative mt-3 text-sm leading-relaxed text-zinc-400">{displayBody}</p>
                <div className="relative mt-5 h-px w-full bg-gradient-to-r from-transparent via-poet-gold/35 to-transparent" aria-hidden />
                <p className="relative mt-4 text-[11px] leading-snug text-zinc-500">{t("courseTrialHint")}</p>
              </li>
            );
          })
        : STATIC_COURSES.map((c) => (
            <li
              key={c.id}
              className={`poet-course-card poet-course-card--${c.variant} group relative overflow-hidden rounded-2xl border p-5 shadow-[0_20px_50px_-28px_rgba(0,0,0,0.85)] transition duration-500 hover:-translate-y-0.5 sm:p-6`}
            >
              <div className="poet-shine pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100" aria-hidden />
              <div className="relative -mx-1 -mt-1 mb-3 overflow-hidden rounded-lg border border-poet-gold/15">
                <Image
                  src={c.image}
                  alt=""
                  width={640}
                  height={360}
                  className="h-36 w-full object-cover sm:h-40"
                  sizes="(max-width:640px) 100vw, 33vw"
                />
              </div>
              <p className="relative text-[10px] font-semibold uppercase tracking-[0.28em] text-zinc-500">{t(c.tagKey)}</p>
              <h3 className="relative mt-2 font-display text-xl font-semibold tracking-tight text-gradient-gold sm:text-[1.35rem]">
                {t(c.titleKey)}
              </h3>
              <p className="relative mt-3 text-sm leading-relaxed text-zinc-400">{t(c.bodyKey)}</p>
              <div className="relative mt-5 h-px w-full bg-gradient-to-r from-transparent via-poet-gold/35 to-transparent" aria-hidden />
              <p className="relative mt-4 text-[11px] leading-snug text-zinc-500">{t("courseTrialHint")}</p>
            </li>
          ))}
    </ul>
  );
}

function formatSlotDate(iso: string | null, locale: AppLocale): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const loc = locale === "pl" ? "pl-PL" : locale === "ru" ? "ru-RU" : "uk-UA";
  return new Intl.DateTimeFormat(loc, {
    weekday: "short",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Warsaw",
  }).format(d);
}

export async function PoetTrialsAndFlow({ locale, trials }: { locale: AppLocale; trials: PoetTrialDisplay[] }) {
  const t = await getTranslations("Poet");
  const tickets = getTicketsSiteBase();

  const flowSteps = [
    { n: 1, title: t("flowStep1Title"), body: t("flowStep1Body") },
    { n: 2, title: t("flowStep2Title"), body: t("flowStep2Body") },
    { n: 3, title: t("flowStep3Title"), body: t("flowStep3Body") },
    { n: 4, title: t("flowStep4Title"), body: t("flowStep4Body") },
  ] as const;

  return (
    <div className="space-y-10 sm:space-y-12">
      <div className="grid gap-6 lg:grid-cols-2 lg:gap-8">
        <div className="rounded-2xl border border-poet-gold/25 bg-gradient-to-br from-poet-surface/80 via-poet-surface/40 to-zinc-950/30 p-6 shadow-gold-sm backdrop-blur-md sm:p-8">
          <h3 className="font-display text-lg font-medium text-gradient-gold sm:text-xl">{t("signupTitle")}</h3>
          <p className="mt-3 text-sm leading-relaxed text-zinc-400">
            {t("signupBodyBefore")}
            <a href={THEATRE_DIRECTOR_TELEGRAM_URL} className="font-medium text-poet-gold-bright hover:text-poet-gold">
              Telegram @{THEATRE_DIRECTOR_TELEGRAM_HANDLE}
            </a>
            {t("signupBodyMiddle")}
            {tickets ? (
              <a href={ticketsFirma(locale)} className="font-medium">
                {t("signupFirmaLink")}
              </a>
            ) : (
              t("signupFirmaLink")
            )}
            {t("signupBodyAfter")}
          </p>
        </div>
        <div className="rounded-2xl border border-emerald-900/40 bg-gradient-to-br from-emerald-950/35 via-poet-surface/35 to-zinc-950/40 p-6 shadow-[0_0_0_1px_rgba(52,211,153,0.12)] backdrop-blur-md sm:p-8">
          <h3 className="font-display text-lg font-medium text-emerald-200/95 sm:text-xl">{t("giftTitle")}</h3>
          <p className="mt-3 text-sm leading-relaxed text-zinc-400">{t("giftBody")}</p>
        </div>
      </div>

      <div className="rounded-2xl border border-poet-gold/20 bg-poet-surface/30 p-6 backdrop-blur-sm sm:p-8">
        <h3 className="font-display text-xl font-medium text-zinc-100 sm:text-2xl">{t("flowTitle")}</h3>
        <p className="mt-2 max-w-3xl text-sm text-zinc-500">{t("flowIntro")}</p>
        <ol className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {flowSteps.map(({ n, title, body }) => (
            <li
              key={n}
              className="relative rounded-xl border border-poet-gold/15 bg-zinc-950/40 px-4 py-4 sm:min-h-[8.5rem]"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-poet-gold/20 text-xs font-bold text-poet-gold-bright">
                {n}
              </span>
              <p className="mt-3 text-sm font-semibold text-zinc-200">{title}</p>
              <p className="mt-1.5 text-xs leading-relaxed text-zinc-500">{body}</p>
            </li>
          ))}
        </ol>
      </div>

      <div>
        <h3 className="font-display text-xl font-medium text-zinc-100 sm:text-2xl">{t("trialsSlotsTitle")}</h3>
        <p className="mt-2 max-w-2xl text-sm text-zinc-500">{t("trialsSlotsIntro")}</p>

        {trials.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-poet-gold/25 bg-zinc-950/25 px-5 py-8 text-center sm:px-8">
            <p className="text-sm leading-relaxed text-zinc-400">{t("trialsDbEmpty")}</p>
            {tickets ? (
              <a href={ticketsHome(locale)} className="btn-poet-theatre btn-poet mt-6 inline-flex no-underline">
                {t("trialsCta")}
              </a>
            ) : null}
          </div>
        ) : (
          <ul className="mt-6 grid gap-4 sm:grid-cols-2">
            {trials.map((slot) => {
              const when = formatSlotDate(slot.starts_at, locale);
              return (
                <li
                  key={slot.id}
                  className="flex flex-col rounded-2xl border border-poet-gold/25 bg-gradient-to-b from-zinc-900/50 to-poet-surface/30 p-5 shadow-gold-sm backdrop-blur-sm"
                >
                  <div className="flex flex-1 flex-col gap-2">
                    {slot.courseLine ? (
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-poet-gold/75">
                        {t("trialCourseLabel")}: {slot.courseLine}
                      </p>
                    ) : null}
                    <h4 className="font-display text-lg font-medium text-zinc-100">{slot.title}</h4>
                    {when ? <p className="text-xs font-medium text-emerald-300/90">{when}</p> : null}
                    {slot.body ? <p className="text-sm leading-relaxed text-zinc-500">{slot.body}</p> : null}
                  </div>
                  {tickets ? (
                    <a
                      href={ticketsEventPage(locale, slot.slug)}
                      className="btn-poet-theatre btn-poet mt-5 inline-flex w-full justify-center no-underline sm:w-auto"
                    >
                      {t("trialBuyCta")}
                    </a>
                  ) : (
                    <span className="mt-5 text-xs text-amber-200/80">{t("envMissing")}</span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
