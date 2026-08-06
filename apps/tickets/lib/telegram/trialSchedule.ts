import { DateTime } from "luxon";
import { EVENT_ADMIN_TIMEZONE } from "@/lib/warsawEventDatetime";
import { POPULAR_POET_TRIAL_VENUE_PL } from "@/lib/theatreVenueDefaults";

export type TrialCourseSlug = "improv" | "acting" | "playback";

const SCHEDULE_DATE_LINE_RE =
  /^(\d{1,2})[./](\d{1,2})(?:[./](\d{2,4}))?\s*(?:\([^)]*\))?[\s,–—-]*(\d{1,2})[:.](\d{2})(?:\s*[-–—]\s*\d{1,2}[:.]\d{2})?\s*(.*)$/;

/** Строка называет дисциплину — «Импровизация», «Актёрское мастерство», PLAY-BACK. */
export const COURSE_HINT_RE =
  /импров|імпров|impro|комед|актёр|актер|актор|acting|aktor|playback|play-back|плейбек/i;

const SHOW_HINT_RE = /шоу|спектакл|вистав|show|концерт|jam|джем|баттл|battle|premier|прем'єр|премьер/i;

function cleanLineHint(raw: string): string {
  return raw.replace(/^[\s—–\-:·•,]+/, "").trim();
}

export type ScheduleLine = { startsAtWarsaw: string; lineHint: string };

/**
 * Разбор расписания из текста афиши. Два формата:
 * «20.05 (ср) 20:00-22:00 — Импровизация» и заголовок дисциплины над списком дат.
 */
export function extractScheduleLinesFromSource(sourceText: string): ScheduleLine[] {
  const now = DateTime.now().setZone(EVENT_ADMIN_TIMEZONE);
  const out: ScheduleLine[] = [];
  let currentHeader = "";

  for (const rawLine of sourceText.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;

    const m = line.match(SCHEDULE_DATE_LINE_RE);
    if (!m) {
      if (COURSE_HINT_RE.test(line)) currentHeader = line;
      continue;
    }

    const day = m[1]!.padStart(2, "0");
    const month = m[2]!.padStart(2, "0");
    const hour = m[4]!.padStart(2, "0");
    const min = m[5]!.padStart(2, "0");
    const inlineHint = cleanLineHint(m[6] ?? "");
    out.push({
      startsAtWarsaw: `${now.year}-${month}-${day}T${hour}:${min}`,
      lineHint: inlineHint || currentHeader,
    });
  }

  return out;
}

/** null — в тексте нет названия дисциплины, угадывать нельзя. */
export function poetCourseSlugFromText(text: string): TrialCourseSlug | null {
  if (/playback|play-back|плейбек|play\s*back/i.test(text)) return "playback";
  if (/актёр|актер|актор|acting|aktor/i.test(text)) return "acting";
  if (/импров|імпров|impro|комед/i.test(text)) return "improv";
  return null;
}

/** Афиша-расписание пробных занятий, а не анонс шоу. */
export function isTrialScheduleAfisha(sourceText: string): boolean {
  const t = sourceText.toLowerCase();
  if (/пробн|zajęci[aę]\s+prób|zajec\s+prob|trial\s+class/i.test(t)) return true;
  const lines = extractScheduleLinesFromSource(sourceText);
  if (lines.length < 2) return false;
  if (/(?:^|\n)\s*вход\s*:\s*70|70\s*zł|70\s*zl\b/i.test(t)) return true;
  // Голое расписание занятий: у каждой даты названа дисциплина и нигде нет слова «шоу».
  return lines.every((line) => COURSE_HINT_RE.test(line.lineHint)) && !SHOW_HINT_RE.test(t);
}

export type TrialCopy = {
  title: string;
  titlePl: string;
  titleUk: string;
  description: string;
  descriptionPl: string;
  descriptionUk: string;
};

const VENUE_LINE = POPULAR_POET_TRIAL_VENUE_PL;

/**
 * Тексты пробных задаются шаблоном по дисциплине: даты продаются с хаба курса,
 * поэтому уникальные SEO-описания на каждую дату не нужны.
 */
