# Przelewy24 — чеклист перед продакшеном

Сайт уже содержит **публичные ссылки** на регламент Przelewy24 на странице «Данные продавца» / `firma` (локали `pl`, `uk`, `ru`) и endpoint **`POST /api/p24/notify`** для уведомлений об оплате.

## 1. Переменные окружения (Vercel Production)

| Переменная | Назначение |
|------------|------------|
| `CHECKOUT_BYPASS_PAYMENT` | **`false`** — иначе оплата P24 не используется. |
| `NEXT_PUBLIC_APP_URL` | Канонический **HTTPS** URL, например `https://www.populartickets.pl` — для `urlReturn` и `urlStatus`. |
| `P24_SANDBOX` | `true` для песочницы, `false` для боевого приёма платежей. |
| `P24_MERCHANT_ID` | Из панели Przelewy24. |
| `P24_POS_ID` | ID пункта оплаты. |
| `P24_SECRET_ID` | Секрет для API. |
| `P24_CRC_KEY` | Ключ CRC (участвует в подписи запросов и уведомлений). |

Без корректных `P24_*` регистрация транзакции и проверка подписи в [`lib/p24.ts`](../apps/tickets/lib/p24.ts) / [`lib/fulfillment.ts`](../apps/tickets/lib/fulfillment.ts) не сработают.

## 2. URL в панели Przelewy24 (мерчант)

1. **Powiadomienia URL / URL statusu** (уведомление о статусе транзакции):  
   **`{NEXT_PUBLIC_APP_URL}/api/p24/notify`**  
   Пример: `https://www.populartickets.pl/api/p24/notify`  
   Метод в коде: **`POST`**, тело — **JSON** (обработка в [`app/api/p24/notify/route.ts`](../apps/tickets/app/api/p24/notify/route.ts)).

2. **URL powrotu / return** задаётся **при регистрации транзакции** из приложения:  
   `{baseUrl}/{locale}/checkout/return?...` (см. [`buildCheckoutReturnPath`](../apps/tickets/lib/orderReceiptToken.ts) и [`app/actions/checkout.ts`](../apps/tickets/app/actions/checkout.ts)).  
   В панели P24 отдельно «return» часто не дублируют — уточните в актуальной инструкции PayPro для вашего типа интеграции.

3. Сайт должен быть доступен по **HTTPS** с валидным сертификатом (у вас после привязки домена на Vercel — да).

## 3. Что проверить на стороне сайта

- [ ] Страница события открывается, форма заказа ведёт на Przelewy24 (при `CHECKOUT_BYPASS_PAYMENT=false`).
- [ ] После оплаты редирект на `/[locale]/checkout/return` с параметром `rt` или `order` (см. `ORDER_RECEIPT_SECRET`).
- [ ] В логах Vercel нет `p24 verify` / `bad sign` при тестовой оплате в sandbox.
- [ ] Заказ в Supabase переходит в `paid`, билеты создаются, письмо уходит (Resend + не `SKIP_ORDER_EMAIL=true`).

## 4. Дополнительно (по документации PayPro / P24)

- Whitelist IP, если в вашем договоре требуется ограничение источников для `urlStatus`.
- Режим sandbox vs production и отдельные учётные данные для каждого.
- Юридические тексты на сайте: **регламин**, **политика конфиденциальности**, **данные продавца** — уже в роутингах `/regulamin`, `/polityka-prywatnosci`, `/firma` (и локали).

## 5. Графика Przelewy24 в подвале (доверие / верификация)

В репозитории уже лежат файлы из официальных ZIP на [do-pobrania → Materiały graficzne](https://www.przelewy24.pl/do-pobrania#materialy-graficzne):

- `public/payments/p24-logo.svg` — из пакета P24 (`Przelewy24_logo.svg`).
- `public/payments/p24-mark.svg` — компактный знак **P24** (`P24_logo.svg`), форма заказа.
- `public/payments/p24-metody-platnosci.png` — **flagi bez tła** из ZIP `flagi_metod_platnosci_Przelewy24.zip` (сейчас вариант `flagi_Przelewy24_5`); можно заменить на `…_1` … `…_7` из того же каталога.

При обновлении знаков скачайте свежие архивы и замените файлы в **`public/payments/`** (те же имена):

| Файл | Назначение |
|------|------------|
| `p24-metody-platnosci.png` | Полоса методов (**PNG без фона** из `flagi_bez_tla/`). |
| `p24-logo.svg` | Полноразмерный логотип Przelewy24 (если полосы нет). |
| `p24-mark.svg` | Знак P24 у формы заказа. |

Код: [`lib/p24FooterAssets.ts`](../apps/tickets/lib/p24FooterAssets.ts), блок в [`components/SiteFooter.tsx`](../apps/tickets/components/SiteFooter.tsx). URL графики **фиксированные** (`/payments/...`), без `fs` — на Vercel Lambda не видит каталог `public/`, из‑за `existsSync` раньше пропадали картинки. Отключить блок: `NEXT_PUBLIC_HIDE_P24_FOOTER_GRAPHICS=1`.

В подвале **нет** отдельной строки «оплачивает» рядом с полосой `p24-metody-platnosci.png`: в официальном PNG уже есть польская подпись — дублировать её переводом на других локалях не нужно. Блок оплаты **без вложенных рамок**: одна линия-разделитель и полоса на фоне футера (PNG bez tła).

При расхождении с актуальной документацией **Przelewy24 / PayPro** приоритет у официальных материалов мерчанта.
