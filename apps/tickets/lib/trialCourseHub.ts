import type { SupabaseClient } from "@supabase/supabase-js";
import type { AppLocale } from "@/i18n/routing";
import { resolveCourseCopy, resolveEventCopy } from "@/lib/contentI18n";
import { eventPriceDetails } from "@/lib/eventPrice";
import { normalizeEventLanguage, type EventLanguage } from "@/lib/eventLanguage";
import { resolveEventMarketingStatus, type EventMarketingStatus } from "@/lib/eventMarketingStatus";
import { POPULAR_POET_SITE_URL } from "@/lib/theatre";

/** Сегмент транзакционного хаба пробных: /{locale}/probnoe/{courseSlug}. */
export const TRIAL_HUB_SEGMENT = "probnoe";

/** Вечные индексируемые посадочные: даты внутри меняются, URL курса остаётся стабильным. */
export const INDEXABLE_TRIAL_HUB_COURSE_SLUGS = ["improv", "acting"] as const;

export function isIndexableTrialHubCourseSlug(slug: string): boolean {
  return (INDEXABLE_TRIAL_HUB_COURSE_SLUGS as readonly string[]).includes(slug);
}

/** Параметр предвыбранной даты (slug события). */
export const TRIAL_HUB_DATE_PARAM = "d";

/** Путь без локали — для <Link> из @/i18n/navigation. */
export function trialHubHref(courseSlug: string, eventSlug?: string | null): string {
  const base = `/${TRIAL_HUB_SEGMENT}/${encodeURIComponent(courseSlug)}`;
  return eventSlug ? `${base}?${TRIAL_HUB_DATE_PARAM}=${encodeURIComponent(eventSlug)}` : base;
}

/** Путь с локалью — для redirect() и абсолютных ссылок. */
export function trialHubPath(locale: AppLocale, courseSlug: string, eventSlug?: string | null): string {
  return `/${locale}${trialHubHref(courseSlug, eventSlug)}`;
}

export function poetCourseUrl(locale: AppLocale, courseSlug: string): string {
  return `${POPULAR_POET_SITE_URL.replace(/\/+$/, "")}/${locale}/kursy/${encodeURIComponent(courseSlug)}`;
}

export type TrialHubCourse = {
  id: string;
  slug: string;
  title: string;
  description: string;
  heroImageUrl: string | null;
  visibility: string;
};

export type TrialHubDate = {
  id: string;
  slug: string;
  title: string;
  description: string;
  imageUrl: string | null;
  startsAt: string;
  priceGrosze: number;
  regularPriceGrosze: number;
  isEventDayPrice: boolean;
  remaining: number;
  totalTickets: number;
  venue: string;
  eventLanguage: EventLanguage;
  status: EventMarketingStatus;
  soldOut: boolean;
};

const COURSE_SELECT =
  "id,slug,title,body,title_pl,body_pl,title_uk,body_uk,hero_image_url,card_image_url,visibility" as const;

const TRIAL_EVENT_SELECT =
  "id,slug,title,description,title_pl,description_pl,title_uk,description_uk,venue,starts_at,price_grosze,day_of_event_price_grosze,total_tickets,listing_kind,event_language,image_url,poet_course_id,visibility" as const;

const TRIAL_EVENT_SELECT_NO_LANGUAGE =
  "id,slug,title,description,title_pl,description_pl,title_uk,description_uk,venue,starts_at,price_grosze,day_of_event_price_grosze,total_tickets,listing_kind,image_url,poet_course_id,visibility" as const;

