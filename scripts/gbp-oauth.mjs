#!/usr/bin/env node
/**
 * Одноразово получить GOOGLE_GBP_REFRESH_TOKEN (Desktop OAuth).
 *
 * 1. Google Cloud → OAuth client ID → Desktop app → client_id + client_secret
 * 2. OAuth consent screen → scope business.manage
 * 3. Запуск:
 *      GOOGLE_GBP_CLIENT_ID=... GOOGLE_GBP_CLIENT_SECRET=... node scripts/gbp-oauth.mjs
 *    или положить в .env.local и: node scripts/gbp-oauth.mjs
 *
 * 4. В браузере войти аккаунтом-владельцем GBP Popular Poet → Allow
 * 5. Скопировать refresh_token в Vercel + .env.local
 * 6. node scripts/gbp-list-locations.mjs → accountId / locationId
 */

import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const REDIRECT_PORT = 8080;
const REDIRECT_PATH = "/oauth2callback";
const REDIRECT_URI = `http://localhost:${REDIRECT_PORT}${REDIRECT_PATH}`;
const SCOPE = "https://www.googleapis.com/auth/business.manage";

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

if (!clientId || !clientSecret) {
  console.error(`
Нужны GOOGLE_GBP_CLIENT_ID и GOOGLE_GBP_CLIENT_SECRET.

Google Cloud Console:
  1. APIs & Services → Enable: My Business Account Management + Business Information
  2. OAuth consent screen → External → добавить scope business.manage
  3. Credentials → Create OAuth client ID → Desktop app
  4. Скопировать Client ID и Client Secret сюда (.env.local или env)
`);
  process.exit(1);
}

const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
authUrl.searchParams.set("client_id", clientId);
authUrl.searchParams.set("redirect_uri", REDIRECT_URI);
authUrl.searchParams.set("response_type", "code");
authUrl.searchParams.set("scope", SCOPE);
authUrl.searchParams.set("access_type", "offline");
authUrl.searchParams.set("prompt", "consent");

function openBrowser(url) {
  try {
    const command = process.platform === "darwin" ? "open" : process.platform === "win32" ? "cmd" : "xdg-open";
    const args = process.platform === "win32" ? ["/c", "start", "", url] : [url];
    return spawnSync(command, args, { stdio: "ignore" }).status === 0;
  } catch {
    return false;
  }
}

async function exchangeCode(code) {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: REDIRECT_URI,
      grant_type: "authorization_code",
    }),
  });
  return res.json();
}

console.log("\n=== Google Business Profile OAuth ===\n");
console.log("Redirect URI (должен быть разрешён для Desktop client):");
console.log(`  ${REDIRECT_URI}\n`);

const opened = openBrowser(authUrl.toString());
if (opened) {
  console.log("Открываю браузер для входа…\n");
} else {
  console.log("Откройте в браузере:\n");
  console.log(authUrl.toString());
  console.log("");
}

await new Promise((resolve, reject) => {
  const server = http.createServer(async (req, res) => {
    if (!req.url?.startsWith(REDIRECT_PATH)) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }

    const url = new URL(req.url, REDIRECT_URI);
    const err = url.searchParams.get("error");
    const code = url.searchParams.get("code");

    if (err) {
      res.writeHead(400, { "Content-Type": "text/html; charset=utf-8" });
      res.end(`<h1>OAuth error</h1><p>${err}</p>`);
      server.close();
      reject(new Error(err));
      return;
    }

    if (!code) {
      res.writeHead(400, { "Content-Type": "text/html; charset=utf-8" });
      res.end("<h1>Нет code</h1>");
      return;
    }

    try {
      const json = await exchangeCode(code);
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end("<h1>OK</h1><p>Можно закрыть вкладку и вернуться в терминал.</p>");

      console.log("\n=== Токены ===\n");
      if (json.refresh_token) {
        console.log("GOOGLE_GBP_REFRESH_TOKEN=");
        console.log(json.refresh_token);
        console.log("");
      } else {
        console.warn("⚠️ refresh_token не пришёл. Удалите доступ приложения в Google Account → Security → Third-party access, затем запустите скрипт снова с prompt=consent.");
      }
      if (json.access_token) {
        console.log("(access_token на ~1 ч, для Vercel не нужен)\n");
      }
      if (json.error) {
        console.error("OAuth error:", json);
      } else {
        console.log("Дальше:");
        console.log("  1. Сохраните refresh_token в .env.local и Vercel (проект tickets)");
        console.log("  2. node scripts/gbp-list-locations.mjs");
        console.log("  3. GOOGLE_GBP_ACCOUNT_ID + GOOGLE_GBP_LOCATION_ID → Vercel\n");
      }

      server.close();
      resolve(undefined);
    } catch (e) {
      server.close();
      reject(e);
    }
  });

  server.listen(REDIRECT_PORT, "127.0.0.1", () => {
    console.log(`Жду callback на ${REDIRECT_URI} …\n`);
  });

  server.on("error", (e) => {
    if (e.code === "EADDRINUSE") {
      reject(new Error(`Порт ${REDIRECT_PORT} занят. Закройте другой процесс или измените REDIRECT_PORT в скрипте.`));
    } else {
      reject(e);
    }
  });
});
