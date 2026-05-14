/** Kanoniczny URL serwisu PopularTickets (bez końcowego `/`). */
export function getTicketsSiteBase(): string {
  return (process.env.NEXT_PUBLIC_TICKETS_SITE_URL ?? "").trim().replace(/\/+$/, "");
}

export function ticketsHome(locale: "pl" | "uk" | "ru" = "pl"): string {
  const b = getTicketsSiteBase();
  if (!b) return "#";
  return `${b}/${locale}`;
}
