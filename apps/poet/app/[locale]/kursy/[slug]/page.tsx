import { notFound } from "next/navigation";
import Image from "next/image";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { routing, type AppLocale } from "@/i18n/routing";
import { fetchPublishedPoetCourseBySlug } from "@/lib/poetCourses";
import { fetchPublishedTrials, fetchTrialsForCourse, filterTrialsByCourseSlug, type PoetTrialDisplay } from "@/lib/poetTrials";
import { getTicketsSiteBase, ticketsEventPage, ticketsHome } from "@/lib/ticketsSite";
import { buildPoetPageMetadata } from "@/lib/seoPoet";
import { getPoetSiteUrl } from "@/lib/poetPublicUrl";
import {
  bodyKeyForDbKind,
  courseImageForDbKind,
  isPoetStaticCourseSlug,
  staticCourseKeys,
  tagKeyForDbKind,
  variantForDbKind,
} from "@/lib/poetStaticCourses";
import { formatPoetTrialWhen } from "@/lib/formatPoetTrialDate";

export const revalidate = 60;

type PageProps = { params: Promise<{ locale: string; slug: string }> };

export async function generateMetadata({ params }: PageProps) {
  const { locale, slug } = await params;
  if (!routing.locales.includes(locale as AppLocale)) return {};

  const tMeta = await getTranslations({ locale, namespace: "metadata" });
  const tCourse = await getTranslations({ locale, namespace: "Poet" });
  const tPage = await getTranslations({ locale, namespace: "CoursePage" });

  const course = await fetchPublishedPoetCourseBySlug(slug);
  let title: string;
  let description: string;

  if (course) {
    title = course.title;
    const body = course.body?.trim();
    description = body && body.length > 10 ? body.slice(0, 155) : tCourse(bodyKeyForDbKind(course.kind));
  } else if (isPoetStaticCourseSlug(slug)) {
    const keys = staticCourseKeys(slug);
    title = tCourse(keys.titleKey);
    description = tCourse(keys.bodyKey);
  } else {
    return {};
  }

  const base = getPoetSiteUrl();
  const path = `/kursy/${slug}`;
  const ogImages =
    base && tMeta("ogImagePath")
      ? [{ url: `${base}${tMeta("ogImagePath")}`, width: 1200, height: 630, alt: tMeta("ogImageAlt") }]
      : undefined;

  return buildPoetPageMetadata({
    locale: locale as AppLocale,
    path,
    title: `${title} — ${tPage("metaCourseLabel")}`,
    description,
    keywords: tMeta("keywords")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
    ogImages,
  });
}

