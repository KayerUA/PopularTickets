-- Если проект создан по старому schema.sql без колонки maps_url — выполните один раз в SQL Editor.
alter table public.events add column if not exists maps_url text;

-- После добавления колонки в Supabase Cloud откройте:
-- Project Settings → API → «Reload schema» / перезагрузка схемы PostgREST,
-- иначе в логах может быть: Could not find the 'maps_url' column of 'events' in the schema cache.
