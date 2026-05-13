-- Локаль оформления заказа (для письма с билетами).
-- Если API возвращает PGRST204 «Could not find the 'locale' column of 'orders'» — выполните этот скрипт в Supabase SQL Editor (или блок миграции в конце `schema.sql` про orders).
alter table public.orders
  add column if not exists locale text not null default 'pl'
  check (locale in ('pl', 'uk', 'ru'));

comment on column public.orders.locale is 'Язык интерфейса при оформлении (pl|uk|ru) — письмо с билетами.';
