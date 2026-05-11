# Порядок деплоя и Supabase (что через CLI, что вручную)

Цель: сайт на Vercel без ошибки **«Не удалось загрузить список»** — значит с сервера доступны **URL проекта** и **service role**, а в базе есть таблицы из `schema.sql`.

## Что делаем **только в браузере** (Supabase / Vercel)

| Шаг | Где | Действие |
|-----|-----|----------|
| 1 | [supabase.com](https://supabase.com) | Проект уже есть → **Project Settings → API**: скопировать **URL** и **service_role** (Secret, `sb_secret_…`). **Publishable** в MVP приложением не используется, но можно хранить в `.env`. |
| 2 | Supabase → **SQL Editor** | Выполнить **`supabase/schema.sql`**. Предупреждение про *destructive* из‑за `DROP TRIGGER IF EXISTS` — нормально, данные таблиц не стираются. |
| 2a | SQL Editor | **`supabase/storage-event-images.sql`** — бакет Storage `event-images` для загрузки обложек из админки (публичное чтение). Без этого файловая загрузка в форме события упадёт с ошибкой Storage. |
| 2c | SQL Editor | Если ошибка про **`maps_url`** или **schema cache**: выполните **`supabase/add-maps-url.sql`**, затем в панели Supabase **Project Settings → API** нажмите **Reload schema** (обновление кэша PostgREST после `ALTER TABLE`). |
| 2b | SQL Editor | Опционально: **`supabase/verify-data.sql`** — сколько строк в `events` / `orders` / `tickets` / `checkins`. |
| 3 | (опционально) SQL Editor | **`supabase/seed-improv-event.sql`** — тестовое событие на афише. |
| 4 | [vercel.com](https://vercel.com) → проект → **Settings → Environment Variables** | Для **Production** и **Preview**: `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (+ остальное из `.env.example` по необходимости). Сохранить. |
| 5 | Vercel → **Deployments** | **Redeploy** последнего деплоя (или пустой commit push), чтобы подтянулись переменные. |
| 6 | Vercel → **Build & Development Settings** | **Framework**: Next.js, **Output Directory** пустой (не `build`). |

Без шагов 1–2 CLI **не** создаст таблицы в облачной базе — только SQL в панели Supabase или связка **Supabase CLI** + `db push` (если вы сами настроили `supabase link`).

## Что делаем **из терминала в папке проекта**

Убедитесь, что в **`.env`** или **`.env.local`** те же переменные, что на Vercel (можно скопировать вручную или `vercel env pull .env.local` после `vercel link`).

```bash
npm install
npm run verify:supabase    # проверка: events доступна, ключи верные
npm run check:env        # остальные обязательные переменные (если настроены)
npm run seed:improv        # опционально: вставить событие импровизации (если сид SQL не делали)
npm run build              # локально убедиться, что сборка проходит
```

| Команда | Назначение |
|---------|------------|
| `npm run verify:supabase` | Минимальный запрос к `events`; код выхода 0/1. |
| `npm run check:env` | Проверка env-файла без запуска Next. |
| `npm run seed:improv` | Вставка/обновление тестового события через API. |

### Vercel CLI (по желанию)

```bash
vercel login
vercel link              # привязать каталог к проекту
vercel env ls            # посмотреть, что реально задано в облаке
vercel env pull .env.local   # скачать переменные локально (осторожно: секреты в файле)
```

Добавить переменную из терминала: `vercel env add SUPABASE_SERVICE_ROLE_KEY` (интерактивно). Полный список — в [документации Vercel CLI](https://vercel.com/docs/cli/env).

## Порядок «если уже всё делал, но ошибка остаётся»

1. Локально: **`npm run verify:supabase`** — если здесь ошибка, чиним базу/ключи **до** Vercel.
2. Если локально **OK**, а на Vercel нет — в панели Vercel сравнить **имена** переменных (`NEXT_PUBLIC_*` для URL) и окружение (**Preview** vs **Production**).
3. Vercel → **Logs** деплоя / runtime: искать **`[PopularTickets][Supabase]`** — там текст ошибки PostgREST.

## Кратко

- **CLI в репо** — проверка и сид **при наличии ключей** в `.env`; не заменяет SQL в Supabase и не заходит в ваш аккаунт Vercel без `vercel login`.
- **Обязательно вручную** — первый прогон `schema.sql` и выставление секретов в Vercel (или через `vercel env`).
