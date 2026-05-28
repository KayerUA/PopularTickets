#!/usr/bin/env node
/**
 * Пинг IndexNow для всех URL из sitemap.xml.
 * Env: INDEXNOW_KEY, INDEXNOW_HOST (default www.populartickets.pl), SITEMAP_URL.
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
    const hash = val.indexOf(" #");
    if (hash >= 0) val = val.slice(0, hash).trim();
    if (!(key in process.env)) process.env[key] = val;
  }
}

loadEnvFile(".env");

const key = process.env.INDEXNOW_KEY?.trim();
const host = process.env.INDEXNOW_HOST?.trim() || "www.populartickets.pl";
const sitemapUrl = process.env.SITEMAP_URL?.trim() || `https://${host}/sitemap.xml`;

if (!key) {
  console.error("INDEXNOW_KEY не задан (.env или env)");
  process.exit(1);
}

const xml = await fetch(sitemapUrl).then((r) => {
  if (!r.ok) throw new Error(`sitemap ${r.status}`);
  return r.text();
});
const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim());
if (!urls.length) {
  console.error("URL в sitemap не найдены");
  process.exit(1);
}

console.log(`Sitemap: ${sitemapUrl}`);
console.log(`URLs: ${urls.length}`);
console.log(`Key file: https://${host}/${key}.txt`);

const keyCheck = await fetch(`https://${host}/${key}.txt`);
console.log(`Key file HTTP: ${keyCheck.status}`);
if (!keyCheck.ok) {
  console.error("Key file недоступен на проде — проверь деплой и INDEXNOW_KEY в Vercel");
  process.exit(1);
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

if (res.ok || res.status === 202) {
  console.log("OK — URL отправлены в IndexNow (Bing/Yandex и др.)");
  process.exit(0);
}

console.error("IndexNow вернул ошибку");
process.exit(1);
