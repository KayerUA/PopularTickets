-- Pola tłumaczeń treści z bazy (RU = title/description/body; PL/UK = osobne kolumny).
-- Uruchom w Supabase → SQL Editor przed scripts/backfill-content-i18n.mjs (lub razem z backfill SQL).

-- events
alter table public.events add column if not exists title_pl text;
alter table public.events add column if not exists description_pl text;
alter table public.events add column if not exists title_uk text;
alter table public.events add column if not exists description_uk text;

comment on column public.events.title_pl is 'Tytuł po polsku (wymagany do publikacji na /pl/).';
comment on column public.events.description_pl is 'Opis po polsku.';
comment on column public.events.title_uk is 'Назва українською (fallback: title).';
comment on column public.events.description_uk is 'Опис українською (fallback: description).';

-- poet_course
alter table public.poet_course add column if not exists title_pl text;
alter table public.poet_course add column if not exists body_pl text;
alter table public.poet_course add column if not exists title_uk text;
alter table public.poet_course add column if not exists body_uk text;
alter table public.poet_course add column if not exists card_tag_pl text;
alter table public.poet_course add column if not exists card_tag_uk text;

comment on column public.poet_course.title_pl is 'Tytuł kursu PL (popularpoet.pl/pl).';
comment on column public.poet_course.body_pl is 'Opis kursu PL.';
comment on column public.poet_course.card_tag_pl is 'Etykieta kafelka PL.';

-- legacy trial slots (opcjonalnie)
alter table public.poet_trial_slot add column if not exists title_pl text;
alter table public.poet_trial_slot add column if not exists body_pl text;
alter table public.poet_trial_slot add column if not exists title_uk text;
alter table public.poet_trial_slot add column if not exists body_uk text;
