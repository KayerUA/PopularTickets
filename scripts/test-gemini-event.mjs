#!/usr/bin/env node
/** Smoke-test Gemini parse (без Telegram). Модель = GEMINI_MODEL или gemini-2.5-flash (free tier). */
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULT_GEMINI_MODEL = "gemini-flash-latest";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

function loadEnvFile(path) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq <= 0) continue;
    const key = t.slice(0, eq).trim();
    let val = t.slice(eq + 1).trim();
    if (!(key in process.env) || process.env[key] === "") process.env[key] = val;
  }
}

loadEnvFile(resolve(root, ".env"));

const key = (process.env.GEMINI_API_KEY ?? "").trim();
const model = (process.env.GEMINI_MODEL ?? DEFAULT_GEMINI_MODEL).trim();
if (!key) {
  console.error("GEMINI_API_KEY missing");
  process.exit(1);
}

console.log("model:", model);

const sample = `
Пробное занятие: Актёрское мастерство
22 мая 2026, 19:00
Warszawa, ul. Domaniewska 37
Билет: 50 zł
30 мест
Язык: русский
Тренинги и упражнения для актёров…
`;

const res = await fetch(
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
  {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-goog-api-key": key },
    body: JSON.stringify({
      contents: [{
        parts: [{
          text: `Extract event JSON with title, titlePl, titleUk, description (300+ chars each lang), startsAtWarsaw, pricePln, totalTickets, venue, listingKind, eventLanguage. Input:\n${sample}`,
        }],
      }],
      generationConfig: { responseMimeType: "application/json", temperature: 0.2 },
    }),
  },
);

console.log("Gemini status:", res.status);
const json = await res.json();
const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
if (text) {
  const parsed = JSON.parse(text);
  console.log("title:", parsed.title?.slice(0, 60));
  console.log("titlePl:", parsed.titlePl?.slice(0, 60));
  console.log("startsAtWarsaw:", parsed.startsAtWarsaw);
  console.log("description len:", parsed.description?.length, "pl:", parsed.descriptionPl?.length);
} else {
  console.log(JSON.stringify(json, null, 2).slice(0, 800));
  process.exit(1);
}
