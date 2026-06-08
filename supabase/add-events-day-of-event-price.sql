alter table public.events
  add column if not exists day_of_event_price_grosze int
  check (day_of_event_price_grosze is null or day_of_event_price_grosze > 0);

comment on column public.events.day_of_event_price_grosze is
  'Optional ticket price applied during the event calendar day in Europe/Warsaw.';