export const TRIAL_COPY: Record<TrialCourseSlug, TrialCopy> = {
  improv: {
    title: "Пробное занятие по импровизации в Варшаве — театр «Популярный поэт»",
    titlePl: "Zajęcia próbne z improwizacji w Warszawie — Teatr „Popularny Poeta”",
    titleUk: "Пробне заняття з імпровізації у Варшаві — театр «Популярний поет»",
    description: `Открытое занятие по импровизации в театре «Популярный поэт» — два часа игры, живого контакта и смеха.

Что вас ждёт
• Разминка и простые упражнения на внимание и реакцию — без подготовки и без текстов.
• Парные и групповые сцены: учимся принимать идеи партнёра и продолжать их.
• Разбор от преподавателя и ответы на вопросы про курс.

Для кого
Для новичков без опыта на сцене, для тех, кто хочет свободнее говорить и легче знакомиться, и для русскоязычных в Варшаве, которым не хватает живого общения.

Когда и где
${VENUE_LINE}. Метро Wilanowska или Służew.

Билеты
Онлайн на populartickets.pl. Группа небольшая, места лучше бронировать заранее.

театр «Популярный поэт» · impro · Warszawa`,
    descriptionPl: `Zajęcia otwarte z improwizacji w Teatrze „Popularny Poeta” — dwie godziny gry, kontaktu i śmiechu.

Co Was czeka
• Rozgrzewka i proste ćwiczenia na uwagę oraz reakcję — bez przygotowania i bez tekstów.
• Sceny w parach i w grupie: uczymy się przyjmować pomysły partnera i je rozwijać.
• Omówienie od prowadzącego i odpowiedzi na pytania o kurs.

Dla kogo
Dla osób bez doświadczenia scenicznego, dla tych, którzy chcą swobodniej mówić i łatwiej poznawać ludzi.

Kiedy i gdzie
${VENUE_LINE}. Metro Wilanowska lub Służew.

Bilety
Online na populartickets.pl. Grupa jest kameralna, warto zarezerwować miejsce wcześniej.

Teatr „Popularny Poeta” · impro · Warszawa`,
    descriptionUk: `Відкрите заняття з імпровізації в театрі «Популярний поет» — дві години гри, живого контакту та сміху.

Що вас чекає
• Розминка й прості вправи на увагу та реакцію — без підготовки й без текстів.
• Сцени в парах і в групі: вчимося приймати ідеї партнера й розвивати їх.
• Розбір від викладача та відповіді на запитання про курс.

Для кого
Для новачків без сценічного досвіду й для тих, хто хоче вільніше говорити та легше знайомитися.

Коли і де
${VENUE_LINE}. Метро Wilanowska або Służew.

Квитки
Онлайн на populartickets.pl. Група невелика, місце краще забронювати заздалегідь.

театр «Популярний поет» · impro · Warszawa`,
  },
  acting: {
    title: "Пробное занятие по актёрскому мастерству в Варшаве — театр «Популярный поэт»",
    titlePl: "Zajęcia próbne z aktorstwa w Warszawie — Teatr „Popularny Poeta”",
    titleUk: "Пробне заняття з акторської майстерності у Варшаві — театр «Популярний поет»",
    description: `Открытое занятие по актёрскому мастерству в театре «Популярный поэт» — два часа работы с голосом, телом и вниманием.

Что вас ждёт
• Разминка: дыхание, речь, снятие зажимов.
• Этюды и работа в паре — учимся держать внимание и быть в контакте с партнёром.
• Обратная связь от преподавателя и разговор о программе курса.

Для кого
Для новичков без опыта, для тех, кто хочет увереннее держаться на публике, и для русскоязычных в Варшаве, которым интересен театр изнутри.

Когда и где
${VENUE_LINE}. Метро Wilanowska или Służew.

Билеты
Онлайн на populartickets.pl. Группа небольшая, места лучше бронировать заранее.

театр «Популярный поэт» · актёрское мастерство · Warszawa`,
    descriptionPl: `Zajęcia otwarte z aktorstwa w Teatrze „Popularny Poeta” — dwie godziny pracy z głosem, ciałem i uwagą.

Co Was czeka
• Rozgrzewka: oddech, dykcja, zdejmowanie napięć.
• Etiudy i praca w parach — uczymy się utrzymywać uwagę i być w kontakcie z partnerem.
• Informacja zwrotna od prowadzącego i rozmowa o programie kursu.

Dla kogo
Dla osób bez doświadczenia, dla tych, którzy chcą pewniej czuć się przed ludźmi, i dla wszystkich ciekawych teatru od środka.

Kiedy i gdzie
${VENUE_LINE}. Metro Wilanowska lub Służew.

Bilety
Online na populartickets.pl. Grupa jest kameralna, warto zarezerwować miejsce wcześniej.

Teatr „Popularny Poeta” · aktorstwo · Warszawa`,
    descriptionUk: `Відкрите заняття з акторської майстерності в театрі «Популярний поет» — дві години роботи з голосом, тілом і увагою.

Що вас чекає
• Розминка: дихання, мовлення, зняття затисків.
• Етюди й робота в парі — вчимося тримати увагу та бути в контакті з партнером.
• Зворотний зв'язок від викладача й розмова про програму курсу.

Для кого
Для новачків без досвіду та для тих, хто хоче впевненіше почуватися на публіці.

Коли і де
${VENUE_LINE}. Метро Wilanowska або Służew.

Квитки
Онлайн на populartickets.pl. Група невелика, місце краще забронювати заздалегідь.

театр «Популярний поет» · акторська майстерність · Warszawa`,
  },
  playback: {
    title: "Пробное занятие playback-театра в Варшаве — театр «Популярный поэт»",
    titlePl: "Zajęcia próbne teatru playback w Warszawie — Teatr „Popularny Poeta”",
    titleUk: "Пробне заняття playback-театру у Варшаві — театр «Популярний поет»",
    description: `Открытое занятие playback-театра в театре «Популярный поэт» — два часа про истории, эмпатию и сцену.

Что вас ждёт
• Разминка и простые формы playback: как услышать историю и вернуть её образом.
• Работа в группе — голос, движение, музыка, короткие сцены.
• Разбор от преподавателя и разговор о курсе.

Для кого
Для новичков без сценического опыта и для тех, кому близок театр про живые человеческие истории.

Когда и где
${VENUE_LINE}. Метро Wilanowska или Służew.

Билеты
Онлайн на populartickets.pl. Группа небольшая, места лучше бронировать заранее.

театр «Популярный поэт» · playback · Warszawa`,
    descriptionPl: `Zajęcia otwarte teatru playback w Teatrze „Popularny Poeta” — dwie godziny o historiach, empatii i scenie.

Co Was czeka
• Rozgrzewka i proste formy playbacku: jak usłyszeć historię i oddać ją obrazem.
• Praca w grupie — głos, ruch, muzyka, krótkie sceny.
• Omówienie od prowadzącego i rozmowa o kursie.

Dla kogo
Dla osób bez doświadczenia scenicznego i dla wszystkich, którym bliski jest teatr o prawdziwych historiach.

Kiedy i gdzie
${VENUE_LINE}. Metro Wilanowska lub Służew.

Bilety
Online na populartickets.pl. Grupa jest kameralna, warto zarezerwować miejsce wcześniej.

Teatr „Popularny Poeta” · playback · Warszawa`,
    descriptionUk: `Відкрите заняття playback-театру в театрі «Популярний поет» — дві години про історії, емпатію та сцену.

Що вас чекає
• Розминка й прості форми playback: як почути історію та повернути її образом.
• Робота в групі — голос, рух, музика, короткі сцени.
• Розбір від викладача й розмова про курс.

Для кого
Для новачків без сценічного досвіду й для тих, кому близький театр про справжні людські історії.

Коли і де
${VENUE_LINE}. Метро Wilanowska або Służew.

Квитки
Онлайн на populartickets.pl. Група невелика, місце краще забронювати заздалегідь.

театр «Популярний поет» · playback · Warszawa`,
  },
};
