import { notFound } from "next/navigation";
import { getServiceSupabase } from "@/lib/supabase/admin";
import { fetchOptionalMapsUrl } from "@/lib/supabase/fetchOptionalMapsUrl";
import { SupabaseSetupHint } from "@/components/SupabaseSetupHint";
import { EventForm, type AdminEventRow } from "@/components/EventForm";
import { fetchPoetCourseSelectOptions } from "@/lib/fetchPoetCourseSelectOptions";
import { isEventsPoetCourseIdUnavailable, isEventsLanguageUnavailable } from "@/lib/supabase/eventsPoetCourseColumn";
import { parseContentVisibilityFromForm } from "@/lib/contentVisibility";
import { isTranslateConfigured, translateProviderLabel } from "@/lib/translateContent";
import { normalizeEventLanguage } from "@/lib/eventLanguage";

const ADMIN_EVENT_SELECT_BASE =
  "id,slug,title,description,title_pl,description_pl,title_uk,description_uk,image_url,image_focal_x,image_focal_y,venue,starts_at,price_grosze,day_of_event_price_grosze,total_tickets,visibility,listing_kind,event_language" as const;
const ADMIN_EVENT_SELECT_FULL = `${ADMIN_EVENT_SELECT_BASE},poet_course_id` as const;

export default async function EditEventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = getServiceSupabase();
  if (!supabase) {
    return <SupabaseSetupHint variant="setup" />;
  }

  const r1 = await supabase.from("events").select(ADMIN_EVENT_SELECT_FULL).eq("id", id).maybeSingle();

  type Ev = Record<string, unknown>;
  let event: Ev | null = (r1.data as Ev | null) ?? null;
  if (r1.error) {
    if (isEventsPoetCourseIdUnavailable(r1.error.message)) {
      const r2 = await supabase.from("events").select(ADMIN_EVENT_SELECT_BASE).eq("id", id).maybeSingle();
      if (r2.error) notFound();
      const base = r2.data as Ev | null;
      event = base ? { ...base, poet_course_id: null } : null;
    } else if (isEventsLanguageUnavailable(r1.error.message)) {
      const legacySel =
        "id,slug,title,description,title_pl,description_pl,title_uk,description_uk,image_url,image_focal_x,image_focal_y,venue,starts_at,price_grosze,day_of_event_price_grosze,total_tickets,visibility,listing_kind,poet_course_id" as const;
      const r2 = await supabase.from("events").select(legacySel).eq("id", id).maybeSingle();
      if (r2.error) notFound();
      const base = r2.data as Ev | null;
      event = base ? { ...base, event_language: null } : null;
    } else if (r1.error.code === "42703") {
      const legacySel =
        "id,slug,title,description,image_url,image_focal_x,image_focal_y,venue,starts_at,price_grosze,day_of_event_price_grosze,total_tickets,visibility,listing_kind,poet_course_id" as const;
      const r2 = await supabase.from("events").select(legacySel).eq("id", id).maybeSingle();
      if (r2.error) notFound();
      event = (r2.data as Ev | null) ?? null;
    } else {
      notFound();
    }
  }
  if (!event) notFound();

  const mapsUrl = await fetchOptionalMapsUrl(supabase, event.id as string);
  const poetCourseOptions = await fetchPoetCourseSelectOptions();

  const row: AdminEventRow = {
    id: event.id as string,
    slug: event.slug as string,
    title: event.title as string,
    description: event.description as string | null,
    title_pl: (event.title_pl as string | null | undefined) ?? null,
    description_pl: (event.description_pl as string | null | undefined) ?? null,
    title_uk: (event.title_uk as string | null | undefined) ?? null,
    description_uk: (event.description_uk as string | null | undefined) ?? null,
    image_url: event.image_url as string | null,
    image_focal_x: typeof event.image_focal_x === "number" ? event.image_focal_x : 50,
    image_focal_y: typeof event.image_focal_y === "number" ? event.image_focal_y : 50,
    maps_url: mapsUrl,
    venue: event.venue as string,
    starts_at: event.starts_at as string,
    price_grosze: event.price_grosze as number,
    day_of_event_price_grosze: (event.day_of_event_price_grosze as number | null) ?? null,
    total_tickets: event.total_tickets as number,
    visibility: parseContentVisibilityFromForm(event.visibility),
    listing_kind: (event.listing_kind as "performance" | "trial") ?? "performance",
    event_language: normalizeEventLanguage(event.event_language),
    poet_course_id: (event.poet_course_id as string | null | undefined) ?? null,
  };

  const translateProviderHint = isTranslateConfigured()
    ? translateProviderLabel()
    : "не настроен (DEEPL_AUTH_KEY или LIBRETRANSLATE_URL)";

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-semibold text-zinc-50">Редактирование</h1>
      <EventForm event={row} poetCourseOptions={poetCourseOptions} translateProviderHint={translateProviderHint} />
    </div>
  );
}
