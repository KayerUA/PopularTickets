#!/usr/bin/env node
/**
 * 1) Применяет supabase/add-content-i18n-columns.sql (если задан SUPABASE_DB_URL).
 * 2) Переводит events + poet_course через OpenAI (RU → PL + UK).
 * 3) Записывает title_pl, description_pl / body_pl, card_tag_pl и uk-* в Supabase.
 *
 * Usage:
 *   node scripts/backfill-content-i18n.mjs           # dry-run (показать план)
 *   node scripts/backfill-content-i18n.mjs --apply    # записать в БД
 *
 * Env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, OPENAI_API_KEY
 * Optional: SUPABASE_DB_URL=postgresql://postgres.[ref]:[password]@... — для DDL без SQL Editor
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const apply = process.argv.includes("--apply");
const skipOpenAi = process.argv.includes("--skip-openai");

function loadEnvFile(name) {
  const p = path.join(root, name);
  if (!fs.existsSync(p)) return;
  for (const line of fs.readFileSync(p, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!m) continue;
    const key = m[1];
    let val = m[2].trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!(key in process.env) || process.env[key] === "") process.env[key] = val;
  }
}

loadEnvFile(".env.local");
loadEnvFile(".env");

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim().replace(/\/+$/, "");
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
const openaiKey = process.env.OPENAI_API_KEY?.trim();
const dbUrl = process.env.SUPABASE_DB_URL?.trim();

if (!url || !serviceKey) {
  console.error("Need NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(url, serviceKey);

async function columnsExist() {
  const { error } = await supabase.from("events").select("title_pl").limit(1);
  return !error;
}

async function runMigrationSql() {
  const sqlPath = path.join(root, "supabase/add-content-i18n-columns.sql");
  const sql = fs.readFileSync(sqlPath, "utf8");
  if (!dbUrl) {
    console.log("\n⚠️  SUPABASE_DB_URL не задан — выполни вручную в Supabase SQL Editor:");
    console.log(`   ${sqlPath}\n`);
    return false;
  }
  try {
    const postgres = (await import("postgres")).default;
    const sqlExec = postgres(dbUrl, { max: 1 });
    const statements = sql
      .split(";")
      .map((s) => s.replace(/--[^\n]*/g, "").trim())
      .filter((s) => s.length > 0);
    for (const stmt of statements) {
      await sqlExec.unsafe(stmt);
    }
    await sqlExec.end();
    console.log("✓ Migration applied via SUPABASE_DB_URL");
    return true;
  } catch (e) {
    console.error("Migration via postgres failed:", e.message);
    return false;
  }
}

async function fetchRows() {
  const { data: events, error: e1 } = await supabase.from("events").select("id,slug,title,description");
  const { data: courses, error: e2 } = await supabase.from("poet_course").select("id,slug,title,body,card_tag");
  if (e1) throw new Error(`events: ${e1.message}`);
  if (e2) throw new Error(`poet_course: ${e2.message}`);
  return { events: events ?? [], courses: courses ?? [] };
}

async function translateBatch(payload) {
  if (skipOpenAi) {
    const cached = path.join(root, "supabase/backfill-content-i18n-cache.json");
    if (!fs.existsSync(cached)) throw new Error(`--skip-openai but no cache at ${cached}`);
    return JSON.parse(fs.readFileSync(cached, "utf8"));
  }
  if (!openaiKey) throw new Error("OPENAI_API_KEY required");

  const system = `You translate theatre/ticket website content from Russian to Polish and Ukrainian.
Return ONLY valid JSON matching the input structure.
Rules:
- Polish (pl): natural marketing Polish for Warsaw theatre audience; keep venue addresses, URLs, PLN, emoji, dates as-is.
- Ukrainian (uk): natural Ukrainian; same preservation rules.
- card_tag: short label (1-3 words).
- Do not add disclaimers. Preserve line breaks as \\n in JSON strings.`;

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${openaiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      temperature: 0.3,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        {
          role: "user",
          content: `Translate this batch:\n${JSON.stringify(payload)}`,
        },
      ],
    }),
  });

  if (!res.ok) {
    const t = await res.text();
    throw new Error(`OpenAI ${res.status}: ${t.slice(0, 400)}`);
  }
  const json = await res.json();
  const content = json.choices?.[0]?.message?.content;
  const parsed = JSON.parse(content);
  fs.writeFileSync(path.join(root, "supabase/backfill-content-i18n-cache.json"), JSON.stringify(parsed, null, 2) + "\n");
  return parsed;
}

