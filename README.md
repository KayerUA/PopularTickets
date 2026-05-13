# PopularTickets — MVP продажи билетов

Платформа для небольших событий в Польше: афиша на **польском**, **украинском** и **русском** (`/pl`, `/uk`, `/ru`), оплата **Przelewy24**, билеты с **QR**, **Resend**, админка и **check-in**.

## Структура проекта

```
PopularTickets/
├── app/
│   ├── [locale]/(site)/        # Публичный сайт: /pl/..., /uk/..., /ru/...
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── events/[slug]/page.tsx
│   │   ├── checkout/return/page.tsx
│   │   └── firma/page.tsx
│   ├── check-in/               # Контроль входа (без языкового префикса)
│   ├── admin/                  # Админка (JWT cookie + middleware)
│   ├── actions/
│   ├── api/
│   ├── globals.css
│   └── layout.tsx
├── components/
├── docs/
│   └── SUPABASE.md             # Пошаговая настройка Supabase
├── i18n/                       # next-intl: routing, request, navigation
├── messages/                   # pl.json, uk.json
├── lib/
│   └── checkoutBypass.ts       # флаг CHECKOUT_BYPASS_PAYMENT
├── .github/
│   └── workflows/
│       └── ci.yml              # lint + tsc при push/PR в main
├── middleware.ts               # JWT /admin + next-intl + редиректы локали
├── scripts/check-env.mjs       # npm run check:env
├── supabase/schema.sql
├── .env.example
└── package.json
```

## Локали и URL

- Публичные страницы: **`/pl/...`**, **`/uk/...`**, **`/ru/...`**. Корень **`/`** перенаправляется на **`/pl`** (middleware).
- **Админка и служебные URL без префикса языка** (закладки для команды):
  - `https://<ваш-домен>/admin` и `/admin/login`
  - `https://<ваш-домен>/check-in`
  - Webhook Przelewy24: `https://<ваш-домен>/api/p24/notify`

Ссылки **Check-in** и **Админ** в публичную шапку не выводятся.

## Безопасность (кратко)

- **Данные в Supabase** — только с сервера через **service role**; RLS включён, политик для `anon` нет (см. `supabase/schema.sql`).
- **Страница чека после оплаты** (`/…/checkout/return`): по умолчанию доступ по query-параметру `order=<uuid>` (capability URL: кто знает ссылку — видит билеты и email). В production рекомендуется задать **`ORDER_RECEIPT_SECRET`** (≥16 символов): тогда редиректы после оплаты используют подписанный параметр **`rt`**, а голый `order` в URL без подписи не открывает чек.
- **Check-in**: если задан **`CHECKIN_OPERATOR_TOKEN`**, тот же секрет нужен и для поиска билета, и для отметки входа.
- **Rate limit**: встроенный счётчик в памяти процесса; на serverless с несколькими инстансами лучше задать **`UPSTASH_REDIS_REST_URL`** и **`UPSTASH_REDIS_REST_TOKEN`** — тогда лимиты общие (см. `lib/security.ts`).
- **Админка**: пароль из env, JWT в `httpOnly` cookie, проверка в middleware.
- **SEO / GEO**: `metadataBase` из `NEXT_PUBLIC_APP_URL` (или `VERCEL_URL`), на публичных страницах — canonical, hreflang (`pl` / `uk` / `ru` + `x-default`), Open Graph, Twitter, meta `geo.region` / `geo.placename` (Польша / Варшава). Главная и события — JSON-LD (`WebSite` + `Organization`, `Event` с `Offer`, `validThrough` = дата начала, `inLanguage`). Файлы **`/sitemap.xml`** и **`/robots.txt`** (`app/sitemap.ts`, `app/robots.ts`). Страницы `/admin`, `/check-in`, `/api/*` и `/…/checkout/return` с **noindex**.

## NPM-пакеты

| Пакет | Назначение |
|--------|------------|
| `next` | App Router, SSR, server actions |
| `next-intl` | i18n для `pl` / `uk` |
| `react`, `react-dom` | UI |
| `typescript` | типизация |
| `tailwindcss`, `postcss`, `autoprefixer` | стили |
| `@supabase/supabase-js` | Postgres (service role на сервере) |
| `resend` | почта |
| `qrcode` | PNG QR |
| `zod` | валидация |
| `framer-motion` | анимации |
| `eslint`, `eslint-config-next` | линт |

## Установка (локально)

