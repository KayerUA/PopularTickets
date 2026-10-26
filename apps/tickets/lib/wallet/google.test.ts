import { generateKeyPairSync } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { importSPKI, jwtVerify } from "jose";
import { generateGoogleWalletSaveUrl, isGoogleWalletConfigured } from "./google";
import type { WalletTicket } from "./types";

const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
const privatePem = privateKey.export({ type: "pkcs8", format: "pem" }).toString();
const publicPem = publicKey.export({ type: "spki", format: "pem" }).toString();

const ticket: WalletTicket = {
  id: "5b976445-46f3-44ea-a976-18fc9ebde3c9",
  ticketNumber: "TKT-ABC123",
  eventId: "476e5409-e133-4541-98bd-c531f9b37449",
  eventTitle: "Evening at the Theatre",
  venue: "Warsaw Theatre",
  startsAt: "2026-07-15T17:00:00Z",
  seatLabel: "A12",
  locale: "pl",
  usedAt: null,
};

const envNames = [
  "GOOGLE_WALLET_ISSUER_ID",
  "GOOGLE_WALLET_CLIENT_EMAIL",
  "GOOGLE_WALLET_PRIVATE_KEY",
  "GOOGLE_WALLET_HERO_URL",
  "NEXT_PUBLIC_APP_URL",
] as const;
const savedEnv = Object.fromEntries(envNames.map((name) => [name, process.env[name]]));

beforeEach(() => {
  process.env.GOOGLE_WALLET_ISSUER_ID = "123456789";
  process.env.GOOGLE_WALLET_CLIENT_EMAIL = "wallet@example.iam.gserviceaccount.com";
  process.env.GOOGLE_WALLET_PRIVATE_KEY = privatePem.replace(/\n/g, "\\n");
  process.env.GOOGLE_WALLET_HERO_URL = "https://cdn.populartickets.pl/theatre.png";
  process.env.NEXT_PUBLIC_APP_URL = "https://populartickets.pl";
});

afterEach(() => {
  for (const name of envNames) {
    const original = savedEnv[name];
    if (original === undefined) delete process.env[name];
    else process.env[name] = original;
  }
  vi.restoreAllMocks();
});

describe("Google Wallet save link", () => {
  it("signs an inline event ticket with the existing check-in UUID", async () => {
    expect(isGoogleWalletConfigured()).toBe(true);
    const url = await generateGoogleWalletSaveUrl(ticket);
    expect(url).toMatch(/^https:\/\/pay\.google\.com\/gp\/v\/save\//);

    const jwt = url.slice("https://pay.google.com/gp/v/save/".length);
    const key = await importSPKI(publicPem, "RS256");
    const { payload, protectedHeader } = await jwtVerify(jwt, key, {
      issuer: "wallet@example.iam.gserviceaccount.com",
      audience: "google",
    });
    expect(protectedHeader.alg).toBe("RS256");
    expect(payload.typ).toBe("savetowallet");
    expect(payload.origins).toEqual(["https://www.populartickets.pl"]);
    const inner = payload.payload as {
      eventTicketClasses: Record<string, unknown>[];
      eventTicketObjects: Record<string, unknown>[];
    };
    expect(inner.eventTicketClasses[0]).toMatchObject({
      id: `123456789.event_${ticket.eventId}`,
      reviewStatus: "UNDER_REVIEW",
      issuerName: "Popular Poet",
      hexBackgroundColor: "#180a0e",
      multipleDevicesAndHoldersAllowedStatus: "ONE_USER_ALL_DEVICES",
      dateTime: { start: "2026-07-15T19:00:00+02:00" },
    });
    expect(inner.eventTicketClasses[0]).toHaveProperty("logo");
    expect(inner.eventTicketClasses[0]).toHaveProperty("heroImage");
    expect(inner.eventTicketClasses[0]).not.toHaveProperty("wideLogo");
    expect(inner.eventTicketObjects[0]).toMatchObject({
      id: `123456789.event_${ticket.eventId}_ticket_${ticket.id}`,
      classId: `123456789.event_${ticket.eventId}`,
      state: "ACTIVE",
      ticketNumber: ticket.ticketNumber,
      barcode: { type: "QR_CODE", value: ticket.id, alternateText: ticket.ticketNumber },
      seatInfo: { seat: { defaultValue: { value: "A12" } } },
    });
  });

  it("keeps the QR check-in value while showing a short event title and readable ticket number", async () => {
    const url = await generateGoogleWalletSaveUrl({
      ...ticket,
      eventTitle: "Спектакль «Боинг-Боинг»",
      venue: "Bemowskie Centrum Kultury — Scena Kocjana, ul. Kocjana 3, 01-473 Warszawa",
    });
    const jwt = url.slice("https://pay.google.com/gp/v/save/".length);
    const { payload } = await jwtVerify(jwt, await importSPKI(publicPem, "RS256"));
    const inner = payload.payload as {
      eventTicketClasses: { eventName: { defaultValue: { value: string } }; venue: { name: { defaultValue: { value: string } } }; linksModuleData?: { uris: { uri: string; description: string }[] } }[];
      eventTicketObjects: { barcode: { value: string; alternateText: string } }[];
    };
    expect(inner.eventTicketClasses[0]?.eventName.defaultValue.value).toBe("Боинг-Боинг");
    expect(inner.eventTicketClasses[0]?.venue.name.defaultValue.value).toBe("Scena Kocjana");
    expect(inner.eventTicketClasses[0]?.linksModuleData?.uris).toEqual([{
      uri: "https://maps.app.goo.gl/SCe4bTuSdRbUdjha9?g_st=ic",
      description: "Otwórz w Mapach Google",
      id: "venue-map",
    }]);
    expect(inner.eventTicketObjects[0]?.barcode).toMatchObject({
      value: ticket.id,
      alternateText: ticket.ticketNumber,
    });
  });

  it("marks tickets already used when the link is created", async () => {
    const url = await generateGoogleWalletSaveUrl({ ...ticket, usedAt: "2026-07-15T19:30:00+02:00" });
    const jwt = url.slice("https://pay.google.com/gp/v/save/".length);
    const { payload } = await jwtVerify(jwt, await importSPKI(publicPem, "RS256"));
    const inner = payload.payload as { eventTicketObjects: { state: string }[] };
    expect(inner.eventTicketObjects[0]?.state).toBe("INACTIVE");
  });

  it("requires issuer credentials and a valid event time", async () => {
    delete process.env.GOOGLE_WALLET_PRIVATE_KEY;
    expect(isGoogleWalletConfigured()).toBe(false);
    await expect(generateGoogleWalletSaveUrl(ticket)).rejects.toThrow("not configured");
    process.env.GOOGLE_WALLET_PRIVATE_KEY = privatePem;
    await expect(generateGoogleWalletSaveUrl({ ...ticket, startsAt: "not a date" })).rejects.toThrow("Invalid event start time");
  });
});
