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
}): string | null {
  const direct = typeof event.maps_url === "string" ? event.maps_url.trim() : "";
  if (direct) return direct;
  return extractGoogleMapsUrl(event.description);
}
