import type { AppLocale } from "@/i18n/routing";

export type TicketEmailStrings = {
  subjectPrefix: string;
  intro: string;
  colTicket: string;
  colQr: string;
  tagline: string;
};

const COPY: Record<AppLocale, TicketEmailStrings> = {
  pl: {
    subjectPrefix: "Bilety:",
    intro: "W załącznikach — kody QR dla każdego biletu. Na wejściu pokaż odpowiedni kod QR.",
    colTicket: "Numer biletu",
    colQr: "Identyfikator (QR)",
    tagline: "PopularTickets · bilety na wydarzenia w Polsce",
  },
  uk: {
    subjectPrefix: "Квитки:",
    intro: "У вкладеннях — QR-коди для кожного квитка. На вході покажіть відповідний QR-код.",
    colTicket: "Номер квитка",
    colQr: "Ідентифікатор (QR)",
    tagline: "PopularTickets · квитки на події в Польщі",
  },
  ru: {
    subjectPrefix: "Билеты:",
    intro: "Во вложениях — QR-коды для каждого билета. На входе покажите соответствующий QR-код.",
    colTicket: "Номер билета",
    colQr: "Идентификатор (QR)",
    tagline: "PopularTickets · билеты на события в Польше",
  },
};

export function ticketEmailStrings(locale: string | null | undefined): TicketEmailStrings {
  const l = locale === "uk" || locale === "ru" || locale === "pl" ? locale : "pl";
  return COPY[l];
}
