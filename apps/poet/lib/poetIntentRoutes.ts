import type { AppLocale } from "@/i18n/routing";

export type PoetIntentPage = {
  slug: string;
  title: string;
  description: string;
  h1: string;
  lead: string;
  bullets: string[];
  courseHref: string;
  courseCta: string;
  scheduleCta: string;
  faq: { q: string; a: string }[];
};

const PL: PoetIntentPage[] = [
  {
    slug: "kurs-aktorski-warszawa",
    title: "Kurs aktorski po rosyjsku i ukraińsku w Warszawie — Popular Poet",
    description:
      "Kurs aktorski Popular Poet w Warszawie dla osób rosyjsko- i ukraińskojęzycznych: głos, ciało, emocje, tekst i praktyka sceniczna w małej grupie.",
    h1: "Kurs aktorski w Warszawie dla osób rosyjsko- i ukraińskojęzycznych",
    lead:
      "Popular Poet prowadzi w Warszawie praktyczne zajęcia aktorskie dla osób rosyjsko- i ukraińskojęzycznych. To nie jest polskojęzyczna szkoła aktorska: polska wersja strony pomaga znaleźć informacje, ale sama praca w grupach odbywa się w języku wskazanym przy danym terminie, najczęściej po rosyjsku lub ukraińsku.",
    bullets: [
      "kurs dla rosyjsko- i ukraińskojęzycznej społeczności w Warszawie",
      "praktyka sceniczna od pierwszych zajęć",
      "głos, ciało, reakcja, tekst i emocje",
      "małe grupy przy ul. Domaniewska 37",
      "język konkretnej grupy jest podany przy terminie",
    ],
    courseHref: "/kursy/aktorskoe-masterstvo",
    courseCta: "Zobacz kurs aktorski",
    scheduleCta: "Najbliższe zajęcia",
    faq: [
      {
        q: "Czy kurs aktorski jest dla początkujących?",
        a: "Tak. Na zajęcia można przyjść bez wcześniejszego doświadczenia scenicznego — ważniejsza jest gotowość do praktyki niż przygotowany warsztat.",
      },
      {
        q: "Czy to kurs po polsku?",
        a: "Nie. Popular Poet jest w Warszawie, ale zajęcia są kierowane głównie do osób rosyjsko- i ukraińskojęzycznych. Polski opis jest informacyjny, żeby jasno pokazać miejsce, format i zasady.",
      },
      {
        q: "W jakim języku odbywają się zajęcia?",
        a: "Grupy Popular Poet są kierowane głównie do osób rosyjsko- i ukraińskojęzycznych w Warszawie. Język konkretnego terminu jest podany przy zajęciach.",
      },
      {
        q: "Gdzie odbywają się zajęcia?",
        a: "Popular Poet działa w Warszawie przy ul. Domaniewska 37, Centrum biznesowe Zepter, piętro 5, lokal 42.",
      },
    ],
  },
  {
    slug: "warsztaty-aktorskie-warszawa",
    title: "Warsztaty aktorskie po rosyjsku i ukraińsku w Warszawie — Popular Poet",
    description:
      "Warsztaty aktorskie i masterclassy Popular Poet w Warszawie dla rosyjsko- i ukraińskojęzycznych uczestników: scena, improwizacja, głos, ciało i partner.",
    h1: "Warsztaty aktorskie w Warszawie dla osób rosyjsko- i ukraińskojęzycznych",
    lead:
      "Jeśli mieszkasz w Warszawie i szukasz zajęć scenicznych po rosyjsku albo ukraińsku, Popular Poet daje formaty krótsze niż pełny kurs: otwarte zajęcia, masterclassy i spotkania tematyczne. To propozycja dla osób, które chcą wejść w praktykę sceny w swoim języku, a nie szukają polskojęzycznej akademii.",
    bullets: [
      "dla rosyjsko- i ukraińskojęzycznych uczestników w Warszawie",
      "otwarte zajęcia i masterclassy",
      "ćwiczenia z partnerem i sceną",
      "tematyczne spotkania bez długiej teorii",
      "możliwość przejścia do regularnej grupy, jeśli format pasuje",
    ],
    courseHref: "/#schedule",
    courseCta: "Sprawdź kalendarz",
    scheduleCta: "Wybrać termin",
    faq: [
      {
        q: "Czym różnią się warsztaty od kursu?",
        a: "Warsztaty i masterclassy są krótsze oraz skupione na konkretnym temacie. Kurs daje regularny rytm pracy i rozwój grupy w czasie.",
      },
      {
        q: "Czy warsztaty odbywają się po polsku?",
        a: "Zasadniczo nie. Popular Poet działa w Warszawie, ale formaty są tworzone przede wszystkim dla rosyjsko- i ukraińskojęzycznej publiczności oraz uczestników.",
      },
      {
        q: "Czy można kupić jedno wejście?",
        a: "Tak, jeśli w kalendarzu jest otwarty termin, miejsce rezerwuje się online dla konkretnej daty.",
      },
      {
        q: "Czy są zajęcia z improwizacji?",
        a: "Tak. Popular Poet prowadzi improwizację aktorską, PLAY-BACK i formaty, w których reakcja oraz kontakt są ważniejsze niż gotowy tekst.",
      },
    ],
  },
  {
    slug: "improwizacja-kurs-warszawa",
    title: "Kurs improwizacji po rosyjsku i ukraińsku w Warszawie — Popular Poet",
    description:
      "Kurs improwizacji aktorskiej w Warszawie dla osób rosyjsko- i ukraińskojęzycznych: reakcja, humor, partnerstwo i scena bez scenariusza.",
    h1: "Kurs improwizacji w Warszawie dla rosyjsko- i ukraińskojęzycznych",
    lead:
      "Improwizacja w Popular Poet to trening reakcji, lekkości i kontaktu dla osób, które chcą pracować na scenie po rosyjsku lub ukraińsku. Zamiast uczyć się gotowego tekstu, uczysz się słyszeć partnera, brać impuls z sali i budować scenę tu i teraz.",
    bullets: [
      "improwizacja dla rosyjsko- i ukraińskojęzycznych uczestników",
      "sceny bez scenariusza i presji na perfekcję",
      "ćwiczenia na reakcję, ciało i obecność",
      "komediowe i aktorskie narzędzia impro",
      "otwarte terminy dla nowych uczestników w Warszawie",
    ],
    courseHref: "/kursy/improvizaciya",
    courseCta: "Zobacz kurs improwizacji",
    scheduleCta: "Najbliższe terminy",
    faq: [
      {
        q: "Czy trzeba być aktorem?",
        a: "Nie. Improwizacja jest dobra także dla osób, które po prostu chcą więcej swobody, odwagi i reakcji w kontakcie z ludźmi.",
      },
      {
        q: "Czy kurs jest po polsku?",
        a: "Nie jako główny format. Popular Poet jest miejscem w Warszawie dla rosyjsko- i ukraińskojęzycznych osób; język konkretnej grupy lub zajęć jest podany przy terminie.",
      },
      {
        q: "Czy to bardziej kurs czy rozrywka?",
        a: "To praktyka sceniczna. Jest dużo zabawy, ale celem jest realne doświadczenie pracy na scenie i z partnerem.",
      },
      {
        q: "Gdzie kupić wejście na otwarte zajęcia?",
        a: "Terminy otwartych zajęć są w kalendarzu Popular Poet; rezerwacja miejsca prowadzi przez PopularTickets.",
      },
    ],
  },
];

