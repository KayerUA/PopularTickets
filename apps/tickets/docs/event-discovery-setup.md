# Авто-публикация событий (Telegram → сайт → Google)

## Как это работает сейчас

**Telegram-бот** (афиша → «Опубликовать»):

1. Создаёт событие на **populartickets.pl** (JSON-LD Event, sitemap) — автоматически
2. **Google Business Profile** — создаёт пост «Событие» через API, если настроены `GOOGLE_GBP_*`
3. **IndexNow** — пинг URL, если настроен `INDEXNOW_KEY`
4. В ответе бота видно статус: `📍 Google Business: событие создано` или `ℹ️ не настроен`

Отдельное «тестовое событие» или Make/Zapier **не нужны** — всё в том же флоу, что и публикация афиши.

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
# Установить google-auth-oauthlib или использовать OAuth Playground:
# https://developers.google.com/oauthplayground/
# Scope: https://www.googleapis.com/auth/business.manage
# Use your own OAuth credentials → Authorize → Exchange → refresh_token
```

Или Python:

```bash
pip install google-auth-oauthlib
# credentials.json из Desktop OAuth client
python -c "
from google_auth_oauthlib.flow import InstalledAppFlow
SCOPES = ['https://www.googleapis.com/auth/business.manage']
flow = InstalledAppFlow.from_client_secrets_file('credentials.json', SCOPES)
creds = flow.run_local_server(port=8080, access_type='offline', prompt='consent')
print('refresh_token:', creds.refresh_token)
"
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

После деплоя: опубликовать афишу через бота → в ответе должно быть `📍 Google Business: событие создано`.

## IndexNow (опционально)

```env
INDEXNOW_KEY=<openssl rand -hex 16>
INDEXNOW_HOST=www.populartickets.pl
```

Проверка: `https://www.populartickets.pl/<KEY>.txt`

## Админка vs бот

- **Бот** — основной флоу; GBP + IndexNow после «Опубликовать»
- **Админка** — те же каналы при save с `visibility=published`, без лишних сообщений в Telegram

## Ошибки GBP

- `403` — API не включён или аккаунт не владелец локации
- `invalid_grant` — refresh token протух / отозван → получить новый
- `not_configured` в боте — не заданы `GOOGLE_GBP_*` в Vercel

Документация Google: [Create Posts on Google](https://developers.google.com/my-business/content/posts-data)
