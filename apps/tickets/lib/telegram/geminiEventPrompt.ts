import { DateTime } from "luxon";
import { POPULAR_POET_TRIAL_VENUE_PL } from "@/lib/theatreVenueDefaults";
import { EVENT_ADMIN_TIMEZONE } from "@/lib/warsawEventDatetime";

export const MIN_EVENT_DESCRIPTION_CHARS = 300;
/** Целевая длина для SEO (не жёсткий лимит JSON-схемы). */
export const TARGET_EVENT_DESCRIPTION_CHARS = 550;

const BRAND = {
  ru: "театр «Популярный поэт»",
  pl: "Teatr „Popularny Poeta”",
  uk: "театр «Популярний поет»",
} as const;

/** Контекст для SEO-описаний пробных занятий (не копировать дословно — переработать). */
export const COURSE_DESCRIPTION_IMPROV = `Импровизация — занятия, где человек учится быть свободнее, быстрее реагировать, легче общаться и не бояться проявляться. Формат про игру, живой контакт, смех, раскрепощение и ощущение, что можно быть собой здесь и сейчас.`;

export const COURSE_DESCRIPTION_ACTING = `Актёрское мастерство — работа с голосом, телом, вниманием и подачей, которая помогает увереннее чувствовать себя и на сцене, и в жизни. Участники развивают свободу самовыражения и умение быть в контакте с собой и другими.`;

/**
 * Промпт Gemini: парсинг афиши + SEO-описания для populartickets.pl (RU / PL / UK).
 * Описание — plain text с абзацами и подзаголовками (сайт рендерит pre-wrap, без Markdown).
 */
export function buildGeminiEventParsePrompt(sourceText: string, hasImage: boolean): string {
  const now = DateTime.now().setZone(EVENT_ADMIN_TIMEZONE);

  return `Ты редактор афиш и SEO-текстов для билетной кассы ${BRAND.ru} (improv / театр, Warszawa, ul. Domaniewska 37).
Задача: из афиши извлечь поля и написать продающие тексты на трёх языках.

Сейчас: ${now.toFormat("yyyy-MM-dd HH:mm")} (${EVENT_ADMIN_TIMEZONE}).

═══ БРЕНД (используй дословно) ═══
• RU: ${BRAND.ru}
• PL: ${BRAND.pl}
• UK: ${BRAND.uk}
Не пиши "Popular Poet Theater" в описаниях — только локализованное название.

═══ НЕСКОЛЬКО СОБЫТИЙ В ОДНОЙ АФИШЕ ═══
Если в тексте несколько дат/времени (расписание пробных занятий на неделю, несколько показов):
• Верни массив events — отдельный объект на КАЖДУЮ дату/слот.
• Общую цену (например «Вход: 70 zl») поставь в pricePln на уровне корня JSON — она применится ко всем.
• totalTickets на корне — общее для всех, если не указано иначе.
• Диапазон времени «20:00-22:00» → startsAtWarsaw только время НАЧАЛА: 20:00.
• День недели в скобках игнорируй; год: ${now.year}, если не указан.
• listingKind: trial для пробных занятий / impro / актёрского мастерства.
• Если в шапке «пробные занятия» — ВСЕ events[] с listingKind: trial.
• НИКОГДА не пиши «мастер-класс» / masterclass в title для пробных из расписания.
• «Импровизация комедии» / impro — пробное занятие (trial), не мастер-класс.
• Разные типы занятий — разные title и описания (см. контекст курсов ниже).

Если в афише одно событие — массив events из одного элемента.

═══ КОНТЕКСТ КУРСОВ (для trial / пробных) ═══
Импровизация / impro / комедия:
${COURSE_DESCRIPTION_IMPROV}

Актёрское мастерство:
${COURSE_DESCRIPTION_ACTING}

Включай суть курса в description (RU/PL/UK), адаптируя под конкретную дату.

═══ ЦИФРЫ — НЕ УГАДЫВАЙ ═══
• pricePln: число PLN или null (на корне JSON; в events можно не дублировать)
• totalTickets: число или null (на корне)
• startsAtWarsaw в каждом event: строго yyyy-MM-ddTHH:mm (без секунд, без timezone) или null
• Дата без года: день/месяц в текущем году (yyyy=${now.year}), год поправит сервер

═══ ЗАГОЛОВКИ (title / titlePl / titleUk) — в каждом event ═══
• 50–120 символов, цепляющие, без КАПСА
• Формат: «[тип события]: [название]» или «[название] — ${BRAND.ru}»
• Включи естественно: impro / импровизация / шоу / спектакль / пробное (если уместно)
• SEO: Warszawa или Варшава — один раз в titlePl / title / titleUk соответственно
• Не дублируй дату и цену в заголовке

═══ ОПИСАНИЯ (description / descriptionPl / descriptionUk) — в каждом event ═══
Каждое ${MIN_EVENT_DESCRIPTION_CHARS}–900 символов (цель ~${TARGET_EVENT_DESCRIPTION_CHARS}).
Plain text: абзацы через пустую строку. Без Markdown (#, **), без HTML, без emoji.
Структура (подзаголовки на языке локали):

1) Лид — 1–2 предложения: что за вечер, эмоция, уникальность.

2) Что вас ждёт / Co Was czeka / Що вас чекає
   2–4 пункта через «•» — формат, программа, особенности.

3) Для кого
   Кому подойдёт (пара, друзья, новички в impro, русскоязычные в PL и т.д.).

4) Язык
   На каком языке событие (ru / pl / uk / mixed).

5) Когда и где
   Дата, время, адрес: ${POPULAR_POET_TRIAL_VENUE_PL} (venue — это поле, в тексте можно кратко).

6) Билеты
   Онлайн на populartickets.pl, лучше заранее, мест ограничено (если totalTickets известен — упомяни).

7) Как добраться
   Domaniewska 37, Zepter, 5 piętro / 5 этаж; метро Wilanowska или Służew (примерно, без выдуманных деталей).

8) Финальная строка
   RU: ${BRAND.ru} · impro · Warszawa
   PL: ${BRAND.pl} · impro · Warszawa
   UK: ${BRAND.uk} · impro · Warszawa

SEO (естественно, без keyword stuffing):
• impro / импровизация / improwizacja / театр / Warszawa / Варшава / билеты
• Название события и бренд театра — по одному разу в тексте
• Уникальный текст на каждом языке (не дословный перевод RU→PL→UK)

═══ ОСТАЛЬНЫЕ ПОЛЯ ═══
• venue: "${POPULAR_POET_TRIAL_VENUE_PL}" если адрес не указан (не переводить) — на корне JSON
• listingKind в каждом event: trial (пробное/занятие, в т.ч. impro и актёрское) | performance (шоу, спектакль, playback)
• Запрещено: listingKind trial + title «мастер-класс» — для пробных только «пробное занятие» / «zajęcia próbne»
• eventLanguage на корне: ru | uk | ru_uk | pl | en | mixed
• confidence — не заполняй
• notes — не заполняй

═══ JSON ═══
Верни один JSON-объект без markdown-обёртки:
{
  "events": [
    {
      "title", "titlePl", "titleUk",
      "description", "descriptionPl", "descriptionUk",
      "startsAtWarsaw", "listingKind"
    }
  ],
  "pricePln", "totalTickets", "venue", "eventLanguage"
}

${hasImage ? "Текст афиши может быть на изображении — прочитай его." : ""}

Афиша:
"""
${sourceText.trim() || "(прочитай текст с изображения)"}
"""`;
}
