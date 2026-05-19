/**
 * Ręczne tłumaczenia PL/UK (OpenAI quota fallback). Uruchom:
 *   node scripts/backfill-content-i18n-data.mjs --write-sql
 *   node scripts/backfill-content-i18n-data.mjs --apply   (po migracji kolumn)
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const apply = process.argv.includes("--apply");
const writeSql = process.argv.includes("--write-sql") || !apply;

function loadEnvFile(name) {
  const p = path.join(root, name);
  if (!fs.existsSync(p)) return;
  for (const line of fs.readFileSync(p, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!m) continue;
    let val = m[2].trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1);
    if (!(m[1] in process.env) || process.env[m[1]] === "") process.env[m[1]] = val;
  }
}
loadEnvFile(".env.local");
loadEnvFile(".env");

/** @type {{ events: Record<string, { title_pl: string; description_pl: string; title_uk: string; description_uk: string }>; courses: Record<string, { title_pl: string; body_pl: string; title_uk: string; body_uk: string; card_tag_pl: string; card_tag_uk: string }> }} */
export const DATA = {
  events: {
    "teatr-popular-poet": {
      title_pl: "Spektakl „Improwizacja”",
      description_pl:
        "🎭 Nasi improwizatorzy są gotowi na każde wyzwanie! Wasze pomysły nabiorą kształtu na scenie, rozbudzą humor i zamienią się w żywe postacie.\n\n😍 Krótkie i długie formy improwizacji, widzowie staną się reżyserami, ciepła i przyjazna atmosfera wspólnoty, śmiech i inteligentny humor — wszystko to sprawi, że poniedziałkowy wieczór będzie niezapomniany.",
      title_uk: "Шоу «Імпровізація»",
      description_uk:
        "🎭 Наші імпровізатори готові до будь-яких завдань! Ваші ідеї набудуть образності на сцені, обростуть гумором і перетворяться на живих персонажів.\n\n😍 Короткі й довгі форми імпровізації, глядачі стануть режисерами, затишна атмосфера єднання, сміх і інтелектуальний гумор — все це зробить понеділковий вечір незабутнім.",
    },
    "popular-poet": {
      title_pl: "Spektakl „Boing-Boing”",
      description_pl: "Spektakl „Boing-Boing” w teatrze Popular Poet w Warszawie. Szczegóły wkrótce na stronie wydarzenia.",
      title_uk: "Вистава «Боинг-Боинг»",
      description_uk: "Вистава «Боинг-Боинг» у театрі Popular Poet у Варшаві.",
    },
    "pp-trial-playback": {
      title_pl: "Zajęcia wstępne PLAY-BACK",
      description_pl:
        "Zajęcia próbne Popular Poet w Warszawie. Płatność i bilet — na PopularTickets.\n\nAdres: Warszawa, ul. Domaniewska 37, Centrum biznesowe Zepter, piętro 5, lokal 42.",
      title_uk: "Вступне заняття PLAY-BACK",
      description_uk:
        "Пробний слот Popular Poet у Варшаві. Оплата та квиток — на PopularTickets.\n\nАдреса: Warszawa, ul. Domaniewska 37, Centrum biznesowe Zepter, piętro 5, lokal 42.",
    },
    "improv-swietlica-2026-05-08": {
      title_pl: "Spektakl „Improwizacja”",
      description_pl:
        "Jak spędzić piątkowy wieczór? Pójść na spektakl „Improwizacja”.\n\n8 maja (pt), 21:00 — bar Świetlica Wolności, Nowy Świat 6/12, 00-400 Warszawa.\n\nMapa: https://maps.app.goo.gl/jz9E6JUn8rcymRoH7?g_st=ic\n\nNasi aktorzy będą tworzyć fabuły na waszych oczach, żartować bez scenariusza i radzić sobie z trudnymi zadaniami aktorskimi.\n\nStart o 21:00\n• Humor i komedia\n• Dużo interakcji\n• Formy ze widownią\n• Trudne zadania dla aktorów\n\nSpędzimy piątkowy wieczór w gronie przyjaciół, popijając napoje z baru i ciesząc się komedią improwizowaną.\n\nZabierzcie znajomych, przyjdźcie wcześniej.\n\nBilet — 100 zł.",
      title_uk: "Шоу «Імпровізація»",
      description_uk:
        "Як провести п’ятничний вечір? Сходити на шоу «Імпровізація».\n\n8 травня (пт), 21:00 — бар Świetlica Wolności, Nowy Świat 6/12, 00-400 Warszawa.\n\nКарта: https://maps.app.goo.gl/jz9E6JUn8rcymRoH7?g_st=ic\n\nНаші актори створюватимуть сюжети на ваших очах, жартуючи без заготовок.\n\nПочаток о 21:00\n• Гумор і комедії\n• Багато інтерактиву\n• Формати з глядачами\n\nКвиток — 100 zł.",
    },
    "probnoe-zaniatie-15052026": {
      title_pl: "Zajęcia z improwizacji",
      description_pl:
        "Dlaczego warto spróbować improwizacji?\n\n- rozluźnienie od pierwszego spotkania\n- emocjonalne naładowanie\n- nowe umiejętności\n- lekkość w myśleniu i ciele\n\nCo będzie na zajęciach?\nNa lekcji próbnej stopniowo rozgrzewamy się przez treningi aktorskie — bez presji! Po 15 minutach łapiesz stan gry: pirat, dziecko, dowódca czy zabawna postać.",
      title_uk: "Заняття з імпровізації",
      description_uk:
        "Чому варто спробувати імпровізацію?\n\n- розкріплення з першої зустрічі\n- емоційне перезавантаження\n- нові навички\n- легкість у мисленні та тілі\n\nНа пробному занятті поступово розігріваємось через акторські тренінги — без тиску!",
    },
    "pp-trial-acting": {
      title_pl: "Zajęcia próbne: aktorstwo",
      description_pl:
        "Zajęcia próbne Popular Poet w Warszawie. Płatność i bilet — na PopularTickets (Przelewy24).\n\nAdres: Warszawa, ul. Domaniewska 37, Centrum biznesowe Zepter, piętro 5, lokal 42.",
      title_uk: "Пробне: акторська майстерність",
      description_uk:
        "Пробний слот Popular Poet у Варшаві. Оплата та квиток — на PopularTickets (Przelewy24).\n\nАдреса: Warszawa, ul. Domaniewska 37, Centrum biznesowe Zepter, piętro 5, lokal 42.",
    },
    "pp-trial-improv": {
      title_pl: "Zajęcia próbne: improwizacja aktorska",
      description_pl:
        "Zajęcia próbne Popular Poet w Warszawie. Bilet kupujesz na PopularTickets: płatność Przelewy24, potwierdzenie na e-mail.\n\nAdres: Warszawa, ul. Domaniewska 37, Centrum biznesowe Zepter, piętro 5, lokal 42.",
      title_uk: "Пробне: акторська імпровізація",
      description_uk:
        "Пробний слот Popular Poet у Варшаві. Оформлюєте квиток на PopularTickets: оплата Przelewy24, підтвердження на e-mail.\n\nАдреса: Warszawa, ul. Domaniewska 37, Centrum biznesowe Zepter, piętro 5, lokal 42.",
    },
    "impro-dwa-palcha-19052026": {
      title_pl: "Spektakl komediowy ⭐️ IMPROWIZACJA ⭐️",
      description_pl:
        "Zespół: „Dwa palce”\n\nZapraszamy na humorystyczne show do teatru „Popularny Poeta”. Nasi improwizatorzy wystąpią w formatach komediowych, tworząc fabuły i postacie na waszych oczach, a nietypowe zadania aktorskie dopełnią obraz humoru!\n\n👑 Czeka was:\n- Humor i komedia\n- Pełna improwizacja\n- Trudne zadania aktorskie\n- Formy ze widownią\n- Energia i zabawa\n\n🎈 19.05 (wt)\n🏁 Start o 19:00",
      title_uk: "Комедійне шоу ⭐️ ІМПРОВІЗАЦІЯ ⭐️",
      description_uk:
        "Команда: «Два пальця»\n\nЗапрошуємо на гумористичне шоу до театру «Популярний поет». Наші імпровізатори виступлять у комедійних форматах.\n\n👑 Вас чекають:\n- Гумор і комедії\n- Повна імпровізація\n- Складні акторські завдання\n- Формати з глядачами\n\n🎈 19.05 (вт)\n🏁 Початок о 19:00",
    },
    "sale-14": {
      title_pl: "Spektakl",
      description_pl: "Spektakl w teatrze Popular Poet. Szczegóły wkrótce.",
      title_uk: "Вистава",
      description_uk: "Вистава в театрі Popular Poet.",
    },
    "pp-trial-masterclass": {
      title_pl: "Warsztaty „Uwaga na scenie”",
      description_pl: "Adres: Warszawa, ul. Domaniewska 37, Centrum biznesowe Zepter, piętro 5, lokal 42.",
      title_uk: "Майстер-клас «Увага на сцені»",
      description_uk: "Адреса: Warszawa, ul. Domaniewska 37, Centrum biznesowe Zepter, piętro 5, lokal 42.",
    },
    "story-tailing-prewiew": {
      title_pl: "Zajęcia wstępne ze storytellingu",
      description_pl:
        "Opowiemy sobie nawzajem historie i omówimy, czym różni się historia A od historii B.",
      title_uk: "Вступне заняття зі сторітелінгу",
      description_uk: "Разом розповімо одне одному історії та розберемо, у чому різниця між історією A та B.",
    },
    "impro20052026": {
      title_pl: "Zajęcia próbne z improwizacji",
      description_pl:
        "Dlaczego warto spróbować improwizacji?\n\n- rozluźnienie od pierwszego spotkania\n- emocjonalne naładowanie\n- nowe umiejętności\n- lekkość w myśleniu i ciele\n\nCo będzie na zajęciach?\nNa lekcji próbnej stopniowo rozgrzewamy się przez treningi aktorskie — bez presji! Po 15 minutach łapiesz stan gry.",
      title_uk: "Пробне заняття з імпровізації",
      description_uk:
        "Чому варто спробувати імпровізацію?\n\n- розкріплення з першої зустрічі\n- емоційне перезавантаження\n- нові навички\n- легкість у мисленні та тілі",
    },
    "shou-play-back": {
      title_pl: "Spektakl „PLAY-BACK”",
      description_pl:
        "Zespół „Kwartirnik” wystąpi w tę sobotę i zagra wasze historie! Spieszcie się z rezerwacją miejsc.\n\n„Kwartirnik” to zespół aktorów występujący w gatunku play-back. Zagramy historie widzów w teatralnych formach. Każda opowieść stanie się fabułą, a opowiadający zobaczy, jak ich historia zamienia się w dramaturgię. Niezapomniana atmosfera wspólnoty z salą, humor i satyra, wzruszające wnioski — czekamy na was!",
      title_uk: "Шоу «PLAY-BACK»",
      description_uk:
        "Команда «Квартирник» виступить у цю суботу та зіграє ваші історії! Поспішайте забронювати місця.\n\n«Квартирник» — команда акторів у жанрі play-back. Ми зіграємо історії глядачів у театралізованих формах.",
    },
  },
  courses: {
    playback: {
      title_pl: "Grupy PLAY-BACK",
      body_pl: "Muzyka, ruch i historie widzów na scenie. Zajęcia próbne: płatność na PopularTickets.",
      title_uk: "Групи PLAY-BACK",
      body_uk: "Музика, рух і історії глядачів на сцені. Пробне: оплата на PopularTickets.",
      card_tag_pl: "PLAY-BACK",
      card_tag_uk: "PLAY-BACK",
    },
    improv: {
      title_pl: "Improwizacja aktorska",
      body_pl: "Scena „tu i teraz”, formaty i widz — bez wkuwania tekstu. Zajęcia próbne: płatność na PopularTickets.",
      title_uk: "Акторська імпровізація",
      body_uk: "Сцена «тут і зараз», формати й глядач — без заученого тексту. Пробне: оплата на PopularTickets.",
      card_tag_pl: "Impro",
      card_tag_uk: "Імпро",
    },
    acting: {
      title_pl: "Aktorstwo",
      body_pl: "Głos, tekst i obecność na scenie. Zajęcia próbne: płatność na PopularTickets.",
      title_uk: "Акторська майстерність",
      body_uk: "Голос, текст і присутність на сцені. Пробне: оплата на PopularTickets.",
      card_tag_pl: "Aktorstwo",
      card_tag_uk: "Акторство",
    },
    "play-back": {
      title_pl: "Kurs teatru play-back",
      body_pl: "Kurs teatru play-back — muzyka, ruch i opowieści widzów na scenie.",
      title_uk: "Курс Play-back театру",
      body_uk: "Курс Play-back театру",
      card_tag_pl: "PLAY-BACK",
      card_tag_uk: "PLAY-BACK",
    },
    "kurs-impro": {
      title_pl: "Kurs improwizacji",
      body_pl: "Kurs improwizacji aktorskiej — od podstaw do sceny.",
      title_uk: "Курс імпровізації",
      body_uk: "Імпро, імпро, імпро",
      card_tag_pl: "Impro",
      card_tag_uk: "Імпро",
    },
    "akterskoe-masterstvo": {
      title_pl: "Aktorstwo",
      body_pl: "Kurs aktorstwa — głos, tekst i obecność na scenie w praktyce.",
      title_uk: "Акторська майстерність",
      body_uk: "Приходь акторитися",
      card_tag_pl: "Aktorstwo",
      card_tag_uk: "Акторство",
    },
    "story-talling": {
      title_pl: "Kurs storytellingu",
      body_pl: "Kurs, który nauczy opowiadać historie.\n4 zajęcia.",
      title_uk: "Курс сторітелінгу",
      body_uk: "Курс, який навчить розповідати історії\n4 заняття",
      card_tag_pl: "Kurs",
      card_tag_uk: "Курс",
    },
    masterclass: {
      title_pl: "Warsztaty (masterclass)",
      body_pl: "Skondensowany intensyw z wybranego tematu. Zajęcia próbne: płatność na PopularTickets.",
      title_uk: "Майстер-класи",
      body_uk: "Стислий інтенсив з теми. Пробне: оплата на PopularTickets.",
      card_tag_pl: "Masterclass",
      card_tag_uk: "Майстер-клас",
    },
  },
};

