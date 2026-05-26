# PopularTickets — автоматическое обнаружение событий

Сайт с **5–30+ событиями в месяц** не должен требовать ручного noindex или «запросить индексирование» на каждый URL. В коде настроена **автоматическая политика** и **хуки при publish**.

## Что делает код без вашего участия

| Действие | Когда | Результат |
|----------|--------|-----------|
| **Event JSON-LD** | Каждый рендер страницы `/events/{slug}` | Google Search / Events rich results, Gemini может цитировать структурированные данные |
| **Sitemap** | Все `visibility=published` | Будущие — priority 0.9, недавно прошедшие — 0.6, старые — 0.35; **все остаются в sitemap** |
| **robots** | published | **index, follow** (и прошлые события — архив контента). `unlisted` → noindex |
| **IndexNow** | Admin save / Telegram bot publish | Пинг Bing/Yandex (если задан `INDEXNOW_KEY`) |
| **Webhook** | То же | JSON в Make/Zapier/n8n (опционально) |
| **Telegram** | То же | Сообщение `TELEGRAM_ADMIN_USER_IDS` (+ опц. группа) — ссылки и напоминание про GBP |

Опционально: `EVENT_SEO_ARCHIVE_DAYS=365` — через N дней после **начала** события ставится `noindex, follow` (по умолчанию **выключено**).

## Google Search vs Maps vs Business Profile

**Важно:** JSON-LD и sitemap **не создают** карточку «Событие» в Google Business Profile автоматически. Это разные системы:

1. **Google Search / Events** — читает `Event` schema на populartickets.pl + sitemap. Работает из коробки после деплоя.
2. **Google Maps (Events layer)** — частично подтягивает публичные события с сайтов с корректной разметкой; гарантий нет, нужны crawl + authority.
3. **Google Business Profile** — события создаются через **профиль организации** (ручной UI) или **Google Business Profile API** / интеграции (Make, Zapier, Localo и т.п.).

Рекомендуемая схема: **сайт = источник правды**, webhook дублирует publish в GBP.

## Настройка IndexNow (5 минут)

1. Сгенерировать ключ, например: `openssl rand -hex 16`
2. В Vercel (проект tickets), Production:
   - `INDEXNOW_KEY=<ваш ключ>`
   - `INDEXNOW_HOST=www.populartickets.pl`
3. После деплоя проверить: `https://www.populartickets.pl/<KEY>.txt` → в теле только ключ.
4. Опубликовать тестовое событие — в логах Vercel не должно быть `[eventDiscovery] IndexNow failed`.

Google IndexNow **не использует**; для Google достаточно sitemap + Event schema + internal links (related events, hub pages).

## Telegram вместо Make/Zapier

Если webhook не нужен — **ничего настраивать не надо**: при publish бот шлёт личку всем из `TELEGRAM_ADMIN_USER_IDS` (уже заданы для бота афиш):

```
🎭 Опубликовано на PopularTickets
📅 6 июня 2026 г., 19:30
📍 Yo Bar & Pub…
💰 50.00 PLN
[Страница билетов] [Google Maps]
💡 Добавьте «Событие» в Google Business Profile…
```

- Выключить: `TELEGRAM_DISCOVERY_NOTIFY=false`
- Доп. группа команды: `TELEGRAM_DISCOVERY_CHAT_IDS=-1001234567890` (бот — админ группы)
- Админ должен хотя бы раз написать боту `/start`, иначе личка не доставится

## Настройка webhook → GBP (Make / Zapier) — опционально

1. Создать сценарий: **Webhook** → **Google Business Profile: Create Post** (тип Event) или аналог через [GBP API](https://developers.google.com/my-business/reference/rest).
2. URL webhook → `EVENT_DISCOVERY_WEBHOOK_URL` в Vercel.
3. Тело POST (пример):

```json
{
  "source": "populartickets",
  "type": "event_published",
  "event": {
    "slug": "improv-2026-06-06",
    "title": "…",
    "starts_at": "2026-06-06T17:30:00.000Z",
    "ticket_url": "https://www.populartickets.pl/ru/events/improv-2026-06-06",
    "maps_url": "https://maps.app.goo.gl/…"
  },
  "gbp_hint": {
    "topicType": "EVENT",
    "title": "…",
    "startDate": "2026-06-06T17:30:00.000Z",
    "callToAction": { "actionType": "BOOK", "url": "https://…" }
  }
}
```

Привязать GBP к **Teatr Popular Poet** (ul. Domaniewska) — одна локация, много событий.

## Что ещё усиливает видимость (раз в квартал, не на каждый ивент)

- **GSC:** один sitemap `https://www.populartickets.pl/sitemap.xml` — без ручного submit каждого event URL.
- **SameAs / performer** в JSON-LD уже указывает popularpoet.pl и соцсети театра.
- **Cross-links:** hub-страницы poet → билеты; related events на странице события.
- **Prod SQL:** `supabase/fix-event-urls-2026-05.sql` — битые `image_url` ломали metadata (Invalid URL).

## Триггеры в коде

- `apps/tickets/app/actions/admin-events.ts` — сохранение в админке
- `apps/tickets/lib/telegram/createEventDraft.ts` — публикация из Telegram-бота

Оба вызывают `notifyEventPublished()` только для `visibility === "published"`.