const UK: PoetIntentPage[] = [
  {
    slug: "aktorski-kursy-varshava",
    title: "Акторські курси у Варшаві — Popular Poet",
    description:
      "Акторські курси Popular Poet у Варшаві: голос, тіло, емоції, текст і сценічна практика в малих групах для україномовних і російськомовних учасників.",
    h1: "Акторські курси у Варшаві",
    lead:
      "Popular Poet — це місце у Варшаві, де можна спробувати сцену без зайвої теорії: голос, тіло, партнер, реакція, текст і живий контакт. Курси підходять тим, хто хоче вийти на сцену, говорити впевненіше й повернути собі відчуття творчої свободи.",
    bullets: [
      "практика з першого заняття",
      "голос, тіло, емоції й робота з партнером",
      "невеликі групи у Варшаві",
      "формати для україномовних і російськомовних учасників",
    ],
    courseHref: "/kursy/aktorskoe-masterstvo",
    courseCta: "Дивитися акторський курс",
    scheduleCta: "Найближчі заняття",
    faq: [
      {
        q: "Чи можна прийти без досвіду?",
        a: "Так. На курс можна приходити без акторської бази — головне бажання пробувати, реагувати й працювати в групі.",
      },
      {
        q: "Якою мовою проходять заняття?",
        a: "Заняття Popular Poet переважно орієнтовані на україномовних і російськомовних учасників у Варшаві. Мова конкретної групи вказана біля дати.",
      },
      {
        q: "Де проходять заняття?",
        a: "Варшава, ul. Domaniewska 37, Centrum biznesowe Zepter, 5 поверх, локал 42.",
      },
    ],
  },
  {
    slug: "aktorska-maysternist-varshava",
    title: "Акторська майстерність у Варшаві — Popular Poet",
    description:
      "Акторська майстерність у Варшаві: практичні заняття Popular Poet для голосу, тіла, тексту, емоцій і впевненості перед людьми.",
    h1: "Акторська майстерність у Варшаві",
    lead:
      "Акторська майстерність у Popular Poet — це не про ідеальність. Це про те, щоб відпускати контроль, чути партнера, працювати з тілом і голосом, а потім виносити це на сцену.",
    bullets: [
      "сценічна практика в малих групах",
      "робота з голосом, тілом і текстом",
      "емоції без перегравання",
      "можна почати з відкритого заняття",
    ],
    courseHref: "/kursy/aktorskoe-masterstvo",
    courseCta: "Відкрити програму",
    scheduleCta: "Обрати дату",
    faq: [
      {
        q: "Це курс для сцени чи для життя?",
        a: "І те, і те. Заняття дають сценічну практику, але навички голосу, присутності й реакції допомагають і поза сценою.",
      },
      {
        q: "Чи є пробні або відкриті заняття?",
        a: "Так, у календарі з’являються відкриті заняття, майстер-класи й інші формати, де можна спробувати напрям.",
      },
      {
        q: "Як записатися?",
        a: "Виберіть дату в календарі Popular Poet або відкрийте сторінку курсу. Бронювання місця проходить онлайн.",
      },
    ],
  },
  {
    slug: "kurs-improvizatsii-varshava",
    title: "Курс імпровізації у Варшаві — Popular Poet",
    description:
      "Курс акторської імпровізації у Варшаві: реакція, гумор, партнерство й сцена без сценарію. Popular Poet, ul. Domaniewska 37.",
    h1: "Курс імпровізації у Варшаві",
    lead:
      "Імпровізація в Popular Poet тренує реакцію, сміливість і контакт із партнером. Тут не потрібно заздалегідь знати текст — важливо бути в моменті й дозволити сцені народитися прямо зараз.",
    bullets: [
      "сцени без сценарію",
      "вправи на реакцію й присутність",
      "гумор, партнерство й свобода тіла",
      "відкриті формати для нових учасників",
    ],
    courseHref: "/kursy/improvizaciya",
    courseCta: "Дивитися курс імпровізації",
    scheduleCta: "Найближчі дати",
    faq: [
      {
        q: "Чи треба бути смішним?",
        a: "Ні. У хорошій імпровізації важливіше слухати, реагувати й не блокувати партнера. Гумор часто народжується сам.",
      },
      {
        q: "Чи підходить це новачкам?",
        a: "Так, відкриті заняття й базові групи створені саме для того, щоб спробувати формат без довгої підготовки.",
      },
      {
        q: "Де подивитися найближчі дати?",
        a: "Найближчі відкриті заняття й майстер-класи з’являються в календарі Popular Poet.",
      },
    ],
  },
];

export const POET_INTENT_PAGES: Record<AppLocale, PoetIntentPage[]> = {
  pl: PL,
  uk: UK,
  ru: [],
};

export function poetIntentPage(locale: AppLocale, slug: string): PoetIntentPage | undefined {
  return POET_INTENT_PAGES[locale].find((page) => page.slug === slug);
}

export function allPoetIntentPages(): { locale: AppLocale; page: PoetIntentPage }[] {
  return (Object.keys(POET_INTENT_PAGES) as AppLocale[]).flatMap((locale) =>
    POET_INTENT_PAGES[locale].map((page) => ({ locale, page })),
  );
}
