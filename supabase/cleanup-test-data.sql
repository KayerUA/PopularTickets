-- Очистка тестовых данных PopularTickets / Popular Poet
--
-- ПОРЯДОК:
--   1) Запустите audit-db-inventory.sql и посмотрите списки.
--   2) Отредактируйте блоки ниже под себя (slug-и, email-ы).
--   3) Сначала выполните только SELECT «dry run» в каждом блоке.
--   4) Потом раскомментируйте DELETE и замените ROLLBACK на COMMIT.
--
-- Ограничения схемы:
--   • orders → events (ON DELETE RESTRICT) — сначала заказы, потом события.
--   • tickets → orders (CASCADE) — удалятся с заказом.
--   • poet_trial_slot → events.slug (RESTRICT) — слоты удалить до события.
--
-- НЕ ТРОГАЕМ по умолчанию: poet_course (курсы на popularpoet.pl).

begin;

-- ═══════════════════════════════════════════════════════════════════════════
-- БЛОК A — безопасно: неоплаченные заказы (pending / failed / cancelled)
-- Билеты у pending обычно не создаются; у failed/cancelled — тоже.
-- ═══════════════════════════════════════════════════════════════════════════

-- dry run:
select o.id, o.status, o.email, e.slug
from public.orders o
join public.events e on e.id = o.event_id
where o.status in ('pending', 'failed', 'cancelled');

-- delete:
-- delete from public.orders
-- where status in ('pending', 'failed', 'cancelled');


-- ═══════════════════════════════════════════════════════════════════════════
-- БЛОК B — тестовые оплаченные заказы по email (bypass / свои покупки)
-- Подставьте свои тестовые адреса. Удалит заказы + билеты (CASCADE).
-- ═══════════════════════════════════════════════════════════════════════════

-- dry run:
-- select o.id, o.email, o.buyer_name, e.slug, o.amount_grosze / 100.0 as pln
-- from public.orders o
-- join public.events e on e.id = o.event_id
-- where o.status = 'paid'
--   and lower(o.email) in (
--     lower('your-test@gmail.com'),
--     lower('severkelli@gmail.com')  -- только если это были чисто ваши тесты!
--   );

-- delete:
-- delete from public.orders
-- where status = 'paid'
--   and lower(email) in (
--     lower('your-test@gmail.com')
--   );


-- ═══════════════════════════════════════════════════════════════════════════
-- БЛОК C — удалить конкретные события по slug (+ все их заказы и билеты)
-- Отредактируйте массив slug. Не включайте pp-trial-* если они нужны на сайте.
-- ═══════════════════════════════════════════════════════════════════════════

-- dry run:
-- with target(slug) as (
--   select unnest(array[
--     'improv-swietlica-2026-05-08',  -- пример: старый сид шоу
--     'test-event-slug'               -- ваш черновик из админки
--   ]::text[])
-- ),
-- ev as (
--   select e.id, e.slug from public.events e
--   join target t on t.slug = e.slug
-- )
-- select ev.slug,
--        count(distinct o.id) filter (where o.status = 'paid') as paid_orders,
--        count(t.id) as tickets
-- from ev
-- left join public.orders o on o.event_id = ev.id
-- left join public.tickets t on t.event_id = ev.id
-- group by ev.slug;

-- delete (раскомментируйте целиком блок):
-- with target(slug) as (
--   select unnest(array[
--     'improv-swietlica-2026-05-08',
--     'test-event-slug'
--   ]::text[])
-- ),
-- ev as (
--   select e.id, e.slug from public.events e
--   join target t on t.slug = e.slug
-- )
-- delete from public.poet_trial_slot pts
-- where pts.tickets_checkout_event_slug in (select slug from ev);
--
-- with target(slug) as (
--   select unnest(array[
--     'improv-swietlica-2026-05-08',
--     'test-event-slug'
--   ]::text[])
-- ),
-- ev as (
--   select e.id from public.events e
--   join target t on t.slug = e.slug
-- )
-- delete from public.orders o
-- where o.event_id in (select id from ev);
--
-- with target(slug) as (
--   select unnest(array[
--     'improv-swietlica-2026-05-08',
--     'test-event-slug'
--   ]::text[])
-- )
-- delete from public.events e
-- using target t
-- where e.slug = t.slug;


-- ═══════════════════════════════════════════════════════════════════════════
-- БЛОК D — черновики: visibility = inactive, без paid-заказов
-- Удаляет «забытые» события из админки. Опубликованные не трогает.
-- ═══════════════════════════════════════════════════════════════════════════

-- dry run:
-- with doomed as (
--   select e.id, e.slug, e.title
--   from public.events e
--   where e.visibility = 'inactive'
--     and not exists (
--       select 1 from public.orders o
--       where o.event_id = e.id and o.status = 'paid'
--     )
-- )
-- select * from doomed;

-- delete:
-- with doomed as (
--   select e.id, e.slug
--   from public.events e
--   where e.visibility = 'inactive'
--     and not exists (
--       select 1 from public.orders o
--       where o.event_id = e.id and o.status = 'paid'
--     )
-- )
-- delete from public.poet_trial_slot pts
-- where pts.tickets_checkout_event_slug in (select slug from doomed);
--
-- with doomed as (
--   select e.id from public.events e
--   where e.visibility = 'inactive'
--     and not exists (
--       select 1 from public.orders o
--       where o.event_id = e.id and o.status = 'paid'
--     )
-- )
-- delete from public.orders o where o.event_id in (select id from doomed);
--
-- with doomed as (
--   select e.id from public.events e
--   where e.visibility = 'inactive'
--     and not exists (
--       select 1 from public.orders o
--       where o.event_id = e.id and o.status = 'paid'
--     )
-- )
-- delete from public.events e where e.id in (select id from doomed);


-- ═══════════════════════════════════════════════════════════════════════════
-- БЛОК E — старые payment_callbacks без заказа (опционально, косметика)
-- ═══════════════════════════════════════════════════════════════════════════

-- dry run:
-- select id, created_at, status, session_id
-- from public.payment_callbacks
-- where order_id is null
--   and created_at < now() - interval '30 days';

-- delete:
-- delete from public.payment_callbacks
-- where order_id is null
--   and created_at < now() - interval '30 days';


-- ═══════════════════════════════════════════════════════════════════════════
-- Проверка после очистки (можно запустить до commit)
-- ═══════════════════════════════════════════════════════════════════════════
select 'events' as table_name, count(*)::bigint as rows from public.events
union all select 'orders', count(*) from public.orders
union all select 'tickets', count(*) from public.tickets
union all select 'checkins', count(*) from public.checkins
order by table_name;

-- Пока не уверены — откат:
rollback;

-- Когда всё ок — закомментируйте rollback и раскомментируйте:
-- commit;
