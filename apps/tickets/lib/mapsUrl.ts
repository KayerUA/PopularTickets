import {
  defaultMapsUrlForEvent,
  type EventListingKind,
} from "@/lib/theatreVenueDefaults";
import { normalizeHttpUrl } from "@/lib/safePublicUrl";

/** Первая ссылка на Google Maps в тексте (maps.app.goo.gl или google.com/maps). */
export function extractGoogleMapsUrl(text: string | null | undefined): string | null {
  if (!text) return null;
  const goo = text.match(/https:\/\/maps\.app\.goo\.gl\/[a-zA-Z0-9_-]+(?:\?[^\s)\]]*)?/i);
  if (goo) return goo[0].replace(/[.,;]+$/, "");
  const gmaps = text.match(/https:\/\/(?:www\.)?google\.com\/maps[^\s)\]]+/i);
  if (gmaps) return gmaps[0].replace(/[.,;]+$/, "");
  return null;
}

export function resolveEventMapsUrl(event: {
  maps_url?: string | null;
  description: string;
  venue?: string | null;
  listing_kind?: EventListingKind | null;
}): string | null {
  const direct = typeof event.maps_url === "string" ? normalizeHttpUrl(event.maps_url) : null;
  if (direct) return direct;
  const fromDescription = extractGoogleMapsUrl(event.description);
  if (fromDescription) return fromDescription;
  const venue = event.venue ?? "";
  const listingKind = event.listing_kind ?? "performance";
  const fallback = defaultMapsUrlForEvent(venue, listingKind);
  return fallback ? normalizeHttpUrl(fallback) : null;
}
