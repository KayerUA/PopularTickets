# Popular Poet — чеклист SEO / AI / GEO (вне репозитория)

Документ для владельца бренда: что сделать руками после выката кода (sitemap, JSON-LD, `llms.txt`, страница фактов).

## Google Search Console

1. Добавить **domain property** или URL-prefix для канонического домена (например `https://www.popularpoet.pl`).
2. Проверить, что **sitemap** доступен по `https://www.popularpoet.pl/sitemap.xml`, и отправить его в GSC (**Sitemaps**).
3. Выполнить **URL Inspection** для: главной (`/pl`, `/ru`, `/uk`), страницы фактов (`/pl/o-popular-poet` и др.), одной страницы курса (`/pl/kursy/...`).

## Bing Webmaster Tools

1. Подтвердить сайт (DNS или файл).
2. Отправить тот же **sitemap.xml**.

## Google Business Profile (GBP)

1. Категории, адрес и часы — **выровнять** с текстом на сайте и в `llms.txt` (ul. Domaniewska 37, Zepter, piętro 5, lokal 42, Warszawa).
2. Указать основной сайт **popularpoet.pl**; при необходимости — ссылку на афишу **populartickets.pl** в описании или постах.

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
