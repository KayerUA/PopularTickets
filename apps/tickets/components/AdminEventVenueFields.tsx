"use client";

import { useMemo, useState } from "react";
import {
  detectEventVenuePresetId,
  EVENT_VENUE_PRESETS,
  resolveVenueFieldsFromPreset,
  type EventVenuePresetId,
} from "@/lib/eventVenues";

type Props = {
  initialVenue: string;
  initialMapsUrl: string;
  listingKind: "performance" | "trial";
};

export function AdminEventVenueFields({ initialVenue, initialMapsUrl, listingKind }: Props) {
  const detectedPreset = useMemo(() => detectEventVenuePresetId(initialVenue), [initialVenue]);
  const [presetId, setPresetId] = useState<EventVenuePresetId>(detectedPreset);
  const [customVenue, setCustomVenue] = useState(detectedPreset === "custom" ? initialVenue : "");
  const [customMapsUrl, setCustomMapsUrl] = useState(detectedPreset === "custom" ? initialMapsUrl : "");

  const resolved = resolveVenueFieldsFromPreset(
    presetId,
    customVenue || initialVenue,
    customMapsUrl || initialMapsUrl,
    listingKind,
  );

  const isCustom = presetId === "custom";

  return (
    <>
      <label className="block text-sm text-zinc-300 sm:col-span-2">
        Площадка
        <select
          name="venuePresetId"
          value={presetId}
          onChange={(e) => setPresetId(e.target.value as EventVenuePresetId)}
          className="mt-1 w-full rounded-xl border border-poet-gold/20 bg-zinc-950 px-3 py-2 text-white"
        >
          {EVENT_VENUE_PRESETS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
          <option value="custom">Другая площадка (вручную)</option>
        </select>
        <span className="mt-1 block text-xs text-zinc-500">
          Справочник подставляет адрес и ссылку на карту — меньше ошибок для off-site событий.
        </span>
      </label>

      {isCustom ? (
        <>
          <label className="block text-sm text-zinc-300 sm:col-span-2">
            Адрес / место
            <input
              name="venue"
              required
              value={customVenue}
              onChange={(e) => setCustomVenue(e.target.value)}
              className="mt-1 w-full rounded-xl border border-poet-gold/20 bg-zinc-950 px-3 py-2 text-white"
            />
          </label>
          <label className="block text-sm text-zinc-300 sm:col-span-2">
            Карта (Google Maps)
            <input
              name="mapsUrl"
              type="url"
              value={customMapsUrl}
              onChange={(e) => setCustomMapsUrl(e.target.value)}
              className="mt-1 w-full rounded-xl border border-poet-gold/20 bg-zinc-950 px-3 py-2 text-white"
              placeholder="https://maps.app.goo.gl/..."
            />
          </label>
        </>
      ) : (
        <>
          <input type="hidden" name="venue" value={resolved.venue} />
          <input type="hidden" name="mapsUrl" value={resolved.mapsUrl} />
          <div className="sm:col-span-2 rounded-xl border border-poet-gold/15 bg-zinc-950/50 px-3 py-3 text-sm text-zinc-300">
            <p className="font-medium text-zinc-200">{resolved.venue}</p>
            {resolved.mapsUrl ? (
              <a
                href={resolved.mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 inline-block text-xs text-poet-gold underline decoration-poet-gold/40 underline-offset-2 hover:text-poet-gold-bright"
              >
                Открыть карту ↗
              </a>
            ) : null}
          </div>
        </>
      )}
    </>
  );
}
