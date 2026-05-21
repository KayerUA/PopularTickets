import type { AppLocale } from "@/i18n/routing";
import type { PoetIntentClusterId } from "@/lib/poetIntentClusters";

export type PoetIntentPage = {
  slug: string;
  cluster: PoetIntentClusterId;
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
    cluster: "acting-course",
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
    courseHref: "/kursy/acting",
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
    cluster: "acting-workshops",
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
    cluster: "improv-course",
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
    courseHref: "/kursy/improv",
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
  {
    slug: "probnie-zajecia-warszawa",
    cluster: "trial",
    title: "Próbne zajęcia aktorskie w Warszawie — Popular Poet",
    description:
      "Próbne zajęcia Popular Poet w Warszawie: pierwsze spotkanie z sceną, improwizacją i grupą bez długiego zobowiązania.",
    h1: "Próbne zajęcia w Warszawie",
    lead:
      "Jeśli chcesz sprawdzić, czy scena i grupa Popular Poet są dla Ciebie, zacznij od otwartego lub próbnego terminu. To bezpieczny start: mała sala, jasne zasady i możliwość poznać ludzi w podobnym tempie.",
    bullets: [
      "jedno wejście bez całego kursu",
      "dla początkujących i ciekawych sceny",
      "rosyjsko- i ukraińskojęzyczne grupy w Warszawie",
      "rezerwacja miejsca online",
    ],
    courseHref: "/#schedule",
    courseCta: "Zobacz terminy próbne",
    scheduleCta: "Kalendarz zajęć",
    faq: [
      {
        q: "Czy muszę mieć doświadczenie?",
        a: "Nie. Próbne zajęcia są dla osób, które chcą po prostu sprawdzić format i atmosferę grupy.",
      },
      {
        q: "Jak zapisać się na termin?",
        a: "Wybierz datę w kalendarzu Popular Poet lub na PopularTickets, jeśli termin jest w afiszy.",
      },
      {
        q: "Czy po próbnym zajęciu można dołączyć do kursu?",
        a: "Tak. Jeśli format pasuje, można przejść do regularnej grupy aktorskiej lub impro.",
      },
    ],
  },
  {
    slug: "playback-teatr-warszawa",
    cluster: "playback",
    title: "PLAY-BACK teatr Warszawa — Popular Poet",
    description:
      "PLAY-BACK theatre w Warszawie: format, w którym aktorzy odtwarzają historie widzów na żywo. Zajęcia i wydarzenia Popular Poet.",
    h1: "PLAY-BACK teatr w Warszawie",
    lead:
      "PLAY-BACK to teatr oparty na historiach ludzi z sali. Popular Poet prowadzi ten format zarówno jako zajęcia, jak i wydarzenia — to doświadczenie bliskości, empatii i wspólnoty bez presji na występ.",
    bullets: [
      "format oparty na historiach uczestników",
      "mała grupa i bezpieczna atmosfera",
      "dla osób rosyjsko- i ukraińskojęzycznych w Warszawie",
      "zajęcia i show w kalendarzu Popular Poet",
    ],
    courseHref: "/kursy/playback",
    courseCta: "Zobacz kurs PLAY-BACK",
    scheduleCta: "Najbliższe terminy",
    faq: [
      {
        q: "Czy muszę opowiadać swoją historię?",
        a: "Nie. Można być widzem albo uczestnikiem — nikt nie jest zobowiązany do dzielenia się treścią.",
      },
      {
        q: "Czy to bardziej kurs czy spektakl?",
        a: "Popular Poet ma oba formaty: regularne zajęcia PLAY-BACK oraz wydarzenia sceniczne z elementem formatu.",
      },
      {
        q: "Gdzie odbywają się zajęcia?",
        a: "Warszawa, ul. Domaniewska 37, Centrum biznesowe Zepter, piętro 5, lokal 42.",
      },
    ],
  },
  {
    slug: "kurs-dla-poczatkujacych-warszawa",
    cluster: "beginners",
    title: "Kurs aktorski dla początkujących Warszawa — Popular Poet",
    description:
      "Kursy aktorskie i impro dla początkujących w Warszawie: start od podstaw, małe grupy, praktyka sceniczna Popular Poet.",
    h1: "Kursy dla początkujących w Warszawie",
    lead:
      "Jeśli nigdy nie byłeś na scenie albo wracasz po przerwie, Popular Poet daje formaty startowe: od otwartych zajęć po pełne kursy. Tempo dostosowane do grupy, bez akademickiej presji.",
    bullets: [
      "start bez wcześniejszego doświadczenia",
      "małe grupy i jasna struktura zajęć",
      "aktorstwo, impro i PLAY-BACK",
      "rosyjsko- i ukraińskojęzyczna społeczność w Warszawie",
    ],
    courseHref: "/kursy/acting",
    courseCta: "Kurs aktorski od podstaw",
    scheduleCta: "Otwarte terminy",
    faq: [
      {
        q: "Od czego lepiej zacząć — aktorstwo czy impro?",
        a: "Oba formaty są przyjazne początkującym. Impro daje szybszą grę w grupie, kurs aktorski — szerszą pracę z tekstem i emocją.",
      },
      {
        q: "Czy mogę najpierw przyjść na jedno zajęcie?",
        a: "Tak, jeśli w kalendarzu jest otwarty termin próbny lub jednorazowy.",
      },
      {
        q: "W jakim języku są zajęcia?",
        a: "Grupy Popular Poet są głównie rosyjsko- i ukraińskojęzyczne; język terminu jest podany przy dacie.",
      },
    ],
  },
  {
    slug: "gdzie-isc-samemu-warszawa",
    cluster: "community-alone",
    title: "Gdzie iść samemu wieczorem w Warszawie — Popular Poet",
    description:
      "Gdzie iść samemu w Warszawie: kameralne show, impro i spotkania Popular Poet — przestrzeń, w której łatwo być sobą i poznać ludzi.",
    h1: "Gdzie iść samemu w Warszawie",
    lead:
      "Popular Poet to nie tylko spektakl — to też miejsce, gdzie można przyjść solo, usiąść w małej widowni albo dołączyć do otwartych zajęć. Bez presji na randkę czy dużą grupę: łatwo poczuć się swoim.",
    bullets: [
      "kameralna sala — można przyjść solo",
      "show impro i spektakle wieczorem",
      "otwarte zajęcia jako sposób na poznanie ludzi",
      "rosyjsko- i ukraińskojęzyczna społeczność w Warszawie",
      "bezpieczna przestrzeń bez oceniania",
    ],
    courseHref: "/#schedule",
    courseCta: "Zobacz kalendarz",
    scheduleCta: "Bilety na show",
    faq: [
      {
        q: "Czy trzeba iść z kimś?",
        a: "Nie. Wielu gości przychodzi solo — format kameralny i otwarte zajęcia są do tego stworzone.",
      },
      {
        q: "Czy to dobre miejsce, żeby poznać ludzi?",
        a: "Tak. Otwarte zajęcia i regularne grupy budują społeczność wokół sceny — bez wymuszonej networkingowej presji.",
      },
      {
        q: "Gdzie kupić bilet na wieczór?",
        a: "Publiczne show i wydarzenia są na PopularTickets; zajęcia i kursy — w kalendarzu Popular Poet.",
      },
    ],
  },
];

