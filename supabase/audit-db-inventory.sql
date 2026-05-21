-- Обзор данных перед очисткой (Supabase → SQL Editor → Run).
-- Сохраните результат или сделайте скрин — потом проще решить, что удалять.

-- ─── Сводка по таблицам ───────────────────────────────────────────────────
select 'events' as table_name, count(*)::bigint as rows from public.events
union all select 'orders', count(*) from public.orders
union all select 'tickets', count(*) from public.tickets
union all select 'checkins', count(*) from public.checkins
union all select 'payment_callbacks', count(*) from public.payment_callbacks
union all select 'poet_course', count(*) from public.poet_course
union all select 'poet_trial_slot', count(*) from public.poet_trial_slot
order by table_name;

-- ─── События + заказы и билеты ────────────────────────────────────────────
select
  e.slug,
  e.title,
  e.visibility,
  e.listing_kind,
  e.starts_at at time zone 'Europe/Warsaw' as starts_warsaw,
  e.total_tickets,
  count(distinct o.id) filter (where o.status = 'paid') as paid_orders,
  count(distinct o.id) filter (where o.status = 'pending') as pending_orders,
  count(distinct o.id) filter (where o.status in ('failed', 'cancelled')) as dead_orders,
  count(t.id) as tickets_total,
  count(t.id) filter (where t.used_at is not null) as tickets_used
from public.events e
left join public.orders o on o.event_id = e.id
left join public.tickets t on t.event_id = e.id
group by e.id
order by e.starts_at desc;

-- ─── Незавершённые заказы (обычно мусор после тестов checkout) ───────────
select
  o.created_at at time zone 'Europe/Warsaw' as created_warsaw,
  o.status,
  o.email,
  o.buyer_name,
  o.quantity,
  o.amount_grosze / 100.0 as amount_pln,
  e.slug as event_slug,
  e.title as event_title
from public.orders o
join public.events e on e.id = o.event_id
where o.status in ('pending', 'failed', 'cancelled')
order by o.created_at desc;

-- ─── Оплаченные заказы (удалять только если уверены, что это ваши тесты) ─
select
  o.created_at at time zone 'Europe/Warsaw' as created_warsaw,
  o.email,
  o.buyer_name,
  o.quantity,
  o.amount_grosze / 100.0 as amount_pln,
  e.slug,
  e.title,
  count(t.id) as tickets,
  count(t.id) filter (where t.used_at is not null) as used
from public.orders o
join public.events e on e.id = o.event_id
left join public.tickets t on t.order_id = o.id
where o.status = 'paid'
group by o.id, e.id
order by o.created_at desc;

-- ─── Группировка по email (быстро найти свои тестовые адреса) ─────────────
select
  o.email,
  o.status,
  count(*) as orders,
  sum(o.quantity) as tickets_qty,
  sum(o.amount_grosze) / 100.0 as total_pln
from public.orders o
group by o.email, o.status
order by orders desc, o.email;

-- ─── Legacy-слоты poet_trial_slot (если таблица есть) ─────────────────────
select
  pts.id,
  pts.is_published,
  pts.tickets_checkout_event_slug,
  pts.starts_at at time zone 'Europe/Warsaw' as starts_warsaw,
  pts.title
from public.poet_trial_slot pts
order by pts.starts_at desc nulls last;

-- ─── События-кандидаты на удаление (эвристика, не команда DELETE) ─────────
-- inactive + нет ни одного paid-заказа
select
  e.slug,
  e.title,
  e.visibility,
  e.starts_at at time zone 'Europe/Warsaw' as starts_warsaw,
  count(o.id) as any_orders
from public.events e
left join public.orders o on o.event_id = e.id
where e.visibility = 'inactive'
  and not exists (
    select 1 from public.orders p where p.event_id = e.id and p.status = 'paid'
  )
group by e.id
order by e.starts_at desc;
