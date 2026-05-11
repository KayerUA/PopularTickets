#!/usr/bin/env node
/**
 * Проверка подключения к Supabase из .env / .env.local (без Next).
 * Выход 0 — запрос к таблице events прошёл; иначе 1 и подсказка.
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
    "[verify-supabase] Нет URL или service role.\n" +
      "  Нужно: NEXT_PUBLIC_SUPABASE_URL (или SUPABASE_URL) + SUPABASE_SERVICE_ROLE_KEY (или SUPABASE_SECRET_KEY).\n" +
      "  Файлы: .env или .env.local в корне репозитория.\n" +
      "  На Vercel: Settings → Environment Variables → Production/Preview → Redeploy."
  );
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const { error } = await supabase.from("events").select("id").limit(1);

if (error) {
  console.error("[verify-supabase] Ошибка запроса:", error.message, error.code ? `(${error.code})` : "");
  const msg = (error.message || "").toLowerCase();
  if (msg.includes("does not exist") || msg.includes("schema cache")) {
    console.error(
      "  → Скорее всего нет таблицы. Откройте Supabase → SQL Editor и выполните файл supabase/schema.sql из репозитория."
    );
  } else if (msg.includes("jwt") || msg.includes("invalid api key") || msg.includes("permission denied")) {
    console.error(
      "  → Проверьте ключ: в Project Settings → API нужен секрет service_role (sb_secret_…), не Publishable/anon."
    );
  } else {
    console.error("  → См. docs/DEPLOY.md — раздел «Только в браузере» и логи Vercel Functions.");
  }
  process.exit(1);
}

console.log("[verify-supabase] OK: таблица events доступна, ключи и URL верные.");
process.exit(0);
