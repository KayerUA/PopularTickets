-- Тип публікації події: афіша квитків (PopularTickets) vs пробний слот (popularpoet.pl → оплата на тій же події).
-- Після виконання: у адмінці PopularTickets оберіть тип; головна квиткового сайту показує лише `performance`.

alter table public.events
  add column if not exists listing_kind text not null default 'performance'
  check (listing_kind in ('performance', 'trial'));

comment on column public.events.listing_kind is
  'performance = афіша виступів/шоу на PopularTickets; trial = слот пробного на popularpoet.pl (чекаут той самий slug на PopularTickets).';

create index if not exists events_listing_published_starts_idx
  on public.events (listing_kind, is_published, starts_at);

-- Публічне читання опублікованих подій (anon) — для popularpoet.pl без service role.
drop policy if exists "events_select_published" on public.events;
create policy "events_select_published"
  on public.events for select to anon, authenticated
  using (is_published = true);

grant select on public.events to anon, authenticated;
