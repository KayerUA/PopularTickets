#!/usr/bin/env node
/**
 * Szybka weryfikacja zmiennych środowiskowych przed buildem / deployem.
 * Nie uruchamia serwera Next — tylko sprawdza obecność kluczy.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, "..");

const optionalAlways = [
  "NEXT_PUBLIC_APP_URL",
  "NEXT_PUBLIC_CONTACT_EMAIL",
  "RESEND_API_KEY",
  "RESEND_FROM_EMAIL",
  "ADMIN_PASSWORD",
  "ADMIN_JWT_SECRET",
  "CHECKIN_PASSWORD",
  "CHECKIN_OPERATOR_TOKEN",
  "ORDER_RECEIPT_SECRET",
  "UPSTASH_REDIS_REST_URL",
  "UPSTASH_REDIS_REST_TOKEN",
];

const optionalP24 = ["P24_MERCHANT_ID", "P24_CRC_KEY"];

function envNonEmpty(key) {
  const raw = process.env[key];
  if (raw === undefined || raw === null) return undefined;
  const t = String(raw).trim();
  return t === "" ? undefined : t;
}

function p24SandboxMode() {
  const raw = envNonEmpty("P24_SANDBOX");
  if (raw !== undefined) {
    const v = raw.toLowerCase();
    if (v === "false" || v === "0" || v === "no" || v === "off") return false;
    if (v === "true" || v === "1" || v === "yes" || v === "on") return true;
  }
  const sandboxSecret =
    envNonEmpty("SANDBOX_P24_REPORTS_SECRET_ID") ??
    envNonEmpty("SANDBOX_P24_API_KEY") ??
    envNonEmpty("SANDBOX_P24_TRANSACTION_SECRET_ID") ??
    envNonEmpty("SANDBOX_P24_SECRET_ID");
  const sandboxId = envNonEmpty("SANDBOX_P24_MERCHANT_ID") ?? envNonEmpty("SANDBOX_P24_POS_ID");
  const prodMerchant = envNonEmpty("P24_MERCHANT_ID");
  if (sandboxSecret && sandboxId && !prodMerchant) return true;
  return false;
}

function p24CheckoutEnvMissing() {
  const sandbox = p24SandboxMode();
  const has = (...keys) => keys.some((k) => String(process.env[k] ?? "").trim());
  const miss = [];
  if (sandbox) {
    if (!has("SANDBOX_P24_MERCHANT_ID", "P24_MERCHANT_ID")) {
      miss.push("SANDBOX_P24_MERCHANT_ID|P24_MERCHANT_ID");
    }
    if (
      !has(
        "SANDBOX_P24_REPORTS_SECRET_ID",
        "SANDBOX_P24_API_KEY",
        "SANDBOX_P24_TRANSACTION_SECRET_ID",
        "SANDBOX_P24_SECRET_ID",
        "P24_REPORTS_SECRET_ID",
        "P24_API_KEY",
        "P24_TRANSACTION_SECRET_ID",
        "P24_SECRET_ID"
      )
    ) {
      miss.push("SANDBOX_P24_REPORTS_SECRET_ID|… (klucz do raportów = Basic Auth REST)");
    }
    if (!has("SANDBOX_P24_CRC_KEY", "P24_CRC_KEY")) {
      miss.push("SANDBOX_P24_CRC_KEY|P24_CRC_KEY");
    }
    if (!has("SANDBOX_P24_POS_ID", "P24_POS_ID", "SANDBOX_P24_MERCHANT_ID", "P24_MERCHANT_ID")) {
      miss.push("SANDBOX_P24_POS_ID|P24_POS_ID (opcjonalnie, domyślnie = merchant)");
    }
  } else {
    for (const k of optionalP24) {
      if (!has(k)) miss.push(k);
    }
    if (!has("P24_REPORTS_SECRET_ID", "P24_API_KEY", "P24_TRANSACTION_SECRET_ID", "P24_SECRET_ID")) {
      miss.push("P24_REPORTS_SECRET_ID|P24_SECRET_ID (klucz API do Basic Auth)");
    }
    if (!has("P24_POS_ID", "P24_MERCHANT_ID")) {
      miss.push("P24_POS_ID (opcjonalnie, domyślnie = P24_MERCHANT_ID)");
    }
  }
  return miss;
}

function loadEnvFile(name) {
  const p = path.join(repoRoot, name);
  if (!fs.existsSync(p)) return;
  const raw = fs.readFileSync(p, "utf8");
  for (const line of raw.split("\n")) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!m) continue;
    const key = m[1];
    let val = m[2].trim();
    const fullyQuoted =
      (val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"));
    if (!fullyQuoted) {
      val = val.replace(/\s+#.*$/, "").trim();
    }
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

const bypass = process.env.CHECKOUT_BYPASS_PAYMENT?.trim().toLowerCase() === "true";

function publicAppUrlForCheck() {
  const explicit = String(process.env.NEXT_PUBLIC_APP_URL || "").trim().replace(/\/$/, "");
  if (explicit) return explicit;
  const prodHost = String(process.env.VERCEL_PROJECT_PRODUCTION_URL || "")
    .trim()
    .replace(/\/$/, "");
  if (prodHost && process.env.VERCEL_ENV === "production") return `https://${prodHost}`;
  const vercel = String(process.env.VERCEL_URL || "")
    .trim()
    .replace(/\/$/, "");
  if (vercel) return `https://${vercel}`;
  return "";
}

const publicUrl = publicAppUrlForCheck();

if (!bypass && !publicUrl) {
  console.error(
    "[check-env] Przy CHECKOUT_BYPASS_PAYMENT=false ustaw NEXT_PUBLIC_APP_URL albo uruchom na Vercel (VERCEL_URL / VERCEL_PROJECT_PRODUCTION_URL na production)."
  );
  failed = true;
}

const optional = [
  ...optionalAlways,
  ...(bypass ? [] : p24SandboxMode() ? [] : optionalP24),
];
const missingOptional = optional.filter((k) => !process.env[k] || String(process.env[k]).trim() === "");
if (missingOptional.length) {
  console.warn("[check-env] Opcjonalnie (dla pełnej funkcjonalności) uzupełnij:", missingOptional.join(", "));
}
if (!bypass) {
  const p24Miss = p24CheckoutEnvMissing();
  if (p24Miss.length) {
    console.warn("[check-env] Przy CHECKOUT_BYPASS_PAYMENT=false brakuje konfiguracji Przelewy24:", p24Miss.join(", "));
    console.warn(
      "[check-env] Sandbox: P24_SANDBOX=true + SANDBOX_P24_MERCHANT_ID, SANDBOX_P24_REPORTS_SECRET_ID (klucz do raportów = Basic Auth), SANDBOX_P24_CRC_KEY; opcjonalnie SANDBOX_P24_POS_ID."
    );
  }
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
