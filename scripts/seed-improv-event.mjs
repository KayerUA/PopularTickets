#!/usr/bin/env node
/**
 * Одноразовый сид: событие «Импровизация» в Świetlica Wolności.
 * Читает .env / .env.local из корня репозитория (без коммита секретов).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

function loadEnvFile(name) {
  const p = path.join(root, name);
  if (!fs.existsSync(p)) return;
  const raw = fs.readFileSync(p, "utf8");
  for (const line of raw.split("\n")) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!m) continue;
    const key = m[1];
    let val = m[2].trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!(key in process.env) || process.env[key] === "") {
      process.env[key] = val;
    }
  }
}

loadEnvFile(".env.local");
loadEnvFile(".env");

const url =
  process.env.NEXT_PUBLIC_SUPABASE_URL?.trim().replace(/\/+$/, "") ||
  process.env.SUPABASE_URL?.trim().replace(/\/+$/, "");
const key =
  process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
  process.env.SUPABASE_SECRET_KEY?.trim();

if (!url || !key) {
  console.error(
    "Нужны URL (NEXT_PUBLIC_SUPABASE_URL или SUPABASE_URL) и service role (SUPABASE_SERVICE_ROLE_KEY или SUPABASE_SECRET_KEY) в .env или .env.local"
  );
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const slug = "improv-swietlica-2026-05-08";

const description = `Как провести вечер пятницы? Сходить на шоу «Импровизация».

8 мая (пт), 21:00 — бар Świetlica Wolności, Nowy Świat 6/12, 00-400 Warszawa.

Карта: https://maps.app.goo.gl/jz9E6JUn8rcymRoH7?g_st=ic

Наши актёры будут создавать сюжеты на ваших глазах, шутить без заготовок, справляться со сложными актёрскими задачами.

Начало в 21:00
• Юмор и комедии
• Много интерактива
• Форматы со зрителями
• Сложные задачи для актёров

Проведём вечер пятницы в кругу друзей, потягивая напитки с бара и наслаждаясь комедией в жанре импровизации.

Зовите друзей, приходите заранее.

Билет — 100 zł.`;

const row = {
  slug,
  title: "Как провести вечер пятницы? Шоу «Импровизация»",
  description,
  image_url: "/events/improv-swietlica-2026-05-08.png",
  maps_url: "https://maps.app.goo.gl/jz9E6JUn8rcymRoH7?g_st=ic",
  venue: "Świetlica Wolności — Nowy Świat 6/12, 00-400 Warszawa",
  starts_at: "2026-05-08T19:00:00.000Z",
  price_grosze: 10000,
  total_tickets: 120,
  is_published: true,
};

const { data: existing, error: selErr } = await supabase.from("events").select("id").eq("slug", slug).maybeSingle();

if (selErr) {
  console.error("Ошибка чтения events:", selErr.message, selErr.code);
  console.error("Если таблицы нет — выполните supabase/schema.sql в SQL Editor Supabase.");
  process.exit(1);
}

if (existing?.id) {
  const { error: upErr } = await supabase.from("events").update(row).eq("id", existing.id);
  if (upErr) {
    console.error("Ошибка обновления:", upErr.message);
    process.exit(1);
  }
  console.log("Событие обновлено:", slug, existing.id);
} else {
  const { data, error: insErr } = await supabase.from("events").insert(row).select("id").single();
  if (insErr) {
    console.error("Ошибка вставки:", insErr.message, insErr.code);
    console.error("Если таблицы нет — выполните supabase/schema.sql в SQL Editor Supabase.");
    process.exit(1);
  }
  console.log("Событие создано:", slug, data.id);
}

console.log("Публичная страница: /pl/events/" + slug + " (и /uk, /ru)");
