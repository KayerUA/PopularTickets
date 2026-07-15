# Авто-публикация событий (Telegram → сайт → Google)

## Как это работает сейчас

**Telegram-бот** (афиша → превью → скрытый черновик → публикация на сайте):

1. Админ присылает фото и текст афиши (в любом порядке; альбом + текст отдельным сообщением — ок).
2. **Gemini** разбирает афишу. Если не хватает полей — бот спрашивает с **инлайн-кнопками** (цена, места, тип шоу/пробное, язык) или текстом.
3. **Превью** — проверка данных. Кнопка **«Создать (скрыто)»** создаёт событие как `unlisted`:
   - страница доступна **по прямой ссылке** для проверки;
   - **не** в афише, **не** в sitemap, `noindex` для поисковиков;
   - IndexNow и GBP **не** запускаются.
4. Админ открывает ссылку-предпросмотр и нажимает **«Опубликовать на сайте»**:
   - событие переходит в `published` (афиша, sitemap, индексация);
   - **Google Business Profile** — пост через API, если настроены `GOOGLE_GBP_*`;
   - **IndexNow** — пинг URL, если настроен `INDEXNOW_KEY`;
   - опционально рассылка в Telegram-группы.
5. Кнопка **«Удалить»** скрывает черновик (`inactive`) — событие пропадает с сайта.

Команды: `/start` — инструкция; `/cancel` — отменить текущий черновик до создания; `/broadcast` — разослать произвольный пост во все Telegram-группы.

## Release checklist (перед передачей бота пользователю)

### 1. Переменные окружения (Vercel, проект tickets)

Обязательные:

```env
TELEGRAM_BOT_TOKEN=...
TELEGRAM_WEBHOOK_SECRET=<случайная строка>
TELEGRAM_ADMIN_USER_IDS=<telegram user id владельца через запятую>
GEMINI_API_KEY=...
```

Опциональные:

```env
TELEGRAM_AUTO_BROADCAST=1
# TELEGRAM_BROADCAST_CHAT_IDS — устарело: группы регистрируются автоматически (см. ниже)
INDEXNOW_KEY=<openssl rand -hex 16>
INDEXNOW_HOST=www.populartickets.pl
GOOGLE_GBP_ACCOUNT_ID=...
GOOGLE_GBP_LOCATION_ID=...
GOOGLE_GBP_CLIENT_ID=...
GOOGLE_GBP_CLIENT_SECRET=...
GOOGLE_GBP_REFRESH_TOKEN=...
GOOGLE_GBP_LANGUAGE=ru
GOOGLE_GBP_MANUAL_PANEL_URL=https://business.google.com/
```

### 2. SQL-миграции в Supabase

Выполнить в SQL Editor (порядок важен). После `CREATE TABLE` обычно ничего больше не нужно — Supabase подхватывает схему сам.

Если бот/API пишет, что таблица «не найдена», в том же SQL Editor выполните:

```sql
NOTIFY pgrst, 'reload schema';
```

(Результат: `Success. No rows returned` — это нормально.)

1. `supabase/add-content-visibility.sql` — колонка `visibility` (published/unlisted/inactive)
2. `supabase/telegram-event-drafts.sql` — черновики бота
3. `supabase/telegram-message-buffers.sql` — буферы альбомов (serverless)
4. `supabase/telegram-broadcast-chats.sql` — группы для рассылки афиши
5. `supabase/telegram-bot-admins.sql` — редакторы бота (назначаются через /addadmin)
6. `supabase/add-events-day-of-event-price.sql` — цена в день события

### 3. Регистрация webhook

```bash
node scripts/set-telegram-webhook.mjs
```

URL: `https://www.populartickets.pl/api/telegram/webhook/<TELEGRAM_WEBHOOK_SECRET>`

### 4. Проверка после деплоя

1. `/start` в личке бота — инструкция отображается.
2. Переслать тестовую афишу → превью → «Создать (скрыто)» → ссылка открывается, события **нет** в афише.
3. «Опубликовать на сайте» → событие в афише, в ответе статус IndexNow/GBP.
4. Добавить бота **админом** в Telegram-группу → рассылка подключится автоматически (`/subscribe` вручную, `/unsubscribe` отключить).
5. Перерегистрировать webhook после деплоя: `node scripts/set-telegram-webhook.mjs` (нужен `my_chat_member`).

