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
  /** Jak wejść: QR z załącznika/telefonu + krótki numer (bez technicznego żargonu). */
  backupIdNote: string;
  /** Cena końcowa / podatek w cenie — prosto dla kupującego. */
  vatConsumerNote: string;
};

const COPY: Record<AppLocale, TicketEmailStrings> = {
  pl: {
    subjectPrefix: "Twoje bilety:",
    intro:
      "Dziękujemy za zakup! W załącznikach masz bilety w PDF — ten sam ładny układ co na stronie, z kodem QR do wejścia i informacjami o wydarzeniu. Z telefonu też wystarczy.",
    colTicket: "Twój numer",
    attachmentColumnTitle: "Plik",
    colAttachment: "Bilet PDF",
    tagline: "PopularTickets · bilety na wydarzenia w Polsce",
    backupIdNote:
      "Na wejściu pokaż kod QR z załącznika albo z ekranu telefonu — to wystarczy. Krótki numer biletu przyda się obsłudze, jeśli zapyta.",
    vatConsumerNote:
      "Cena, którą widziałeś/aś przy zakupie, jest już końcowa — zawiera podatek (dla kultury w Polsce stosujemy 8% VAT).",
  },
  uk: {
    subjectPrefix: "Ваші квитки:",
    intro:
      "Дякуємо за покупку! У вкладеннях — квитки PDF: такий самий зручний вигляд, як на сайті, з QR для входу та даними про подію. З екрана телефона теж зручно.",
    colTicket: "Ваш номер",
    attachmentColumnTitle: "Файл",
    colAttachment: "Квиток PDF",
    tagline: "PopularTickets · квитки на події в Польщі",
    backupIdNote:
      "На вході покажіть QR з вкладення або з екрана телефона — цього достатньо. Короткий номер стоїть поруч, якщо персонал попросить.",
    vatConsumerNote:
      "Сума при оплаті вже фінальна — податки враховані (для культурних подій у Польщі застосовуємо ПДВ 8%).",
  },
  ru: {
    subjectPrefix: "Ваши билеты:",
    intro:
      "Спасибо за покупку! Во вложениях — билеты в PDF: тот же аккуратный макет, что на сайте, с QR для входа и данными о событии. С телефона тоже подойдёт.",
    colTicket: "Ваш номер",
    attachmentColumnTitle: "Файл",
    colAttachment: "Билет PDF",
    tagline: "PopularTickets · билеты на события в Польше",
    backupIdNote:
      "На входе покажите QR из вложения или с экрана телефона — этого достаточно. Короткий номер рядом, если попросят на контроле.",
    vatConsumerNote:
      "Сумма при оплате уже итоговая — налоги включены (для культурных событий в Польше действует ставка НДС 8%).",
  },
};

/**
 * Подписи для PDF во вложении письма.
 * Для uk/ru строки `ticketQrSecondary`, `ticketKindSecondary`, `ticketDisclaimer`,
 * `ticketNumberCaption` должны дословно совпадать с `messages/*.json` → `TicketPdf`,
 * иначе предпросмотр на /checkout/return и вложение в письме разъедутся.
 */
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
      ticketQrSecondary: "Покажіть QR при вході (телефон або PDF).",
      ticketDisclaimer:
        "Текст нижче українською — лише довідковий переклад. Обов'язкові записи польською вказані вище.",
      ticketNumberCaption: "Номер квитка",
      ticketLabel: "Номер квитка",
      ticketRibbon: "Один глядач",
      stubControl: "КОНТРОЛЬ",
    },
    ru: {
      ticketKindSecondary: "Электронный билет",
      ticketQrSecondary: "Покажите QR при входе (телефон или PDF).",
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