function str(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

/** Курс popularpoet.pl по slug. Старые схемы без i18n/медиа-колонок отдают минимальный набор. */
export async function fetchTrialHubCourse(
  supabase: SupabaseClient,
  courseSlug: string,
  locale: AppLocale,
): Promise<TrialHubCourse | null> {
  let row = await supabase
    .from("poet_course")
    .select(COURSE_SELECT)
    .eq("slug", courseSlug)
    .in("visibility", ["published", "unlisted"])
    .maybeSingle();

  if (row.error?.code === "42703") {
    row = await supabase
      .from("poet_course")
      .select("id,slug,title,body,visibility")
      .eq("slug", courseSlug)
      .in("visibility", ["published", "unlisted"])
      .maybeSingle();
  }

  if (row.error) {
    console.error("[trialCourseHub] course:", row.error.message);
    return null;
  }
  if (!row.data) return null;

  const data = row.data as Record<string, unknown>;
  const copy = resolveCourseCopy(
    {
      title: String(data.title ?? ""),
      body: str(data.body),
      title_pl: str(data.title_pl),
      body_pl: str(data.body_pl),
      title_uk: str(data.title_uk),
      body_uk: str(data.body_uk),
    },
    locale,
  );

  return {
    id: String(data.id),
    slug: String(data.slug),
    title: copy?.title ?? String(data.title ?? ""),
    description: copy?.description ?? "",
    heroImageUrl: str(data.hero_image_url) ?? str(data.card_image_url),
    visibility: String(data.visibility ?? ""),
  };
}

/** Slug курса по id — нужен для редиректа со страницы отдельной даты на хаб. */
export async function fetchPoetCourseSlugById(
  supabase: SupabaseClient,
  courseId: string,
): Promise<string | null> {
  const { data, error } = await supabase
    .from("poet_course")
    .select("slug")
    .eq("id", courseId)
    .maybeSingle();
  if (error) {
    console.warn("[trialCourseHub] course slug:", error.message);
    return null;
  }
  return str((data as { slug?: unknown } | null)?.slug);
}

function mapTrialRow(row: Record<string, unknown>, locale: AppLocale, sold: number): TrialHubDate {
  const startsAt = String(row.starts_at);
  const totalTickets = Number(row.total_tickets ?? 0);
  const remaining = totalTickets - sold;
  const pricing = eventPriceDetails({
    starts_at: startsAt,
    price_grosze: Number(row.price_grosze ?? 0),
    day_of_event_price_grosze: (row.day_of_event_price_grosze as number | null) ?? null,
    listing_kind: "trial",
  });
  const copy = resolveEventCopy(
    {
      title: String(row.title ?? ""),
      description: str(row.description),
      title_pl: str(row.title_pl),
      description_pl: str(row.description_pl),
      title_uk: str(row.title_uk),
      description_uk: str(row.description_uk),
    },
    locale,
  );
  const status = resolveEventMarketingStatus({ startsAt, remaining, totalTickets });

  return {
    id: String(row.id),
    slug: String(row.slug),
    title: copy?.title ?? String(row.title ?? ""),
    description: copy?.description ?? "",
    imageUrl: str(row.image_url),
    startsAt,
    priceGrosze: pricing.effectivePriceGrosze,
    regularPriceGrosze: pricing.regularPriceGrosze,
    isEventDayPrice: pricing.isEventDay && pricing.hasDayOfEventIncrease,
    remaining,
    totalTickets,
    venue: String(row.venue ?? ""),
    eventLanguage: normalizeEventLanguage(row.event_language),
    status,
    soldOut: remaining <= 0 || status === "sold_out",
  };
}

async function loadSoldMap(supabase: SupabaseClient, ids: string[]): Promise<Map<string, number>> {
  const soldMap = new Map<string, number>();
  if (ids.length === 0) return soldMap;
  const { data } = await supabase.from("tickets").select("event_id").in("event_id", ids);
  for (const ticket of data ?? []) {
    const eventId = String((ticket as { event_id: unknown }).event_id);
    soldMap.set(eventId, (soldMap.get(eventId) ?? 0) + 1);
  }
  return soldMap;
}

export type TrialHubPhoto = {
  src: string;
  focalX: number | null;
  focalY: number | null;
};

const TRIAL_HUB_GALLERY_LIMIT = 6;

function photoScore(src: string): number {
  // Живые кадры с занятий лежат в trial-photos; афишные обложки — ниже приоритетом.
  if (src.includes("/trial-photos/")) return 2;
  return 1;
}

/**
 * Уникальные обложки с прошедших пробных этого курса.
 * Сначала кадры из trial-photos, затем остальные афиши — без дублей URL.
 */
export async function fetchTrialHubPhotos(
  supabase: SupabaseClient,
  courseId: string,
  limit = TRIAL_HUB_GALLERY_LIMIT,
): Promise<TrialHubPhoto[]> {
  const nowIso = new Date().toISOString();
  const query = (select: string) =>
    supabase
      .from("events")
      .select(select)
      .eq("listing_kind", "trial")
      .eq("poet_course_id", courseId)
      .lt("starts_at", nowIso)
      .not("image_url", "is", null)
      .order("starts_at", { ascending: false })
      .limit(48);

  let result = await query("image_url,image_focal_x,image_focal_y,starts_at");
  if (result.error?.code === "42703") {
    result = await query("image_url,starts_at");
  }
  if (result.error) {
    console.error("[trialCourseHub] photos:", result.error.message);
    return [];
  }

  const rows = (result.data ?? []) as unknown as Record<string, unknown>[];
  const ranked: { photo: TrialHubPhoto; score: number; index: number }[] = [];
  const seen = new Set<string>();

  for (const [index, row] of rows.entries()) {
    const src = str(row.image_url);
    if (!src || seen.has(src)) continue;
    seen.add(src);
    ranked.push({
      index,
      score: photoScore(src),
      photo: {
        src,
        focalX: typeof row.image_focal_x === "number" ? row.image_focal_x : null,
        focalY: typeof row.image_focal_y === "number" ? row.image_focal_y : null,
      },
    });
  }

  ranked.sort((a, b) => b.score - a.score || a.index - b.index);
  return ranked.slice(0, limit).map((entry) => entry.photo);
}

/** Будущие пробные занятия курса с остатком мест. */
export async function fetchTrialHubDates(
  supabase: SupabaseClient,
  courseId: string,
  locale: AppLocale,
): Promise<TrialHubDate[]> {
  const nowIso = new Date().toISOString();
  const query = (select: string) =>
    supabase
      .from("events")
      .select(select)
      .eq("listing_kind", "trial")
      .eq("poet_course_id", courseId)
      .in("visibility", ["published", "unlisted"])
      .gte("starts_at", nowIso)
      .order("starts_at", { ascending: true });

  let result = await query(TRIAL_EVENT_SELECT);
  if (result.error?.code === "42703") {
    result = await query(TRIAL_EVENT_SELECT_NO_LANGUAGE);
  }
  if (result.error) {
    console.error("[trialCourseHub] dates:", result.error.message);
    return [];
  }

  const rows = (result.data ?? []) as unknown as Record<string, unknown>[];
  if (rows.length === 0) return [];

  const soldMap = await loadSoldMap(supabase, rows.map((row) => String(row.id)));
  return rows.map((row) => mapTrialRow(row, locale, soldMap.get(String(row.id)) ?? 0));
}

export type TrialHubGroup = {
  course: { id: string; slug: string; title: string; heroImageUrl: string | null };
  dates: TrialHubDate[];
};

/** Пробные по дисциплинам — для обзорной страницы «Пробные занятия». */
export async function fetchTrialHubGroups(
  supabase: SupabaseClient,
  locale: AppLocale,
): Promise<TrialHubGroup[]> {
  const nowIso = new Date().toISOString();
  const query = (select: string) =>
    supabase
      .from("events")
      .select(select)
      .eq("listing_kind", "trial")
      .eq("visibility", "published")
      .gte("starts_at", nowIso)
      .order("starts_at", { ascending: true });

  let result = await query(TRIAL_EVENT_SELECT);
  if (result.error?.code === "42703") {
    result = await query(TRIAL_EVENT_SELECT_NO_LANGUAGE);
  }
  if (result.error) {
    console.error("[trialCourseHub] groups:", result.error.message);
    return [];
  }

  const rows = ((result.data ?? []) as unknown as Record<string, unknown>[]).filter((row) =>
    Boolean(str(row.poet_course_id)),
  );
  if (rows.length === 0) return [];

  let courseRows: Record<string, unknown>[] = [];
  const courses = await supabase
    .from("poet_course")
    .select("id,slug,title,title_pl,title_uk,hero_image_url,card_image_url")
    .in("visibility", ["published", "unlisted"])
    .order("sort_order", { ascending: true });
  if (courses.error?.code === "42703") {
    const fallback = await supabase
      .from("poet_course")
      .select("id,slug,title,hero_image_url,card_image_url")
      .in("visibility", ["published", "unlisted"]);
    if (fallback.error) {
      console.error("[trialCourseHub] courses:", fallback.error.message);
      return [];
    }
    courseRows = (fallback.data ?? []) as unknown as Record<string, unknown>[];
  } else if (courses.error) {
    console.error("[trialCourseHub] courses:", courses.error.message);
    return [];
  } else {
    courseRows = (courses.data ?? []) as unknown as Record<string, unknown>[];
  }

  const soldMap = await loadSoldMap(supabase, rows.map((row) => String(row.id)));
  const datesByCourse = new Map<string, TrialHubDate[]>();
  for (const row of rows) {
    const courseId = String(row.poet_course_id);
    const list = datesByCourse.get(courseId) ?? [];
    list.push(mapTrialRow(row, locale, soldMap.get(String(row.id)) ?? 0));
    datesByCourse.set(courseId, list);
  }

  return Promise.all(
    courseRows.flatMap((course) => {
      const id = String(course.id);
      const dates = datesByCourse.get(id);
      if (!dates?.length) return [];
      const copy = resolveCourseCopy(
        {
          title: String(course.title ?? ""),
          title_pl: str(course.title_pl),
          title_uk: str(course.title_uk),
        },
        locale,
      );
      return [
        fetchTrialHubPhotos(supabase, id, 1).then((photos) => ({
          course: {
            id,
            slug: String(course.slug),
            title: copy?.title ?? String(course.title ?? ""),
            heroImageUrl:
              photos[0]?.src ?? str(course.hero_image_url) ?? str(course.card_image_url),
          },
          dates,
        })),
      ];
    }),
  );
}

/** Дата под чекаут: предвыбранная из ?d=, иначе ближайшая свободная. */
export function selectTrialHubDate(
  dates: TrialHubDate[],
  requestedSlug: string | undefined,
): { selected: TrialHubDate | null; requestedMissing: boolean } {
  if (dates.length === 0) return { selected: null, requestedMissing: Boolean(requestedSlug) };
  if (requestedSlug) {
    const match = dates.find((date) => date.slug === requestedSlug);
    if (match) return { selected: match, requestedMissing: false };
  }
  const firstAvailable = dates.find((date) => !date.soldOut);
  return {
    selected: firstAvailable ?? dates[0]!,
    requestedMissing: Boolean(requestedSlug),
  };
}