### Рассылка в Telegram-группы

Без хардкода chat id в Vercel:

1. Добавьте бота в группу и назначьте **администратором** — группа сохранится в `telegram_broadcast_chats`.
2. Или отправьте `/subscribe` в группе (от имени пользователя из `TELEGRAM_ADMIN_USER_IDS`).
3. `/unsubscribe` — отключить рассылку в эту группу.
4. `TELEGRAM_BROADCAST_CHAT_IDS` в env — опциональный fallback для старых настроек.

**Афиша события** — кнопка «В группы» после публикации на сайте (или авто при `TELEGRAM_AUTO_BROADCAST=1`).

**Произвольный пост** — `/broadcast` в личке бота (владелец или редактор):
1. `/broadcast` → пришлите текст, фото, видео или альбом → подтвердите «Разослать».
2. Или ответьте `/broadcast` на уже отправленное сообщение.
3. `/post` — то же самое. `/cancel` — выйти из режима рассылки.

**Предстоящие события** — `/events` (или `/upcoming`, `/афиша`):
- Список будущих событий на сайте (`published` и скрытые `unlisted`).
- Кнопка **📢** у каждого — повторная рассылка в группы (обложка с сайта, продающий текст).
- 🌍 — в афише, 👀 — только по ссылке.

**Точка фокуса обложки** — кнопка «🖼 Точка фокуса» на превью (до создания) и после скрытого черновика. Открывает мини-приложение Telegram: клик по превью 16:9, как в админке. В BotFather для бота должен быть задан домен: `www.populartickets.pl` (`/setdomain`).

Бот копирует сообщение в каждую группу без пометки «переслано» (Telegram `copyMessage` / `copyMessages`).

Slug события строится по **языку аудитории** (`event_language`): ru/ru_uk → русский заголовок, uk → украинский, pl → польский.

### Редакторы бота (делегирование)

- **Владельцы** — `TELEGRAM_ADMIN_USER_IDS` в Vercel (нельзя удалить через бота).
- **Редакторы** — назначаются владельцем в личке бота:
  - `/addadmin 123456789` или ответ `/addadmin` на сообщение человека
  - `/removeadmin 123456789` — снять доступ
  - `/listadmins` — список владельцев и редакторов
  - `/myid` — узнать свой Telegram ID (доступно всем)

### 5. Известные ограничения

- **Дедуп апдейтов** — in-memory в одном serverless-инстансе; ретраи Telegram на другой lambda не дедупятся (публикация защищена атомарным захватом черновика).
- **`/cancel`** отменяет только активный черновик до создания; уже созданный скрытый черновик удаляется кнопкой «Удалить».
- **Фото** сопоставляются событиям **по порядку дат** (от ближайшей), не по порядку загрузки.

## Что нельзя автоматизировать на 100%

| Канал | Как попадает |
|-------|----------------|
| **Сайт + Google Search Events** | Event schema + sitemap (авто) |
| **Google Business Profile** | GBP API при настроенном OAuth (авто из бота) |
| **Google Maps (слой событий)** | Нет публичного API «создать событие на карте» — Google подтягивает с сайта/GBP, без гарантий |
| **Gemini** | Органически из индекса, не управляется |

## Одноразовая настройка Google Business Profile (~20 мин)

### 1. Google Cloud