1. **Node.js 20+** и npm.
2. `cp .env.example .env.local` и заполните значения (см. ниже и [docs/SUPABASE.md](docs/SUPABASE.md)).
3. В Supabase: **SQL Editor** → выполните `supabase/schema.sql`.
4. `npm install` → `npm run dev` → откройте `http://localhost:3000` (откроется `/pl/...`).

Опционально перед деплоем: `npm run check:env` — проверяет наличие ключевых переменных без запуска сервера.

### Переменные окружения

См. `.env.example`. Важно:

- `NEXT_PUBLIC_APP_URL` — канонический публичный URL (P24 `urlReturn` / `urlStatus`, письма, SEO). На Vercel после привязки **своего домена** можно не задавать: на production подставится `VERCEL_PROJECT_PRODUCTION_URL` (домен из панели). Для preview по-прежнему `https://$VERCEL_URL`, если переменная не задана.
- `SKIP_ORDER_EMAIL=true` — не отправлять письмо с билетами (билеты в БД создаются).
- `NEXT_PUBLIC_CONTACT_EMAIL` — контакт для покупателей (страница «Информация» / `firma`).
- `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` — только на сервере, не светите service role в браузер.
- Ключи **Przelewy24** и **Resend**.
- `ADMIN_PASSWORD`, `ADMIN_JWT_SECRET` (≥16 символов).
- Опционально `CHECKIN_OPERATOR_TOKEN` — если задан, на `/check-in` для отметки входа нужен тот же секрет в поле кода оператора.

### MVP без Przelewy24

Пока нет регистрации в Przelewy24, в `.env` / `.env.local` задайте:

```env
CHECKOUT_BYPASS_PAYMENT=true
SKIP_ORDER_EMAIL=true
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

На **Vercel** в режиме bypass `NEXT_PUBLIC_APP_URL` можно не указывать (редирект относительный). `SKIP_ORDER_EMAIL=true` отключает письмо даже при настроенном Resend. После отправки формы заказ сразу **оплачен**, билеты создаются; письмо с QR — только если Resend задан и `SKIP_ORDER_EMAIL` не `true`. Когда P24 будет готов — `CHECKOUT_BYPASS_PAYMENT=false` и заполните `P24_*`.

## Supabase (кратко)

Полная пошаговая инструкция: **[docs/SUPABASE.md](docs/SUPABASE.md)** — создание проекта, **Project Settings → API**, выполнение `schema.sql`, проверка `.env.local`.

Порядок **ручных шагов vs CLI** (Vercel, ошибка загрузки списка): **[docs/DEPLOY.md](docs/DEPLOY.md)** — там же команды `npm run verify:supabase` и `vercel env`.

**Админка** не под префиксом языка: `https://<ваш-домен>/admin/login` — в футере публичного сайта есть ссылка «Панель организатора».

### Билеты и check-in

- **Когда появляются билеты**: после перевода заказа в статус **оплачен** (`paid`) — в обход P24 (`CHECKOUT_BYPASS_PAYMENT=true`) это сразу после отправки формы на сайте, с Przelewy24 — после успешного уведомления на `/api/p24/notify`. Логика в [`lib/fulfillment.ts`](lib/fulfillment.ts): для каждой единицы `quantity` создаётся строка в таблице `tickets` (связь с заказом и событием).
- **Номер и QR**: у билета есть UUID **`id`** (его и вводят/сканируют на входе) и короткий уникальный **`ticket_number`** — генерируется в [`lib/tickets.ts`](lib/tickets.ts) (`randomTicketNumber` + проверка коллизий).
- **Кто и как отмечает вход**: страница **`/check-in`** (не раздел админки). Ввод UUID билета → поиск → кнопка «Отметить вход». Если в окружении задан **`CHECKIN_OPERATOR_TOKEN`**, перед отметкой нужно ввести этот же секрет в поле кода оператора. В админке **`/admin/orders`** можно только **смотреть** номера билетов и статус (вошёл / нет), отметка делается только на `/check-in`.

## Что делать дальше (чеклист)

