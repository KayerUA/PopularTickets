import {
  defaultMapsUrlForEvent,
  isPopularPoetTheatreVenue,
  POPULAR_POET_THEATRE_MAPS_URL,
  POPULAR_POET_TRIAL_VENUE_PL,
} from "@/lib/theatreVenueDefaults";

/** Legacy maps URL — Świetlica Wolności, off-site improv. */
export const SWIETLICA_WOLNOSCI_MAPS_URL = "https://maps.app.goo.gl/jz9E6JUn8rcymRoH7?g_st=ic";

export const SWIETLICA_WOLNOSCI_VENUE =
  "Świetlica Wolności — Nowy Świat 6/12, 00-400 Warszawa";

export type EventVenuePresetId = "popular-poet-theatre" | "swietlica-wolnosci" | "custom";

export type EventVenuePreset = {
  id: EventVenuePresetId;
  label: string;
  venue: string;
  mapsUrl: string;
  defaultForTrial?: boolean;
};

export const EVENT_VENUE_PRESETS: EventVenuePreset[] = [
  {
    id: "popular-poet-theatre",
    label: "Popular Poet — Domaniewska 37 (Zepter, piętro 5)",
    venue: POPULAR_POET_TRIAL_VENUE_PL,
    mapsUrl: POPULAR_POET_THEATRE_MAPS_URL,
    defaultForTrial: true,
  },
  {
    id: "swietlica-wolnosci",
    label: "Świetlica Wolności — Nowy Świat 6/12",
    venue: SWIETLICA_WOLNOSCI_VENUE,
    mapsUrl: SWIETLICA_WOLNOSCI_MAPS_URL,
  },
];

export function getEventVenuePreset(id: EventVenuePresetId): EventVenuePreset | undefined {
  return EVENT_VENUE_PRESETS.find((p) => p.id === id);
}

export function detectEventVenuePresetId(venue: string): EventVenuePresetId {
  const v = venue.trim();
  if (!v) return "popular-poet-theatre";
  if (isPopularPoetTheatreVenue(v)) return "popular-poet-theatre";
  const lower = v.toLowerCase();
  if (lower.includes("wietlica") || lower.includes("nowy świat") || lower.includes("nowy swiat")) {
    return "swietlica-wolnosci";
  }
  return "custom";
}

export function resolveVenueFieldsFromPreset(
  presetId: EventVenuePresetId,
  customVenue: string,
  customMapsUrl: string,
  listingKind: "performance" | "trial",
): { venue: string; mapsUrl: string } {
  if (presetId === "custom") {
    const venue = customVenue.trim();
    const mapsUrl =
      customMapsUrl.trim() || (venue ? defaultMapsUrlForEvent(venue, listingKind) : "");
    return { venue, mapsUrl };
  }
  const preset = getEventVenuePreset(presetId);
  if (!preset) return { venue: customVenue.trim(), mapsUrl: customMapsUrl.trim() };
  return { venue: preset.venue, mapsUrl: preset.mapsUrl };
}
