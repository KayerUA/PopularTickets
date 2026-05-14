import { notFound } from "next/navigation";
import { getServiceSupabase } from "@/lib/supabase/admin";
import { fetchOptionalMapsUrl } from "@/lib/supabase/fetchOptionalMapsUrl";
import { SupabaseSetupHint } from "@/components/SupabaseSetupHint";
import { EventForm, type AdminEventRow } from "@/components/EventForm";
import { fetchPoetCourseSelectOptions } from "@/lib/fetchPoetCourseSelectOptions";
import { isEventsPoetCourseIdUnavailable } from "@/lib/supabase/eventsPoetCourseColumn";

const ADMIN_EVENT_SELECT_BASE =
  "id,slug,title,description,image_url,venue,starts_at,price_grosze,total_tickets,is_published,listing_kind" as const;
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
    image_url: event.image_url as string | null,
    maps_url: mapsUrl,
    venue: event.venue as string,
    starts_at: event.starts_at as string,
    price_grosze: event.price_grosze as number,
    total_tickets: event.total_tickets as number,
    is_published: event.is_published as boolean,
    listing_kind: (event.listing_kind as "performance" | "trial") ?? "performance",
    poet_course_id: (event.poet_course_id as string | null | undefined) ?? null,
  };

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-semibold text-zinc-50">Редактирование</h1>
      <EventForm event={row} poetCourseOptions={poetCourseOptions} />
    </div>
  );
}
