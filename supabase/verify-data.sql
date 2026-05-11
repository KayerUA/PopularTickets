-- Быстрая проверка после schema.sql (SQL Editor → Run).
-- Покажет число строк в каждой таблице. events = 0, пока не добавите событие вручную / сидом / админкой.

select 'events' as table_name, count(*)::bigint as rows from public.events
union all
select 'orders', count(*) from public.orders
union all
select 'tickets', count(*) from public.tickets
union all
select 'checkins', count(*) from public.checkins
order by table_name;
