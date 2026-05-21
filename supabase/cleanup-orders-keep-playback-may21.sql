-- Очистка тестовых заказов: оставить только 2 реальные оплаты PLAY BACK (5 zł).
-- Supabase → SQL Editor → Run (весь файл целиком).
--
-- Остаются:
--   TKT-BD8F73  (21.05.2026 14:40, Mikita Lashytski, check-in ✓)
--   TKT-D52237  (21.05.2026 14:20, Nick Nick, militalashytski@gmail.com)

begin;

-- ─── Что сохранится (должно быть 2 строки) ─────────────────────────────────
select
  'KEEP' as action,
  o.id as order_id,
  o.status,
  o.email,
  o.buyer_name,
  o.amount_grosze / 100.0 as amount_pln,
  e.title as event_title,
  t.ticket_number,
  t.used_at is not null as checked_in
from public.orders o
join public.tickets t on t.order_id = o.id
join public.events e on e.id = o.event_id
where upper(t.ticket_number) in ('TKT-BD8F73', 'TKT-D52237')
order by o.created_at;

-- ─── Стоп, если не нашли ровно 2 заказа ────────────────────────────────────
do $$
declare
  keep_orders int;
  keep_tickets int;
begin
  select count(distinct t.order_id), count(*)
    into keep_orders, keep_tickets
  from public.tickets t
  where upper(t.ticket_number) in ('TKT-BD8F73', 'TKT-D52237');

  if keep_tickets <> 2 then
    raise exception 'Ожидали 2 билета TKT-BD8F73 + TKT-D52237, найдено %', keep_tickets;
  end if;
  if keep_orders <> 2 then
    raise exception 'Ожидали 2 заказа, найдено % (оба билета должны быть в разных orders)', keep_orders;
  end if;
end $$;

-- ─── Удаление всего остального (orders → tickets + checkins каскадом) ────
with keep_orders as (
  select distinct t.order_id
  from public.tickets t
  where upper(t.ticket_number) in ('TKT-BD8F73', 'TKT-D52237')
)
delete from public.orders o
where o.id not in (select order_id from keep_orders);

-- ─── Итог ──────────────────────────────────────────────────────────────────
select count(*) as orders_left from public.orders;
select count(*) as tickets_left from public.tickets;
select ticket_number, used_at is not null as checked_in from public.tickets order by ticket_number;

commit;
