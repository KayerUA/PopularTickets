import type { AppLocale } from "@/i18n/routing";
import type { PoetIntentPage } from "@/lib/poetIntentRoutes";
import type { PoetIntentHubExpansion } from "@/lib/poetIntentHubTypes";
import { poetIntentClusterForSlug } from "@/lib/poetIntentClusters";

const content = {
  ru: {
    hub: { title: "Актёрские курсы для взрослых в Варшаве на русском", description: "Импровизация и актёрское мастерство в Варшаве: сравните программы, посмотрите даты и приходите на пробное за 100 zł. Занятия на русском, можно по-украински.", lead: "Хотите играть без готового текста или разбирать персонажей и ставить спектакль? У нас два курса для взрослых. На оба можно прийти без опыта и начать с пробного занятия.", sections: [
      { heading: "Если вы никогда не занимались", paragraphs: ["Первые занятия посвящены телу, голосу и эмоциям. Педагог объясняет упражнения, вы пробуете их в паре и с группой. Учить монолог или готовить выступление перед пробным не нужно."] },
      { heading: "Как выбрать курс", paragraphs: ["На импровизации учимся реагировать на партнёра и придумывать сцены на ходу. На актёрском мастерстве работаем с голосом, текстом, камерой и персонажем, затем переходим к постановке спектакля.", "Если пока не знаете, что выбрать, приходите на пробное. За два часа успеете познакомиться с педагогом и попробовать упражнения."] },
      { heading: "Как устроены занятия", paragraphs: ["Регулярная группа до 8 человек занимается раз в неделю по два часа. День группы согласуем после пробного. Оплата блоками: 590 zł за четыре занятия, пробное стоит 100 zł."] },
    ] },
    trial: { title: "Пробное занятие в Варшаве: импровизация или актёрское мастерство", description: "Два часа актёрской практики на русском в Варшаве. Разминка, игры и сцены с группой. Пробное 100 zł. Актуальные даты и запись, Domaniewska 37.", lead: "Приходите попробовать импровизацию или актёрское мастерство. Два часа занимаемся с педагогом и группой: разминаемся, играем и пробуем короткие сцены. Пробное стоит 100 zł.", sections: [
      { heading: "Что будет за два часа", paragraphs: ["Начнём с разминки для тела и голоса, затем перейдём к играм на внимание и взаимодействие. Дальше будут упражнения в паре и небольшие сцены. Педагог объяснит задачи и поможет разобраться по ходу."] },
      { heading: "Что взять с собой", paragraphs: ["Удобную одежду, сменную обувь или носки и воду. Готовить текст или учить роль не нужно."] },
      { heading: "После пробного", paragraphs: ["Если захотите продолжить, можно присоединиться к регулярной группе. Импровизация рассчитана на 16 занятий, актёрское мастерство на 32. Оплата по четыре занятия, 590 zł за блок. День регулярной группы согласуем после пробного."] },
    ] },
    faq: [{ q: "Нужен ли опыт?", a: "Нет. Можно начать с пробного занятия без актёрской подготовки." }, { q: "На каком языке занятия?", a: "На русском, можно говорить по-украински. Польский для занятий не нужен." }, { q: "Сколько людей в группе?", a: "В регулярной группе до 8 человек. Вместимость конкретного пробного и свободные места указаны рядом с датой." }, { q: "Где проходят занятия?", a: "ul. Domaniewska 37, Centrum Biznesowe Zepter, 5 этаж, помещение 42, Варшава. Ближайшие станции метро Wilanowska и Służew." }],
  },
  uk: {
    hub: { title: "Акторські курси для дорослих у Варшаві російською", description: "Імпровізація та акторська майстерність у Варшаві: порівняйте програми, оберіть дату й приходьте на пробне за 100 zł. Можна говорити українською.", lead: "Хочете грати без готового тексту чи розбирати персонажів і ставити виставу? У нас два курси для дорослих. На обидва можна прийти без досвіду й почати з пробного заняття.", sections: [
      { heading: "Якщо ви ніколи не займалися", paragraphs: ["Перші заняття присвячені тілу, голосу та емоціям. Педагог пояснює вправи, ви пробуєте їх у парі та з групою. Вчити монолог чи готувати виступ перед пробним не потрібно."] },
      { heading: "Як обрати курс", paragraphs: ["На імпровізації вчимося реагувати на партнера та придумувати сцени на ходу. На акторській майстерності працюємо з голосом, текстом, камерою і персонажем, а потім переходимо до постановки вистави.", "Якщо поки не знаєте, що обрати, приходьте на пробне. За дві години познайомитеся з педагогом і спробуєте вправи."] },
      { heading: "Як влаштовані заняття", paragraphs: ["Регулярна група до 8 людей займається раз на тиждень по дві години. День групи узгодимо після пробного. Оплата блоками: 590 zł за чотири заняття, пробне коштує 100 zł."] },
    ] },
    trial: { title: "Пробне заняття у Варшаві: імпровізація чи акторська майстерність", description: "Дві години акторської практики російською у Варшаві. Розминка, ігри та сцени з групою. Пробне 100 zł. Актуальні дати й запис, Domaniewska 37.", lead: "Приходьте спробувати імпровізацію або акторську майстерність. Дві години займаємося з педагогом і групою: розминаємося, граємо та пробуємо короткі сцени. Пробне коштує 100 zł.", sections: [
      { heading: "Що буде за дві години", paragraphs: ["Почнемо з розминки для тіла й голосу, потім перейдемо до ігор на увагу та взаємодію. Далі будуть вправи в парі й невеликі сцени. Педагог пояснить завдання та допоможе розібратися по ходу."] },
      { heading: "Що взяти із собою", paragraphs: ["Зручний одяг, змінне взуття або шкарпетки й воду. Готувати текст чи вчити роль не потрібно."] },
      { heading: "Після пробного", paragraphs: ["Якщо захочете продовжити, можна приєднатися до регулярної групи. Імпровізація розрахована на 16 занять, акторська майстерність на 32. Оплата по чотири заняття, 590 zł за блок. День регулярної групи узгодимо після пробного."] },
    ] },
    faq: [{ q: "Чи потрібен досвід?", a: "Ні. Можна почати з пробного заняття без акторської підготовки." }, { q: "Якою мовою заняття?", a: "Російською, можна говорити українською. Польська для занять не потрібна." }, { q: "Скільки людей у групі?", a: "У регулярній групі до 8 людей. Місткість конкретного пробного та вільні місця вказані біля дати." }, { q: "Де проходять заняття?", a: "ul. Domaniewska 37, Centrum Biznesowe Zepter, 5 поверх, приміщення 42, Варшава. Найближчі станції метро Wilanowska та Służew." }],
  },
  pl: {
    hub: { title: "Kursy aktorskie dla dorosłych w Warszawie po rosyjsku", description: "Improwizacja i aktorstwo w Warszawie. Porównaj programy, wybierz termin i przyjdź na zajęcia próbne za 100 zł. Zajęcia po rosyjsku, można mówić po ukraińsku.", lead: "Chcesz grać bez gotowego tekstu czy pracować nad postacią i spektaklem? Prowadzimy dwa kursy dla dorosłych. Oba możesz zacząć bez doświadczenia, od zajęć próbnych.", sections: [
      { heading: "Jeśli nigdy nie grałeś na scenie", paragraphs: ["Pierwsze zajęcia poświęcamy ciału, głosowi i emocjom. Prowadzący wyjaśnia ćwiczenia, a Ty próbujesz ich w parze i z grupą. Nie musisz przygotowywać monologu ani występu na zajęcia próbne."] },
      { heading: "Jak wybrać kurs", paragraphs: ["Na improwizacji uczymy się reagować na partnera i wymyślać sceny na bieżąco. Na aktorstwie pracujemy z głosem, tekstem, kamerą i postacią, a potem przechodzimy do przygotowania spektaklu.", "Jeśli jeszcze nie wiesz, co wybrać, przyjdź na zajęcia próbne. Przez dwie godziny poznasz prowadzącego i spróbujesz ćwiczeń."] },
      { heading: "Jak organizujemy zajęcia", paragraphs: ["Regularna grupa do 8 osób spotyka się raz w tygodniu na dwie godziny. Dzień ustalamy po zajęciach próbnych. Płatność w blokach: 590 zł za cztery zajęcia, próbne kosztują 100 zł."] },
    ] },
    trial: { title: "Zajęcia próbne w Warszawie: improwizacja lub aktorstwo", description: "Dwie godziny praktyki aktorskiej po rosyjsku w Warszawie. Rozgrzewka, gry i sceny z grupą. Zajęcia próbne 100 zł. Aktualne terminy, Domaniewska 37.", lead: "Przyjdź spróbować improwizacji lub aktorstwa. Przez dwie godziny ćwiczymy z prowadzącym i grupą: rozgrzewamy się, gramy i próbujemy krótkich scen. Zajęcia próbne kosztują 100 zł.", sections: [
      { heading: "Co robimy przez dwie godziny", paragraphs: ["Zaczynamy od rozgrzewki ciała i głosu, następnie przechodzimy do gier na uwagę i współpracę. Dalej ćwiczymy w parach i gramy krótkie sceny. Prowadzący wyjaśnia zadania i pomaga na bieżąco."] },
      { heading: "Co zabrać", paragraphs: ["Wygodny strój, buty na zmianę lub skarpetki i wodę. Nie trzeba przygotowywać tekstu ani uczyć się roli."] },
      { heading: "Po zajęciach próbnych", paragraphs: ["Jeśli chcesz kontynuować, możesz dołączyć do regularnej grupy. Improwizacja obejmuje 16 zajęć, aktorstwo 32. Płatność za cztery zajęcia wynosi 590 zł. Dzień regularnej grupy ustalamy po zajęciach próbnych."] },
    ] },
    faq: [{ q: "Czy potrzebuję doświadczenia?", a: "Nie. Możesz zacząć od zajęć próbnych bez przygotowania aktorskiego." }, { q: "W jakim języku są zajęcia?", a: "Po rosyjsku, można mówić po ukraińsku. Polski nie jest potrzebny do udziału." }, { q: "Ile osób jest w grupie?", a: "Regularna grupa liczy do 8 osób. Limit miejsc i dostępność na konkretnych zajęciach próbnych są podane przy terminie." }, { q: "Gdzie odbywają się zajęcia?", a: "ul. Domaniewska 37, Centrum Biznesowe Zepter, 5 piętro, lokal 42, Warszawa. Najbliższe stacje metra: Wilanowska i Służew." }],
  },
};

export function priorityPoetPage(locale: AppLocale, page: PoetIntentPage): PoetIntentPage {
  const key = page.cluster === "acting-course" ? "hub" : page.cluster === "trial" ? "trial" : null;
  if (!key) return page;
  const text = content[locale][key];
  return { ...page, courseHref: key === "hub" ? "#course-comparison" : "#trial-dates", courseCta: key === "hub" ? ({ ru: "Сравнить курсы", uk: "Порівняти курси", pl: "Porównaj kursy" }[locale]) : ({ ru: "Выбрать дату", uk: "Обрати дату", pl: "Wybierz termin" }[locale]), title: `${text.title} | Popular Poet`, h1: text.title, description: text.description, lead: text.lead, answerLead: undefined, bullets: [], faq: content[locale].faq };
}
export function priorityPoetExpansion(locale: AppLocale, slug: string): PoetIntentHubExpansion | undefined {
  const cluster = poetIntentClusterForSlug(locale, slug);
  const key = cluster === "acting-course" ? "hub" : cluster === "trial" ? "trial" : null;
  return key ? { sections: content[locale][key].sections, extraFaq: [], relatedHubSlugs: [], ticketsCluster: "trial" } : undefined;
}
