-- Обновление обложек improv + acting (файлы /courses/impro.jpg и /courses/akterka.jpg в деплое).
-- Повторный запуск безопасен — те же пути, актуальные картинки без цены на постере.

update public.poet_course
set
  card_image_url = '/courses/impro.jpg',
  hero_image_url = '/courses/impro.jpg',
  updated_at = now()
where slug = 'improv';

update public.poet_course
set
  card_image_url = '/courses/akterka.jpg',
  hero_image_url = '/courses/akterka.jpg',
  updated_at = now()
where slug = 'acting';

update public.events
set image_url = '/courses/impro.jpg', updated_at = now()
where slug = 'pp-trial-improv'
   or poet_course_id = (select id from public.poet_course where slug = 'improv' limit 1);

update public.events
set image_url = '/courses/akterka.jpg', updated_at = now()
where slug = 'pp-trial-acting'
   or poet_course_id = (select id from public.poet_course where slug = 'acting' limit 1);
