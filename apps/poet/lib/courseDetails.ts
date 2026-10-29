export const COURSE_MAX_GROUP_SIZE = 12;

export const COURSE_DETAILS = {
  improv: { lessons: 16, lessonMinutes: 120, pricePerBlock: 590, lessonsPerBlock: 4, trialPrice: 100, groupSize: COURSE_MAX_GROUP_SIZE },
  acting: { lessons: 32, lessonMinutes: 120, pricePerBlock: 590, lessonsPerBlock: 4, trialPrice: 100, groupSize: COURSE_MAX_GROUP_SIZE },
} as const;

export function courseDetails(slug: string) {
  return slug === "improv" || slug === "acting" ? COURSE_DETAILS[slug] : null;
}

export const COURSE_LANGUAGE = {
  ru: "Занятия на русском, можно говорить по-украински.",
  uk: "Заняття російською, можна говорити українською.",
  pl: "Zajęcia prowadzimy po rosyjsku. Można mówić po ukraińsku.",
} as const;

export const COURSE_SEO = {
  ru: {
    improv: { title: "Импровизация в Варшаве на русском", description: `Импровизация для взрослых: 16 занятий по 2 часа, группа до ${COURSE_MAX_GROUP_SIZE} человек. Занятия на русском, можно говорить по-украински. Пробное 100 zł, Mokotów.` },
    acting: { title: "Актёрское мастерство в Варшаве на русском", description: "Актёрское мастерство для взрослых: голос, дикция, камера и роль. 32 занятия по 2 часа на русском. Можно говорить по-украински. Пробное 100 zł." },
  },
  uk: {
    improv: { title: "Курс імпровізації у Варшаві російською мовою", description: `Імпровізація для дорослих: 16 занять по 2 години, група до ${COURSE_MAX_GROUP_SIZE} людей. Викладання російською, можна говорити українською. Пробне 100 zł, Mokotów.` },
    acting: { title: "Курс акторської майстерності у Варшаві російською мовою", description: "Акторська майстерність для дорослих: голос, дикція, камера та роль. 32 заняття по 2 години. Викладання російською, можна говорити українською. Пробне 100 zł." },
  },
  pl: {
    improv: { title: "Kurs improwizacji w Warszawie po rosyjsku", description: `Improwizacja dla dorosłych: 16 zajęć po 2 godziny, grupa do ${COURSE_MAX_GROUP_SIZE} osób. Zajęcia po rosyjsku, można mówić po ukraińsku. Zajęcia próbne 100 zł, Mokotów.` },
    acting: { title: "Kurs aktorski w Warszawie po rosyjsku", description: "Aktorstwo dla dorosłych: głos, dykcja, kamera i rola. 32 zajęcia po 2 godziny. Zajęcia po rosyjsku, można mówić po ukraińsku. Zajęcia próbne 100 zł." },
  },
} as const;
