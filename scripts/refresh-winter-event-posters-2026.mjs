import fs from "node:fs";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

for (const relative of ["../apps/tickets/.env.local", "../.env.local", "../.env"]) {
  const file = fileURLToPath(new URL(relative, import.meta.url));
  if (!fs.existsSync(file)) continue;
  for (const line of fs.readFileSync(file, "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}
const apply = process.argv.includes("--apply");
const uploadOnly = process.argv.includes("--upload-only");
const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const db = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } });
const items = [
  { id: "c24083e5-d518-4c1e-b252-7bb9f2007d5b", slug: "pimpro-bazar-club-2026-12-20", file: "pimpro-bazar-2026-12-20-afisha.png", move: true },
  { id: "5cc50210-125f-4047-a89a-e4ebe07bc6be", slug: "improvizatsiya-strogogo-rezhima-2026-11-22", file: "improvizatsiya-strogogo-rezhima-2026-11-22-afisha.png" },
  { id: "5c118d10-d19a-44ff-820d-863377cb9714", slug: "osobo-lyubyashchiy-taksist-2026-12-11", file: "osobo-lyubyashchiy-taksist-2026-12-11-afisha.png" },
];
const results = [];
for (const item of items) {
  const bytes = fs.readFileSync(new URL(`../output/imagegen/${item.file}`, import.meta.url));
  const digest = createHash("sha256").update(bytes).digest("hex").slice(0, 12);
  const path = `${item.slug}-afisha-${digest}.png`;
  const { data: before, error: re } = await db.from("events").select("*").eq("id", item.id).single();
  if (re) throw re;
  const image_url = `${url.replace(/\/$/, "")}/storage/v1/object/public/event-images/${path}`;
  const changes = { image_url, image_focal_x: 50, image_focal_y: 50 };
  if (item.move) {
    if (!["pimpro-bazar-club-2026-11-29", item.slug].includes(before.slug)) throw new Error("Unexpected PIMPRO slug.");
    if (![Date.parse("2026-11-29T18:00:00Z"), Date.parse("2026-12-20T18:00:00Z")].includes(Date.parse(before.starts_at))) throw new Error("Unexpected PIMPRO date.");
    Object.assign(changes, {
      slug: item.slug, starts_at: "2026-12-20T18:00:00Z", ends_at: "2026-12-20T21:00:00Z",
      description: before.description.replaceAll("29 ноября 2026", "20 декабря 2026"),
      description_uk: before.description_uk?.replaceAll("29 листопада 2026", "20 грудня 2026"),
      description_pl: before.description_pl?.replaceAll("29 listopada 2026", "20 grudnia 2026"),
    });
  } else if (before.slug !== item.slug) throw new Error("Unexpected event slug.");
  if (apply || uploadOnly) {
    const { error } = await db.storage.from("event-images").upload(path, bytes, { contentType: "image/png", upsert: false, cacheControl: "31536000" });
    if (error && !/already exists|duplicate/i.test(error.message)) throw error;
  }
  if (apply) {
    const { data: after, error } = await db.from("events").update(changes).eq("id", item.id).eq("slug", before.slug).select("id,slug,starts_at,ends_at,price_grosze,total_tickets,venue,visibility,image_url,discount_periods").single();
    if (error) throw error;
    for (const field of ["price_grosze", "total_tickets", "venue", "visibility"]) if (after[field] !== before[field]) throw new Error(`Unexpected change: ${field}`);
    results.push(after);
  } else results.push({ id: item.id, ...changes });
}
console.log(JSON.stringify({ mode: apply ? "apply" : uploadOnly ? "upload-only" : "preview", events: results }, null, 2));