export default async function PoetCoursePage({ params }: PageProps) {
  const { locale, slug } = await params;
  if (!routing.locales.includes(locale as AppLocale)) notFound();
  setRequestLocale(locale);

  const dbCourse = await fetchPublishedPoetCourseBySlug(slug);
  const staticSlug = isPoetStaticCourseSlug(slug) ? slug : null;

  if (!dbCourse && !staticSlug) notFound();

  const t = await getTranslations("Poet");
  const tPage = await getTranslations("CoursePage");
  const tickets = getTicketsSiteBase();

  let display: {
    title: string;
    body: string;
    tag: string;
    variant: string;
    image: string;
  };

  if (dbCourse) {
    const variant = variantForDbKind(dbCourse.kind);
    const img = courseImageForDbKind(dbCourse.kind);
    const tagKey = tagKeyForDbKind(dbCourse.kind);
    const bodyFallback = bodyKeyForDbKind(dbCourse.kind);
    display = {
      title: dbCourse.title,
      body: dbCourse.body?.trim() ? dbCourse.body.trim() : t(bodyFallback),
      tag: t(tagKey),
      variant,
      image: img,
    };
  } else if (staticSlug) {
    const keys = staticCourseKeys(staticSlug);
    display = {
      title: t(keys.titleKey),
      body: t(keys.bodyKey),
      tag: t(keys.tagKey),
      variant: keys.variant,
      image: keys.image,
    };
  } else {
    notFound();
    throw new Error("unreachable");
  }

  let trials: PoetTrialDisplay[];
  if (dbCourse) {
    trials = await fetchTrialsForCourse(dbCourse.id);
  } else {
    const all = await fetchPublishedTrials();
    trials = filterTrialsByCourseSlug(all, slug);
  }

  return (
    <div className="poet-safe-x mx-auto max-w-5xl pb-12 pt-6 sm:pb-16 sm:pt-8">
      <nav className="text-sm text-zinc-500">
        <Link href="/" className="text-poet-gold/90 hover:text-poet-gold-bright">
          {tPage("breadcrumbHome")}
        </Link>
        <span className="mx-2 text-zinc-600">/</span>
        <Link href="/#kursy" className="text-poet-gold/90 hover:text-poet-gold-bright">
          {tPage("breadcrumbCourses")}
        </Link>
      </nav>

      <article className="mt-8 overflow-hidden rounded-2xl border border-poet-gold/20 bg-poet-surface/25 shadow-gold-sm backdrop-blur-sm">
        <div className="relative aspect-[21/9] max-h-56 w-full sm:aspect-[24/9] sm:max-h-64">
          <Image src={display.image} alt="" fill className="object-cover" sizes="(max-width:1024px) 100vw, 896px" priority />
          <div className="absolute inset-0 bg-gradient-to-t from-poet-bg via-poet-bg/40 to-transparent" aria-hidden />
        </div>
        <div className="space-y-4 px-5 py-7 sm:px-8 sm:py-9">
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-zinc-500">{display.tag}</p>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-gradient-gold sm:text-4xl">{display.title}</h1>
          <p className="max-w-3xl text-sm leading-relaxed text-zinc-400 sm:text-base">{display.body}</p>
          <p className="text-xs leading-relaxed text-zinc-500">{t("courseTrialHint")}</p>
        </div>
      </article>

      <section className="mt-12 scroll-mt-24" id="proby-kursu">
        <h2 className="font-display text-xl font-medium text-zinc-100 sm:text-2xl">{tPage("trialsHeading")}</h2>
        <p className="mt-2 max-w-2xl text-sm text-zinc-500">{tPage("trialsIntro")}</p>

        {trials.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-poet-gold/25 bg-zinc-950/25 px-5 py-8 sm:px-8">
            <p className="text-sm leading-relaxed text-zinc-400">{tPage("emptyTrials")}</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/#probny-kalendar" className="btn-poet-theatre btn-poet inline-flex no-underline">
                {tPage("ctaFullCalendar")}
              </Link>
              {tickets ? (
                <a href={ticketsHome(locale as AppLocale)} className="btn-poet inline-flex items-center justify-center rounded-xl border border-poet-gold/30 px-5 py-2.5 text-sm text-poet-gold-bright no-underline hover:bg-poet-gold/10">
                  {t("trialsCta")}
                </a>
              ) : null}
            </div>
          </div>
        ) : (
          <ul className="mt-6 grid gap-4 sm:grid-cols-2">
            {trials.map((slot) => {
              const when = formatPoetTrialWhen(slot.starts_at, locale as AppLocale);
              return (
                <li
                  key={slot.id}
                  className="flex flex-col rounded-2xl border border-poet-gold/25 bg-gradient-to-b from-zinc-900/50 to-poet-surface/30 p-5 shadow-gold-sm backdrop-blur-sm"
                >
                  <div className="flex flex-1 flex-col gap-2">
                    <h3 className="font-display text-lg font-medium text-zinc-100">{slot.title}</h3>
                    {when ? <p className="text-xs font-medium text-emerald-300/90">{when}</p> : null}
                    {slot.body ? <p className="text-sm leading-relaxed text-zinc-500">{slot.body}</p> : null}
                  </div>
                  {tickets ? (
                    <a
                      href={ticketsEventPage(locale as AppLocale, slot.slug)}
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
      </section>
    </div>
  );
}
