-- Привязать пробные 27–29.05.2026 к курсам improv / acting (календарь на popularpoet.pl).
-- Выполните после проверки SELECT.

select e.slug, e.title, e.starts_at at time zone 'Europe/Warsaw' as local, e.poet_course_id, c.slug as course_slug
from public.events e
left join public.poet_course c on c.id = e.poet_course_id
where e.starts_at::date between '2026-05-27' and '2026-05-29'
  and e.listing_kind = 'trial'
order by e.starts_at;

-- Импровизация (27 и 28 мая, 20:00)
update public.events e
set poet_course_id = (select id from public.poet_course where slug = 'improv' limit 1),
    updated_at = now()
where e.listing_kind = 'trial'
  and e.starts_at::date in ('2026-05-27', '2026-05-28')
  and (
    e.title ilike '%импров%'
    or e.slug ilike '%improv%'
  );

-- Актёрское (29 мая)
update public.events e
set poet_course_id = (select id from public.poet_course where slug = 'acting' limit 1),
    updated_at = now()
where e.listing_kind = 'trial'
  and e.starts_at::date = '2026-05-29'
  and (
    e.title ilike '%актёр%' or e.title ilike '%актер%' or e.slug ilike '%aktersk%'
  );

select e.slug, e.title, c.slug as course_slug
from public.events e
left join public.poet_course c on c.id = e.poet_course_id
where e.starts_at::date between '2026-05-27' and '2026-05-29'
order by e.starts_at;
