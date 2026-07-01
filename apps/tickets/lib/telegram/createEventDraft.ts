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
import { buildEventSlug, fallbackEventSlug } from "@/lib/eventSlugFromTitle";
import { parseStartsAtFromAdminForm } from "@/lib/warsawEventDatetime";
import { defaultMapsUrlForEvent } from "@/lib/theatreVenueDefaults";
import { runEventDiscovery, type EventDiscoveryResult } from "@/lib/eventDiscovery/notifyEventPublished";
import type { ContentVisibility } from "@/lib/contentVisibility";
import { clampEventImageFocal } from "@/lib/eventCoverFocal";
import type { ImageFocal } from "@/lib/telegram/draftImageFocal";
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
  dayOfEventPricePln: number | null;
  totalTickets: number;
  venue: string;
  listingKind: "performance" | "trial";
  imageUrl: string | null;
  discovery: EventDiscoveryResult;
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
    imageFocal?: ImageFocal;
  } = {},
): Promise<CreatedEventDraft> {
  const visibility = opts.visibility ?? "published";
  const image = opts.image;
  const focal = opts.imageFocal ?? { x: 50, y: 50 };
  const fromTitle = buildEventSlug({
    title: parsed.title,
    titlePl: parsed.titlePl,
    titleUk: parsed.titleUk,
    eventLanguage: parsed.eventLanguage,
    startsAt: parsed.startsAtWarsaw,
  });
  const baseSlug = fromTitle.length >= 2 ? fromTitle : fallbackEventSlug();
  const slug = await allocateUniqueEventSlug(supabase, baseSlug);
  const startsAtIso = parseStartsAtFromAdminForm(parsed.startsAtWarsaw);
  const priceGrosze = Math.round(parsed.pricePln * 100);
  const dayOfEventPriceGrosze =
    parsed.dayOfEventPricePln != null && parsed.dayOfEventPricePln > parsed.pricePln
      ? Math.round(parsed.dayOfEventPricePln * 100)
      : null;

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
    day_of_event_price_grosze: dayOfEventPriceGrosze,
    total_tickets: parsed.totalTickets,
    visibility,
    listing_kind: parsed.listingKind,
    event_language: parsed.eventLanguage,
    poet_course_id: poetCourseId,
    image_focal_x: clampEventImageFocal(focal.x),
    image_focal_y: clampEventImageFocal(focal.y),
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
  const mapsUrl = defaultMapsUrlForEvent(parsed.venue, parsed.listingKind);
  if (mapsUrl) {
    const mapsErr = await setMapsUrlRpc(supabase, eventId, mapsUrl);
    if (mapsErr.error) {
      console.warn("[telegram bot] maps_url:", mapsErr.error);
    }
  }

  const discovery = await runEventDiscovery(
    {
      slug,
      title: parsed.title,
      description: parsed.description,
      venue: parsed.venue,
      starts_at: startsAtIso,
      price_grosze: priceGrosze,
      listing_kind: parsed.listingKind,
      maps_url: mapsUrl ?? null,
      visibility,
      image_url: imageUrl,
    },
    { source: "telegram" },
  );

  for (const loc of routing.locales) {
    revalidatePath(`/${loc}`);
    revalidatePath(`/${loc}/events`);
    revalidatePath(`/${loc}/events/${slug}`);
  }
  revalidatePath("/admin");

  return {
    id: eventId,
    slug,
    title: parsed.title,
    startsAtIso,
    pricePln: parsed.pricePln,
    dayOfEventPricePln: parsed.dayOfEventPricePln,
    totalTickets: parsed.totalTickets,
    venue: parsed.venue,
    listingKind: parsed.listingKind,
    imageUrl,
    discovery,
  };
}

async function revalidateEventPaths(slug: string): Promise<void> {
  for (const loc of routing.locales) {
    revalidatePath(`/${loc}`);
    revalidatePath(`/${loc}/events`);
    revalidatePath(`/${loc}/events/${slug}`);
  }
  revalidatePath("/admin");
}

export type RevealEventResult = {
  slug: string;
  title: string;
  startsAtIso: string;
  alreadyLive: boolean;
  discovery: EventDiscoveryResult;
};

/**
 * Переводит ранее созданное (unlisted) событие в published и запускает discovery
 * (IndexNow + GBP). Idempotent: если уже published — discovery не повторяет.
 */
export async function revealEventOnSite(
  supabase: SupabaseClient,
  eventId: string,
): Promise<RevealEventResult | null> {
  const { data, error } = await supabase
    .from("events")
    .select(
      "slug,title,description,venue,starts_at,price_grosze,listing_kind,maps_url,image_url,visibility",
    )
    .eq("id", eventId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;

  const row = data as {
    slug: string;
    title: string;
    description: string;
    venue: string;
    starts_at: string;
    price_grosze: number;
    listing_kind: string | null;
    maps_url: string | null;
    image_url: string | null;
    visibility: string;
  };

  if (row.visibility === "published") {
    return {
      slug: row.slug,
      title: row.title,
      startsAtIso: row.starts_at,
      alreadyLive: true,
      discovery: { indexNow: "skipped", gbp: "skipped" },
    };
  }

  const upd = await supabase.from("events").update({ visibility: "published" }).eq("id", eventId);
  if (upd.error) throw new Error(upd.error.message);

  const discovery = await runEventDiscovery(
    {
      slug: row.slug,
      title: row.title,
      description: row.description,
      venue: row.venue,
      starts_at: row.starts_at,
      price_grosze: row.price_grosze,
      listing_kind: row.listing_kind,
      maps_url: row.maps_url,
      visibility: "published",
      image_url: row.image_url,
    },
    { source: "telegram" },
  );

  await revalidateEventPaths(row.slug);

  return {
    slug: row.slug,
    title: row.title,
    startsAtIso: row.starts_at,
    alreadyLive: false,
    discovery,
  };
}

/** Скрывает событие с сайта (visibility=inactive): убирает с афиши, закрывает чекаут. */
export async function hideEventFromSite(
  supabase: SupabaseClient,
  eventId: string,
): Promise<{ slug: string } | null> {
  const { data, error } = await supabase
    .from("events")
    .update({ visibility: "inactive" })
    .eq("id", eventId)
    .select("slug")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  const slug = (data as { slug: string }).slug;
  await revalidateEventPaths(slug);
  return { slug };
}

/** @deprecated alias */
export const createEventDraftFromParsed = createEventFromParsed;
