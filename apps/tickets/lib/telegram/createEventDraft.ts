import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { routing } from "@/i18n/routing";
import { uploadEventCoverBuffer } from "@/lib/supabase/eventImageUpload";
import { setMapsUrlRpc } from "@/lib/supabase/mapsUrlRpc";
import {
  isEventsImageFocalUnavailable,
  isEventsLanguageUnavailable,
  isEventsPoetCourseIdUnavailable,
} from "@/lib/supabase/eventsPoetCourseColumn";
import { slugifyEventTitle, fallbackEventSlug } from "@/lib/eventSlugFromTitle";
import { parseStartsAtFromAdminForm } from "@/lib/warsawEventDatetime";
import { POPULAR_POET_THEATRE_MAPS_URL } from "@/lib/theatreVenueDefaults";
import type { ContentVisibility } from "@/lib/contentVisibility";
import type { ParsedTelegramEvent } from "@/lib/telegram/parseEventWithGemini";

async function allocateUniqueEventSlug(supabase: SupabaseClient, baseSlug: string): Promise<string> {
  const base = (baseSlug.trim().slice(0, 72) || "event").replace(/-+$/g, "") || "event";
  let candidate = base;
  let n = 2;
  for (;;) {
    const { data, error } = await supabase.from("events").select("id").eq("slug", candidate).maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return candidate;
    candidate = `${base}-${n}`;
    n += 1;
    if (n > 500) throw new Error("Не удалось подобрать свободный slug");
  }
}

export type CreatedEventDraft = {
  id: string;
  slug: string;
  title: string;
  startsAtIso: string;
  pricePln: number;
  totalTickets: number;
  venue: string;
  listingKind: "performance" | "trial";
  imageUrl: string | null;
};

async function resolvePoetCourseId(
  supabase: SupabaseClient,
  slug: string | undefined,
): Promise<string | null> {
  if (!slug) return null;
  const { data, error } = await supabase.from("poet_course").select("id").eq("slug", slug).maybeSingle();
  if (error) {
    console.warn("[telegram bot] poet_course lookup:", error.message);
    return null;
  }
  return (data?.id as string | undefined) ?? null;
}

export async function createEventFromParsed(
  supabase: SupabaseClient,
  parsed: ParsedTelegramEvent,
  opts: {
    visibility?: ContentVisibility;
    image?: { buffer: Buffer; mimeType: string };
  } = {},
): Promise<CreatedEventDraft> {
  const visibility = opts.visibility ?? "published";
  const image = opts.image;
  const fromTitle = slugifyEventTitle(parsed.title);
  const baseSlug = fromTitle.length >= 2 ? fromTitle : fallbackEventSlug();
  const slug = await allocateUniqueEventSlug(supabase, baseSlug);
  const startsAtIso = parseStartsAtFromAdminForm(parsed.startsAtWarsaw);
  const priceGrosze = Math.round(parsed.pricePln * 100);

  let imageUrl: string | null = null;
  if (image) {
    imageUrl = await uploadEventCoverBuffer(supabase, image.buffer, image.mimeType, slug);
  }

  const poetCourseId =
    parsed.listingKind === "trial" && parsed.poetCourseSlug
      ? await resolvePoetCourseId(supabase, parsed.poetCourseSlug)
      : null;

  const payload: Record<string, unknown> = {
    slug,
    title: parsed.title,
    description: parsed.description,
    title_pl: parsed.titlePl.trim(),
    description_pl: parsed.descriptionPl.trim(),
    title_uk: parsed.titleUk.trim(),
    description_uk: parsed.descriptionUk.trim(),
    image_url: imageUrl,
    venue: parsed.venue,
    starts_at: startsAtIso,
    price_grosze: priceGrosze,
    total_tickets: parsed.totalTickets,
    visibility,
    listing_kind: parsed.listingKind,
    event_language: parsed.eventLanguage,
    poet_course_id: poetCourseId,
    image_focal_x: 50,
    image_focal_y: 50,
  };

  let ins = await supabase.from("events").insert(payload).select("id").single();
  if (ins.error && isEventsPoetCourseIdUnavailable(ins.error.message)) {
    const { poet_course_id: _drop, ...withoutCourse } = payload;
    ins = await supabase.from("events").insert(withoutCourse).select("id").single();
  }
  if (ins.error && isEventsImageFocalUnavailable(ins.error.message)) {
    const { image_focal_x: _fx, image_focal_y: _fy, ...withoutFocal } = payload;
    ins = await supabase.from("events").insert(withoutFocal).select("id").single();
  }
  if (ins.error && isEventsLanguageUnavailable(ins.error.message)) {
    const { event_language: _lang, ...withoutLanguage } = payload;
    ins = await supabase.from("events").insert(withoutLanguage).select("id").single();
  }
  if (ins.error || !ins.data?.id) {
    throw new Error(ins.error?.message ?? "insert events failed");
  }

  const eventId = ins.data.id as string;
  const mapsErr = await setMapsUrlRpc(supabase, eventId, POPULAR_POET_THEATRE_MAPS_URL);
  if (mapsErr.error) {
    console.warn("[telegram bot] maps_url:", mapsErr.error);
  }

  for (const loc of routing.locales) {
    revalidatePath(`/${loc}`);
    revalidatePath(`/${loc}/events/${slug}`);
  }
  revalidatePath("/admin");

  return {
    id: eventId,
    slug,
    title: parsed.title,
    startsAtIso,
    pricePln: parsed.pricePln,
    totalTickets: parsed.totalTickets,
    venue: parsed.venue,
    listingKind: parsed.listingKind,
    imageUrl,
  };
}

/** @deprecated alias */
export const createEventDraftFromParsed = createEventFromParsed;