async function applyTranslations(translated) {
  let ok = 0;
  let fail = 0;

  for (const ev of translated.events ?? []) {
    const patch = {
      title_pl: ev.title_pl,
      description_pl: ev.description_pl,
      title_uk: ev.title_uk,
      description_uk: ev.description_uk,
      updated_at: new Date().toISOString(),
    };
    if (!apply) {
      console.log(`[dry] event ${ev.slug}:`, ev.title_pl?.slice(0, 60));
      ok++;
      continue;
    }
    const { error } = await supabase.from("events").update(patch).eq("id", ev.id);
    if (error) {
      console.error(`✗ event ${ev.slug}:`, error.message);
      fail++;
    } else {
      console.log(`✓ event ${ev.slug}`);
      ok++;
    }
  }

  for (const c of translated.courses ?? []) {
    const patch = {
      title_pl: c.title_pl,
      body_pl: c.body_pl,
      title_uk: c.title_uk,
      body_uk: c.body_uk,
      card_tag_pl: c.card_tag_pl,
      card_tag_uk: c.card_tag_uk,
      updated_at: new Date().toISOString(),
    };
    if (!apply) {
      console.log(`[dry] course ${c.slug}:`, c.title_pl?.slice(0, 60));
      ok++;
      continue;
    }
    const { error } = await supabase.from("poet_course").update(patch).eq("id", c.id);
    if (error) {
      console.error(`✗ course ${c.slug}:`, error.message);
      fail++;
    } else {
      console.log(`✓ course ${c.slug}`);
      ok++;
    }
  }

  return { ok, fail };
}

async function main() {
  console.log(apply ? "Mode: APPLY" : "Mode: dry-run (add --apply to write)");

  let hasCols = await columnsExist();
  if (!hasCols) {
    console.log("i18n columns missing…");
    await runMigrationSql();
    hasCols = await columnsExist();
    if (!hasCols) {
      console.log("(продолжаем перевод; для записи в БД сначала выполни SQL миграции)\n");
    } else {
      console.log("✓ i18n columns exist");
    }
  } else {
    console.log("✓ i18n columns exist");
  }

  const { events, courses } = await fetchRows();
  console.log(`Found ${events.length} events, ${courses.length} courses`);

  const payload = {
    events: events.map((e) => ({
      id: e.id,
      slug: e.slug,
      title_ru: e.title,
      description_ru: e.description ?? "",
    })),
    courses: courses.map((c) => ({
      id: c.id,
      slug: c.slug,
      title_ru: c.title,
      body_ru: c.body ?? "",
      card_tag_ru: c.card_tag ?? "",
    })),
  };

  console.log("Translating via OpenAI…");
  const raw = await translateBatch(payload);

  const translated = {
    events: (raw.events ?? []).map((t, i) => ({
      id: events[i]?.id ?? t.id,
      slug: events[i]?.slug ?? t.slug,
      title_pl: t.title_pl,
      description_pl: t.description_pl,
      title_uk: t.title_uk,
      description_uk: t.description_uk,
    })),
    courses: (raw.courses ?? []).map((t, i) => ({
      id: courses[i]?.id ?? t.id,
      slug: courses[i]?.slug ?? t.slug,
      title_pl: t.title_pl,
      body_pl: t.body_pl,
      title_uk: t.title_uk,
      body_uk: t.body_uk,
      card_tag_pl: t.card_tag_pl,
      card_tag_uk: t.card_tag_uk,
    })),
  };

  const { ok, fail } = await applyTranslations(translated);

  writeGeneratedSql(translated);

  if (apply && !hasCols) {
    console.error("\n--apply пропущен: нет колонок. Выполни supabase/add-content-i18n-columns.sql в SQL Editor, затем снова --apply");
    process.exit(1);
  }

  console.log(`\nDone: ${ok} ok, ${fail} failed`);
  if (fail > 0) process.exit(1);
}

function sqlLiteral(value) {
  if (value == null) return "NULL";
  return `'${String(value).replace(/'/g, "''")}'`;
}

function writeGeneratedSql(translated) {
  const outPath = path.join(root, "supabase/backfill-content-i18n.generated.sql");
  const lines = [
    "-- AUTO-GENERATED by scripts/backfill-content-i18n.mjs",
    "-- Run AFTER supabase/add-content-i18n-columns.sql",
    "",
  ];
  for (const ev of translated.events ?? []) {
    lines.push(
      `UPDATE public.events SET title_pl = ${sqlLiteral(ev.title_pl)}, description_pl = ${sqlLiteral(ev.description_pl)}, title_uk = ${sqlLiteral(ev.title_uk)}, description_uk = ${sqlLiteral(ev.description_uk)}, updated_at = now() WHERE slug = ${sqlLiteral(ev.slug)};`,
    );
  }
  for (const c of translated.courses ?? []) {
    lines.push(
      `UPDATE public.poet_course SET title_pl = ${sqlLiteral(c.title_pl)}, body_pl = ${sqlLiteral(c.body_pl)}, title_uk = ${sqlLiteral(c.title_uk)}, body_uk = ${sqlLiteral(c.body_uk)}, card_tag_pl = ${sqlLiteral(c.card_tag_pl)}, card_tag_uk = ${sqlLiteral(c.card_tag_uk)}, updated_at = now() WHERE slug = ${sqlLiteral(c.slug)};`,
    );
  }
  fs.writeFileSync(outPath, lines.join("\n") + "\n");
  console.log(`\nWrote ${outPath}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
