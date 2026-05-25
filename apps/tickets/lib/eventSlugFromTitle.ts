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
 * Человекочитаемый slug для события: латиница, цифры, дефисы.
 * Пустая строка — если из названия нельзя собрать ни одного допустимого символа.
 */
export function slugifyEventTitle(input: string): string {
  const lower = input.trim().toLowerCase();
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
  return out
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
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

/** Slug для SEO: translit названия + дата события, напр. improvizatsiya-2026-05-21 */
export function buildEventSlugFromTitleAndDate(title: string, startsAt: string): string {
  const base = slugifyEventTitle(title);
  const date = dateSuffixFromAdminStartsAt(startsAt);
  if (!base && !date) return fallbackEventSlug();
  if (!base) return `event-${date}`.slice(0, 80);
  if (!date) return base.length >= 2 ? base : fallbackEventSlug();
  const combined = `${base}-${date}`.replace(/-+/g, "-").replace(/-+$/g, "").slice(0, 80);
  return combined.length >= 2 ? combined : fallbackEventSlug();
}
