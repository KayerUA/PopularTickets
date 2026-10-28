import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import ts from "typescript";

for (const path of ["../apps/tickets/.env.local", "../.env.local", "../.env"]) {
  const file = fileURLToPath(new URL(path, import.meta.url));
  if (!fs.existsSync(file)) continue;
  for (const line of fs.readFileSync(file, "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}
const apply = process.argv.includes("--apply");
const publish = process.argv.includes("--publish");
const key = process.argv.find(a => a.startsWith("--event="))?.split("=")[1];
if (!["improv", "taxi"].includes(key)) throw new Error("Choose --event=improv or --event=taxi.");
if (publish && !apply) throw new Error("Publishing requires --apply.");

const common = { ends_at: null, day_of_event_price_grosze: null, image_url: null,
  image_focal_x: 50, image_focal_y: 50, listing_kind: "performance", event_language: "ru",
  poet_course_id: null, show_id: null, visibility: "unlisted", discount_periods: [] };
const row = key === "improv" ? {
  ...common, slug: "improvizatsiya-strogogo-rezhima-2026-11-22",
  title: "Импровизация строгого режима",
  title_uk: "Імпровізація суворого режиму", title_pl: "Improwizacja ścisłego reżimu",
  description: "«Импровизация строгого режима» в Stand-up Lokal.\n\nВстречаемся в воскресенье, 22 ноября, в 20:30.\n\nStand-up Lokal, ul. Stanisława Noakowskiego 16, Warszawa.\nБилет: 50 zł.",
  description_uk: "«Імпровізація суворого режиму» у Stand-up Lokal.\n\nЗустрічаємося в неділю, 22 листопада, о 20:30.\n\nStand-up Lokal, ul. Stanisława Noakowskiego 16, Warszawa.\nКвиток: 50 zł.",
  description_pl: "„Improwizacja ścisłego reżimu” w Stand-up Lokal.\n\nNiedziela, 22 listopada, godz. 20:30.\n\nStand-up Lokal, ul. Stanisława Noakowskiego 16, Warszawa.\nBilet: 50 zł.",
  venue: "Stand-up Lokal, ul. Stanisława Noakowskiego 16, Warszawa",
  maps_url: "https://www.google.com/maps/search/?api=1&query=Stand+up+Lokal+Stanislawa+Noakowskiego+16+Warszawa",
  starts_at: "2026-11-22T19:30:00Z", price_grosze: 5000, total_tickets: 100,
} : {
  ...common, slug: "osobo-lyubyashchiy-taksist-2026-12-11",
  title: "Спектакль «Особо любящий таксист»",
  title_uk: "Вистава «Особливо люблячий таксист»", title_pl: "Spektakl „Wyjątkowo kochający taksówkarz”",
  description: "«Особо любящий таксист» на Scena Kocjana.\n\n11 декабря, пятница, начало в 19:00.\n\nВыберите места на схеме зала при покупке. Ряд и место будут указаны в билете.\n\nПервый пул: 80 zł до 27 ноября включительно.\nВторой пул: 100 zł с 28 ноября по 11 декабря.\n\nScena Kocjana, ul. Kocjana 3, Warszawa.",
  description_uk: "«Особливо люблячий таксист» на Scena Kocjana.\n\n11 грудня, п’ятниця, початок о 19:00.\n\nОберіть місця на схемі зали під час купівлі. Ряд і місце будуть зазначені у квитку.\n\nПерший пул: 80 zł до 27 листопада включно.\nДругий пул: 100 zł з 28 листопада до 11 грудня.\n\nScena Kocjana, ul. Kocjana 3, Warszawa.",
  description_pl: "„Wyjątkowo kochający taksówkarz” na Scenie Kocjana.\n\nPiątek, 11 grudnia, początek o 19:00.\n\nWybierz miejsca na planie sali przy zakupie. Rząd i miejsce zostaną podane na bilecie.\n\nPierwsza pula: 80 zł do 27 listopada włącznie.\nDruga pula: 100 zł od 28 listopada do 11 grudnia.\n\nScena Kocjana, ul. Kocjana 3, Warszawa.",
  venue: "Scena Kocjana, ul. Kocjana 3, 01-473 Warszawa",
  maps_url: "https://maps.app.goo.gl/mSjZxRhiYHkycGQ36",
  starts_at: "2026-12-11T18:00:00Z", price_grosze: 10000, total_tickets: 184,
  discount_periods: [{ name: "1 пул", until: "2026-11-27", percent: 20 }],
};
console.log(JSON.stringify({ mode: apply ? "apply" : "preview", publish, ...row }, null, 2));
if (!apply) process.exit(0);
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } });
const { data: existing, error: re } = await db.from("events").select("id,visibility,starts_at,price_grosze,total_tickets,venue,discount_periods").eq("slug", row.slug).maybeSingle();
if (re) throw re;
let id = existing?.id;
if (existing) {
  for (const field of ["price_grosze", "total_tickets", "venue"]) {
    if (existing[field] !== row[field]) throw new Error(`Existing ${field} differs; refusing overwrite.`);
  }
  if (Date.parse(existing.starts_at) !== Date.parse(row.starts_at) || JSON.stringify(existing.discount_periods) !== JSON.stringify(row.discount_periods)) {
    // PostgreSQL JSONB may reorder object keys.
    const samePeriods = JSON.stringify(existing.discount_periods?.map(({name,until,percent}) => ({name,until,percent}))) === JSON.stringify(row.discount_periods);
    if (Date.parse(existing.starts_at) !== Date.parse(row.starts_at) || !samePeriods) throw new Error("Existing time or pricing differs.");
  }
} else {
  const { data, error } = await db.from("events").insert(row).select("id").single();
  if (error) throw error;
  id = data.id;
}
if (key === "taxi") {
  const source = fs.readFileSync(new URL("../apps/tickets/lib/seating/scenaKocjana.ts", import.meta.url), "utf8");
  const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText;
  const { SCENA_KOCJANA: map } = await import(`data:text/javascript;base64,${Buffer.from(js).toString("base64")}`);
  const { error: se } = await db.rpc("pt_enable_seating", { p_event_id: id, p_seats: map.seats.map(s => ({ ...s, rowIndex: map.rows.indexOf(s.row) })) });
  if (se) throw se;
  const { data: configuration, error: ce } = await db.from("event_seating").select("mode").eq("event_id", id).single();
  if (ce) throw ce;
  if (configuration.mode !== "open") {
    const { error } = await db.rpc("pt_seating_mode", { p_event_id: id, p_mode: "open" });
    if (error) throw error;
  }
}
if (publish) {
  const { error } = await db.from("events").update({ visibility: "published" }).eq("id", id);
  if (error) throw error;
}
console.log(JSON.stringify({ id, slug: row.slug, visibility: publish ? "published" : existing?.visibility || "unlisted", numberedSeats: key === "taxi" }));
