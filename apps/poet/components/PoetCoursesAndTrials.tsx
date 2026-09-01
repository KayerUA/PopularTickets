import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { THEATRE_DIRECTOR_TELEGRAM_HANDLE, THEATRE_DIRECTOR_TELEGRAM_URL } from "@/lib/theatre";
import { THEATRE_INSTAGRAM_URL } from "@/lib/social";
import { ticketsGiftPage } from "@/lib/ticketsSite";
import type { PoetCourseRow } from "@/lib/poetCourses";
import { resolveCourseCopy, resolveCourseTag } from "@/lib/contentI18n";
import {
  normalizeCourseCardVariant,
  POET_HOMEPAGE_COURSE_SLUGS,
  staticCourseKeys,
  type PoetHomepageCourseSlug,
} from "@/lib/poetStaticCourses";
import { PoetCourseCard } from "@/components/PoetCourseCard";
import type { PoetCourseProgramContent } from "@/components/PoetCourseProgram";
import { ticketsTrialCheckout } from "@/lib/ticketsSite";

const STATIC_SLUGS: readonly PoetHomepageCourseSlug[] = POET_HOMEPAGE_COURSE_SLUGS;

export async function PoetCourseShowcase({ dbCourses, locale }: { dbCourses: PoetCourseRow[]; locale: AppLocale }) {
  const t = await getTranslations("Poet");
  const tPage = await getTranslations("CoursePage");
  const useDb = dbCourses.length > 0;

  function programFor(slug: string): PoetCourseProgramContent | null {
    return slug === "acting" || slug === "improv"
      ? (tPage.raw(`programs.${slug}`) as PoetCourseProgramContent)
      : null;
  }

  return (
    <ul className="mt-8 grid gap-5 sm:mt-10 sm:grid-cols-2 lg:grid-cols-3">
      {useDb
        ? dbCourses
            .map((c) => {
              const copy = resolveCourseCopy(c, locale);
              if (!copy) return null;
              const variant = normalizeCourseCardVariant(c.card_variant);
              const img = c.card_image_url.trim() || "/courses/theatre.jpg";
              const tagLine = resolveCourseTag(c, locale);
              const program = programFor(c.slug);
              return (
                <PoetCourseCard
                  key={c.id}
                  courseHref={`/kursy/${c.slug}`}
                  bookingHref={program ? ticketsTrialCheckout(locale, c.slug) : `/kursy/${c.slug}`}
                  image={img}
                  title={copy.title}
                  description={copy.description}
                  tagLine={tagLine}
                  variant={variant}
                  unoptimized={img.startsWith("http://") || img.startsWith("https://")}
                  program={program}
                  programToggleLabel={t("courseProgramToggle")}
                  detailsLabel={t("courseDetailsCta")}
                  ctaLabel={program ? program.bookingCta : t("courseCardCta")}
                />
              );
            })
            .filter((node) => node !== null)
        : STATIC_SLUGS.map((slug) => {
            const keys = staticCourseKeys(slug);
            const program = programFor(slug);
            return (
              <PoetCourseCard
                key={slug}
                courseHref={`/kursy/${slug}`}
                bookingHref={program ? ticketsTrialCheckout(locale, slug) : `/kursy/${slug}`}
                image={keys.image}
                title={t(keys.titleKey)}
                description={t(keys.bodyKey)}
                tagLine={t(keys.tagKey)}
                variant={keys.variant}
                program={program}
                programToggleLabel={t("courseProgramToggle")}
                detailsLabel={t("courseDetailsCta")}
                ctaLabel={program ? program.bookingCta : t("courseCardCta")}
              />
            );
          })}
    </ul>
  );
}

export async function PoetTrialsAndFlow({ locale }: { locale: AppLocale }) {
  const t = await getTranslations("Poet");

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
            <a
              href={THEATRE_INSTAGRAM_URL}
              className="font-medium text-poet-gold-bright hover:text-poet-gold"
              target="_blank"
              rel="noopener noreferrer"
            >
              {t("signupInstagramLabel")}
            </a>
            {t("signupBodyMiddle")}
            <a href={THEATRE_DIRECTOR_TELEGRAM_URL} className="font-medium text-poet-gold-bright hover:text-poet-gold">
              Telegram @{THEATRE_DIRECTOR_TELEGRAM_HANDLE}
            </a>
            {t("signupBodyAfter")}
          </p>
        </div>
        <div className="rounded-2xl border border-emerald-900/40 bg-gradient-to-br from-emerald-950/35 via-poet-surface/35 to-zinc-950/40 p-6 shadow-[0_0_0_1px_rgba(52,211,153,0.12)] backdrop-blur-md sm:p-8">
          <h3 className="font-display text-lg font-medium text-emerald-200/95 sm:text-xl">{t("giftTitle")}</h3>
          <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-zinc-400">{t("giftBody")}</p>
          <a
            href={ticketsGiftPage(locale)}
            className="btn-poet btn-poet-theatre mt-5 inline-flex min-h-11 items-center justify-center px-6 py-2.5 text-sm font-semibold"
          >
            {t("giftCta")}
          </a>
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
