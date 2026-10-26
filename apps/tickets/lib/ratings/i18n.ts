import type { AppLocale } from "@/i18n/routing";

export const ratingText = {
  ru: {
    title: "Как прошёл вечер?",
    intro: "Нам важно понять, как прошло именно это мероприятие. Оценка занимает минуту.",
    score: "Оценка",
    scores: ["Ужасно", "Плохо", "Нормально", "Хорошо", "Отлично"] as const,
    comment: "Комментарий — по желанию",
    commentHint: "Что зашло, что можно сделать лучше.",
    submit: "Отправить оценку",
    submitting: "Сохраняем…",
    thanks: "Спасибо. Оценка сохранена.",
    already: "Вы уже оценили это мероприятие.",
    tooEarly: "Оценка откроется после мероприятия.",
    invalid: "Ссылка недействительна или срок её действия истёк.",
    unavailable: "Не удалось сохранить оценку. Попробуйте ещё раз.",
    choose: "Выберите оценку от 1 до 5.",
    link: "Оценить мероприятие",
    emailSubject: "Как прошёл вечер",
    emailSubjectMany: "Как прошли вечера",
    emailBody:
      "Спасибо, что были на этом мероприятии. Нам важно понять, как оно прошло именно для вас. Оценка занимает минуту.",
    emailBodyMany: "Вы были на нескольких вечерах. Оцените каждый — это минута.",
    offerKicker: "Для вас",
    offerLead:
      "Тот же «Боинг-Боинг» — уже в другом зале. Scena Kocjana на Bemowo: настоящая театральная сцена и большое пространство.",
    offerPerks: [
      "Поднятая сцена 9×7 м и большой зал",
      "Кресла амфитеатром — видно с любого ряда",
      "Профессиональный свет, звук, кондиционер",
      "Фойе, ресторан рядом, парковка на ~200 машин",
    ] as const,
    offerInstead: "вместо",
    offerCta: "Забрать билет за {price}",
  },
  pl: {
    title: "Jak minął wieczór?",
    intro: "Chcemy wiedzieć, jak przebiegło właśnie to wydarzenie. Ocena zajmuje chwilę.",
    score: "Ocena",
    scores: ["Fatalnie", "Słabo", "W porządku", "Dobrze", "Świetnie"] as const,
    comment: "Komentarz — opcjonalnie",
    commentHint: "Co zadziałało, co można poprawić.",
    submit: "Wyślij ocenę",
    submitting: "Zapisujemy…",
    thanks: "Dziękujemy. Ocena została zapisana.",
    already: "To wydarzenie zostało już ocenione.",
    tooEarly: "Ocena będzie dostępna po wydarzeniu.",
    invalid: "Link jest nieprawidłowy lub wygasł.",
    unavailable: "Nie udało się zapisać oceny. Spróbuj ponownie.",
    choose: "Wybierz ocenę od 1 do 5.",
    link: "Oceń wydarzenie",
    emailSubject: "Jak minął wieczór",
    emailSubjectMany: "Jak minęły wieczory",
    emailBody:
      "Dziękujemy, że byliście na tym wydarzeniu. Chcemy wiedzieć, jak przebiegło właśnie dla Was. Ocena zajmuje chwilę.",
    emailBodyMany: "Byliście na kilku wieczorach. Oceńcie każdy — to chwila.",
    offerKicker: "Dla Was",
    offerLead:
      "Ten sam „Boeing-Boeing” — już w innej sali. Scena Kocjana na Bemowie: prawdziwa scena teatralna i duża przestrzeń.",
    offerPerks: [
      "Podniesiona scena 9×7 m i duża sala",
      "Fotele amfiteatralnie — widać z każdego rzędu",
      "Profesjonalne światło, dźwięk, klimatyzacja",
      "Foyer, restauracja obok, parking na ok. 200 aut",
    ] as const,
    offerInstead: "zamiast",
    offerCta: "Odbierz bilet za {price}",
  },
  uk: {
    title: "Як минув вечір?",
    intro: "Нам важливо зрозуміти, як минула саме ця подія. Оцінка займає хвилину.",
    score: "Оцінка",
    scores: ["Жахливо", "Погано", "Нормально", "Добре", "Чудово"] as const,
    comment: "Коментар — за бажанням",
    commentHint: "Що зайшло, що можна зробити краще.",
    submit: "Надіслати оцінку",
    submitting: "Зберігаємо…",
    thanks: "Дякуємо. Оцінку збережено.",
    already: "Ви вже оцінили цю подію.",
    tooEarly: "Оцінка буде доступна після події.",
    invalid: "Посилання недійсне або термін його дії минув.",
    unavailable: "Не вдалося зберегти оцінку. Спробуйте ще раз.",
    choose: "Оберіть оцінку від 1 до 5.",
    link: "Оцінити подію",
    emailSubject: "Як минув вечір",
    emailSubjectMany: "Як минули вечори",
    emailBody:
      "Дякуємо, що були на цій події. Нам важливо зрозуміти, як вона минула саме для вас. Оцінка займає хвилину.",
    emailBodyMany: "Ви були на кількох вечорах. Оцініть кожен — це хвилина.",
    offerKicker: "Для вас",
    offerLead:
      "Той самий «Боїнг-Боїнг» — вже в іншій залі. Scena Kocjana на Bemowo: справжня театральна сцена і великий простір.",
    offerPerks: [
      "Піднята сцена 9×7 м і велика зала",
      "Крісла амфітеатром — видно з будь-якого ряду",
      "Професійне світло, звук, кондиціонер",
      "Фоє, ресторан поруч, парковка на ~200 авто",
    ] as const,
    offerInstead: "замість",
    offerCta: "Забрати квиток за {price}",
  },
} as const satisfies Record<
  AppLocale,
  {
    title: string;
    intro: string;
    score: string;
    scores: readonly [string, string, string, string, string];
    comment: string;
    commentHint: string;
    submit: string;
    submitting: string;
    thanks: string;
    already: string;
    tooEarly: string;
    invalid: string;
    unavailable: string;
    choose: string;
    link: string;
    emailSubject: string;
    emailSubjectMany: string;
    emailBody: string;
    emailBodyMany: string;
    offerKicker: string;
    offerLead: string;
    offerPerks: readonly [string, string, string, string];
    offerInstead: string;
    offerCta: string;
  }
>;