function sqlLiteral(v) {
  if (v == null) return "NULL";
  return `'${String(v).replace(/'/g, "''")}'`;
}

function buildSql() {
  const mig = fs.readFileSync(path.join(root, "supabase/add-content-i18n-columns.sql"), "utf8");
  const lines = [mig.trim(), "", "-- Backfill PL/UK", ""];
  for (const [slug, t] of Object.entries(DATA.events)) {
    lines.push(
      `UPDATE public.events SET title_pl = ${sqlLiteral(t.title_pl)}, description_pl = ${sqlLiteral(t.description_pl)}, title_uk = ${sqlLiteral(t.title_uk)}, description_uk = ${sqlLiteral(t.description_uk)}, updated_at = now() WHERE slug = ${sqlLiteral(slug)};`,
    );
  }
  for (const [slug, t] of Object.entries(DATA.courses)) {
    lines.push(
      `UPDATE public.poet_course SET title_pl = ${sqlLiteral(t.title_pl)}, body_pl = ${sqlLiteral(t.body_pl)}, title_uk = ${sqlLiteral(t.title_uk)}, body_uk = ${sqlLiteral(t.body_uk)}, card_tag_pl = ${sqlLiteral(t.card_tag_pl)}, card_tag_uk = ${sqlLiteral(t.card_tag_uk)}, updated_at = now() WHERE slug = ${sqlLiteral(slug)};`,
    );
  }
  return lines.join("\n") + "\n";
}

