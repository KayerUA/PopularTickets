/**
 * Geometry transcribed from the venue screenshot supplied on 2026-09-16.
 * Occupancy from that other performance is intentionally not part of this map.
 * This template does not establish availability for any particular event.
 */
export type VenueSeat = {
  id: string;
  row: string;
  number: string;
  column: number;
  blocked: boolean;
};

const rows = [
  { row: "I", count: 16, start: 4 },
  { row: "II", count: 17, start: 4 },
  { row: "III", count: 16, start: 4, sides: true },
  { row: "IV", count: 17, start: 4, sides: true },
  { row: "V", count: 18, start: 4, sides: true },
  { row: "VI", count: 17, start: 4, sides: true },
  { row: "VII", count: 18, start: 4, sides: true },
  { row: "VIII", count: 18, start: 3 },
  { row: "IX", count: 15, start: 4 },
  { row: "X", count: 14, start: 6 },
  { row: "XI", count: 11, start: 6 },
  { row: "XII", count: 7, start: 6 },
] as const;

export const SCENA_KOCJANA = {
  id: "scena-kocjana",
  name: "Scena Kocjana",
  address: "A. Kocjana 3, 01-473 Warszawa",
  rows: rows.map(({ row }) => row),
  seats: rows.flatMap((layout): VenueSeat[] => {
    const main = Array.from({ length: layout.count }, (_, index) => ({
      id: `${layout.row}-${index + 1}`,
      row: layout.row,
      number: String(index + 1),
      column: layout.start + index + (layout.row === "XI" && index >= 6 ? 3 : 0),
      blocked: false,
    }));
    const sides: VenueSeat[] = "sides" in layout
      ? [
          { number: "1a", column: 0 },
          { number: "1b", column: 1 },
          { number: "1c", column: 24 },
          { number: "1d", column: 25 },
        ].map(({ number, column }) => ({
          id: `${layout.row}-${number}`,
          row: layout.row,
          number,
          column,
          // User decision: side seats remain visible but cannot be selected.
          blocked: true,
        }))
      : [];
    return [...main, ...sides].sort((a, b) => a.column - b.column);
  }),
} as const;
