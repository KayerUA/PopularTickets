# Автоматическая отправка sitemap в Google

После публикации или изменения события сайт сбрасывает кеш sitemap, главной,
афиши, архива и страницы события. Админка запускает внешние уведомления через
Next.js `after()`, чтобы выполнение продолжалось после ответа браузеру.

Search Console sync проверяет наличие URL в sitemap, ответ HTTP 200,
canonical и отсутствие `noindex` в meta и HTTP-заголовке. Затем отправляет
sitemap через официальный Search Console API. Хеш URL и их `lastmod`
сохраняется в Supabase: одинаковое содержимое повторно не отправляется.
Блокировка в базе исключает одновременную отправку несколькими обработчиками.

Ежедневно в 06:00 UTC `/api/cron/search-discovery` повторяет сверку. Он также
находит будущие опубликованные спектакли, созданные напрямую в базе или
скриптами, и проверяет их версии RU/PL/UK, архив и страницы пробных занятий
`/probnoe/acting` и `/probnoe/improv` через URL Inspection API.
За один запуск проверяет до 12 URL, начиная с тех, которые ещё не проверялись
или проверялись раньше остальных. Проверки HTTP ограничены 30 URL за запуск.
Существующие события попадут в эту очередь после включения автоматизации.

Успешная отправка sitemap означает, что Google принял sitemap. Она не
означает, что страницы уже просканированы или добавлены в индекс.
URL Inspection читает состояние индекса, запрос индексации он не отправляет.

## Однократное подключение

1. Выполните `supabase/add-search-console-state.sql` в SQL Editor нужного
   проекта Supabase. Таблица закрыта для браузерных ролей через RLS и grants.
2. В Google Cloud включите Search Console API для проекта сервисного аккаунта.
3. У аккаунта `kayer-analytics@kayer-1776867490785.iam.gserviceaccount.com`
   должен быть полный доступ к нужному свойству Search Console.
4. Настройте в **Production** проекта Tickets на Vercel:

   ```text
   GOOGLE_SEARCH_CONSOLE_CLIENT_EMAIL=kayer-analytics@kayer-1776867490785.iam.gserviceaccount.com
   GOOGLE_SEARCH_CONSOLE_PRIVATE_KEY=<private_key из JSON-ключа сервисного аккаунта>
   GOOGLE_SEARCH_CONSOLE_SITE_URL=https://www.populartickets.pl/
   CRON_SECRET=<секрет для cron>
   NEXT_PUBLIC_APP_URL=https://www.populartickets.pl
   ```

   Для Domain property вместо URL укажите `sc-domain:populartickets.pl`.
   Значение должно совпадать со свойством, к которому выдали доступ.
   Email без приватного ключа не позволяет подписывать запросы от этого аккаунта.
   Значение `private_key` поддерживает настоящие переносы строк и `\n`.
   Не добавляйте ключ в Git, документацию или переменные `NEXT_PUBLIC_*`.
   Ключи GBP и Google Wallet автоматически не используются.
5. Выложите изменения вместе с обновлённым `apps/tickets/vercel.json`.
   Preview-деплои уведомления в Google не отправляют.

При отсутствии ключа публикация работает, результат discovery содержит
`status: skipped`, а ответ бота сообщает, что Google Search не подключён.
При недоступной таблице отправка завершается с ошибкой, чтобы не терять
состояние повторов. Ошибки Google не отменяют уже сохранённое событие.

## Результаты и повторы

Cron принимает только `Authorization: Bearer <CRON_SECRET>`.
Его JSON-ответ содержит `status`, `submittedAt` и `report` с состоянием URL.
`submitted` и `unchanged` относятся к sitemap. Индексация указана отдельно
в `report[].verdict`, `coverageState`, `lastCrawlTime` и `googleCanonical`.
`needsAttention` отмечает отсутствие подтверждённой индексации, другой canonical
или ошибку проверки. Ошибки проверки отдельных URL не отменяют факт отправки.
Для проблемных событий ближайших семи дней cron пишет предупреждение в лог.

HTTP 503 означает сбой общей сверки. Следующая публикация или ежедневный запуск
повторит отправку, если Google ещё не принял текущую версию sitemap.
После аварийного завершения блокировка освобождается по таймауту в пять минут.
После устранения ошибки отдельного URL его состояние повторно проверяется
при следующем суточном обходе очереди.

Состояние можно посмотреть в SQL Editor:

```sql
select site_url, submitted_at, attempted_at, last_error, inspected_at,
       inspection_report
from public.search_console_state;
```

Автоматизация не изменяет Google Business Profile и не отправляет рекламные
сообщения. Она использует Search Console Sitemaps API и URL Inspection API.

- [Отправка sitemap](https://developers.google.com/webmaster-tools/v1/sitemaps/submit)
- [Проверка URL](https://developers.google.com/webmaster-tools/v1/urlInspection.index/inspect)
