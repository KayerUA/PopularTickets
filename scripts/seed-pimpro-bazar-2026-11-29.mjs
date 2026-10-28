import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { DateTime } from "luxon";

for (const relative of ["../apps/tickets/.env.local", "../.env.local", "../.env"]) {
  const file = fileURLToPath(new URL(relative, import.meta.url));
  if (!fs.existsSync(file)) continue;
  for (const line of fs.readFileSync(file, "utf8").split("\n")) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2].replace(/^["']|["']$/g, "");
  }
}

const apply = process.argv.includes("--apply");
const publish = process.argv.includes("--publish");
if (publish && !apply) throw new Error("Use --apply with --publish.");

const start = DateTime.fromISO("2026-11-29T19:00:00", { zone: "Europe/Warsaw" });
const venue = "Bazar Klub, ul. Okrzei 26 (wejście od Jagiellońskiej), Warszawa";
const row = {
  slug: "pimpro-bazar-club-2026-11-29",
  title: "P!MPRO: импровизация на русском в Bazar Club",
  title_uk: "P!MPRO: імпровізація російською в Bazar Club",
  title_pl: "P!MPRO: improwizacja po rosyjsku w Bazar Club",
  description: "Комедийная импровизация P!MPRO в Bazar Club.\n\n29 ноября 2026, воскресенье.\n19:00–22:00: импровизация на русском.\n\nBazar Klub, ul. Okrzei 26, Warszawa. Вход со стороны Jagiellońskiej.\nБилет: 30 zł.",
  description_uk: "Комедійна імпровізація P!MPRO в Bazar Club.\n\n29 листопада 2026, неділя.\n19:00–22:00: імпровізація російською.\n\nBazar Klub, ul. Okrzei 26, Warszawa. Вхід з боку Jagiellońskiej.\nКвиток: 30 zł.",
  description_pl: "Komediowa improwizacja P!MPRO w Bazar Club.\n\n29 listopada 2026, niedziela.\n19:00–22:00: improwizacja po rosyjsku.\n\nBazar Klub, ul. Okrzei 26, Warszawa. Wejście od Jagiellońskiej.\nBilet: 30 zł.",
  starts_at: start.toUTC().toISO(),
  ends_at: start.plus({ minutes: 180 }).toUTC().toISO(),
  price_grosze: 3000,
  day_of_event_price_grosze: null,
  total_tickets: 80,
  venue,
  maps_url: "https://www.google.com/maps/search/?api=1&query=Bazar+Klub+Okrzei+26+Warszawa",
  image_url: "https://www.populartickets.pl/brand/pimpro/wordmark-on-bone.png",
  image_focal_x: 50,
  image_focal_y: 50,
  event_language: "ru",
  listing_kind: "performance",
  visibility: publish ? "published" : "unlisted",
  poet_course_id: null,
  show_id: null,
  discount_periods: [],
};

console.log(JSON.stringify({ mode: apply ? "apply" : "preview", ...row }, null, 2));
if (!apply) process.exit(0);

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } });
const { data: existing, error: readError } = await db.from("events").select("id,slug,starts_at,ends_at,price_grosze,total_tickets,venue,visibility").eq("slug", row.slug).maybeSingle();
if (readError) throw readError;
if (existing) {
  if (existing.visibility === "unlisted") {
    const { count, error: countError } = await db.from("orders").select("id", { head: true, count: "exact" }).eq("event_id", existing.id);
    if (countError) throw countError;
    if (count) throw new Error("Draft already has orders; refusing to replace its settings.");
    const { error } = await db.from("events").update(row).eq("id", existing.id);
    if (error) throw error;
    console.log(JSON.stringify({ id: existing.id, created: false, updated: true, visibility: row.visibility }));
    process.exit(0);
  }
  for (const key of ["price_grosze", "total_tickets", "venue"]) {
    if (existing[key] !== row[key]) throw new Error(`Existing event has a different ${key}; refusing to overwrite.`);
  }
  if (Date.parse(existing.starts_at) !== Date.parse(row.starts_at) || Date.parse(existing.ends_at) !== Date.parse(row.ends_at)) throw new Error("Existing event has different times; refusing to overwrite.");
  if (publish && existing.visibility !== "published") {
    const { error } = await db.from("events").update({ visibility: "published" }).eq("id", existing.id);
    if (error) throw error;
  }
  console.log(JSON.stringify({ id: existing.id, created: false, visibility: publish ? "published" : existing.visibility }));
} else {
  const { data, error } = await db.from("events").insert(row).select("id,slug,visibility").single();
  if (error) throw error;
  console.log(JSON.stringify({ ...data, created: true }));
}
