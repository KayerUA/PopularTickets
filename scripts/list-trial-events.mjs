/** Обзор пробных занятий: что видно на сайте, что скрыто, сколько продано. */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

for (const line of readFileSync(new URL("../.env", import.meta.url), "utf8").split("\n")) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);

const { data: events, error } = await supabase
  .from("events")
  .select("id,slug,starts_at,visibility,total_tickets,price_grosze,poet_course_id")
  .eq("listing_kind", "trial")
  .order("starts_at", { ascending: true });
if (error) throw error;

const { data: courses } = await supabase.from("poet_course").select("id,slug");
const courseById = new Map((courses ?? []).map((c) => [c.id, c.slug]));

const soldById = new Map();
const ids = events.map((e) => e.id);
if (ids.length) {
  const { data: tickets } = await supabase.from("tickets").select("event_id").in("event_id", ids);
  for (const t of tickets ?? []) soldById.set(t.event_id, (soldById.get(t.event_id) ?? 0) + 1);
}

const visible = events.filter((e) => e.visibility !== "inactive");
const hidden = events.length - visible.length;
console.log(`всего trial: ${events.length}, скрыто: ${hidden}, активно: ${visible.length}\n`);
for (const e of visible) {
  const when = new Date(e.starts_at);
  console.log(
    [
      when.getTime() < Date.now() ? "PAST  " : "FUTURE",
      when.toLocaleString("ru-RU", { timeZone: "Europe/Warsaw", dateStyle: "short", timeStyle: "short" }).padEnd(16),
      (courseById.get(e.poet_course_id) ?? "—").padEnd(8),
      e.visibility.padEnd(9),
      `${e.price_grosze / 100} zł`.padEnd(7),
      `мест:${e.total_tickets}`,
      `продано:${soldById.get(e.id) ?? 0}`,
      e.slug,
    ].join("  "),
  );
}
