#!/usr/bin/env node
/**
 * GET /api/v1/testAccess — ten sam Basic Auth co w `apps/tickets/lib/p24.ts` (POS + klucz do raportów).
 * Ładuje `.env.local` i `.env` z roota repo (jak `check-env.mjs`), nie nadpisuje już ustawionych zmiennych.
 *
 * Użycie (z roota monorepo):
 *   node scripts/p24-test-access.mjs
 *   npm run p24:test
 *
 * Opcje:
 *   --login=pos|merchant   wymusza login Basic (domyślnie pos = jak w aplikacji)
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, "..");

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

function stripEnvQuotes(raw) {
  const t = raw.trim();
  if (t.length >= 2) {
    if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) {
      return t.slice(1, -1).trim();
    }
  }
  return t;
}

function stripTrailingUnquotedHashComment(raw) {
  const t = raw.trim();
  const quoted = (t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"));
  if (quoted) return t;
  return t.replace(/\s+#.*$/, "").trim();
}

function firstEnvTrimmed(...keys) {
  for (const key of keys) {
    const raw = process.env[key];
    if (!raw) continue;
    const v = stripEnvQuotes(stripTrailingUnquotedHashComment(raw));
    if (v) return v;
  }
  return undefined;
}

/** @returns {{ key: string, value: string } | undefined} */
function firstEnvWithMeta(...keys) {
  for (const key of keys) {
    const raw = process.env[key];
    if (!raw) continue;
    const v = stripEnvQuotes(stripTrailingUnquotedHashComment(raw));
    if (v) return { key, value: v };
  }
  return undefined;
}

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

function resolveP24MerchantIdRaw() {
  if (p24SandboxMode()) {
    return firstEnvTrimmed("SANDBOX_P24_MERCHANT_ID", "P24_MERCHANT_ID");
  }
  return firstEnvTrimmed("P24_MERCHANT_ID");
}

function resolveP24PosIdRaw() {
  if (p24SandboxMode()) {
    return firstEnvTrimmed(
      "SANDBOX_P24_POS_ID",
      "P24_POS_ID",
      "SANDBOX_P24_MERCHANT_ID",
      "P24_MERCHANT_ID"
    );
  }
  return firstEnvTrimmed("P24_POS_ID", "P24_MERCHANT_ID");
}

function resolveReportsSecretMeta() {
  if (p24SandboxMode()) {
    return firstEnvWithMeta(
      "SANDBOX_P24_REPORTS_SECRET_ID",
      "SANDBOX_P24_API_KEY",
      "SANDBOX_P24_TRANSACTION_SECRET_ID",
      "SANDBOX_P24_SECRET_ID",
      "P24_REPORTS_SECRET_ID",
      "P24_API_KEY",
      "P24_TRANSACTION_SECRET_ID",
      "P24_SECRET_ID"
    );
  }
  return firstEnvWithMeta(
    "P24_REPORTS_SECRET_ID",
    "P24_API_KEY",
    "P24_TRANSACTION_SECRET_ID",
    "P24_SECRET_ID"
  );
}

function basicHeader(login, secret) {
  const token = Buffer.from(`${login}:${secret}`, "utf8").toString("base64");
  return `Basic ${token}`;
}

function parseArgs() {
  const loginArg = process.argv.find((a) => a.startsWith("--login="));
  const mode = loginArg?.split("=")[1]?.toLowerCase();
  if (mode === "merchant") return "merchant";
  return "pos";
}

async function tryTestAccess(label, authorization, url) {
  const res = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
      Authorization: authorization,
    },
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { _raw: text.slice(0, 500) };
  }
  return { label, res, json };
}

async function main() {
  const forcedLogin = parseArgs();
  const sandbox = p24SandboxMode();
  const host = sandbox ? "https://sandbox.przelewy24.pl" : "https://secure.przelewy24.pl";
  const url = `${host}/api/v1/testAccess`;

  const posId = resolveP24PosIdRaw();
  const merchantId = resolveP24MerchantIdRaw();
  const secretMeta = resolveReportsSecretMeta();

  console.log("[p24-test-access] P24_SANDBOX =", sandbox, "| host =", host);
  console.log("[p24-test-access] resolve POS (Basic login w aplikacji):", posId ?? "(brak)");
  console.log("[p24-test-access] resolve MERCHANT (JSON):", merchantId ?? "(brak)");
  if (secretMeta) {
    console.log(
      "[p24-test-access] klucz Basic z env:",
      secretMeta.key,
      "| długość wartości:",
      secretMeta.value.length,
      "(treści nie logujemy)"
    );
  } else {
    console.error("[p24-test-access] Brak klucza do raportów w env (SANDBOX_P24_REPORTS_SECRET_ID / …).");
    process.exit(2);
  }

  if (!posId) {
    console.error("[p24-test-access] Brak POS / MERCHANT do loginu Basic.");
    process.exit(2);
  }

  const crc = p24SandboxMode()
    ? firstEnvTrimmed("SANDBOX_P24_CRC_KEY", "P24_CRC_KEY")
    : firstEnvTrimmed("P24_CRC_KEY");
  console.log("[p24-test-access] CRC w env:", crc ? `ustawione (${crc.length} znaków)` : "brak (testAccess go nie wymaga)");

  let login = posId;
  if (forcedLogin === "merchant") {
    if (!merchantId) {
      console.error("[p24-test-access] --login=merchant ale brak MERCHANT_ID w env.");
      process.exit(2);
    }
    login = merchantId;
    console.log("[p24-test-access] wymuszony login Basic = MERCHANT_ID");
  } else {
    console.log("[p24-test-access] login Basic = POS (jak apps/tickets/lib/p24.ts)");
  }

  const auth = basicHeader(login, secretMeta.value);
  const first = await tryTestAccess("primary", auth, url);
  console.log("[p24-test-access]", first.label, "HTTP", first.res.status);
  console.log(JSON.stringify(first.json, null, 2));

  /** @type {Awaited<ReturnType<typeof tryTestAccess>> | null} */
  let second = null;
  if (
    first.res.status === 401 &&
    merchantId &&
    posId !== merchantId &&
    forcedLogin !== "merchant"
  ) {
    console.log("[p24-test-access] 401 — próba diagnostyczna z loginem MERCHANT_ID (≠ POS)…");
    second = await tryTestAccess("merchant-login", basicHeader(merchantId, secretMeta.value), url);
    console.log("[p24-test-access]", second.label, "HTTP", second.res.status);
    console.log(JSON.stringify(second.json, null, 2));
  }

  const ok = (res, json) => {
    if (!res.ok || !json || typeof json !== "object") return false;
    if (json.responseCode === 0) return true;
    // GET testAccess zwraca czasem tylko { data: true, error: "" } bez responseCode
    return json.data === true && String(json.error ?? "") === "";
  };

  if (ok(first.res, first.json) || (second && ok(second.res, second.json))) {
    console.log("[p24-test-access] OK — uwierzytelnianie REST działa z tymi zmiennymi.");
    process.exit(0);
  }

  if (first.res.status === 401 || second?.res.status === 401) {
    console.error(
      "[p24-test-access] 401 — panel P24: inny klucz (raportów vs zamówień), zły POS, albo prod/sandbox. Porównaj zmienną z logu „klucz Basic z env” z Vercel."
    );
  } else {
    console.error("[p24-test-access] Odpowiedź niepoprawna (responseCode !== 0).");
  }
  process.exit(1);
}

main().catch((e) => {
  console.error("[p24-test-access]", e);
  process.exit(1);
});
