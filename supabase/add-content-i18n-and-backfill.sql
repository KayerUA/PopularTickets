-- Pola tłumaczeń treści z bazy (RU = title/description/body; PL/UK = osobne kolumny).
-- Uruchom w Supabase → SQL Editor przed scripts/backfill-content-i18n.mjs (lub razem z backfill SQL).

-- events
alter table public.events add column if not exists title_pl text;
alter table public.events add column if not exists description_pl text;
alter table public.events add column if not exists title_uk text;
alter table public.events add column if not exists description_uk text;

comment on column public.events.title_pl is 'Tytuł po polsku (wymagany do publikacji na /pl/).';
comment on column public.events.description_pl is 'Opis po polsku.';
comment on column public.events.title_uk is 'Назва українською (fallback: title).';
comment on column public.events.description_uk is 'Опис українською (fallback: description).';

-- poet_course
alter table public.poet_course add column if not exists title_pl text;
alter table public.poet_course add column if not exists body_pl text;
alter table public.poet_course add column if not exists title_uk text;
alter table public.poet_course add column if not exists body_uk text;
alter table public.poet_course add column if not exists card_tag_pl text;
alter table public.poet_course add column if not exists card_tag_uk text;

comment on column public.poet_course.title_pl is 'Tytuł kursu PL (popularpoet.pl/pl).';
comment on column public.poet_course.body_pl is 'Opis kursu PL.';
comment on column public.poet_course.card_tag_pl is 'Etykieta kafelka PL.';

-- legacy trial slots (opcjonalnie)
alter table public.poet_trial_slot add column if not exists title_pl text;
alter table public.poet_trial_slot add column if not exists body_pl text;
alter table public.poet_trial_slot add column if not exists title_uk text;
alter table public.poet_trial_slot add column if not exists body_uk text;

-- Backfill PL/UK

UPDATE public.events SET title_pl = 'Spektakl „Improwizacja”', description_pl = '🎭 Nasi improwizatorzy są gotowi na każde wyzwanie! Wasze pomysły nabiorą kształtu na scenie, rozbudzą humor i zamienią się w żywe postacie.

😍 Krótkie i długie formy improwizacji, widzowie staną się reżyserami, ciepła i przyjazna atmosfera wspólnoty, śmiech i inteligentny humor — wszystko to sprawi, że poniedziałkowy wieczór będzie niezapomniany.', title_uk = 'Шоу «Імпровізація»', description_uk = '🎭 Наші імпровізатори готові до будь-яких завдань! Ваші ідеї набудуть образності на сцені, обростуть гумором і перетворяться на живих персонажів.

😍 Короткі й довгі форми імпровізації, глядачі стануть режисерами, затишна атмосфера єднання, сміх і інтелектуальний гумор — все це зробить понеділковий вечір незабутнім.', updated_at = now() WHERE slug = 'teatr-popular-poet';
UPDATE public.events SET title_pl = 'Spektakl „Boing-Boing”', description_pl = 'Spektakl „Boing-Boing” w teatrze Popular Poet w Warszawie. Szczegóły wkrótce na stronie wydarzenia.', title_uk = 'Вистава «Боинг-Боинг»', description_uk = 'Вистава «Боинг-Боинг» у театрі Popular Poet у Варшаві.', updated_at = now() WHERE slug = 'popular-poet';
UPDATE public.events SET title_pl = 'Zajęcia wstępne PLAY-BACK', description_pl = 'Zajęcia próbne Popular Poet w Warszawie. Płatność i bilet — na PopularTickets.

Adres: Warszawa, ul. Domaniewska 37, Centrum biznesowe Zepter, piętro 5, lokal 42.', title_uk = 'Вступне заняття PLAY-BACK', description_uk = 'Пробний слот Popular Poet у Варшаві. Оплата та квиток — на PopularTickets.

