-- Локаль оформления заказа (для письма с билетами). Выполнить в Supabase SQL Editor после schema.sql.
alter table public.orders
  add column if not exists locale text not null default 'pl'
  check (locale in ('pl', 'uk', 'ru'));

comment on column public.orders.locale is 'Язык интерфейса при оформлении (pl|uk|ru) — письмо с билетами.';
