/**
 * Slugi URL `/[locale]/kursy/{slug}` для статичного fallback (коли картки з i18n без рядка в БД).
 * У продакшені бажано створити відповідні опубліковані `poet_course` з тими ж slug.
 */
export const POET_STATIC_COURSE_SLUGS = ["improv", "acting", "masterclass", "playback"] as const;

/** Курсы на главной (masterclass временно скрыт). */
export const POET_HOMEPAGE_COURSE_SLUGS = ["improv", "acting", "playback"] as const;
export type PoetHomepageCourseSlug = (typeof POET_HOMEPAGE_COURSE_SLUGS)[number];
export type PoetStaticCourseSlug = (typeof POET_STATIC_COURSE_SLUGS)[number];

export function isPoetStaticCourseSlug(s: string): s is PoetStaticCourseSlug {
  return (POET_STATIC_COURSE_SLUGS as readonly string[]).includes(s);
}

export type PoetCourseCardVariant = "improv" | "acting" | "masterclass" | "playback";

type TitleKey = "courseImprovTitle" | "courseActingTitle" | "courseMasterclassTitle" | "coursePlaybackTitle";
type BodyKey = "courseImprovBody" | "courseActingBody" | "courseMasterclassBody" | "coursePlaybackBody";
type SeoDescriptionKey =
  | "courseImprovSeoDescription"
  | "courseActingSeoDescription"
  | "courseMasterclassSeoDescription"
  | "coursePlaybackSeoDescription";
type TagKey = "courseImprovTag" | "courseActingTag" | "courseMasterclassTag" | "coursePlaybackTag";

export function staticCourseKeys(slug: PoetStaticCourseSlug): {
  titleKey: TitleKey;
  bodyKey: BodyKey;
  seoDescriptionKey: SeoDescriptionKey;
  tagKey: TagKey;
  variant: PoetCourseCardVariant;
  image: string;
} {
  switch (slug) {
    case "improv":
      return {
        titleKey: "courseImprovTitle",
        bodyKey: "courseImprovBody",
        seoDescriptionKey: "courseImprovSeoDescription",
        tagKey: "courseImprovTag",
        variant: "improv",
        image: "/courses/impro.jpg",
      };
    case "acting":
      return {
        titleKey: "courseActingTitle",
        bodyKey: "courseActingBody",
        seoDescriptionKey: "courseActingSeoDescription",
        tagKey: "courseActingTag",
        variant: "acting",
        image: "/courses/akterka.jpg",
      };
    case "masterclass":
      return {
        titleKey: "courseMasterclassTitle",
        bodyKey: "courseMasterclassBody",
        seoDescriptionKey: "courseMasterclassSeoDescription",
        tagKey: "courseMasterclassTag",
        variant: "masterclass",
        image: "/courses/theatre.jpg",
      };
    case "playback":
      return {
        titleKey: "coursePlaybackTitle",
        bodyKey: "coursePlaybackBody",
        seoDescriptionKey: "coursePlaybackSeoDescription",
        tagKey: "coursePlaybackTag",
        variant: "playback",
        image: "/courses/play-back.jpg",
      };
  }
}

/** Hero / OG: hero_image_url або card_image_url з БД; інакше fallback (статичний slug). */
export function resolveCourseHeroPath(
  course: { card_image_url: string; hero_image_url: string | null } | null,
  fallbackPath?: string,
): string {
  if (course) {
    const card = course.card_image_url.trim() || "/courses/theatre.jpg";
    return (course.hero_image_url?.trim() || card).trim();
  }
  return fallbackPath?.trim() || "/courses/theatre.jpg";
}

export function courseMediaAbsoluteUrl(base: string, imagePath: string): string {
  if (imagePath.startsWith("http://") || imagePath.startsWith("https://")) return imagePath;
  const root = base.replace(/\/$/, "");
  return `${root}${imagePath.startsWith("/") ? imagePath : `/${imagePath}`}`;
}

/** Нормалізація значення з БД для класу `poet-course-card--{variant}`. */
export function normalizeCourseCardVariant(raw: string | null | undefined): PoetCourseCardVariant {
  const v = (raw ?? "").trim();
  if (v === "acting" || v === "masterclass" || v === "playback" || v === "improv") return v;
  return "improv";
}
