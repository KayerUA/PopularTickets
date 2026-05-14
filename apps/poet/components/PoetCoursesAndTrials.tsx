import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { THEATRE_DIRECTOR_TELEGRAM_HANDLE, THEATRE_DIRECTOR_TELEGRAM_URL } from "@/lib/theatre";
import { getTicketsSiteBase, ticketsFirma, ticketsHome } from "@/lib/ticketsSite";
import type { PoetCourseRow } from "@/lib/poetCourses";
import {
  bodyKeyForDbKind,
  courseImageForDbKind,
  staticCourseKeys,
  tagKeyForDbKind,
  variantForDbKind,
  type PoetStaticCourseSlug,
} from "@/lib/poetStaticCourses";

const STATIC_SLUGS: readonly PoetStaticCourseSlug[] = ["improv", "acting", "masterclass", "playback"];

export async function PoetCourseShowcase({ dbCourses }: { dbCourses: PoetCourseRow[] }) {
  const t = await getTranslations("Poet");
  const useDb = dbCourses.length > 0;

  return (
    <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
      {useDb
        ? dbCourses.map((c) => {
            const variant = variantForDbKind(c.kind);
            const img = courseImageForDbKind(c.kind);
            const tagKey = tagKeyForDbKind(c.kind);
            const displayBody = c.body?.trim() ? c.body.trim() : t(bodyKeyForDbKind(c.kind));
            return (
              <li key={c.id} className="list-none">
                <Link
                  href={`/kursy/${c.slug}`}
                  className={`poet-course-card poet-course-card--${variant} group relative block h-full overflow-hidden rounded-2xl border p-5 no-underline text-inherit shadow-[0_20px_50px_-28px_rgba(0,0,0,0.85)] transition duration-500 hover:-translate-y-0.5 sm:p-6`}
                >
                  <div className="poet-shine pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100" aria-hidden />
                  <div className="relative -mx-1 -mt-1 mb-3 overflow-hidden rounded-lg border border-poet-gold/15">
                    <Image
                      src={img}
                      alt=""
                      width={640}
                      height={360}
                      className="h-36 w-full object-cover sm:h-40"
                      sizes="(max-width:640px) 100vw, 25vw"
                    />
                  </div>
                  <p className="relative text-[10px] font-semibold uppercase tracking-[0.28em] text-zinc-500">{t(tagKey)}</p>
                  <h3 className="relative mt-2 font-display text-xl font-semibold tracking-tight text-gradient-gold sm:text-[1.35rem]">
                    {c.title}
                  </h3>
                  <p className="relative mt-3 text-sm leading-relaxed text-zinc-400">{displayBody}</p>
                  <span className="relative mt-5 inline-flex w-full items-center justify-center rounded-lg border border-poet-gold/25 bg-black/25 px-3 py-2 text-center text-xs font-semibold text-poet-gold-bright transition group-hover:border-poet-gold/45 group-hover:bg-poet-gold/10">
                    {t("courseCardCta")}
                  </span>
                </Link>
              </li>
            );
          })
        : STATIC_SLUGS.map((slug) => {
            const keys = staticCourseKeys(slug);
            return (
              <li key={slug} className="list-none">
                <Link
                  href={`/kursy/${slug}`}
                  className={`poet-course-card poet-course-card--${keys.variant} group relative block h-full overflow-hidden rounded-2xl border p-5 no-underline text-inherit shadow-[0_20px_50px_-28px_rgba(0,0,0,0.85)] transition duration-500 hover:-translate-y-0.5 sm:p-6`}
                >
                  <div className="poet-shine pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100" aria-hidden />
                  <div className="relative -mx-1 -mt-1 mb-3 overflow-hidden rounded-lg border border-poet-gold/15">
                    <Image
                      src={keys.image}
                      alt=""
                      width={640}
                      height={360}
                      className="h-36 w-full object-cover sm:h-40"
                      sizes="(max-width:640px) 100vw, 25vw"
                    />
                  </div>
                  <p className="relative text-[10px] font-semibold uppercase tracking-[0.28em] text-zinc-500">{t(keys.tagKey)}</p>
                  <h3 className="relative mt-2 font-display text-xl font-semibold tracking-tight text-gradient-gold sm:text-[1.35rem]">
                    {t(keys.titleKey)}
                  </h3>
                  <p className="relative mt-3 text-sm leading-relaxed text-zinc-400">{t(keys.bodyKey)}</p>
                  <span className="relative mt-5 inline-flex w-full items-center justify-center rounded-lg border border-poet-gold/25 bg-black/25 px-3 py-2 text-center text-xs font-semibold text-poet-gold-bright transition group-hover:border-poet-gold/45 group-hover:bg-poet-gold/10">
                    {t("courseCardCta")}
                  </span>
                </Link>
              </li>
            );
          })}
    </ul>
  );
}

export async function PoetTrialsAndFlow({ locale }: { locale: AppLocale }) {
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
    </div>
  );
}