Адреса: Warszawa, ul. Domaniewska 37, Centrum biznesowe Zepter, piętro 5, lokal 42.', updated_at = now() WHERE slug = 'pp-trial-playback';
UPDATE public.events SET title_pl = 'Spektakl „Improwizacja”', description_pl = 'Jak spędzić piątkowy wieczór? Pójść na spektakl „Improwizacja”.

8 maja (pt), 21:00 — bar Świetlica Wolności, Nowy Świat 6/12, 00-400 Warszawa.

Mapa: https://maps.app.goo.gl/jz9E6JUn8rcymRoH7?g_st=ic

Nasi aktorzy będą tworzyć fabuły na waszych oczach, żartować bez scenariusza i radzić sobie z trudnymi zadaniami aktorskimi.

Start o 21:00
• Humor i komedia
• Dużo interakcji
• Formy ze widownią
• Trudne zadania dla aktorów

Spędzimy piątkowy wieczór w gronie przyjaciół, popijając napoje z baru i ciesząc się komedią improwizowaną.

Zabierzcie znajomych, przyjdźcie wcześniej.

Bilet — 100 zł.', title_uk = 'Шоу «Імпровізація»', description_uk = 'Як провести п’ятничний вечір? Сходити на шоу «Імпровізація».

8 травня (пт), 21:00 — бар Świetlica Wolności, Nowy Świat 6/12, 00-400 Warszawa.

Карта: https://maps.app.goo.gl/jz9E6JUn8rcymRoH7?g_st=ic

Наші актори створюватимуть сюжети на ваших очах, жартуючи без заготовок.

Початок о 21:00
• Гумор і комедії
• Багато інтерактиву
• Формати з глядачами

Квиток — 100 zł.', updated_at = now() WHERE slug = 'improv-swietlica-2026-05-08';
UPDATE public.events SET title_pl = 'Zajęcia z improwizacji', description_pl = 'Dlaczego warto spróbować improwizacji?

- rozluźnienie od pierwszego spotkania
- emocjonalne naładowanie
- nowe umiejętności
- lekkość w myśleniu i ciele

Co będzie na zajęciach?
Na lekcji próbnej stopniowo rozgrzewamy się przez treningi aktorskie — bez presji! Po 15 minutach łapiesz stan gry: pirat, dziecko, dowódca czy zabawna postać.', title_uk = 'Заняття з імпровізації', description_uk = 'Чому варто спробувати імпровізацію?

- розкріплення з першої зустрічі
- емоційне перезавантаження
- нові навички
- легкість у мисленні та тілі

На пробному занятті поступово розігріваємось через акторські тренінги — без тиску!', updated_at = now() WHERE slug = 'probnoe-zaniatie-15052026';
UPDATE public.events SET title_pl = 'Zajęcia próbne: aktorstwo', description_pl = 'Zajęcia próbne Popular Poet w Warszawie. Płatność i bilet — na PopularTickets (Przelewy24).

Adres: Warszawa, ul. Domaniewska 37, Centrum biznesowe Zepter, piętro 5, lokal 42.', title_uk = 'Пробне: акторська майстерність', description_uk = 'Пробний слот Popular Poet у Варшаві. Оплата та квиток — на PopularTickets (Przelewy24).

Адреса: Warszawa, ul. Domaniewska 37, Centrum biznesowe Zepter, piętro 5, lokal 42.', updated_at = now() WHERE slug = 'pp-trial-acting';
UPDATE public.events SET title_pl = 'Zajęcia próbne: improwizacja aktorska', description_pl = 'Zajęcia próbne Popular Poet w Warszawie. Bilet kupujesz na PopularTickets: płatność Przelewy24, potwierdzenie na e-mail.

Adres: Warszawa, ul. Domaniewska 37, Centrum biznesowe Zepter, piętro 5, lokal 42.', title_uk = 'Пробне: акторська імпровізація', description_uk = 'Пробний слот Popular Poet у Варшаві. Оформлюєте квиток на PopularTickets: оплата Przelewy24, підтвердження на e-mail.

