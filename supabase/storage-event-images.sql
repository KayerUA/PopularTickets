-- Публичный бакет для обложек событий (админка грузит файл → в events.image_url пишется public URL).
-- Выполните в Supabase → SQL Editor после schema.sql (или вместе с деплоем).
-- Ограничения по размеру/типу дублируются в коде (lib/supabase/eventImageUpload.ts).

insert into storage.buckets (id, name, public)
values ('event-images', 'event-images', true)
on conflict (id) do update set public = excluded.public;

-- Чтение объектов для всех (картинки на сайте по публичному URL).
drop policy if exists "Public read event-images" on storage.objects;
create policy "Public read event-images"
on storage.objects for select
to public
using (bucket_id = 'event-images');