1. [Google Cloud Console](https://console.cloud.google.com/) → новый проект
2. **APIs & Services → Enable APIs:**
   - **My Business Business Information API**
   - **My Business Account Management API**
   - (legacy) **Google My Business API** / Business Profile APIs
3. **OAuth consent screen** → External → добавить scope `https://www.googleapis.com/auth/business.manage`
4. **Credentials → Create OAuth client ID → Desktop app** → скачать `client_id` + `client_secret`

### 2. Refresh token

На своём Mac (один раз):

```bash
GOOGLE_GBP_CLIENT_ID=... GOOGLE_GBP_CLIENT_SECRET=... node scripts/gbp-oauth.mjs
```

Скрипт откроет браузер, примет callback на `http://localhost:8080/oauth2callback`
и выведет `GOOGLE_GBP_REFRESH_TOKEN`. Если переменные уже записаны в корневой
`.env.local`, достаточно запустить `node scripts/gbp-oauth.mjs`.

Альтернатива — OAuth Playground:

```bash
# https://developers.google.com/oauthplayground/
# Scope: https://www.googleapis.com/auth/business.manage
# Use your own OAuth credentials → Authorize → Exchange → refresh_token
```

### 3. accountId и locationId

```bash
# В .env.local:
GOOGLE_GBP_CLIENT_ID=...
GOOGLE_GBP_CLIENT_SECRET=...
GOOGLE_GBP_REFRESH_TOKEN=...

node scripts/gbp-list-locations.mjs
```

Скопировать `accountId` и `locationId` для **Teatr Popular Poet** (Domaniewska).

### 4. Vercel (Production, проект tickets)

```env
GOOGLE_GBP_ACCOUNT_ID=1234567890
GOOGLE_GBP_LOCATION_ID=9876543210
GOOGLE_GBP_CLIENT_ID=....apps.googleusercontent.com
GOOGLE_GBP_CLIENT_SECRET=...
GOOGLE_GBP_REFRESH_TOKEN=1//...
GOOGLE_GBP_LANGUAGE=ru
```

После деплоя: создать скрытый черновик → «Опубликовать на сайте» → в ответе должно быть `📍 Google Business: событие создано`.

## IndexNow (опционально)

```env
INDEXNOW_KEY=<openssl rand -hex 16>
INDEXNOW_HOST=www.populartickets.pl
```

Один и тот же `INDEXNOW_KEY` задайте в Vercel **обоих** проектов (tickets + poet).

Проверка key file:
- `https://www.populartickets.pl/<KEY>.txt`
- `https://www.popularpoet.pl/<KEY>.txt`

Пинг sitemap обоих доменов после деплоя:

```bash
node scripts/indexnow-ping-sitemap.mjs --all
```

## Bing Webmaster Tools (ручной шаг)

После деплоя robots/IndexNow/SRO:

1. Зарегистрируйте [Bing Webmaster Tools](https://www.bing.com/webmasters) для обоих доменов:
   - `https://www.populartickets.pl`
   - `https://www.popularpoet.pl`
2. Импорт из Google Search Console (если доступно) или DNS/HTML-верификация.
3. Отправьте sitemap:
   - `https://www.populartickets.pl/sitemap.xml`
   - `https://www.popularpoet.pl/sitemap.xml`
4. Убедитесь, что `INDEXNOW_KEY` в Vercel совпадает с локальным `.env` на обоих проектах.

Bing использует IndexNow для быстрой индексации — пинг `--all` после каждого крупного обновления контента.

## Админка vs бот

- **Бот** — основной флоу; GBP + IndexNow после «Опубликовать на сайте» (не после «Создать скрыто»)
- **Админка** — те же каналы при save с `visibility=published`, без лишних сообщений в Telegram

## Fallback: ручной пост (пока quota API = 0)

Пока Google не одобрил **Application for Basic API Access** (квота 0 QPM), автопост в GBP не работает.

**Бот делает fallback сам:** после «Опубликовать на сайте» приходит отдельное сообщение с:
- названием, датой (Warsaw), текстом, ссылкой на билеты, URL обложки;
- шагами: business.google.com → Добавить → Событие.

Опционально в Vercel:

```env
GOOGLE_GBP_MANUAL_PANEL_URL=https://business.google.com/   # или прямая ссылка на локацию
GOOGLE_GBP_MANUAL_FALLBACK=0   # выключить подсказки
```

Когда API одобрят (quota 300 QPM) и `GOOGLE_GBP_*` настроены — fallback не нужен, посты пойдут автоматически.

## Ошибки GBP

- `403` / quota `0` — API не одобрен → используйте ручной пост из бота
- `invalid_grant` — refresh token протух / отозван → получить новый
- `not_configured` в боте — не заданы `GOOGLE_GBP_*` в Vercel (fallback всё равно придёт)

Документация Google: [Create Posts on Google](https://developers.google.com/my-business/content/posts-data)
