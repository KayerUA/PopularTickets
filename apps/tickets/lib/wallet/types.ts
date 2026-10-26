import type { AppLocale } from "@/i18n/routing";

export type WalletTicket = {
  id: string;
  ticketNumber: string;
  eventId: string;
  eventTitle: string;
  venue: string;
  startsAt: string;
  seatLabel: string;
  locale: AppLocale;
  usedAt: string | null;
};
