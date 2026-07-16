-- Амбассадоры: фиксированная скидка/комиссия за билет, кабинет по hash и show_id.
-- Идемпотентно: можно выполнять после supabase/add-promo-codes.sql на существующей БД.

alter table public.promo_codes
  add column if not exists ambassador_hash text,
  add column if not exists discount_type text not null default 'percent',
  add column if not exists discount_fixed_grosze integer,
  add column if not exists commission_grosze integer not null default 0,
  add column if not exists marketing_materials_url text;

alter table public.promo_codes
  alter column discount_percent drop not null;

alter table public.promo_codes
  drop constraint if exists promo_codes_discount_value_check,
  drop constraint if exists promo_codes_discount_type_check,
  drop constraint if exists promo_codes_discount_fixed_grosze_check,
  drop constraint if exists promo_codes_commission_grosze_check;

alter table public.promo_codes
  add constraint promo_codes_discount_type_check check (discount_type in ('percent', 'fixed')),
  add constraint promo_codes_discount_fixed_grosze_check check (discount_fixed_grosze is null or discount_fixed_grosze > 0),
  add constraint promo_codes_commission_grosze_check check (commission_grosze >= 0),
  add constraint promo_codes_discount_value_check check (
    (discount_type = 'percent' and discount_percent is not null and discount_fixed_grosze is null)
    or (discount_type = 'fixed' and discount_fixed_grosze is not null)
  );

create unique index if not exists promo_codes_ambassador_hash_lower_uidx
  on public.promo_codes (lower(ambassador_hash)) where ambassador_hash is not null;

alter table public.orders
  add column if not exists ambassador_commission_grosze integer not null default 0;

alter table public.orders
  drop constraint if exists orders_ambassador_commission_grosze_check;

alter table public.orders
  add constraint orders_ambassador_commission_grosze_check check (ambassador_commission_grosze >= 0);

comment on column public.promo_codes.ambassador_hash is 'Hash персональной ссылки /ambassador/:hash.';
comment on column public.promo_codes.event_id is 'Опциональная привязка к шоу (show_id во внешнем API).';
comment on column public.promo_codes.commission_grosze is 'Комиссия амбассадора за один оплаченный билет.';
comment on column public.orders.ambassador_commission_grosze is 'Зафиксированная комиссия за весь заказ.';

-- Elvira / Next Mode 15.08.2026.
insert into public.promo_codes (
  code,
  partner_name,
  ambassador_hash,
  discount_type,
  discount_percent,
  discount_fixed_grosze,
  commission_grosze,
  marketing_materials_url,
  scope,
  event_id,
  landing_event_id,
  is_active
)
select
  'ELVIRA',
  'Elvira',
  'elvira_mua',
  'fixed',
  null,
  1000,
  1000,
  'https://drive.google.com/drive/folders/1rODhCk15OjAD68rcbaKhUeL3BJSYUgoi?usp=sharing',
  'event',
  e.id,
  e.id,
  true
from public.events e
where e.slug = 'next-mode-2026-08-15'
  and not exists (select 1 from public.promo_codes p where lower(p.code) = 'elvira');

update public.promo_codes p
set
  partner_name = 'Elvira',
  ambassador_hash = 'elvira_mua',
  discount_type = 'fixed',
  discount_percent = null,
  discount_fixed_grosze = 1000,
  commission_grosze = 1000,
  marketing_materials_url = 'https://drive.google.com/drive/folders/1rODhCk15OjAD68rcbaKhUeL3BJSYUgoi?usp=sharing',
  scope = 'event',
  event_id = e.id,
  landing_event_id = e.id,
  is_active = true,
  updated_at = now()
from public.events e
where lower(p.code) = 'elvira'
  and e.slug = 'next-mode-2026-08-15';
