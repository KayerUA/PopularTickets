export type SeatMapState = {
  mode: "priority" | "open";
  seats: { id: string; row: string; number: string; column: number; status: "free" | "occupied" | "blocked" }[];
};