Адреса: Warszawa, ul. Domaniewska 37, Centrum biznesowe Zepter, piętro 5, lokal 42.', updated_at = now() WHERE slug = 'pp-trial-improv';
UPDATE public.events SET title_pl = 'Spektakl komediowy ⭐️ IMPROWIZACJA ⭐️', description_pl = 'Zespół: „Dwa palce”

Zapraszamy na humorystyczne show do teatru „Popularny Poeta”. Nasi improwizatorzy wystąpią w formatach komediowych, tworząc fabuły i postacie na waszych oczach, a nietypowe zadania aktorskie dopełnią obraz humoru!

👑 Czeka was:
- Humor i komedia
- Pełna improwizacja
- Trudne zadania aktorskie
- Formy ze widownią
- Energia i zabawa

🎈 19.05 (wt)
🏁 Start o 19:00', title_uk = 'Комедійне шоу ⭐️ ІМПРОВІЗАЦІЯ ⭐️', description_uk = 'Команда: «Два пальця»

Запрошуємо на гумористичне шоу до театру «Популярний поет». Наші імпровізатори виступлять у комедійних форматах.

👑 Вас чекають:
- Гумор і комедії
- Повна імпровізація
- Складні акторські завдання
- Формати з глядачами

🎈 19.05 (вт)
🏁 Початок о 19:00', updated_at = now() WHERE slug = 'impro-dwa-palcha-19052026';
UPDATE public.events SET title_pl = 'Spektakl', description_pl = 'Spektakl w teatrze Popular Poet. Szczegóły wkrótce.', title_uk = 'Вистава', description_uk = 'Вистава в театрі Popular Poet.', updated_at = now() WHERE slug = 'sale-14';
UPDATE public.events SET title_pl = 'Warsztaty „Uwaga na scenie”', description_pl = 'Adres: Warszawa, ul. Domaniewska 37, Centrum biznesowe Zepter, piętro 5, lokal 42.', title_uk = 'Майстер-клас «Увага на сцені»', description_uk = 'Адреса: Warszawa, ul. Domaniewska 37, Centrum biznesowe Zepter, piętro 5, lokal 42.', updated_at = now() WHERE slug = 'pp-trial-masterclass';
UPDATE public.events SET title_pl = 'Zajęcia wstępne ze storytellingu', description_pl = 'Opowiemy sobie nawzajem historie i omówimy, czym różni się historia A od historii B.', title_uk = 'Вступне заняття зі сторітелінгу', description_uk = 'Разом розповімо одне одному історії та розберемо, у чому різниця між історією A та B.', updated_at = now() WHERE slug = 'story-tailing-prewiew';
UPDATE public.events SET title_pl = 'Zajęcia próbne z improwizacji', description_pl = 'Dlaczego warto spróbować improwizacji?

- rozluźnienie od pierwszego spotkania
- emocjonalne naładowanie
- nowe umiejętności
- lekkość w myśleniu i ciele

Co będzie na zajęciach?
Na lekcji próbnej stopniowo rozgrzewamy się przez treningi aktorskie — bez presji! Po 15 minutach łapiesz stan gry.', title_uk = 'Пробне заняття з імпровізації', description_uk = 'Чому варто спробувати імпровізацію?

- розкріплення з першої зустрічі
- емоційне перезавантаження
- нові навички
- легкість у мисленні та тілі', updated_at = now() WHERE slug = 'impro20052026';
UPDATE public.events SET title_pl = 'Spektakl „PLAY-BACK”', description_pl = 'Zespół „Kwartirnik” wystąpi w tę sobotę i zagra wasze historie! Spieszcie się z rezerwacją miejsc.

„Kwartirnik” to zespół aktorów występujący w gatunku play-back. Zagramy historie widzów w teatralnych formach. Każda opowieść stanie się fabułą, a opowiadający zobaczy, jak ich historia zamienia się w dramaturgię. Niezapomniana atmosfera wspólnoty z salą, humor i satyra, wzruszające wnioski — czekamy na was!', title_uk = 'Шоу «PLAY-BACK»', description_uk = 'Команда «Квартирник» виступить у цю суботу та зіграє ваші історії! Поспішайте забронювати місця.

