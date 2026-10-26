#!/usr/bin/env node
/** Пробные Popular Poet на октябрь 2026 и шоу «Нога в ногу» в Stand up Lokal. */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(scriptDir, "..");

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  for (const line of fs.readFileSync(filePath, "utf8").split("\n")) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!match) continue;
    let value = match[2].trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(match[1] in process.env) || process.env[match[1]] === "") {
      process.env[match[1]] = value;
    }
  }
}

for (const filename of [".env.local", ".env"]) {
  loadEnvFile(path.join(repoRoot, filename));
  loadEnvFile(path.join(repoRoot, "apps/tickets", filename));
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

const studioVenue = "Warszawa, ul. Domaniewska 37, Centrum biznesowe Zepter, piętro 5, lokal 42";
const studioMapsUrl = "https://maps.app.goo.gl/BtaKyKYvp6nGZbx37";
const showVenue = "Stand up Lokal, ul. Stanisława Noakowskiego 16, 00-666 Warszawa";
const showMapsUrl =
  "https://www.google.com/maps/search/?api=1&query=Stand+up+Lokal+ul.+Stanislawa+Noakowskiego+16+Warszawa";
const showImageUrl =
  "https://pynbtuvhrratjqlweyas.supabase.co/storage/v1/object/public/event-images/shou-improvizatsiya-noga-v-nogu-2026-10-25-afisha-edited-20261019.png";
const updatedAt = new Date().toISOString();

/** Warsaw local times converted to UTC. DST ends 2026-10-25 03:00 CEST → CET. */
const trialDefinitions = [
  { slug: "probnoe-zanyatie-improvizatsiya-varshava-2026-10-06", courseSlug: "improv", startsAt: "2026-10-06T16:00:00.000Z" },
  { slug: "probnoe-zanyatie-improvizatsiya-varshava-2026-10-13", courseSlug: "improv", startsAt: "2026-10-13T16:00:00.000Z" },
  { slug: "probnoe-zanyatie-akterskoe-masterstvo-varshava-2026-10-13", courseSlug: "acting", startsAt: "2026-10-13T18:00:00.000Z" },
  { slug: "probnoe-zanyatie-improvizatsiya-varshava-2026-10-15", courseSlug: "improv", startsAt: "2026-10-15T18:00:00.000Z" },
  { slug: "probnoe-zanyatie-improvizatsiya-varshava-2026-10-20", courseSlug: "improv", startsAt: "2026-10-20T16:00:00.000Z" },
  { slug: "probnoe-zanyatie-akterskoe-masterstvo-varshava-2026-10-20", courseSlug: "acting", startsAt: "2026-10-20T18:00:00.000Z" },
  { slug: "probnoe-zanyatie-improvizatsiya-varshava-2026-10-22", courseSlug: "improv", startsAt: "2026-10-22T18:00:00.000Z" },
  { slug: "probnoe-zanyatie-improvizatsiya-varshava-2026-10-27", courseSlug: "improv", startsAt: "2026-10-27T17:00:00.000Z" },
  { slug: "probnoe-zanyatie-akterskoe-masterstvo-varshava-2026-10-27", courseSlug: "acting", startsAt: "2026-10-27T19:00:00.000Z" },
  { slug: "probnoe-zanyatie-improvizatsiya-varshava-2026-10-29", courseSlug: "improv", startsAt: "2026-10-29T19:00:00.000Z" },
];

const trialRows = trialDefinitions.map(({ slug, courseSlug, startsAt }) => {
  const acting = courseSlug === "acting";

  return {
    slug,
    title: acting
      ? "Пробное занятие: Актёрское мастерство в Варшаве"
      : "Пробное занятие: Импровизация в Варшаве",
    description: acting
      ? `Пробное занятие по актёрскому мастерству для знакомства с программой, педагогом и группой. После занятия можно присоединиться к регулярному курсу.\n\nАдрес: ${studioVenue}.`
      : `Пробное занятие по импровизации для знакомства с программой, педагогом и группой. После занятия можно присоединиться к регулярному курсу.\n\nАдрес: ${studioVenue}.`,
    title_pl: acting
      ? "Zajęcia próbne: aktorstwo w Warszawie"
      : "Zajęcia próbne: improwizacja w Warszawie",
    description_pl: acting
      ? `Zajęcia próbne z aktorstwa, podczas których poznasz program, prowadzącego i grupę. Po zajęciach możesz dołączyć do regularnego kursu.\n\nAdres: ${studioVenue}.`
      : `Zajęcia próbne z improwizacji, podczas których poznasz program, prowadzącego i grupę. Po zajęciach możesz dołączyć do regularnego kursu.\n\nAdres: ${studioVenue}.`,
    title_uk: acting
      ? "Пробне заняття: акторська майстерність у Варшаві"
      : "Пробне заняття: імпровізація у Варшаві",
    description_uk: acting
      ? `Пробне заняття з акторської майстерності для знайомства з програмою, викладачем і групою. Після заняття можна приєднатися до регулярного курсу.\n\nАдреса: ${studioVenue}.`
      : `Пробне заняття з імпровізації для знайомства з програмою, викладачем і групою. Після заняття можна приєднатися до регулярного курсу.\n\nАдреса: ${studioVenue}.`,
    image_url: acting ? "/courses/akterka.jpg" : "/courses/impro.jpg",
    image_focal_x: 50,
    image_focal_y: acting ? 6 : 45,
    maps_url: studioMapsUrl,
    venue: studioVenue,
    starts_at: startsAt,
    price_grosze: 10000,
    total_tickets: 12,
    visibility: "published",
    listing_kind: "trial",
    event_language: "ru",
    poet_course_id: courseIdBySlug.get(courseSlug),
    updated_at: updatedAt,
  };
});

const showRow = {
  slug: "shou-improvizatsiya-noga-v-nogu-2026-10-25",
  title: "Шоу импровизации «Нога в ногу»",
  description: `Команда импровизаторов «Нога в ногу» училась в школе Popular Poet и выходит на сцену со своей комедией: сюжеты рождаются на глазах, без сценария и сетки безопасности.

Юмор, абсурд и живой драйв — вечер, который нельзя посмотреть «потом».

25 октября (вс), 20:30
Stand up Lokal, ul. Stanisława Noakowskiego 16, Warszawa
Билет — 80 zł.`,
  title_pl: "Show improwizacji «Нога в ногу»",
  description_pl: `Zespół improwizatorów «Нога в ногу» uczył się w szkole Popular Poet i wychodzi na scenę z własną komedią: historie powstają na waszych oczach, bez scenariusza i siatki bezpieczeństwa.

Humor, absurd i żywy drive — wieczór, którego nie da się „obejrzeć później”.

25 października (niedziela), 20:30
Stand up Lokal, ul. Stanisława Noakowskiego 16, Warszawa
Bilet — 80 zł.`,
  title_uk: "Шоу імпровізації «Нога в ногу»",
  description_uk: `Команда імпровізаторів «Нога в ногу» навчалася в школі Popular Poet і виходить на сцену зі своєю комедією: сюжети народжуються на очах, без сценарію і страховки.

Гумор, абсурд і живий драйв — вечір, який не можна подивитися «потім».

25 жовтня (нд), 20:30
Stand up Lokal, ul. Stanisława Noakowskiego 16, Warszawa
Квиток — 80 zł.`,
  image_url: showImageUrl,
  image_focal_x: 50,
  image_focal_y: 45,
  maps_url: showMapsUrl,
  venue: showVenue,
  starts_at: "2026-10-25T19:30:00.000Z",
  price_grosze: 8000,
  total_tickets: 120,
  visibility: "published",
  listing_kind: "performance",
  event_language: "ru",
  poet_course_id: null,
  updated_at: updatedAt,
};

const rows = [...trialRows, showRow];

const { data, error } = await supabase
  .from("events")
  .upsert(rows, { onConflict: "slug" })
  .select("slug, title, starts_at, price_grosze, visibility, listing_kind, venue");

if (error) throw error;

for (const event of data ?? []) {
  const localDate = new Date(event.starts_at).toLocaleString("ru-RU", {
    timeZone: "Europe/Warsaw",
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
  console.log(
    `${localDate} · ${event.price_grosze / 100} zł · ${event.listing_kind} · ${event.visibility} · ${event.slug}`,
  );
}
