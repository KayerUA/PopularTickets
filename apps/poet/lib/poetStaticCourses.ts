/**
 * Slugi URL `/[locale]/kursy/{slug}` для статичного fallback (коли картки з i18n без рядка в БД).
 * У продакшені бажано створити відповідні опубліковані `poet_course` з тими ж slug.
 */
export const POET_STATIC_COURSE_SLUGS = ["improv", "acting", "masterclass", "playback"] as const;
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

/** Нормалізація значення з БД для класу `poet-course-card--{variant}`. */
export function normalizeCourseCardVariant(raw: string | null | undefined): PoetCourseCardVariant {
  const v = (raw ?? "").trim();
  if (v === "acting" || v === "masterclass" || v === "playback" || v === "improv") return v;
  return "improv";
}
