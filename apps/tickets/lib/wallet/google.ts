import { importPKCS8, SignJWT } from "jose";
import { DateTime } from "luxon";
import { getPublicAppUrl } from "@/lib/publicAppUrl";
import type { WalletTicket } from "@/lib/wallet/types";
import { knownVenueFromAddress } from "@/lib/venueGeo";

const SAVE_URL = "https://pay.google.com/gp/v/save/";
const WALLET_ID_RE = /^[A-Za-z0-9._-]+$/;
const LANGUAGE: Record<WalletTicket["locale"], string> = {
  pl: "pl-PL",
  uk: "uk-UA",
  ru: "ru-RU",
};

function config(): { issuerId: string; clientEmail: string; privateKey: string } | null {
  const issuerId = process.env.GOOGLE_WALLET_ISSUER_ID?.trim();
  const clientEmail = process.env.GOOGLE_WALLET_CLIENT_EMAIL?.trim();
  const privateKey = process.env.GOOGLE_WALLET_PRIVATE_KEY?.replace(/\\n/g, "\n").trim();
  if (!issuerId || !WALLET_ID_RE.test(issuerId) || !clientEmail || !privateKey) return null;
  return { issuerId, clientEmail, privateKey };
}

export function isGoogleWalletConfigured(): boolean {
  return config() !== null;
}

function localized(value: string, language: string) {
  return { defaultValue: { language, value } };
}

function displayEventName(title: string): string {
  const match = title.match(/^(?:Спектакль|Spektakl)\s+[«„"](.+?)[»“"]$/iu);
  return match?.[1]?.trim() || title;
}

function displayVenueName(venue: string): string {
  const firstPart = venue.split(",", 1)[0]?.trim() || venue;
  return firstPart.split(" — ").at(-1)?.trim() || firstPart;
}

function brandingImage(raw: string | undefined, description: string) {
  if (!raw) return undefined;
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:" || url.username || url.password) return undefined;
    return { sourceUri: { uri: url.toString() }, contentDescription: localized(description, "pl") };
  } catch {
    return undefined;
  }
}

function origins(): string[] {
  const publicUrl = getPublicAppUrl();
  if (!publicUrl) return [];
  try {
    const url = new URL(publicUrl);
    return url.protocol === "https:" || url.hostname === "localhost" ? [url.origin] : [];
  } catch {
    return [];
  }
}

export async function generateGoogleWalletSaveUrl(ticket: WalletTicket): Promise<string> {
  const settings = config();
  if (!settings) throw new Error("Google Wallet is not configured");
  if (!WALLET_ID_RE.test(ticket.id) || !WALLET_ID_RE.test(ticket.eventId)) {
    throw new Error("Invalid ticket or event ID");
  }

  const startsAt = DateTime.fromISO(ticket.startsAt, { setZone: true });
  if (!startsAt.isValid) throw new Error("Invalid event start time");
  const localStart = startsAt.setZone("Europe/Warsaw").toISO({ suppressMilliseconds: true });
  if (!localStart) throw new Error("Invalid event start time");

  const title = ticket.eventTitle.trim();
  const venue = ticket.venue.trim();
  if (!title || !venue) throw new Error("Missing event title or venue");

  const language = LANGUAGE[ticket.locale];
  const venueMapUrl = knownVenueFromAddress(venue)?.mapsUrl;
  const mapLabel = ticket.locale === "pl" ? "Otwórz w Mapach Google" : ticket.locale === "uk" ? "Відкрити в Google Картах" : "Открыть в Google Картах";
  const classId = `${settings.issuerId}.event_${ticket.eventId}`;
  const objectId = `${settings.issuerId}.event_${ticket.eventId}_ticket_${ticket.id}`;
  const base = getPublicAppUrl();
  const logo = brandingImage(process.env.GOOGLE_WALLET_LOGO_URL || (base ? `${base}/brand/popular-poet-logo.png` : undefined), "Popular Poet");
  const heroImage = brandingImage(process.env.GOOGLE_WALLET_HERO_URL, "Scena teatralna Popular Poet");
  const eventTicketClass = {
    id: classId,
    issuerName: "Popular Poet",
    hexBackgroundColor: "#180a0e",
    countryCode: "PL",
    multipleDevicesAndHoldersAllowedStatus: "ONE_USER_ALL_DEVICES",
    ...(logo ? { logo } : {}),
    ...(heroImage ? { heroImage } : {}),
    reviewStatus: "UNDER_REVIEW",
    eventId: ticket.eventId,
    eventName: localized(displayEventName(title), language),
    venue: { name: localized(displayVenueName(venue), language), address: localized(venue, language) },
    ...(venueMapUrl ? { linksModuleData: { uris: [{ uri: venueMapUrl, description: mapLabel, id: "venue-map" }] } } : {}),
    dateTime: { start: localStart },
  };
  const eventTicketObject = {
    id: objectId,
    classId,
    state: ticket.usedAt ? "INACTIVE" : "ACTIVE",
    ticketNumber: ticket.ticketNumber,
    barcode: { type: "QR_CODE", value: ticket.id, alternateText: ticket.ticketNumber },
    ...(ticket.seatLabel.trim()
      ? { seatInfo: { seat: localized(ticket.seatLabel.trim(), language) } }
      : {}),
  };

  const key = await importPKCS8(settings.privateKey, "RS256");
  const jwt = await new SignJWT({
    typ: "savetowallet",
    origins: origins(),
    payload: {
      eventTicketClasses: [eventTicketClass],
      eventTicketObjects: [eventTicketObject],
    },
  })
    .setProtectedHeader({ alg: "RS256", typ: "JWT" })
    .setIssuer(settings.clientEmail)
    .setAudience("google")
    .setIssuedAt()
    .sign(key);

  return `${SAVE_URL}${jwt}`;
}