async function applyViaSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim().replace(/\/+$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const sb = createClient(url, key);
  const { error: probe } = await sb.from("events").select("title_pl").limit(1);
  if (probe) throw new Error(`Kolumny i18n nie istnieją: ${probe.message}. Uruchom supabase/add-content-i18n-and-backfill.sql w SQL Editor.`);

  for (const [slug, t] of Object.entries(DATA.events)) {
    const { error } = await sb
      .from("events")
      .update({
        title_pl: t.title_pl,
        description_pl: t.description_pl,
        title_uk: t.title_uk,
        description_uk: t.description_uk,
        updated_at: new Date().toISOString(),
      })
      .eq("slug", slug);
    if (error) throw new Error(`event ${slug}: ${error.message}`);
    console.log("✓ event", slug);
  }
  for (const [slug, t] of Object.entries(DATA.courses)) {
    const { error } = await sb
      .from("poet_course")
      .update({
        title_pl: t.title_pl,
        body_pl: t.body_pl,
        title_uk: t.title_uk,
        body_uk: t.body_uk,
        card_tag_pl: t.card_tag_pl,
        card_tag_uk: t.card_tag_uk,
        updated_at: new Date().toISOString(),
      })
      .eq("slug", slug);
    if (error) throw new Error(`course ${slug}: ${error.message}`);
    console.log("✓ course", slug);
  }
}

const outSql = path.join(root, "supabase/add-content-i18n-and-backfill.sql");
if (writeSql) {
  fs.writeFileSync(outSql, buildSql());
  console.log("Wrote", outSql);
}

if (apply) {
  await applyViaSupabase();
  console.log("Applied via Supabase API");
}
