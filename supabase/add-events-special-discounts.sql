-- Специальные события: доступны только по прямой ссылке и поддерживают
-- последовательные скидочные периоды. Выполните в Supabase SQL Editor.

alter table public.events
  drop constraint if exists events_listing_kind_check;

alter table public.events
  add constraint events_listing_kind_check
  check (listing_kind in ('performance', 'trial', 'special'));

alter table public.events
  add column if not exists discount_periods jsonb not null default '[]'::jsonb
  check (jsonb_typeof(discount_periods) = 'array');

comment on column public.events.discount_periods is
  'Скидочные периоды special-события, например [{"name":"Super Early Bird","until":"2026-07-17","percent":15}]. until включительно по времени Europe/Warsaw.';
