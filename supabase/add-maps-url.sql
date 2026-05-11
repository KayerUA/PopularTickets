-- Если проект создан по старому schema.sql без колонки maps_url — выполните один раз в SQL Editor.
alter table public.events add column if not exists maps_url text;

-- После добавления колонки полезно: Project Settings → API → Reload schema (кэш PostgREST).

-- Чтение/запись maps_url через RPC: обходит ошибку «maps_url … not in the schema cache» у REST,
-- пока кэш PostgREST не совпадает с реальной таблицей.

create or replace function public.pt_event_maps_url(p_event_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select maps_url from public.events where id = p_event_id limit 1;
$$;

create or replace function public.pt_event_set_maps_url(p_event_id uuid, p_maps_url text)
returns void
language sql
security definer
set search_path = public
as $$
  update public.events
  set maps_url = nullif(trim(p_maps_url), '')
  where id = p_event_id;
$$;

revoke all on function public.pt_event_maps_url(uuid) from public;
grant execute on function public.pt_event_maps_url(uuid) to service_role;

revoke all on function public.pt_event_set_maps_url(uuid, text) from public;
grant execute on function public.pt_event_set_maps_url(uuid, text) to service_role;
