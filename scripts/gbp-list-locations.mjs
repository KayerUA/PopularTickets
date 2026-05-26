#!/usr/bin/env node
/**
 * Список accountId / locationId для Google Business Profile API.
 * Требует GOOGLE_GBP_CLIENT_ID, GOOGLE_GBP_CLIENT_SECRET, GOOGLE_GBP_REFRESH_TOKEN в env.
 *
 * Запуск: node scripts/gbp-list-locations.mjs
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

function loadEnvFile(name) {
  const file = path.join(root, name);
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq <= 0) continue;
    const key = t.slice(0, eq).trim();
    let val = t.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

loadEnvFile(".env.local");
loadEnvFile(".env");

const clientId = process.env.GOOGLE_GBP_CLIENT_ID?.trim();
const clientSecret = process.env.GOOGLE_GBP_CLIENT_SECRET?.trim();
const refreshToken = process.env.GOOGLE_GBP_REFRESH_TOKEN?.trim();

if (!clientId || !clientSecret || !refreshToken) {
  console.error("Нужны GOOGLE_GBP_CLIENT_ID, GOOGLE_GBP_CLIENT_SECRET, GOOGLE_GBP_REFRESH_TOKEN");
  process.exit(1);
}

async function accessToken() {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  const json = await res.json();
  if (!res.ok || !json.access_token) {
    console.error("OAuth failed:", json);
    process.exit(1);
  }
  return json.access_token;
}

async function gbpGet(token, url) {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  const json = await res.json();
  if (!res.ok) {
    console.error("API error:", res.status, json);
    process.exit(1);
  }
  return json;
}

const token = await accessToken();
const accounts = await gbpGet(token, "https://mybusinessaccountmanagement.googleapis.com/v1/accounts");

console.log("\n=== Accounts ===\n");
for (const acc of accounts.accounts ?? []) {
  const accountName = acc.name;
  const accountId = accountName?.replace("accounts/", "") ?? "?";
  console.log(`accountId: ${accountId}`);
  console.log(`  name: ${acc.accountName ?? acc.organizationInfo?.registeredDomain ?? "—"}`);

  const locs = await gbpGet(
    token,
    `https://mybusinessbusinessinformation.googleapis.com/v1/${accountName}/locations?readMask=name,title,storefrontAddress`,
  );
  for (const loc of locs.locations ?? []) {
    const locationId = loc.name?.split("/").pop() ?? "?";
    const addr = loc.storefrontAddress;
    const line = [addr?.locality, addr?.addressLines?.[0]].filter(Boolean).join(", ");
    console.log(`  locationId: ${locationId}`);
    console.log(`    title: ${loc.title ?? "—"}`);
    console.log(`    address: ${line || "—"}`);
  }
  console.log("");
}

console.log("Скопируйте в Vercel:");
console.log("  GOOGLE_GBP_ACCOUNT_ID=...");
console.log("  GOOGLE_GBP_LOCATION_ID=...");
