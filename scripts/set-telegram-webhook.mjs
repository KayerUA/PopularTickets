#!/usr/bin/env node
/**
 * Регистрация webhook Telegram Bot API для PopularTickets.
 *
 * Env (из корня или apps/tickets/.env.local):
 *   TELEGRAM_BOT_TOKEN
 *   TELEGRAM_WEBHOOK_SECRET
 *   NEXT_PUBLIC_APP_URL — канонический URL деплоя (https://www.populartickets.pl)
 *
 * Usage:
 *   node scripts/set-telegram-webhook.mjs
 *   node scripts/set-telegram-webhook.mjs delete
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

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
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = val;
  }
}

loadEnvFile(resolve(root, ".env"));
loadEnvFile(resolve(root, ".env.local"));
loadEnvFile(resolve(root, "apps/tickets/.env.local"));

const token = (process.env.TELEGRAM_BOT_TOKEN ?? "").trim();
const secret = (process.env.TELEGRAM_WEBHOOK_SECRET ?? "").trim();
const base = (process.env.NEXT_PUBLIC_APP_URL ?? "").trim().replace(/\/$/, "");

if (!token || !secret || !base) {
  console.error("Need TELEGRAM_BOT_TOKEN, TELEGRAM_WEBHOOK_SECRET, NEXT_PUBLIC_APP_URL");
  process.exit(1);
}

const webhookUrl = `${base}/api/telegram/webhook/${encodeURIComponent(secret)}`;
const deleteMode = process.argv[2] === "delete";

const apiMethod = deleteMode ? "deleteWebhook" : "setWebhook";
const body = deleteMode
  ? {}
  : {
      url: webhookUrl,
      allowed_updates: ["message", "callback_query"],
      drop_pending_updates: true,
    };

const res = await fetch(`https://api.telegram.org/bot${token}/${apiMethod}`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

const json = await res.json();
console.log(JSON.stringify(json, null, 2));
if (!json.ok) process.exit(1);
if (!deleteMode) console.log("Webhook URL:", webhookUrl);
