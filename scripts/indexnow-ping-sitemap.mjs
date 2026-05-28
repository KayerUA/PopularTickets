#!/usr/bin/env node
/**
 * Пинг IndexNow для всех URL из sitemap.xml.
 * Env: INDEXNOW_KEY, INDEXNOW_HOST (default www.populartickets.pl), SITEMAP_URL.
 * Флаг --all: пинг обоих доменов (populartickets.pl + popularpoet.pl).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

const DEFAULT_HOSTS = ["www.populartickets.pl", "www.popularpoet.pl"];

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
    const hash = val.indexOf(" #");
    if (hash >= 0) val = val.slice(0, hash).trim();
    if (!(key in process.env)) process.env[key] = val;
  }
}

loadEnvFile(".env");

const key = process.env.INDEXNOW_KEY?.trim();
const pingAll = process.argv.includes("--all");

if (!key) {
  console.error("INDEXNOW_KEY не задан (.env или env)");
  process.exit(1);
}

const hosts = pingAll
  ? DEFAULT_HOSTS
  : [process.env.INDEXNOW_HOST?.trim() || DEFAULT_HOSTS[0]];

async function pingHost(host) {
  const sitemapUrl = process.env.SITEMAP_URL?.trim() || `https://${host}/sitemap.xml`;

  const xml = await fetch(sitemapUrl).then((r) => {
    if (!r.ok) throw new Error(`sitemap ${host} ${r.status}`);
    return r.text();
  });
  const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim());
  if (!urls.length) {
    throw new Error(`URL в sitemap не найдены: ${host}`);
  }

  console.log(`\n=== ${host} ===`);
  console.log(`Sitemap: ${sitemapUrl}`);
  console.log(`URLs: ${urls.length}`);
  console.log(`Key file: https://${host}/${key}.txt`);

  const keyCheck = await fetch(`https://${host}/${key}.txt`);
  console.log(`Key file HTTP: ${keyCheck.status}`);
  if (!keyCheck.ok) {
    throw new Error(`Key file недоступен на ${host} — проверь деплой и INDEXNOW_KEY в Vercel`);
  }

  const body = {
    host,
    key,
    keyLocation: `https://${host}/${key}.txt`,
    urlList: urls,
  };

  const res = await fetch("https://api.indexnow.org/indexnow", {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify(body),
  });

  console.log(`IndexNow HTTP: ${res.status} ${res.statusText}`);
  const text = await res.text();
  if (text) console.log(text.slice(0, 500));

  if (!res.ok && res.status !== 202) {
    throw new Error(`IndexNow вернул ошибку для ${host}`);
  }

  console.log(`OK — URL отправлены в IndexNow (${host})`);
}

let failed = false;
for (const host of hosts) {
  try {
    await pingHost(host);
  } catch (err) {
    failed = true;
    console.error(err instanceof Error ? err.message : err);
  }
}

process.exit(failed ? 1 : 0);
