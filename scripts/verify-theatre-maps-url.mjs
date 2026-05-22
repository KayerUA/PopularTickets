#!/usr/bin/env node
/**
 * Проверка maps_url для trial / Domaniewska и опциональный backfill.
 * Использование:
 *   node scripts/verify-theatre-maps-url.mjs          # только отчёт
 *   node scripts/verify-theatre-maps-url.mjs --apply   # UPDATE как в supabase/update-theatre-maps-url-2026-05.sql
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const CANONICAL = "https://maps.app.goo.gl/BtaKyKYvp6nGZbx37";
const LEGACY_FRAGMENT = "jz9E6JUn8rcymRoH7";

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

const apply = process.argv.includes("--apply");
const supabase = createClient(url, key, { auth: { persistSession: false } });

const { data: events, error } = await supabase
  .from("events")
  .select("id, slug, listing_kind, venue")
  .order("starts_at", { ascending: false });

if (error) {
  console.error("Query failed:", error.message);
  process.exit(1);
}

const rows = [];
for (const e of events ?? []) {
  const { data: mapsUrl, error: mapsErr } = await supabase.rpc("pt_event_maps_url", {
    p_event_id: e.id,
  });
  if (mapsErr) {
    console.warn(`maps_url RPC for ${e.slug}:`, mapsErr.message);
  }
  rows.push({ ...e, maps_url: typeof mapsUrl === "string" ? mapsUrl : "" });
}
const needsUpdate = rows.filter((e) => {
  const maps = (e.maps_url ?? "").trim();
  const venue = (e.venue ?? "").toLowerCase();
  const isTrial = e.listing_kind === "trial";
  const isDomaniewska = venue.includes("domaniewska") && venue.includes("37");
  const isLegacy = maps.includes(LEGACY_FRAGMENT);
  const isEmpty = !maps;
  if (isTrial || isDomaniewska || isLegacy) {
    return maps !== CANONICAL;
  }
  return false;
});

console.log(`Events total: ${rows.length}`);
console.log(`Need canonical maps URL (${CANONICAL}): ${needsUpdate.length}`);

if (needsUpdate.length) {
  console.log("\nSample rows to fix:");
  for (const e of needsUpdate.slice(0, 12)) {
    console.log(`  - ${e.slug} | ${e.listing_kind} | maps=${e.maps_url ?? "(null)"}`);
  }
  if (needsUpdate.length > 12) console.log(`  … and ${needsUpdate.length - 12} more`);
}

if (!apply) {
  if (needsUpdate.length) {
    console.log("\nRun with --apply to execute backfill (or SQL in supabase/update-theatre-maps-url-2026-05.sql).");
    process.exit(1);
  }
  console.log("OK — all theatre/trial maps URLs are canonical.");
  process.exit(0);
}

let fixed = 0;
for (const e of needsUpdate) {
  const { error: rpcErr } = await supabase.rpc("pt_event_set_maps_url", {
    p_event_id: e.id,
    p_maps_url: CANONICAL,
  });
  if (rpcErr) {
    console.error(`Failed ${e.slug}:`, rpcErr.message);
    continue;
  }
  fixed += 1;
}

console.log(`Applied backfill to ${fixed}/${needsUpdate.length} events.`);
