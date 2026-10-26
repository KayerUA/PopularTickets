import { describe, expect, it } from "vitest";
import { PDFDict, PDFDocument, PDFName, PDFString } from "pdf-lib";
import { ticketQrDataUrl } from "@/lib/qrDataUrl";
import { renderTicketLayoutPdf, type TicketLayoutDocInput } from "@/lib/renderTicketLayoutPdf";

async function render(venue: string) {
  const ticketId = "5b976445-46f3-44ea-a976-18fc9ebde3c9";
  const input: TicketLayoutDocInput = {
    qrPngDataUrl: await ticketQrDataUrl(ticketId),
    eventTitle: "Спектакль «Боинг-Боинг»",
    venue,
    dateTimeLabel: "4 października 2026 · 19:00",
    ticketNumber: "TKT-ABC123",
    ticketId,
    ticketKindSecondary: "",
    ticketQrSecondary: "",
    ticketDisclaimer: "",
    ticketLabel: "Bilet",
    ticketRibbon: "Jeden widz",
    stubControl: "Kontrola",
  };
  return PDFDocument.load(await renderTicketLayoutPdf(input));
}

describe("ticket PDF venue map", () => {
  it("adds an exact clickable Kocjana map link on a single page", async () => {
    const pdf = await render("Bemowskie Centrum Kultury — Scena Kocjana, ul. Kocjana 3, 01-473 Warszawa");
    expect(pdf.getPageCount()).toBe(1);
    const page = pdf.getPage(0);
    expect(page.getHeight()).toBe(264);
    const annotations = page.node.Annots();
    expect(annotations?.size()).toBe(1);
    const annotation = annotations?.lookup(0, PDFDict);
    expect(annotation?.lookup(PDFName.of("Subtype"), PDFName)?.asString()).toBe("/Link");
    const action = annotation?.lookup(PDFName.of("A"), PDFDict);
    expect(action?.lookup(PDFName.of("URI"), PDFString)?.decodeText()).toBe(
      "https://maps.app.goo.gl/SCe4bTuSdRbUdjha9?g_st=ic",
    );
  });

  it("keeps unknown venues at the original height without a map annotation", async () => {
    const pdf = await render("A venue without a known map");
    expect(pdf.getPageCount()).toBe(1);
    expect(pdf.getPage(0).getHeight()).toBe(248);
    expect(pdf.getPage(0).node.Annots()?.size() ?? 0).toBe(0);
  });
});
