alter table public.events
  add column if not exists event_language text not null default 'ru_uk';

alter table public.events
  drop constraint if exists events_event_language_check;

alter table public.events
  add constraint events_event_language_check
  check (event_language in ('ru', 'uk', 'ru_uk', 'pl', 'en', 'mixed'));

comment on column public.events.event_language is
  'Public language of the event shown to buyers and used in Event JSON-LD inLanguage.';

notify pgrst, 'reload schema';

