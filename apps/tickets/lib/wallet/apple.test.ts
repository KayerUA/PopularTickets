import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { WalletTicket } from "./types";

const passState = vi.hoisted(() => ({ instances: [] as Array<Record<string, unknown>> }));

vi.mock("passkit-generator", () => ({
  PKPass: class {
    type = "";
    primaryFields: Array<Record<string, unknown>> = [];
    secondaryFields: Array<Record<string, unknown>> = [];
    auxiliaryFields: Array<Record<string, unknown>> = [];
    backFields: Array<Record<string, unknown>> = [];
    barcode: Record<string, unknown> | undefined;
    relevantDate: Date | undefined;

    constructor(public images: Record<string, Buffer>, public certificates: Record<string, string>, public props: Record<string, unknown>) {
      passState.instances.push(this as unknown as Record<string, unknown>);
    }

    setBarcodes(barcode: Record<string, unknown>) { this.barcode = barcode; }
    setRelevantDate(date: Date) { this.relevantDate = date; }
    getAsBuffer() { return Buffer.from("pass-buffer"); }
  },
}));

import { generateAppleWalletPass, isAppleWalletConfigured } from "./apple";

const ticket: WalletTicket = {
  id: "d218a49e-5b39-4783-95f8-7fc342e23fb5",
  ticketNumber: "PP-2048",
  eventId: "event-1",
  eventTitle: "Wieczór poezji",
  venue: "Popular Poet, Warszawa",
  startsAt: "2026-07-10T17:00:00.000Z",
  seatLabel: "Rząd 2, miejsce 4",
  locale: "pl",
  usedAt: null,
};

function configure() {
  vi.stubEnv("APPLE_WALLET_PASS_TYPE_ID", "pass.com.example.popularpoet");
  vi.stubEnv("APPLE_WALLET_TEAM_ID", "ABC12345");
  vi.stubEnv("APPLE_WALLET_CERTIFICATE", "CERT\\nLINE");
  vi.stubEnv("APPLE_WALLET_PRIVATE_KEY", "KEY\\nLINE");
  vi.stubEnv("APPLE_WALLET_WWDR_CERTIFICATE", "WWDR\\nLINE");
}

beforeEach(() => { passState.instances.length = 0; });
afterEach(() => { vi.unstubAllEnvs(); });

describe("Apple Wallet ticket pass", () => {
  it("requires every signing setting", async () => {
    configure();
    expect(isAppleWalletConfigured()).toBe(true);
    vi.stubEnv("APPLE_WALLET_WWDR_CERTIFICATE", "");
    expect(isAppleWalletConfigured()).toBe(false);
    await expect(generateAppleWalletPass(ticket)).rejects.toThrow("not configured");
  });

  it("uses the ticket ID for the QR and stable serial, with Warsaw summer time", async () => {
    configure();
    expect(await generateAppleWalletPass(ticket)).toEqual(Buffer.from("pass-buffer"));
    const pass = passState.instances[0];
    expect(pass.type).toBe("eventTicket");
    expect((pass.props as Record<string, unknown>).serialNumber).toBe(ticket.id);
    expect(pass.barcode).toMatchObject({ format: "PKBarcodeFormatQR", message: ticket.id, altText: ticket.ticketNumber });
    expect(pass.secondaryFields).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: "date", value: "10 lipca 2026" }),
      expect.objectContaining({ key: "time", value: "19:00 (Warszawa)" }),
    ]));
    expect(pass.auxiliaryFields).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: "venue", value: ticket.venue }),
      expect.objectContaining({ key: "seat", value: ticket.seatLabel }),
    ]));
    expect((pass.relevantDate as Date).toISOString()).toBe(ticket.startsAt);
    expect((pass.images as Record<string, Buffer>)["icon.png"].subarray(0, 8)).toEqual(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    expect(pass.certificates).toMatchObject({ signerCert: "CERT\nLINE", signerKey: "KEY\nLINE", wwdr: "WWDR\nLINE" });
  });

  it("marks a used ticket void and omits an empty seat", async () => {
    configure();
    await generateAppleWalletPass({ ...ticket, seatLabel: "", usedAt: "2026-07-10T17:35:00Z" });
    const pass = passState.instances[0];
    expect((pass.props as Record<string, unknown>).voided).toBe(true);
    expect(pass.auxiliaryFields).toEqual([expect.objectContaining({ key: "venue" })]);
  });
});
