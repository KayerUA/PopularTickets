#!/usr/bin/env node
/**
 * Локальный тест Telegram-бота без ngrok: long polling → POST на localhost webhook.
 *
 * 1) npm run dev (popular-tickets на :3000)
 * 2) node scripts/telegram-poll-local.mjs
 *
 * Снимает webhook на время polling (в конце можно восстановить set-telegram-webhook.mjs).
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
    if (!(key in process.env) || process.env[key] === "") process.env[key] = val;
  }
}

loadEnvFile(resolve(root, ".env"));
loadEnvFile(resolve(root, ".env.local"));
loadEnvFile(resolve(root, "apps/tickets/.env.local"));

const token =
  (process.env.TELEGRAM_BOT_TOKEN ?? process.env.Telegram_bot_token ?? "").trim();
const secret = (process.env.TELEGRAM_WEBHOOK_SECRET ?? "").trim();
const base = (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").trim().replace(/\/$/, "");

if (!token || !secret) {
  console.error("Need TELEGRAM_BOT_TOKEN and TELEGRAM_WEBHOOK_SECRET in .env");
  process.exit(1);
}

const webhookLocal = `${base}/api/telegram/webhook/${encodeURIComponent(secret)}`;

async function tg(method, body = {}) {
  const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!json.ok) throw new Error(json.description ?? method);
  return json.result;
}

console.log("Removing webhook (required for getUpdates)…");
await tg("deleteWebhook", { drop_pending_updates: false });

console.log(`Polling → ${webhookLocal}`);
console.log("Send a message to your bot in Telegram. Ctrl+C to stop.\n");

try {
  console.log("Warming up webhook (compile Next.js route)…");
  const warm = await fetch(webhookLocal, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ update_id: -1 }),
  });
  console.log(`Warmup HTTP ${warm.status}\n`);
} catch (e) {
  console.warn("Warmup failed (is dev server running?):", e instanceof Error ? e.message : e);
}

let offset = 0;
let idleTicks = 0;
for (;;) {
  let updates;
  try {
    updates = await tg("getUpdates", { timeout: 30, offset, allowed_updates: ["message", "callback_query"] });
  } catch (e) {
    console.error("getUpdates error:", e instanceof Error ? e.message : e);
    await new Promise((r) => setTimeout(r, 3000));
    continue;
  }

  if (updates.length === 0) {
    idleTicks += 1;
    if (idleTicks % 10 === 0) console.log(`…polling (${idleTicks * 30}s idle, offset=${offset})`);
    continue;
  }
  idleTicks = 0;

  for (const u of updates) {
    offset = u.update_id + 1;
    const kind = u.callback_query ? "callback_query" : u.message ? "message" : "other";
    console.log(`Update ${u.update_id} (${kind}) → forwarding…`);
    try {
      const res = await fetch(webhookLocal, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(u),
        signal: AbortSignal.timeout(120_000),
      });
      const text = await res.text();
      console.log(`  HTTP ${res.status}: ${text.slice(0, 120)}`);
    } catch (e) {
      console.error(`  forward failed:`, e instanceof Error ? e.message : e);
    }
  }
}
