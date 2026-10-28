import fs from "node:fs";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

for (const relative of ["../apps/tickets/.env.local", "../.env.local", "../.env"]) {
  const file = fileURLToPath(new URL(relative, import.meta.url));
  if (!fs.existsSync(file)) continue;
  for (const line of fs.readFileSync(file, "utf8").split("\n")) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2].replace(/^["']|["']$/g, "");
  }
}
const poster = fs.readFileSync(new URL("../output/imagegen/pimpro-bazar-2026-11-29-afisha.png", import.meta.url));
const digest = createHash("sha256").update(poster).digest("hex").slice(0, 12);
const slug = "pimpro-bazar-club-2026-11-29";
const imagePath = `${slug}-afisha-${digest}.png`;
const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const changes = {
  title: "P!MPRO в Bazar Club",
  title_uk: "P!MPRO у Bazar Club",
  title_pl: "P!MPRO w Bazar Club",
  description: "Проведите воскресный вечер с P!MPRO в Bazar Club. Актёры придумывают комедийные сцены и диалоги прямо во время шоу.\n\n29 ноября 2026, воскресенье.\n19:00–22:00.\nBazar Club, ul. Okrzei 26, Warszawa. Вход со стороны Jagiellońskiej.\nБилет: 30 zł.",
  description_uk: "Проведіть недільний вечір із P!MPRO у Bazar Club. Актори вигадують комедійні сцени й діалоги просто під час шоу.\n\n29 листопада 2026, неділя.\n19:00–22:00.\nBazar Club, ul. Okrzei 26, Warszawa. Вхід з боку Jagiellońskiej.\nКвиток: 30 zł.",
  description_pl: "Spędź niedzielny wieczór z P!MPRO w Bazar Club. Aktorzy tworzą komediowe sceny i dialogi na żywo.\n\n29 listopada 2026, niedziela.\n19:00–22:00.\nBazar Club, ul. Okrzei 26, Warszawa. Wejście od Jagiellońskiej.\nBilet: 30 zł.",
  image_url: `${url.replace(/\/$/, "")}/storage/v1/object/public/event-images/${imagePath}`,
};
console.log(JSON.stringify({ apply: process.argv.includes("--apply"), slug, ...changes }, null, 2));
if (!process.argv.includes("--apply")) process.exit(0);
const db = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } });
const { data: before, error: readError } = await db.from("events").select("*").eq("slug", slug).single();
if (readError) throw readError;
if (Date.parse(before.starts_at) !== Date.parse("2026-11-29T18:00:00Z")) throw new Error("Unexpected event date.");
const { error: uploadError } = await db.storage.from("event-images").upload(imagePath, poster, { contentType: "image/png", upsert: false, cacheControl: "31536000" });
if (uploadError && !/already exists|duplicate/i.test(uploadError.message)) throw uploadError;
const { data, error } = await db.from("events").update(changes).eq("id", before.id).select("id,slug,title,image_url,price_grosze,total_tickets,starts_at,ends_at").single();
if (error) throw error;
console.log(JSON.stringify({ updated: true, ...data }));
