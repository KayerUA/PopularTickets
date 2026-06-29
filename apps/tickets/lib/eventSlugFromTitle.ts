/** Транслитерация кириллицы → латиница для URL-сегмента. */
const CYRILLIC_LATIN: Record<string, string> = {
  а: "a",
  б: "b",
  в: "v",
  г: "g",
  д: "d",
  е: "e",
  ё: "e",
  ж: "zh",
  з: "z",
  и: "i",
  і: "i",
  й: "y",
  ї: "yi",
  к: "k",
  л: "l",
  м: "m",
  н: "n",
  о: "o",
  п: "p",
  р: "r",
  с: "s",
  т: "t",
  у: "u",
  ф: "f",
  х: "h",
  ц: "ts",
  ч: "ch",
  ш: "sh",
  щ: "sch",
  ъ: "",
  ы: "y",
  ь: "",
  э: "e",
  є: "ye",
  ю: "yu",
  я: "ya",
  ґ: "g",
};

const POLISH_LATIN: Record<string, string> = {
  ą: "a",
  ć: "c",
  ę: "e",
  ł: "l",
  ń: "n",
  ó: "o",
  ś: "s",
  ź: "z",
  ż: "z",
};

/**
 * Стоп-слова (после транслитерации в латиницу) — убираем из slug для SEO.
 * Покрывает ru/uk/pl/en предлоги и союзы, которые не несут ключевой нагрузки.
 */
const SLUG_STOP_WORDS = new Set<string>([
  // ru
  "v", "vo", "na", "po", "i", "s", "so", "k", "ko", "o", "ob", "ot", "do", "za", "iz", "u", "zhe", "li", "ne", "dlya", "ili", "no", "a",
  // uk
  "ta", "y", "vid", "z", "dlya",
  // pl
  "w", "we", "ze", "dla", "od", "oraz",
  // en
  "the", "an", "of", "in", "on", "at", "to", "and", "for", "with", "by",
]);

export const MAX_SLUG_LENGTH = 80;
/** Длина суффикса даты "-YYYY-MM-DD". */
const DATE_SUFFIX_LENGTH = 11;
/** Макс. число значащих слов в slug — короткие URL ранжируются лучше. */
export const MAX_SLUG_WORDS = 5;

/** Обрезает slug до maxLen по границе слова (не режет посередине токена). */
function truncateSlugAtWordBoundary(slug: string, maxLen: number): string {
  if (slug.length <= maxLen) return slug;
  const cut = slug.slice(0, maxLen);
  const lastDash = cut.lastIndexOf("-");
  const trimmed = lastDash > 0 ? cut.slice(0, lastDash) : cut;
  return trimmed.replace(/-+$/g, "");
}

/**
 * Отрезает бренд-хвост заголовка после тире: «… в Варшаве — театр «Популярный поэт»».
 * Бренд есть в каждом заголовке и только удлиняет URL (домен уже брендирует сайт).
 */
function stripBrandSuffix(title: string): string {
  const parts = title.split(/\s*[—–]\s*/);
  if (parts.length > 1 && parts[0]!.trim().length >= 3) return parts[0]!.trim();
  return title;
}

/**
 * Человекочитаемый slug для события: латиница, цифры, дефисы.
 * Бренд-хвост отрезается, стоп-слова удаляются, число слов ограничено (SEO).
 * Пустая строка — если из названия нельзя собрать ни одного допустимого символа.
 */
export function slugifyEventTitle(input: string): string {
  const lower = stripBrandSuffix(input.trim()).toLowerCase();
  let out = "";
  for (const ch of lower) {
    const cyr = CYRILLIC_LATIN[ch];
    if (cyr !== undefined) {
      out += cyr;
      continue;
    }
    const pl = POLISH_LATIN[ch];
    if (pl !== undefined) {
      out += pl;
      continue;
    }
    const stripped = ch.normalize("NFD").replace(/\p{M}+/gu, "");
    if (/^[a-z0-9]$/.test(stripped)) {
      out += stripped;
      continue;
    }
    if (/[\s._/\\|,;:]+/.test(ch) || ch === "-") {
      out += "-";
    }
  }

  const tokens = out
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .split("-")
    .filter(Boolean);
  if (tokens.length === 0) return "";

  const meaningful = tokens.filter((t) => !SLUG_STOP_WORDS.has(t));
  // Если после фильтра ничего не осталось (заголовок из одних стоп-слов) — берём исходные токены.
  const finalTokens = (meaningful.length > 0 ? meaningful : tokens).slice(0, MAX_SLUG_WORDS);
  return finalTokens.join("-").slice(0, MAX_SLUG_LENGTH);
}

export function fallbackEventSlug(): string {
  const n = typeof crypto !== "undefined" && crypto.getRandomValues ? crypto.getRandomValues(new Uint32Array(1))[0] : Date.now();
  return `event-${(n >>> 0).toString(36)}`;
}

/** YYYY-MM-DD из datetime-local (админка) или ISO. */
export function dateSuffixFromAdminStartsAt(startsAt: string): string | null {
  const trimmed = startsAt.trim();
  const m = trimmed.match(/^(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : null;
}

/**
 * Slug для SEO: translit названия без стоп-слов + дата события,
 * напр. improvizatsiya-2026-05-21. Дата всегда сохраняется (база обрезается
 * по границе слова с резервом под суффикс даты).
 */
export function buildEventSlugFromTitleAndDate(title: string, startsAt: string): string {
  const base = slugifyEventTitle(title);
  const date = dateSuffixFromAdminStartsAt(startsAt);
  if (!base && !date) return fallbackEventSlug();
  if (!base) return `event-${date}`.slice(0, MAX_SLUG_LENGTH);
  if (!date) {
    const trimmed = truncateSlugAtWordBoundary(base, MAX_SLUG_LENGTH);
    return trimmed.length >= 2 ? trimmed : fallbackEventSlug();
  }
  const baseMax = MAX_SLUG_LENGTH - DATE_SUFFIX_LENGTH;
  const trimmedBase = truncateSlugAtWordBoundary(base, baseMax);
  const combined = `${trimmedBase}-${date}`.replace(/-+/g, "-").replace(/^-+|-+$/g, "");
  return combined.length >= 2 ? combined : fallbackEventSlug();
}
