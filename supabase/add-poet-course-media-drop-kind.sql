-- Курсы: картинки и метка в БД, стиль карточки (card_variant), колонка kind удаляется.
-- После выполнения: Dashboard → Settings → API → Reload schema cache.

alter table public.poet_course add column if not exists card_image_url text;
alter table public.poet_course add column if not exists hero_image_url text;
alter table public.poet_course add column if not exists card_variant text;
alter table public.poet_course add column if not exists card_tag text;

do $m$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'poet_course'
      and column_name = 'kind'
  ) then
    update public.poet_course set
      card_image_url = coalesce(
        nullif(trim(card_image_url), ''),
        case kind
          when 'improvisation' then '/courses/impro.jpg'
          when 'acting' then '/courses/akterka.jpg'
          when 'playback' then '/courses/play-back.jpg'
          when 'masterclass' then '/courses/theatre.jpg'
          else '/courses/theatre.jpg'
        end
      ),
      hero_image_url = coalesce(
        nullif(trim(hero_image_url), ''),
        case kind
          when 'improvisation' then '/courses/impro.jpg'
          when 'acting' then '/courses/akterka.jpg'
          when 'playback' then '/courses/play-back.jpg'
          when 'masterclass' then '/courses/theatre.jpg'
          else '/courses/theatre.jpg'
        end
      ),
      card_variant = coalesce(
        nullif(trim(card_variant), ''),
        case kind
          when 'acting' then 'acting'
          when 'playback' then 'playback'
          when 'masterclass' then 'masterclass'
          else 'improv'
        end
      ),
      card_tag = coalesce(
        nullif(trim(card_tag), ''),
        case kind
          when 'improvisation' then 'Импро'
          when 'acting' then 'Актёрское'
          when 'playback' then 'PLAY-BACK'
          when 'masterclass' then 'Мастер-класс'
          else 'Курс'
        end
      );
  end if;
end
$m$;

update public.poet_course
set card_image_url = '/courses/theatre.jpg'
where card_image_url is null or trim(card_image_url) = '';

update public.poet_course
set hero_image_url = card_image_url
where hero_image_url is null or trim(hero_image_url) = '';

update public.poet_course
set card_variant = 'improv'
where card_variant is null
   or trim(card_variant) = ''
   or card_variant not in ('improv', 'acting', 'masterclass', 'playback');

update public.poet_course
set card_tag = ''
where card_tag is null;

alter table public.poet_course alter column card_tag set default '';

alter table public.poet_course drop constraint if exists poet_course_kind_check;
alter table public.poet_course drop column if exists kind;

do $c$
begin
  if not exists (
    select 1
    from pg_catalog.pg_constraint c
    join pg_catalog.pg_class t on c.conrelid = t.oid
    join pg_catalog.pg_namespace n on t.relnamespace = n.oid
    where n.nspname = 'public'
      and t.relname = 'poet_course'
      and c.conname = 'poet_course_card_variant_check'
  ) then
    alter table public.poet_course
      add constraint poet_course_card_variant_check
      check (card_variant in ('improv', 'acting', 'masterclass', 'playback'));
  end if;
end
$c$;

alter table public.poet_course alter column card_image_url set not null;
alter table public.poet_course alter column card_variant set not null;
alter table public.poet_course alter column card_tag set not null;

comment on column public.poet_course.card_image_url is
  'Обложка карточки курса на главной popularpoet.pl (путь /… или полный URL).';
comment on column public.poet_course.hero_image_url is
  'Герой страницы /kursy/{slug}; если пусто в приложении подставляется card_image_url.';
comment on column public.poet_course.card_variant is
  'CSS-пресет карточки: improv | acting | masterclass | playback.';
comment on column public.poet_course.card_tag is
  'Короткая метка над названием (произвольный текст; может быть пустой строкой).';
