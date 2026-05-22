#!/usr/bin/env node
/**
 * Отчёт по Supabase Storage (event-images) и размеру БД — для контроля Free tier.
 * Запуск: node scripts/supabase-usage-report.mjs
 * Опционально: --cleanup-orphans  удаляет файлы в бакете, не привязанные к events.image_url
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const BUCKET = "event-images";
const FREE_STORAGE_BYTES = 1 * 1024 * 1024 * 1024;
const FREE_EGRESS_HINT_GB = 5;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

function loadEnvFile(name) {
  const p = path.join(root, name);
  if (!fs.existsSync(p)) return;
  for (const line of fs.readFileSync(p, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!m) continue;
    let val = m[2].trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!(m[1] in process.env) || process.env[m[1]] === "") process.env[m[1]] = val;
  }
}

loadEnvFile(".env.local");
loadEnvFile(".env");

const url =
  process.env.NEXT_PUBLIC_SUPABASE_URL?.trim().replace(/\/+$/, "") ||
  process.env.SUPABASE_URL?.trim().replace(/\/+$/, "");
const key =
  process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
  process.env.SUPABASE_SECRET_KEY?.trim();

if (!url || !key) {
  console.error("Need SUPABASE URL + service role key in .env");
  process.exit(1);
}

const cleanup = process.argv.includes("--cleanup-orphans");
const supabase = createClient(url, key, { auth: { persistSession: false } });

async function listAllFiles(prefix = "") {
  const out = [];
  let offset = 0;
  const limit = 100;
  for (;;) {
    const { data, error } = await supabase.storage.from(BUCKET).list(prefix, {
      limit,
      offset,
      sortBy: { column: "name", order: "asc" },
    });
    if (error) throw new Error(error.message);
    if (!data?.length) break;
    for (const item of data) {
      const full = prefix ? `${prefix}/${item.name}` : item.name;
      if (item.id == null && item.metadata == null) {
        out.push(...(await listAllFiles(full)));
      } else {
        out.push({ path: full, size: item.metadata?.size ?? 0 });
      }
    }
    if (data.length < limit) break;
    offset += limit;
  }
  return out;
}

const { data: events, error: evErr } = await supabase.from("events").select("slug, image_url");
if (evErr) {
  console.error("events query:", evErr.message);
  process.exit(1);
}

const referenced = new Set();
for (const e of events ?? []) {
  const u = e.image_url?.trim();
  if (!u) continue;
  const marker = `/storage/v1/object/public/${BUCKET}/`;
  const idx = u.indexOf(marker);
  if (idx >= 0) referenced.add(u.slice(idx + marker.length));
}

let files;
try {
  files = await listAllFiles();
} catch (e) {
  console.error("Storage list failed:", e.message);
  process.exit(1);
}

const totalBytes = files.reduce((s, f) => s + (f.size || 0), 0);
const orphans = files.filter((f) => !referenced.has(f.path));

console.log("=== Supabase usage report (PopularTickets) ===\n");
console.log(`Storage bucket: ${BUCKET}`);
console.log(`Files: ${files.length}`);
console.log(`Total size: ${(totalBytes / 1024 / 1024).toFixed(2)} MB (${((totalBytes / FREE_STORAGE_BYTES) * 100).toFixed(2)}% of Free 1 GB)`);
console.log(`Referenced in events.image_url: ${referenced.size}`);
console.log(`Orphan files (not in DB): ${orphans.length} (${(orphans.reduce((s, f) => s + f.size, 0) / 1024 / 1024).toFixed(2)} MB)`);
console.log(`\nFree tier reminders:`);
console.log(`  - File storage limit: 1 GB (3–6 uploads/mo ≈ +0.5–2 MB/mo after WebP)`);
console.log(`  - Egress limit: ${FREE_EGRESS_HINT_GB} GB/mo (check Supabase Dashboard → Usage)`);
console.log(`  - Project pause: 7 days without activity on Free plan`);
console.log(`\nEvents in DB: ${events?.length ?? 0}`);

if (orphans.length) {
  console.log("\nOrphan samples:");
  for (const f of orphans.slice(0, 8)) {
    console.log(`  - ${f.path} (${((f.size || 0) / 1024).toFixed(1)} KB)`);
  }
}

if (cleanup && orphans.length) {
  console.log(`\nDeleting ${orphans.length} orphan file(s)…`);
  const paths = orphans.map((f) => f.path);
  const { error: delErr } = await supabase.storage.from(BUCKET).remove(paths);
  if (delErr) {
    console.error("Delete failed:", delErr.message);
    process.exit(1);
  }
  console.log("Done.");
}
