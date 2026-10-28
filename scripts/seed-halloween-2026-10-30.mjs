import fs from "node:fs";
import { createHash } from "node:crypto";
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
const posterArg = process.argv.indexOf("--poster");
if (posterArg < 0 || !process.argv[posterArg + 1]) throw new Error("Provide --poster <path>.");
if (publish && !apply) throw new Error("Use --apply with --publish.");
const poster = fs.readFileSync(process.argv[posterArg + 1]);
const digest = createHash("sha256").update(poster).digest("hex").slice(0, 12);
const slug = "halloween-popular-poet-party-2026-10-30";
const imagePath = `${slug}-${digest}.png`;
const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const start = DateTime.fromISO("2026-10-30T19:00:00", { zone: "Europe/Warsaw" });
const row = {
  slug,
  title: "HALLOWEEN POPULAR POET PARTY",
  title_uk: "HALLOWEEN POPULAR POET PARTY",
  title_pl: "HALLOWEEN POPULAR POET PARTY",
  description: `🎃👻 HALLOWEEN POPULAR POET PARTY! 🦇🔥
30 октября, пятница, начало в 19:00!

Собираемся всем нашим большим театральным сообществом Popular poet, все группы по актёрскому мастерству и импровизации, чтобы вместе провести жутко весёлый вечер! 🕷️

Вас ждут жуткие игры и конкурсы, страшные закуски, панический DJ set, импровизации, выступления и, конечно, встреча с учениками нашего театрального сообщества! 💀🎭

🎧 За музыкальную атмосферу отвечает DJ Stefan!

Будем знакомиться, общаться, танцевать, играть, пугаться и много смеяться! 🧛‍♂️🪩

📅 30.10, пятница
🕖 19:00–00:00
📍 Театр «Популярный Поэт», Domaniewska 37, Warszawa

🎟️ Билеты на сайте, 30 zł

Готовьте хэллоуинские образы и приходите за порцией жутких эмоций!

Увидимся на HALLOWEEN POPULAR POET PARTY! 🎃👻🔥`,
  description_uk: `HALLOWEEN POPULAR POET PARTY!
30 жовтня, п’ятниця, початок о 19:00.

Збираємося всією театральною спільнотою Popular Poet: групами акторської майстерності та імпровізації, щоб разом провести моторошно веселий вечір.

На вас чекають ігри та конкурси, тематичні закуски, DJ set, імпровізації, виступи й зустріч з учнями нашої театральної спільноти.

За музику відповідає DJ Stefan. Будемо знайомитися, спілкуватися, танцювати, грати й багато сміятися.

30 жовтня 2026, 19:00–00:00.
Театр «Популярный Поэт», Domaniewska 37, Warszawa.
Квиток: 30 zł.

Готуйте гелловінські образи та приходьте на HALLOWEEN POPULAR POET PARTY!`,
  description_pl: `HALLOWEEN POPULAR POET PARTY!
30 października, piątek, start o 19:00.

Spotykamy się całą teatralną społecznością Popular Poet, grupami aktorstwa i improwizacji, żeby razem spędzić strasznie wesoły wieczór.

W programie gry i konkursy, halloweenowe przekąski, DJ set, improwizacje, występy i spotkanie z uczestnikami naszych grup teatralnych.

Za muzykę odpowiada DJ Stefan. Będziemy poznawać się, rozmawiać, tańczyć, grać i dużo się śmiać.

30 października 2026, 19:00–00:00.
Teatr Popular Poet, Domaniewska 37, Warszawa.
Bilet: 30 zł.

Przygotujcie halloweenowe stroje i wpadajcie na HALLOWEEN POPULAR POET PARTY!`,
  starts_at: start.toUTC().toISO(),
  ends_at: start.plus({ hours: 5 }).toUTC().toISO(),
  venue: "Театр «Популярный Поэт», ul. Domaniewska 37, Centrum Biznesowe Zepter, 5 piętro, lokal 42, Warszawa",
  maps_url: "https://maps.app.goo.gl/BtaKyKYvp6nGZbx37",
  image_url: `${url.replace(/\/$/, "")}/storage/v1/object/public/event-images/${imagePath}`,
  image_focal_x: 50,
  image_focal_y: 50,
  event_language: "ru",
  price_grosze: 3000,
  day_of_event_price_grosze: null,
  total_tickets: 70,
  visibility: publish ? "published" : "unlisted",
  listing_kind: "performance",
  poet_course_id: null,
  show_id: null,
  discount_periods: [],
};
console.log(JSON.stringify({ mode: apply ? "apply" : "preview", row, posterBytes: poster.length }, null, 2));
if (!apply) process.exit(0);
const db = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } });
const { data: existing, error: readError } = await db.from("events").select("id,slug,price_grosze,total_tickets,starts_at,ends_at,visibility").eq("slug", slug).maybeSingle();
if (readError) throw readError;
if (existing) {
  if (existing.price_grosze !== row.price_grosze || existing.total_tickets !== row.total_tickets || Date.parse(existing.starts_at) !== Date.parse(row.starts_at) || Date.parse(existing.ends_at) !== Date.parse(row.ends_at)) throw new Error("Existing event differs; refusing to overwrite.");
  console.log(JSON.stringify({ existing: true, ...existing }));
  process.exit(0);
}
const { error: uploadError } = await db.storage.from("event-images").upload(imagePath, poster, { contentType: "image/png", upsert: false, cacheControl: "31536000" });
if (uploadError && !/already exists|duplicate/i.test(uploadError.message)) throw uploadError;
const { data, error } = await db.from("events").insert(row).select("id,slug,visibility,price_grosze,total_tickets,starts_at,ends_at").single();
if (error) throw error;
console.log(JSON.stringify({ created: true, ...data }));
