#!/usr/bin/env node
/**
 * Szybka weryfikacja zmiennych środowiskowych przed buildem / deployem.
 * Nie uruchamia serwera Next — tylko sprawdza obecność kluczy.
 */

const fs = require("node:fs");
const path = require("node:path");

const required = [
  "NEXT_PUBLIC_APP_URL",
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
];

const optionalAlways = [
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

let failed = false;
for (const key of required) {
  const v = process.env[key];
  if (!v || String(v).trim() === "") {
    console.error(`[check-env] Brakuje wymaganej zmiennej: ${key}`);
    failed = true;
  }
}

const bypass = process.env.CHECKOUT_BYPASS_PAYMENT === "true";
const optional = [...optionalAlways, ...(bypass ? [] : optionalP24)];
const missingOptional = optional.filter((k) => !process.env[k] || String(process.env[k]).trim() === "");
if (missingOptional.length) {
  console.warn("[check-env] Opcjonalnie (dla pełnej funkcjonalności) uzupełnij:", missingOptional.join(", "));
}
if (bypass) {
  console.warn("[check-env] CHECKOUT_BYPASS_PAYMENT=true — Przelewy24 pomijany (MVP).");
}

if (failed) {
  console.error("[check-env] Skopiuj .env.example → .env lub .env.local i uzupełnij wartości.");
  process.exit(1);
}

console.log("[check-env] Wymagane zmienne obecne. OK.");
