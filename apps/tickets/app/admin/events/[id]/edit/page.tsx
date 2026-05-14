import { notFound } from "next/navigation";
import { getServiceSupabase } from "@/lib/supabase/admin";
import { fetchOptionalMapsUrl } from "@/lib/supabase/fetchOptionalMapsUrl";
import { SupabaseSetupHint } from "@/components/SupabaseSetupHint";
import { EventForm, type AdminEventRow } from "@/components/EventForm";
import { fetchPoetCourseSelectOptions } from "@/lib/fetchPoetCourseSelectOptions";

const ADMIN_EVENT_SELECT =
  "id,slug,title,description,image_url,venue,starts_at,price_grosze,total_tickets,is_published,listing_kind,poet_course_id" as const;

export default async function EditEventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = getServiceSupabase();
  if (!supabase) {
    return <SupabaseSetupHint variant="setup" />;
  }
  const { data: event, error } = await supabase
    .from("events")
    .select(ADMIN_EVENT_SELECT)
    .eq("id", id)
    .maybeSingle();

  if (error || !event) notFound();

  const mapsUrl = await fetchOptionalMapsUrl(supabase, event.id as string);
  const poetCourseOptions = await fetchPoetCourseSelectOptions();

  const row: AdminEventRow = {
    id: event.id,
    slug: event.slug,
    title: event.title,
    description: event.description,
    image_url: event.image_url,
    maps_url: mapsUrl,
    venue: event.venue,
    starts_at: event.starts_at,
    price_grosze: event.price_grosze,
    total_tickets: event.total_tickets,
    is_published: event.is_published,
    listing_kind: (event.listing_kind as "performance" | "trial") ?? "performance",
    poet_course_id: (event as { poet_course_id?: string | null }).poet_course_id ?? null,
  };

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-semibold text-zinc-50">Редактирование</h1>
      <EventForm event={row} poetCourseOptions={poetCourseOptions} />
    </div>
  );
}