1. **Локально**: заполните `.env` / `.env.local` по [`.env.example`](.env.example), выполните `supabase/schema.sql` в панели Supabase, затем **`npm run verify:supabase`** — если OK, ключи и таблица на месте. Дальше `npm run dev`, проверьте `/pl` и заказ (при `CHECKOUT_BYPASS_PAYMENT=true`). Подробнее: [docs/DEPLOY.md](docs/DEPLOY.md).
2. **Админка**: задайте `ADMIN_PASSWORD` и `ADMIN_JWT_SECRET` (≥16 символов) → `/admin/login` → создайте и **опубликуйте** событие.
3. **Почта (по желанию)**: Resend + `RESEND_*` — тогда в demo-режиме после «оплаты» уйдёт письмо с QR.
4. **GitHub**: `git remote add origin …`, `git push -u origin main` (см. раздел ниже).
5. **Автодеплой**: свяжите репозиторий с **Vercel** (раздел «Автодеплой») и перенесите переменные в **Environment Variables** проекта.
6. **Przelewy24**: когда будет готов мерчант — `CHECKOUT_BYPASS_PAYMENT=false`, ключи `P24_*`, в панели P24 укажите `urlStatus` на ваш домен.

## Автодеплой при push в `main` (Vercel + GitHub)

Рекомендуемый способ для Next.js — **не отдельный workflow деплоя**, а встроенная интеграция Vercel ↔ GitHub: каждый push в ветку **Production** (обычно `main`) запускает сборку и выкладку.

1. Зайдите на [vercel.com](https://vercel.com), войдите (можно через GitHub).
2. **Add New… → Project → Import** ваш репозиторий `PopularTickets`.
3. **Framework Preset**: Next.js. **Output Directory** оставьте **пустым** (не `build` — это не Create React App). В корне репозитория есть [`vercel.json`](vercel.json) с `"framework": "nextjs"`, чтобы Vercel не подхватил неверный пресет.
4. **Environment Variables**: для **MVP с bypass** достаточно Supabase, `CHECKOUT_BYPASS_PAYMENT=true`, опционально `SKIP_ORDER_EMAIL=true` (билеты создаются, письмо не уходит). **`NEXT_PUBLIC_APP_URL`** задайте на свой домен (Production), если нужен один URL в письмах и P24 независимо от внутреннего `*.vercel.app`. После привязки домена в Vercel production-деплой и так получит канонический хост через системную переменную (см. `lib/publicAppUrl.ts`). Админка, Resend/P24 — по мере готовности.
5. **Deploy**. В настройках проекта: **Settings → Git → Production Branch** = `main` (по умолчанию так и есть).
6. Дальше: **любой push в `main`** → Vercel сам собирает и деплоит; в PR можно включить **Preview Deployments** (по умолчанию включены для PR).

В репозитории уже есть [`.github/workflows/ci.yml`](.github/workflows/ci.yml): при push/PR в `main` гоняются **ESLint** и **`tsc --noEmit`** (без вызова Supabase). Полную `next build` Vercel выполняет на своих раннерах при деплое.

**Не включайте одновременно** второй кастомный деплой тем же коммитом (дублирующий workflow с `vercel deploy`), если уже подключили Git через Vercel — получатся лишние двойные сборки.

## Деплой на Vercel (переменные и P24)

1. После импорта репозитория задайте **Environment Variables** (Production + Preview) по `.env.example`.
2. В Przelewy24 укажите **urlStatus**: `https://<домен>/api/p24/notify`.
3. Публичный URL: **`NEXT_PUBLIC_APP_URL`** (рекомендуется на свой домен) **или** на Vercel production — системный `VERCEL_PROJECT_PRODUCTION_URL` после привязки домена; иначе `VERCEL_URL` (`https://…vercel.app`). Колбек P24: `https://<тот же хост>/api/p24/notify`.

## Поток Przelewy24 (упрощённо)

1. Форма на странице события → server action создаёт заказ `pending`.
2. Регистрация транзакции в P24, редирект на оплату.
3. После оплаты — JSON на `/api/p24/notify`, проверка подписи и `verify`.
4. Заказ `paid`, билеты и письмо с QR.

## Публикация на GitHub

Убедитесь, что в [`.gitignore`](.gitignore) игнорируются `.env.local`, `.env*.local`, `.next/`.

```bash
git init
git add .
git commit -m "Initial PopularTickets MVP"
```

На GitHub: **New repository** (без README, если он уже есть локально), затем:

```bash
git remote add origin git@github.com:<org>/<repo>.git
git branch -M main
git push -u origin main
```

С [GitHub CLI](https://cli.github.com/): `gh repo create <repo> --private --source=. --remote=origin --push`.

## Полезные команды

```bash
npm run dev       # разработка
npm run build     # production-сборка
npm run start     # запуск после build
npm run lint      # ESLint
npm run check:env # проверка обязательных env
```

После деплоя: `/admin/login` → создайте и опубликуйте событие. Реквизиты и блок Przelewy24: **`/pl/firma`**, **`/uk/firma`** или **`/ru/firma`**.
