import { createClient } from "@supabase/supabase-js";
import { DateTime } from "luxon";

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const apply = process.argv.includes("--apply");
const { data: courses, error: courseError } = await db.from("poet_course").select("id,slug").in("slug", ["improv", "acting"]);
if (courseError) throw courseError;
const { data: existing, error: existingError } = await db.from("events").select("slug,poet_course_id,starts_at").eq("listing_kind", "trial").gte("starts_at", "2026-11-01T00:00:00Z").lt("starts_at", "2026-12-01T00:00:00Z");
if (existingError) throw existingError;
const { error: endsError } = await db.from("events").select("ends_at").limit(1);
const rows = [];
for (const courseSlug of ["improv", "acting"]) {
  const course = courses.find((row) => row.slug === courseSlug);
  if (!course) throw new Error(`Missing course ${courseSlug}`);
  const { data: template, error } = await db.from("events").select("title,description,title_pl,description_pl,title_uk,description_uk,venue,maps_url,price_grosze,total_tickets,image_url,event_language").eq("poet_course_id", course.id).eq("listing_kind", "trial").eq("visibility", "published").lt("starts_at", "2026-11-01T00:00:00Z").order("starts_at", { ascending: false }).limit(1).single();
  if (error) throw error;
  for (let day = 1; day <= 30; day++) {
    const date = DateTime.fromObject({ year: 2026, month: 11, day }, { zone: "Europe/Warsaw" });
    const tuesday = date.weekday === 2;
    const thursday = date.weekday === 4;
    if (!tuesday && !(courseSlug === "improv" && thursday)) continue;
    const start = date.set({ hour: courseSlug === "improv" && tuesday ? 18 : 20 });
    const startsAt = start.toUTC().toISO();
    if (existing.some((row) => row.poet_course_id === course.id && Date.parse(row.starts_at) === Date.parse(startsAt))) continue;
    rows.push({
      ...template,
      slug: `probnoe-zanyatie-${courseSlug === "improv" ? "improvizatsiya" : "akterskoe-masterstvo"}-varshava-${date.toISODate()}`,
      poet_course_id: course.id,
      starts_at: startsAt,
      ...(!endsError ? { ends_at: start.plus({ hours: 2 }).toUTC().toISO() } : {}),
      listing_kind: "trial",
      visibility: "published",
    });
  }
}
console.log(JSON.stringify({ mode: apply ? "apply" : "preview", existing: existing.length, create: rows.length, dates: rows.map((row) => ({ title: row.title, local: DateTime.fromISO(row.starts_at).setZone("Europe/Warsaw").toFormat("yyyy-MM-dd cccc HH:mm"), price: row.price_grosze / 100, capacity: row.total_tickets })) }, null, 2));
if (apply && rows.length) {
  const { data, error } = await db.from("events").insert(rows).select("id,slug,starts_at");
  if (error) throw error;
  console.log(JSON.stringify({ created: data.length }));
}
