/**
 * Bilet na wydarzenie kulturalne (wstęp) — w Polsce zwykle obniżona stawka VAT 8%
 * (ustawa o VAT, m.in. art. 41 ust. 12 pkt 4 w zw. z załącznikiem nr 3).
 * Ceny w serwisie są kwotami brutto (z VAT); netto i VAT wyliczamy z brutto.
 */

/** Licznik / mianownik: brutto = netto * 108/100, VAT = brutto * 8/108. */
const VAT_NUM = 8;
const VAT_DEN = 108;

export type PlTicketVatSplitGrosze = {
  /** Kwota brutto w groszach (tak jak w bazie). */
  grossGrosze: number;
  /** Netto w groszach (po odjęciu VAT od brutto, zaokrąglenie na korzyść nabywcy: netto w dół). */
  netGrosze: number;
  /** Kwota VAT w groszach (reszta: brutto − netto). */
  vatGrosze: number;
};

/**
 * Rozbicie ceny biletu z VAT 8% w cenie (brutto zawiera podatek).
 * Używa arytmetyki całkowitej w groszach: netto = floor(brutto * 100 / 108).
 */
export function splitTheatreTicketGrossGrosze(grossGrosze: number): PlTicketVatSplitGrosze {
  const g = Math.max(0, Math.round(grossGrosze));
  const netGrosze = Math.floor((g * (VAT_DEN - VAT_NUM)) / VAT_DEN);
  const vatGrosze = g - netGrosze;
  return { grossGrosze: g, netGrosze, vatGrosze };
}

export function splitTheatreTicketTotalGrosze(unitGrossGrosze: number, quantity: number): PlTicketVatSplitGrosze {
  const q = Math.max(0, Math.min(20, Math.floor(quantity)));
  return splitTheatreTicketGrossGrosze(unitGrossGrosze * q);
}