«Квартирник» — команда акторів у жанрі play-back. Ми зіграємо історії глядачів у театралізованих формах.', updated_at = now() WHERE slug = 'shou-play-back';
UPDATE public.poet_course SET title_pl = 'Grupy PLAY-BACK', body_pl = 'Muzyka, ruch i historie widzów na scenie. Zajęcia próbne: płatność na PopularTickets.', title_uk = 'Групи PLAY-BACK', body_uk = 'Музика, рух і історії глядачів на сцені. Пробне: оплата на PopularTickets.', card_tag_pl = 'PLAY-BACK', card_tag_uk = 'PLAY-BACK', updated_at = now() WHERE slug = 'playback';
UPDATE public.poet_course SET title_pl = 'Improwizacja aktorska', body_pl = 'Scena „tu i teraz”, formaty i widz — bez wkuwania tekstu. Zajęcia próbne: płatność na PopularTickets.', title_uk = 'Акторська імпровізація', body_uk = 'Сцена «тут і зараз», формати й глядач — без заученого тексту. Пробне: оплата на PopularTickets.', card_tag_pl = 'Impro', card_tag_uk = 'Імпро', updated_at = now() WHERE slug = 'improv';
UPDATE public.poet_course SET title_pl = 'Aktorstwo', body_pl = 'Głos, tekst i obecność na scenie. Zajęcia próbne: płatność na PopularTickets.', title_uk = 'Акторська майстерність', body_uk = 'Голос, текст і присутність на сцені. Пробне: оплата на PopularTickets.', card_tag_pl = 'Aktorstwo', card_tag_uk = 'Акторство', updated_at = now() WHERE slug = 'acting';
UPDATE public.poet_course SET title_pl = 'Kurs teatru play-back', body_pl = 'Kurs teatru play-back — muzyka, ruch i opowieści widzów na scenie.', title_uk = 'Курс Play-back театру', body_uk = 'Курс Play-back театру', card_tag_pl = 'PLAY-BACK', card_tag_uk = 'PLAY-BACK', updated_at = now() WHERE slug = 'play-back';
UPDATE public.poet_course SET title_pl = 'Kurs improwizacji', body_pl = 'Kurs improwizacji aktorskiej — od podstaw do sceny.', title_uk = 'Курс імпровізації', body_uk = 'Імпро, імпро, імпро', card_tag_pl = 'Impro', card_tag_uk = 'Імпро', updated_at = now() WHERE slug = 'kurs-impro';
UPDATE public.poet_course SET title_pl = 'Aktorstwo', body_pl = 'Kurs aktorstwa — głos, tekst i obecność na scenie w praktyce.', title_uk = 'Акторська майстерність', body_uk = 'Приходь акторитися', card_tag_pl = 'Aktorstwo', card_tag_uk = 'Акторство', updated_at = now() WHERE slug = 'akterskoe-masterstvo';
UPDATE public.poet_course SET title_pl = 'Kurs storytellingu', body_pl = 'Kurs, który nauczy opowiadać historie.
4 zajęcia.', title_uk = 'Курс сторітелінгу', body_uk = 'Курс, який навчить розповідати історії
4 заняття', card_tag_pl = 'Kurs', card_tag_uk = 'Курс', updated_at = now() WHERE slug = 'story-talling';
UPDATE public.poet_course SET title_pl = 'Warsztaty (masterclass)', body_pl = 'Skondensowany intensyw z wybranego tematu. Zajęcia próbne: płatność na PopularTickets.', title_uk = 'Майстер-класи', body_uk = 'Стислий інтенсив з теми. Пробне: оплата на PopularTickets.', card_tag_pl = 'Masterclass', card_tag_uk = 'Майстер-клас', updated_at = now() WHERE slug = 'masterclass';
