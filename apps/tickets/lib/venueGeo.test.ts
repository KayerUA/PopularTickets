import { describe, expect, it } from "vitest";
import { eventSearchAliases, isStagedPlay, knownVenueFromAddress } from "@/lib/venueGeo";

describe("knownVenueFromAddress", () => {
  it("maps Scena Kocjana to Bemowo coordinates, not Domaniewska", () => {
    const venue = knownVenueFromAddress(
      "Bemowskie Centrum Kultury — Scena Kocjana, ul. Kocjana 3, 01-473 Warszawa",
    );
    expect(venue?.district).toBe("Bemowo");
    expect(venue?.postalCode).toBe("01-473");
    expect(venue?.lat).toBeCloseTo(52.2544, 3);
    expect(venue?.lng).toBeCloseTo(20.9253, 3);
    expect(venue?.mapsUrl).toBe("https://maps.app.goo.gl/SCe4bTuSdRbUdjha9?g_st=ic");
  });

  it("keeps the Mokotów theatre on Domaniewska 37", () => {
    const venue = knownVenueFromAddress("Warszawa, ul. Domaniewska 37, lokal 42");
    expect(venue?.district).toBe("Mokotów");
  });

  it("maps Stand up Lokal to Śródmieście, not Domaniewska", () => {
    const venue = knownVenueFromAddress("Stand up Lokal, ul. Stanisława Noakowskiego 16, 00-666 Warszawa");
    expect(venue?.district).toBe("Śródmieście");
    expect(venue?.postalCode).toBe("00-666");
    expect(venue?.lat).toBeCloseTo(52.2217, 3);
    expect(venue?.lng).toBeCloseTo(21.01, 3);
  });
});

describe("eventSearchAliases", () => {
  it("adds Latin Boeing-Boeing for the Russian title", () => {
    expect(eventSearchAliases("Спектакль «Боинг-Боинг»")).toEqual(
      expect.arrayContaining(["Боинг-Боинг", "Boeing-Boeing", "Boeing Boeing"]),
    );
  });

  it("adds Latin Noga w nogu for the Russian team name", () => {
    expect(eventSearchAliases("Шоу импровизации «Нога в ногу»")).toEqual(
      expect.arrayContaining(["Нога в ногу", "Noga w nogu"]),
    );
  });
});

describe("isStagedPlay", () => {
  it("treats a spektakl as a play", () => {
    expect(isStagedPlay("Спектакль «Боинг-Боинг»", "Фарс")).toBe(true);
    expect(isStagedPlay("Комедийное шоу импровизаторов", "живая импровизация")).toBe(false);
  });
});
