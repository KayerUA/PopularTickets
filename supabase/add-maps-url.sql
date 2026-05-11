-- Если проект создан по старому schema.sql без колонки maps_url — выполните один раз в SQL Editor.
alter table public.events add column if not exists maps_url text;
