-- Промокод 70 zł вместо 100 zł на «Боинг-Боинг» 4 октября — для баннера на странице оценки.
-- Выполните в Supabase SQL Editor, если кода ещё нет.

insert into public.promo_codes (
  code,
  partner_name,
  discount_type,
  discount_percent,
  discount_fixed_grosze,
  commission_grosze,
  scope,
  event_id,
  landing_event_id,
  is_active
)
select
  'RATE70',
  'Оценка мероприятия',
  'fixed',
  null,
  3000,
  0,
  'event',
  e.id,
  e.id,
  true
from public.events e
where e.slug = 'spektakl-boing-boing-scena-kocjana-2026-10-04'
  and not exists (
    select 1 from public.promo_codes p where lower(p.code) = 'rate70'
  );
