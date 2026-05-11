#!/usr/bin/env node
/**
 * Szybka weryfikacja zmiennych środowiskowych przed buildem / deployem.
 * Nie uruchamia serwera Next — tylko sprawdza obecność kluczy.
 */

import fs from "node:fs";
import path from "node:path";

const optionalAlways = [
  "NEXT_PUBLIC_APP_URL",
  "NEXT_PUBLIC_CONTACT_EMAIL",
  "RESEND_API_KEY",
  "RESEND_FROM_EMAIL",
  "ADMIN_PASSWORD",
  "ADMIN_JWT_SECRET",
  "CHECKIN_OPERATOR_TOKEN",
];

const optionalP24 = ["P24_MERCHANT_ID", "P24_POS_ID", "P24_SECRET_ID", "P24_CRC_KEY"];

function loadEnvFile(name) {
  const p = path.join(process.cwd(), name);
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

function supabaseProjectUrl() {
  return (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "").trim().replace(/\/+$/, "");
}

function supabaseServiceRoleKey() {
  return (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || "").trim();
}

let failed = false;
if (!supabaseProjectUrl()) {
  console.error("[check-env] Brakuje URL Supabase: NEXT_PUBLIC_SUPABASE_URL lub SUPABASE_URL");
  failed = true;
}
if (!supabaseServiceRoleKey()) {
  console.error("[check-env] Brakuje SUPABASE_SERVICE_ROLE_KEY lub SUPABASE_SECRET_KEY");
  failed = true;
}

const bypass = process.env.CHECKOUT_BYPASS_PAYMENT === "true";
const publicUrl =
  (process.env.NEXT_PUBLIC_APP_URL && String(process.env.NEXT_PUBLIC_APP_URL).trim()) ||
  (process.env.VERCEL_URL && `https://${String(process.env.VERCEL_URL).trim()}`);

if (!bypass && !publicUrl) {
  console.error(
    "[check-env] Przy CHECKOUT_BYPASS_PAYMENT=false ustaw NEXT_PUBLIC_APP_URL (albo uruchom na Vercel z VERCEL_URL)."
  );
  failed = true;
}

const optional = [...optionalAlways, ...(bypass ? [] : optionalP24)];
const missingOptional = optional.filter((k) => !process.env[k] || String(process.env[k]).trim() === "");
if (missingOptional.length) {
  console.warn("[check-env] Opcjonalnie (dla pełnej funkcjonalności) uzupełnij:", missingOptional.join(", "));
}
if (bypass) {
  console.warn("[check-env] CHECKOUT_BYPASS_PAYMENT=true — Przelewy24 pomijany (MVP).");
  if (process.env.SKIP_ORDER_EMAIL === "true") {
    console.warn("[check-env] SKIP_ORDER_EMAIL=true — e-mail z biletami nie będzie wysyłany.");
  }
}

if (failed) {
  console.error("[check-env] Skopiuj .env.example → .env lub .env.local i uzupełnij wartości.");
  process.exit(1);
}

console.log("[check-env] Wymagane zmienne obecne. OK.");
