/** Известные площадки PopularTickets — координаты для JSON-LD / geo meta (не путать залы). */
export type KnownVenue = {
  lat: number;
  lng: number;
  postalCode: string;
  placename: string;
  district: string;
  mapsUrl: string;
};

const DOMANIEWSKA: KnownVenue = {
  lat: 52.1783,
  lng: 21.0034,
  postalCode: "02-677",
  placename: "Warsaw, Mokotów",
  district: "Mokotów",
  mapsUrl: "https://maps.app.goo.gl/BtaKyKYvp6nGZbx37",
};

const SCENA_KOCJANA: KnownVenue = {
  lat: 52.2544,
  lng: 20.9253,
  postalCode: "01-473",
  placename: "Warsaw, Bemowo",
  district: "Bemowo",
  mapsUrl: "https://maps.app.goo.gl/SCe4bTuSdRbUdjha9?g_st=ic",
};

const STAND_UP_LOKAL: KnownVenue = {
  lat: 52.2217,
  lng: 21.01,
  postalCode: "00-666",
  placename: "Warsaw, Śródmieście",
  district: "Śródmieście",
  mapsUrl:
    "https://www.google.com/maps/search/?api=1&query=Stand+up+Lokal+ul.+Stanislawa+Noakowskiego+16+Warszawa",
};

export function knownVenueFromAddress(venue: string | null | undefined): KnownVenue | null {
  const value = (venue ?? "").toLowerCase();
  if (!value.trim()) return null;
  if (value.includes("domaniewska") && value.includes("37")) return DOMANIEWSKA;
  if (value.includes("kocjana") || value.includes("bemowskie centrum")) return SCENA_KOCJANA;
  if (value.includes("noakowskiego") || value.includes("stand up lokal") || value.includes("stand-up lokal")) {
    return STAND_UP_LOKAL;
  }
  return null;
}

export function eventSearchAliases(title: string): string[] {
  const aliases = new Set<string>();
  for (const match of title.matchAll(/[«"]([^»"]+)[»"]/g)) {
    const quoted = match[1]?.trim();
    if (!quoted) continue;
    aliases.add(quoted);
    aliases.add(quoted.replace(/-/g, " "));
  }
  if (/боинг|boeing/i.test(title)) {
    aliases.add("Boeing-Boeing");
    aliases.add("Boeing Boeing");
    aliases.add("Боинг Боинг");
  }
  if (/нога в ногу|noga w nogu/i.test(title)) {
    aliases.add("Нога в ногу");
    aliases.add("Noga w nogu");
  }
  return [...aliases];
}

export function isStagedPlay(title: string, description = ""): boolean {
  const text = `${title} ${description}`.toLowerCase();
  return /spektakl|спектакл|вистав|фарс|fars/.test(text);
}
