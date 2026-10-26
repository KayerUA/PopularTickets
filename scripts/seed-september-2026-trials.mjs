#!/usr/bin/env node
/** Добавляет пробные Popular Poet на 5, 6, 12 и 13 сентября 2026 года. */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(scriptDir, "..");

for (const filename of [".env.local", ".env"]) {
  const envPath = path.join(repoRoot, filename);
  if (!fs.existsSync(envPath)) continue;

  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!match || process.env[match[1]]) continue;
    process.env[match[1]] = match[2].trim().replace(/^["']|["']$/g, "");
  }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || process.env.SUPABASE_URL?.trim();
const serviceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || process.env.SUPABASE_SECRET_KEY?.trim();

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("Нужны NEXT_PUBLIC_SUPABASE_URL и SUPABASE_SERVICE_ROLE_KEY в .env");
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const { data: courses, error: coursesError } = await supabase
  .from("poet_course")
  .select("id, slug")
  .in("slug", ["acting", "improv"]);

if (coursesError) throw coursesError;

const courseIdBySlug = new Map((courses ?? []).map((course) => [course.slug, course.id]));
if (!courseIdBySlug.has("acting") || !courseIdBySlug.has("improv")) {
  throw new Error("В poet_course не найдены опубликованные курсы acting и improv");
}

const venue = "Warszawa, ul. Domaniewska 37, Centrum biznesowe Zepter, piętro 5, lokal 42";
const mapsUrl = "https://maps.app.goo.gl/BtaKyKYvp6nGZbx37";
const updatedAt = new Date().toISOString();

const definitions = [
  {
    slug: "probnoe-zanyatie-akterskoe-masterstvo-varshava-2026-09-05",
    courseSlug: "acting",
    startsAt: "2026-09-05T14:00:00.000Z",
  },
  {
    slug: "probnoe-zanyatie-improvizatsiya-varshava-2026-09-06",
    courseSlug: "improv",
    startsAt: "2026-09-06T10:30:00.000Z",
  },
  {
    slug: "probnoe-zanyatie-akterskoe-masterstvo-varshava-2026-09-12",
    courseSlug: "acting",
    startsAt: "2026-09-12T14:00:00.000Z",
  },
  {
    slug: "probnoe-zanyatie-improvizatsiya-varshava-2026-09-13",
    courseSlug: "improv",
    startsAt: "2026-09-13T10:30:00.000Z",
  },
];

const rows = definitions.map(({ slug, courseSlug, startsAt }) => {
  const acting = courseSlug === "acting";

  return {
    slug,
    title: acting
      ? "Пробное занятие: Актёрское мастерство в Варшаве"
      : "Пробное занятие: Импровизация в Варшаве",
    description: acting
      ? `Пробное занятие по актёрскому мастерству для знакомства с программой, педагогом и группой. После занятия можно присоединиться к регулярному курсу.\n\nАдрес: ${venue}.`
      : `Пробное занятие по импровизации для знакомства с программой, педагогом и группой. После занятия можно присоединиться к регулярному курсу.\n\nАдрес: ${venue}.`,
    title_pl: acting
      ? "Zajęcia próbne: aktorstwo w Warszawie"
      : "Zajęcia próbne: improwizacja w Warszawie",
    description_pl: acting
      ? `Zajęcia próbne z aktorstwa, podczas których poznasz program, prowadzącego i grupę. Po zajęciach możesz dołączyć do regularnego kursu.\n\nAdres: ${venue}.`
      : `Zajęcia próbne z improwizacji, podczas których poznasz program, prowadzącego i grupę. Po zajęciach możesz dołączyć do regularnego kursu.\n\nAdres: ${venue}.`,
    title_uk: acting
      ? "Пробне заняття: акторська майстерність у Варшаві"
      : "Пробне заняття: імпровізація у Варшаві",
    description_uk: acting
      ? `Пробне заняття з акторської майстерності для знайомства з програмою, викладачем і групою. Після заняття можна приєднатися до регулярного курсу.\n\nАдреса: ${venue}.`
      : `Пробне заняття з імпровізації для знайомства з програмою, викладачем і групою. Після заняття можна приєднатися до регулярного курсу.\n\nАдреса: ${venue}.`,
    image_url: acting ? "/courses/akterka.jpg" : "/courses/impro.jpg",
    image_focal_x: 50,
    image_focal_y: acting ? 6 : 45,
    maps_url: mapsUrl,
    venue,
    starts_at: startsAt,
    price_grosze: 7000,
    total_tickets: 12,
    visibility: "published",
    listing_kind: "trial",
    event_language: "ru",
    poet_course_id: courseIdBySlug.get(courseSlug),
    updated_at: updatedAt,
  };
});

const { data, error } = await supabase
  .from("events")
  .upsert(rows, { onConflict: "slug" })
  .select("slug, starts_at, price_grosze, visibility");

if (error) throw error;

for (const event of data ?? []) {
  const localDate = new Date(event.starts_at).toLocaleString("ru-RU", {
    timeZone: "Europe/Warsaw",
    dateStyle: "short",
    timeStyle: "short",
  });
  console.log(`${localDate} · ${event.price_grosze / 100} zł · ${event.visibility} · ${event.slug}`);
}
