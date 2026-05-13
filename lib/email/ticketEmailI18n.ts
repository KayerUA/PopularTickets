import type { AppLocale } from "@/i18n/routing";
import type { TicketLayoutDocInput } from "@/lib/renderTicketLayoutPdf";

export type TicketEmailStrings = {
  subjectPrefix: string;
  intro: string;
  colTicket: string;
  /** Nagłówek drugiej kolumny tabeli. */
  attachmentColumnTitle: string;
  /** Druga kolumna: neutralny opis (przy awarii PDF w załączniku będzie PNG). */
  colAttachment: string;
  tagline: string;
  /** Пояснение, почему в письме не показываем длинный UUID в таблице. */
  backupIdNote: string;
  /** Кратко про VAT 8% для билета (потребитель). */
  vatConsumerNote: string;
};

const COPY: Record<AppLocale, TicketEmailStrings> = {
  pl: {
    subjectPrefix: "Bilety:",
    intro:
      "W załącznikach — plik PDF dla każdego biletu (układ jak na stronie: QR do wejścia + dane wydarzenia). Możesz też pokazać kod QR z ekranu telefonu.",
    colTicket: "Numer biletu",
    attachmentColumnTitle: "Załącznik",
    colAttachment: "PDF w załączniku (jak na stronie)",
    tagline: "PopularTickets · bilety na wydarzenia w Polsce",
    backupIdNote:
      "Długi identyfikator techniczny (UUID) jest zakodowany w QR i w pliku PDF — przy wejściu wystarczy numer biletu lub skan QR z PDF/telefonu.",
    vatConsumerNote:
      "Bilet na wydarzenie kulturalne (wstęp) — stawka VAT 8% wg polskiego prawa; cena brutto zawiera podatek.",
  },
  uk: {
    subjectPrefix: "Квитки:",
    intro:
      "У вкладеннях — PDF на кожен квиток (оформлення як на сайті: QR для входу + дані події). Можна показати QR з екрана телефона.",
    colTicket: "Номер квитка",
    attachmentColumnTitle: "Вкладення",
    colAttachment: "PDF у вкладенні (як на сайті)",
    tagline: "PopularTickets · квитки на події в Польщі",
    backupIdNote:
      "Довгий технічний ідентифікатор (UUID) закодований у QR і в PDF — на вході достатньо номера квитка або скану QR з PDF/телефона.",
    vatConsumerNote:
      "Квиток на культурну подію (вхід) — ставка ПДВ 8% за польським правом; брутто-ціна включає податок.",
  },
  ru: {
    subjectPrefix: "Билеты:",
    intro:
      "Во вложениях — PDF на каждый билет (оформление как на сайте: QR для входа + данные события). Можно показать QR с экрана телефона.",
    colTicket: "Номер билета",
    attachmentColumnTitle: "Вложение",
    colAttachment: "PDF во вложении (как на сайте)",
    tagline: "PopularTickets · билеты на события в Польше",
    backupIdNote:
      "Длинный технический идентификатор (UUID) закодирован в QR и в PDF — на входе достаточно номера билета или сканирования QR из PDF/телефона.",
    vatConsumerNote:
      "Билет на культурное мероприятие (вход) — ставка НДС 8% по польскому закону; цена брутто включает налог.",
  },
};

/** Подписи для PDF во вложении — согласовано с `CheckoutReturn` / `TicketPdf` в messages. */
export function emailTicketPdfLayoutStrings(locale: AppLocale): Pick<
  TicketLayoutDocInput,
  | "ticketKindSecondary"
  | "ticketQrSecondary"
  | "ticketDisclaimer"
  | "ticketNumberCaption"
  | "ticketLabel"
  | "ticketRibbon"
  | "stubControl"
> {
  const L: Record<
    AppLocale,
    Pick<
      TicketLayoutDocInput,
      | "ticketKindSecondary"
      | "ticketQrSecondary"
      | "ticketDisclaimer"
      | "ticketNumberCaption"
      | "ticketLabel"
      | "ticketRibbon"
      | "stubControl"
    >
  > = {
    pl: {
      ticketKindSecondary: "",
      ticketQrSecondary: "",
      ticketDisclaimer: "",
      ticketNumberCaption: "",
      ticketLabel: "Numer biletu",
      ticketRibbon: "Jeden widz",
      stubControl: "KONTROLA",
    },
    uk: {
      ticketKindSecondary: "Електронний квиток",
      ticketQrSecondary: "QR-код = ідентифікатор для входу",
      ticketDisclaimer:
        "Текст нижче українською — лише довідковий переклад. Обов'язкові записи польською вказані вище.",
      ticketNumberCaption: "Номер квитка",
      ticketLabel: "Номер квитка",
      ticketRibbon: "Один глядач",
      stubControl: "КОНТРОЛЬ",
    },
    ru: {
      ticketKindSecondary: "Электронный билет",
      ticketQrSecondary: "QR-код = идентификатор при входе",
      ticketDisclaimer:
        "Текст ниже на русском — только справочный перевод. Обязательные формулировки на польском указаны выше.",
      ticketNumberCaption: "Номер билета",
      ticketLabel: "Номер билета",
      ticketRibbon: "Один зритель",
      stubControl: "КОНТРОЛЬ",
    },
  };
  return L[locale];
}

export function ticketEmailStrings(locale: string | null | undefined): TicketEmailStrings {
  const l = locale === "uk" || locale === "ru" || locale === "pl" ? locale : "pl";
  return COPY[l];
}