const UK: PoetIntentPage[] = [
  {
    slug: "aktorski-kursy-varshava",
    cluster: "acting-course",
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
    courseHref: "/kursy/acting",
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
    cluster: "acting-workshops",
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
    courseHref: "/kursy/acting",
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
    cluster: "improv-course",
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
    courseHref: "/kursy/improv",
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
  {
    slug: "probne-zanyattya-varshava",
    cluster: "trial",
    title: "Пробне заняття у Варшаві — Popular Poet",
    description:
      "Пробні заняття Popular Poet у Варшаві: перше знайомство зі сценою, імпровізацією та групою без довгого зобов’язання.",
    h1: "Пробне заняття у Варшаві",
    lead:
      "Якщо хочете перевірити, чи підходить вам сцена та атмосфера Popular Poet, почніть з відкритого або пробного терміну. Це безпечний старт: невелика зала, зрозумілі правила і можливість познайомитися з людьми в комфортному темпі.",
    bullets: [
      "одне відвідування без цілого курсу",
      "для новачків і тих, хто цікавиться сценою",
      "україномовні та російськомовні групи у Варшаві",
      "бронювання місця онлайн",
    ],
    courseHref: "/#schedule",
    courseCta: "Дивитися пробні терміни",
    scheduleCta: "Календар занять",
    faq: [
      {
        q: "Чи потрібен досвід?",
        a: "Ні. Пробні заняття для тих, хто хоче просто відчути формат і атмосферу групи.",
      },
      {
        q: "Як записатися?",
        a: "Оберіть дату в календарі Popular Poet або на PopularTickets, якщо термін є в афіші.",
      },
      {
        q: "Чи можна після пробного перейти на курс?",
        a: "Так. Якщо формат підходить, можна долучитися до регулярної акторської або impro-групи.",
      },
    ],
  },
  {
    slug: "playback-teatr-varshava",
    cluster: "playback",
    title: "PLAY-BACK театр у Варшаві — Popular Poet",
    description:
      "PLAY-BACK theatre у Варшаві: актори відтворюють історії глядачів наживо. Заняття та події Popular Poet.",
    h1: "PLAY-BACK театр у Варшаві",
    lead:
      "PLAY-BACK — театр, побудований на історіях людей із зали. Popular Poet веде цей формат як заняття та як події — досвід близькості, емпатії та спільноти без тиску на виступ.",
    bullets: [
      "формат на історіях учасників",
      "мала група та безпечна атмосфера",
      "для україномовних і російськомовних у Варшаві",
      "заняття та шоу в календарі Popular Poet",
    ],
    courseHref: "/kursy/playback",
    courseCta: "Дивитися курс PLAY-BACK",
    scheduleCta: "Найближчі терміни",
    faq: [
      {
        q: "Чи обов’язково розповідати свою історію?",
        a: "Ні. Можна бути глядачем або учасником — ніхто не зобов’язаний ділитися.",
      },
      {
        q: "Це курс чи вистава?",
        a: "Popular Poet має обидва формати: регулярні заняття PLAY-BACK та сценічні події з елементами формату.",
      },
      {
        q: "Де проходять заняття?",
        a: "Варшава, ul. Domaniewska 37, Centrum biznesowe Zepter, 5 поверх, локал 42.",
      },
    ],
  },
  {
    slug: "kurs-dlya-pochatkivtsiv-varshava",
    cluster: "beginners",
    title: "Курси для початківців у Варшаві — Popular Poet",
    description:
      "Акторські курси та impro для початківців у Варшаві: старт з основ, малі групи, сценічна практика Popular Poet.",
    h1: "Курси для початківців у Варшаві",
    lead:
      "Якщо ви ніколи не були на сцені або повертаєтесь після перерви, Popular Poet пропонує стартові формати: від відкритих занять до повних курсів. Темп під групу, без академічного тиску.",
    bullets: [
      "старт без попереднього досвіду",
      "малі групи та зрозуміла структура",
      "акторство, impro та PLAY-BACK",
      "україномовна та російськомовна спільнота у Варшаві",
    ],
    courseHref: "/kursy/acting",
    courseCta: "Акторський курс з нуля",
    scheduleCta: "Відкриті терміни",
    faq: [
      {
        q: "З чого краще почати — акторство чи impro?",
        a: "Обидва формати дружні до новачків. Impro дає швидку гру в групі, акторський курс — ширшу роботу з текстом і емоцією.",
      },
      {
        q: "Чи можна спочатку прийти на одне заняття?",
        a: "Так, якщо в календарі є відкритий або пробний термін.",
      },
      {
        q: "Якою мовою проходять заняття?",
        a: "Групи Popular Poet переважно україномовні та російськомовні; мова терміну вказана біля дати.",
      },
    ],
  },
  {
    slug: "kudy-pity-samostijno-varshava",
    cluster: "community-alone",
    title: "Куди піти самому у Варшаві — Popular Poet",
    description:
      "Куди піти самому у Варшаві: камерні шоу, impro та зустрічі Popular Poet — простір, де легко бути собою і познайомитися з людьми.",
    h1: "Куди піти самому у Варшаві",
    lead:
      "Popular Poet — це не лише вистава, а й місце, куди можна прийти solo: сісти в камерній залі або долучитися до відкритих занять. Без тиску «йти парою» чи великою компанією — легко відчути себе своїм.",
    bullets: [
      "камерна зала — можна прийти одному",
      "impro-шоу та вистави ввечері",
      "відкриті заняття як спосіб познайомитися",
      "україномовна та російськомовна спільнота у Варшаві",
      "безпечний простір без оцінювання",
    ],
    courseHref: "/#schedule",
    courseCta: "Дивитися календар",
    scheduleCta: "Квитки на шоу",
    faq: [
      {
        q: "Чи треба йти з кимось?",
        a: "Ні. Багато гостей приходять solo — камерний формат і відкриті заняття для цього створені.",
      },
      {
        q: "Чи це місце, щоб знайти друзів?",
        a: "Так. Відкриті заняття та регулярні групи будують спільноту навколо сцени — без штучного networking.",
      },
      {
        q: "Де купити квиток на вечір?",
        a: "Публічні шоу — на PopularTickets; заняття та курси — у календарі Popular Poet.",
      },
    ],
  },
];

const RU: PoetIntentPage[] = [
  {
    slug: "akterskie-kursy-varshava",
    cluster: "acting-course",
    title: "Актёрские курсы в Варшаве — Popular Poet",
    description:
      "Актёрские курсы Popular Poet в Варшаве: голос, тело, эмоции, текст и сценическая практика в малых группах для русскоязычных и украиноязычных участников.",
    h1: "Актёрские курсы в Варшаве",
    lead:
      "Popular Poet — это место в Варшаве, где можно попробовать сцену без лишней теории: голос, тело, партнёр, реакция, текст и живой контакт. Курсы подходят тем, кто хочет выйти на сцену, говорить увереннее и вернуть себе ощущение творческой свободы.",
    bullets: [
      "практика с первого занятия",
      "голос, тело, эмоции и работа с партнёром",
      "небольшие группы в Варшаве",
      "форматы для русскоязычных и украиноязычных участников",
    ],
    courseHref: "/kursy/acting",
    courseCta: "Смотреть актёрский курс",
    scheduleCta: "Ближайшие занятия",
    faq: [
      {
        q: "Можно ли прийти без опыта?",
        a: "Да. На курс можно приходить без актёрской базы — главное желание пробовать, реагировать и работать в группе.",
      },
      {
        q: "На каком языке проходят занятия?",
        a: "Занятия Popular Poet ориентированы на русскоязычных и украиноязычных участников в Варшаве. Язык конкретной группы указан у даты.",
      },
      {
        q: "Где проходят занятия?",
        a: "Варшава, ul. Domaniewska 37, Centrum biznesowe Zepter, 5 этаж, локал 42.",
      },
    ],
  },
  {
    slug: "akterskaya-maysternost-varshava",
    cluster: "acting-workshops",
    title: "Актёрское мастерство в Варшаве — Popular Poet",
    description:
      "Актёрское мастерство в Варшаве: практические занятия Popular Poet для голоса, тела, текста, эмоций и уверенности перед людьми.",
    h1: "Актёрское мастерство в Варшаве",
    lead:
      "Актёрское мастерство в Popular Poet — это не про идеальность. Это про то, чтобы отпускать контроль, слышать партнёра, работать с телом и голосом, а потом выносить это на сцену.",
    bullets: [
      "сценическая практика в малых группах",
      "работа с голосом, телом и текстом",
      "эмоции без перегибов",
      "можно начать с открытого занятия",
    ],
    courseHref: "/kursy/acting",
    courseCta: "Открыть программу",
    scheduleCta: "Выбрать дату",
    faq: [
      {
        q: "Это курс для сцены или для жизни?",
        a: "И то, и другое. Занятия дают сценическую практику, но навыки голоса, присутствия и реакции помогают и вне сцены.",
      },
      {
        q: "Есть ли пробные или открытые занятия?",
        a: "Да, в календаре появляются открытые занятия, мастер-классы и другие форматы, где можно попробовать направление.",
      },
      {
        q: "Как записаться?",
        a: "Выберите дату в календаре Popular Poet или откройте страницу курса. Бронирование места проходит онлайн.",
      },
    ],
  },
  {
    slug: "improvizatsiya-varshava",
    cluster: "improv-course",
    title: "Курс импровизации в Варшаве — Popular Poet",
    description:
      "Курс актёрской импровизации в Варшаве: реакция, юмор, партнёрство и сцена без сценария. Popular Poet, ul. Domaniewska 37.",
    h1: "Курс импровизации в Варшаве",
    lead:
      "Импровизация в Popular Poet тренирует реакцию, смелость и контакт с партнёром. Здесь не нужно заранее знать текст — важно быть в моменте и позволить сцене родиться прямо сейчас.",
    bullets: [
      "сцены без сценария",
      "упражнения на реакцию и присутствие",
      "юмор, партнёрство и свобода тела",
      "открытые форматы для новых участников",
    ],
    courseHref: "/kursy/improv",
    courseCta: "Смотреть курс импровизации",
    scheduleCta: "Ближайшие даты",
    faq: [
      {
        q: "Нужно ли быть смешным?",
        a: "Нет. В хорошей импровизации важнее слушать, реагировать и не блокировать партнёра. Юмор часто рождается сам.",
      },
      {
        q: "Подходит ли это новичкам?",
        a: "Да, открытые занятия и базовые группы созданы именно для того, чтобы попробовать формат без долгой подготовки.",
      },
      {
        q: "Где посмотреть ближайшие даты?",
        a: "Ближайшие открытые занятия и мастер-классы появляются в календаре Popular Poet.",
      },
    ],
  },
  {
    slug: "probnoe-zanyatie-varshava",
    cluster: "trial",
    title: "Пробное занятие в Варшаве — Popular Poet",
    description:
      "Пробные занятия Popular Poet в Варшаве: первое знакомство со сценой, импровизацией и группой без длинного обязательства.",
    h1: "Пробное занятие в Варшаве",
    lead:
      "Если хотите проверить, подходит ли вам сцена и атмосфера Popular Poet, начните с открытого или пробного термина. Это безопасный старт: небольшой зал, понятные правила и возможность познакомиться с людьми в комфортном темпе.",
    bullets: [
      "одно посещение без целого курса",
      "для новичков и тех, кому интересна сцена",
      "русскоязычные и украиноязычные группы в Варшаве",
      "бронирование места онлайн",
    ],
    courseHref: "/#schedule",
    courseCta: "Смотреть пробные даты",
    scheduleCta: "Календарь занятий",
    faq: [
      {
        q: "Нужен ли опыт?",
        a: "Нет. Пробные занятия для тех, кто хочет просто почувствовать формат и атмосферу группы.",
      },
      {
        q: "Как записаться?",
        a: "Выберите дату в календаре Popular Poet или на PopularTickets, если термин есть в афише.",
      },
      {
        q: "Можно ли после пробного перейти на курс?",
        a: "Да. Если формат подходит, можно присоединиться к регулярной актёрской или impro-группе.",
      },
    ],
  },
  {
    slug: "playback-teatr-varshava",
    cluster: "playback",
    title: "PLAY-BACK театр в Варшаве — Popular Poet",
    description:
      "PLAY-BACK theatre в Варшаве: актёры воспроизводят истории зрителей наживо. Занятия и события Popular Poet.",
    h1: "PLAY-BACK театр в Варшаве",
    lead:
      "PLAY-BACK — театр, построенный на историях людей из зала. Popular Poet ведёт этот формат как занятия и как события — опыт близости, эмпатии и сообщества без давления на выступление.",
    bullets: [
      "формат на историях участников",
      "малая группа и безопасная атмосфера",
      "для русскоязычных и украиноязычных в Варшаве",
      "занятия и шоу в календаре Popular Poet",
    ],
    courseHref: "/kursy/playback",
    courseCta: "Смотреть курс PLAY-BACK",
    scheduleCta: "Ближайшие термины",
    faq: [
      {
        q: "Обязательно ли рассказывать свою историю?",
        a: "Нет. Можно быть зрителем или участником — никто не обязан делиться.",
      },
      {
        q: "Это курс или спектакль?",
        a: "У Popular Poet есть оба формата: регулярные занятия PLAY-BACK и сценические события с элементами формата.",
      },
      {
        q: "Где проходят занятия?",
        a: "Варшава, ul. Domaniewska 37, Centrum biznesowe Zepter, 5 этаж, локал 42.",
      },
    ],
  },
  {
    slug: "kurs-dlya-nachinayushchih-varshava",
    cluster: "beginners",
    title: "Курсы для начинающих в Варшаве — Popular Poet",
    description:
      "Актёрские курсы и impro для начинающих в Варшаве: старт с основ, малые группы, сценическая практика Popular Poet.",
    h1: "Курсы для начинающих в Варшаве",
    lead:
      "Если вы никогда не были на сцене или возвращаетесь после перерыва, Popular Poet предлагает стартовые форматы: от открытых занятий до полных курсов. Темп под группу, без академического давления.",
    bullets: [
      "старт без предыдущего опыта",
      "малые группы и понятная структура",
      "актёрство, impro и PLAY-BACK",
      "русскоязычное и украиноязычное комьюнити в Варшаве",
    ],
    courseHref: "/kursy/acting",
    courseCta: "Актёрский курс с нуля",
    scheduleCta: "Открытые даты",
    faq: [
      {
        q: "С чего лучше начать — актёрство или impro?",
        a: "Оба формата дружелюбны к новичкам. Impro даёт быструю игру в группе, актёрский курс — более широкую работу с текстом и эмоцией.",
      },
      {
        q: "Можно ли сначала прийти на одно занятие?",
        a: "Да, если в календаре есть открытый или пробный термин.",
      },
      {
        q: "На каком языке проходят занятия?",
        a: "Группы Popular Poet преимущественно русскоязычные и украиноязычные; язык термина указан у даты.",
      },
    ],
  },
  {
    slug: "kuda-poyti-odnomu-varshava",
    cluster: "community-alone",
    title: "Куда пойти одному в Варшаве — Popular Poet",
    description:
      "Куда пойти одному в Варшаве: камерные шоу, impro и встречи Popular Poet — пространство, где легко быть собой и познакомиться с людьми.",
    h1: "Куда пойти одному в Варшаве",
    lead:
      "Popular Poet — это не только спектакль, но и место, куда можно прийти solo: сесть в камерном зале или присоединиться к открытым занятиям. Без давления «идти парой» или большой компанией — легко чувствовать себя своим.",
    bullets: [
      "камерный зал — можно прийти одному",
      "impro-шоу и спектакли вечером",
      "открытые занятия как способ познакомиться",
      "русскоязычное комьюнити в Варшаве",
      "безопасное пространство без оценивания",
    ],
    courseHref: "/#schedule",
    courseCta: "Смотреть календарь",
    scheduleCta: "Билеты на шоу",
    faq: [
      {
        q: "Нужно ли идти с кем-то?",
        a: "Нет. Многие гости приходят solo — камерный формат и открытые занятия для этого созданы.",
      },
      {
        q: "Это место, чтобы найти друзей?",
        a: "Да. Открытые занятия и регулярные группы строят комьюнити вокруг сцены — без искусственного networking.",
      },
      {
        q: "Где купить билет на вечер?",
        a: "Публичные шоу — на PopularTickets; занятия и курсы — в календаре Popular Poet.",
      },
    ],
  },
];

export const POET_INTENT_PAGES: Record<AppLocale, PoetIntentPage[]> = {
  pl: PL,
  uk: UK,
  ru: RU,
};

export function poetIntentPage(locale: AppLocale, slug: string): PoetIntentPage | undefined {
  return POET_INTENT_PAGES[locale].find((page) => page.slug === slug);
}

export function allPoetIntentPages(): { locale: AppLocale; page: PoetIntentPage }[] {
  return (Object.keys(POET_INTENT_PAGES) as AppLocale[]).flatMap((locale) =>
    POET_INTENT_PAGES[locale].map((page) => ({ locale, page })),
  );
}
