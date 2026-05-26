# Popular Poet — чеклист SEO / AI / GEO (вне репозитория)

Документ для владельца бренда: что сделать руками после выката кода (sitemap, JSON-LD, `llms.txt`, страница фактов).

## Google Search Console

1. Добавить **domain property** или URL-prefix для канонического домена (например `https://www.popularpoet.pl`).
2. Проверить, что **sitemap** доступен по `https://www.popularpoet.pl/sitemap.xml`, и отправить его в GSC (**Sitemaps**).
3. Выполнить **URL Inspection** для: главной (`/pl`, `/ru`, `/uk`), страницы фактов (`/pl/o-popular-poet` и др.), одной страницы курса (`/pl/kursy/...`).

### Отчёт «Страница с переадресацией» (http, без www, apex)

Для URL вроде `http://popularpoet.pl/`, `https://popularpoet.pl/` это **нормально**: Google сканирует зеркало, получает **301/308** на канон (`https://www.…`), и **не индексирует** исходный URL — так и должно быть. В Vercel должен быть привязан **один** основной домен (рекомендуется **www**), в `NEXT_PUBLIC_POET_SITE_URL` — **тот же** URL (https + www, без слэша в конце). Дубли по слэшу после локали (`/ru/` vs `/ru`) в коде сводятся редиректом на вариант **без** завершающего слэша.

### «Обнаружена, не проиндексирована» (28+ SEO-страниц)

Страницы из sitemap (`/pl/improwizacja-kurs-warszawa` и т.д.) **200 OK**, но Google ещё не обошёл их. Действия:

1. Убедиться, что sitemap отправлен и **без ошибок** (см. выше).
2. В GSC → **Проверка URL** → для 2–3 приоритетных slug нажать **Запросить индексирование** (не чаще нескольких в день).
3. Не валидировать в отчёте «Переадресация» URL `https://www.popularpoet.pl/` — канон главной: `https://www.popularpoet.pl/ru` (или `/pl` для PL-аудитории).
4. Подождать 1–3 недели после первого sitemap; новые intent-страницы пререндерятся при деплое (`generateStaticParams`).

### После деплоя SEO-хабов (2026-05) — запросить индексирование

Не чаще **3–5 URL в день** (GSC → Проверка URL → Запросить индексирование):

**popularpoet.pl (приоритет):**

- `https://www.popularpoet.pl/ru/improvizatsiya-varshava`
- `https://www.popularpoet.pl/ru/akterskie-kursy-varshava`
- `https://www.popularpoet.pl/ru/akterskaya-maysternost-varshava`
- `https://www.popularpoet.pl/ru/probnoe-zanyatie-varshava`
- `https://www.popularpoet.pl/pl/kurs-aktorski-warszawa`

**populartickets.pl:**

- `https://www.populartickets.pl/ru` (афиша)
- 1–2 актуальных event URL из афиши (не прошедших)

### Rich Results Test (после деплоя tickets)

1. Открыть [Rich Results Test](https://search.google.com/test/rich-results).
2. Проверить URL опубликованного события на PopularTickets — ожидаются **Event** + **FAQ** (если на странице есть FAQ).
3. При ошибках `Invalid URL` или битых `image` — выполнить `supabase/fix-event-urls-2026-05.sql` в prod и перепроверить.

### Canonical / env (PopularTickets)

- Production Vercel: **`NEXT_PUBLIC_APP_URL=https://www.populartickets.pl`** (без слэша в конце).
- Smoke: в HTML event/intent должно быть `link rel="canonical"` на **тот же** URL с локалью (`/ru/events/...`, не главная и не staging).


1. Подтвердить сайт (DNS или файл).
2. Отправить тот же **sitemap.xml**.

## Google Business Profile (GBP)

1. Категории, адрес и часы — **выровнять** с текстом на сайте и в `llms.txt` (ul. Domaniewska 37, Zepter, piętro 5, lokal 42, Warszawa).
2. Указать основной сайт **popularpoet.pl**; при необходимости — ссылку на афишу **populartickets.pl** в описании или постах.
3. **Каноническая ссылка на карту театра (Domaniewska 37):** `https://maps.app.goo.gl/BtaKyKYvp6nGZbx37` — должна совпадать на GBP, в футере popularpoet.pl, на `/firma` (блок театра) и в `events.maps_url` для пробных.
4. **Не путать** с legacy URL `https://maps.app.goo.gl/jz9E6JUn8rcymRoH7` — в репозитории он привязан к off-site событию (Świetlica Wolności, Nowy Świat). Если в GBP стоит старая ссылка — заменить на `BtaKy…` или убедиться, что обе ведут на **одно** место (Zepter, Domaniewska 37).
5. Телефон GBP: **+48 452 203 802** (как на populartickets.pl `/firma`).

## Внешние ссылки и профили

1. Поддерживать согласованные **Instagram / YouTube / Telegram** (уже в футере и на странице фактов).
2. По мере сил: 5–10 качественных внешних упоминаний (афиши, партнёры, мероприятия) — не автоматизируется кодом.

## WAF / Cloudflare / edge

1. Убедиться, что на edge **не подменяется** `robots.txt` и не блокируются полезные боты (в коде Poet для `*` стоит `Allow: /`; для **GPTBot** при необходимости задано `Disallow: /` — это продуктовое решение про обучение).
2. Проверить, что **sitemap.xml** и **llms.txt** отдаются с **200**, без редиректа на логин.

## IndexNow (опционально)

1. Если внедряте IndexNow: завести ключ, положить файл ключа в корень (или по правилам Bing), добавить **env** в деплой и POST на API IndexNow при публикации новых URL (курсы, факты) — это отдельная задача на backend/CI, не только фронт.

## Переменные окружения (напоминание)

- `NEXT_PUBLIC_POET_SITE_URL` — канонический URL сайта Poet для SEO (canonical, sitemap, OG).
- `NEXT_PUBLIC_TICKETS_SITE_URL` — база PopularTickets для ссылок на афишу и фирму.
- Для **PopularTickets** на Vercel: `NEXT_PUBLIC_APP_URL` = тот же канон, что и основной домен деплоя (часто `https://www.populartickets.pl`), чтобы canonical/P24 не расходились с редиректами.

## Reels / Shorts → landing (воронка)

1. В bio Instagram и в описании YouTube Shorts ставить **ссылку на intent-страницу**, а не только на главную:
   - комьюнити / «куда одному»: `popularpoet.pl/ru/kuda-poyti-odnomu-varshava` или `populartickets.pl/ru/kuda-poyti-odnomu-varshava`
   - impro: `popularpoet.pl/ru/improvizatsiya-varshava`
   - пробное: `popularpoet.pl/ru/probnoe-zanyatie-varshava`
2. В субтитрах и description Reels/Shorts — ключевые слова: **Warsaw, improv, theatre, русскоязычное**.
3. После публикации long-form — отправить URL в GSC (**URL Inspection** → Request indexing).

## Отзывы и GBP

1. Регулярно просить отзывы у гостей шоу (Google Maps / GBP) — 2–3 предложения + фото зала.
2. В GBP добавить фото сцены, афиши и ссылку на intent «куда одному» или афишу tickets.
3. Категории GBP: Theater, Drama school, Event venue — согласованы с сайтом.
