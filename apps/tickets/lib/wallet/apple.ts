import { readFile } from "node:fs/promises";
import path from "node:path";
import { DateTime } from "luxon";
import { PKPass } from "passkit-generator";
import sharp from "sharp";
import { EVENT_ADMIN_TIMEZONE } from "@/lib/warsawEventDatetime";
import type { WalletTicket } from "./types";

const requiredEnv = [
  "APPLE_WALLET_PASS_TYPE_ID",
  "APPLE_WALLET_TEAM_ID",
  "APPLE_WALLET_CERTIFICATE",
  "APPLE_WALLET_PRIVATE_KEY",
  "APPLE_WALLET_WWDR_CERTIFICATE",
] as const;

const labels = {
  pl: { date: "Data", time: "Godzina", venue: "Miejsce", seat: "Miejsce", ticket: "Bilet", used: "Wykorzystany", warsaw: "Warszawa" },
  uk: { date: "Дата", time: "Час", venue: "Місце", seat: "Місце", ticket: "Квиток", used: "Використано", warsaw: "Варшава" },
  ru: { date: "Дата", time: "Время", venue: "Место", seat: "Место", ticket: "Билет", used: "Использован", warsaw: "Варшава" },
} as const;

function pem(name: (typeof requiredEnv)[number]): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Apple Wallet is missing ${name}`);
  return value.replace(/\\n/g, "\n");
}

export function isAppleWalletConfigured(): boolean {
  return requiredEnv.every((name) => Boolean(process.env[name]?.trim()));
}

async function brandImage(): Promise<Buffer> {
  const relativePath = path.join("public", "brand", "popular-poet-logo.png");
  const candidates = [
    path.join(process.cwd(), relativePath),
    path.join(process.cwd(), "apps", "tickets", relativePath),
  ];
  for (const candidate of candidates) {
    try {
      return await readFile(candidate);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
  }
  throw new Error("Apple Wallet brand image is missing");
}

export async function generateAppleWalletPass(ticket: WalletTicket): Promise<Buffer> {
  if (!isAppleWalletConfigured()) throw new Error("Apple Wallet is not configured");
  if (!ticket.id.trim()) throw new Error("Apple Wallet ticket ID is missing");
  if (!/(?:Z|[+-]\d{2}:\d{2})$/i.test(ticket.startsAt)) {
    throw new Error("Apple Wallet event start needs a time zone offset");
  }

  const startsAt = DateTime.fromISO(ticket.startsAt, { setZone: true });
  if (!startsAt.isValid) throw new Error("Apple Wallet event start is invalid");
  const warsawStart = startsAt.setZone(EVENT_ADMIN_TIMEZONE);
  const locale = ticket.locale in labels ? ticket.locale : "pl";
  const label = labels[locale];
  const image = await brandImage();
  const signerKeyPassphrase = process.env.APPLE_WALLET_KEY_PASSPHRASE?.trim();

  const pass = new PKPass(
    {
      "icon.png": await sharp(image).resize(29, 29, { fit: "cover" }).png().toBuffer(),
      "icon@2x.png": await sharp(image).resize(58, 58, { fit: "cover" }).png().toBuffer(),
      "thumbnail.png": await sharp(image).resize(90, 90, { fit: "cover" }).png().toBuffer(),
      "thumbnail@2x.png": await sharp(image).resize(180, 180, { fit: "cover" }).png().toBuffer(),
    },
    {
      wwdr: pem("APPLE_WALLET_WWDR_CERTIFICATE"),
      signerCert: pem("APPLE_WALLET_CERTIFICATE"),
      signerKey: pem("APPLE_WALLET_PRIVATE_KEY"),
      ...(signerKeyPassphrase ? { signerKeyPassphrase } : {}),
    },
    {
      formatVersion: 1,
      passTypeIdentifier: pem("APPLE_WALLET_PASS_TYPE_ID"),
      teamIdentifier: pem("APPLE_WALLET_TEAM_ID"),
      serialNumber: ticket.id,
      organizationName: "PopularTickets",
      description: `${ticket.eventTitle} — Popular Poet`,
      logoText: "Popular Poet",
      backgroundColor: "rgb(22, 20, 18)",
      foregroundColor: "rgb(255, 247, 224)",
      labelColor: "rgb(218, 174, 98)",
      ...(ticket.usedAt ? { voided: true } : {}),
    },
  );

  pass.type = "eventTicket";
  pass.primaryFields.push({ key: "event", label: "Popular Poet", value: ticket.eventTitle });
  pass.secondaryFields.push(
    { key: "date", label: label.date, value: warsawStart.setLocale(locale).toFormat("d MMMM yyyy") },
    { key: "time", label: label.time, value: `${warsawStart.toFormat("HH:mm")} (${label.warsaw})` },
  );
  pass.auxiliaryFields.push({ key: "venue", label: label.venue, value: ticket.venue });
  if (ticket.seatLabel.trim()) {
    pass.auxiliaryFields.push({ key: "seat", label: label.seat, value: ticket.seatLabel });
  }
  pass.backFields.push({ key: "ticketNumber", label: label.ticket, value: ticket.ticketNumber });
  if (ticket.usedAt) {
    pass.backFields.push({ key: "used", label: label.used, value: ticket.usedAt });
  }
  pass.setBarcodes({ format: "PKBarcodeFormatQR", message: ticket.id, messageEncoding: "iso-8859-1", altText: ticket.ticketNumber });
  pass.setRelevantDate(startsAt.toJSDate());

  return pass.getAsBuffer();
}
