-- Точка фокуса обложки события (0–100 % для object-position при object-cover).
-- После применения: Settings → API → Reload schema cache.

alter table public.events
  add column if not exists image_focal_x double precision not null default 50;

alter table public.events
  add column if not exists image_focal_y double precision not null default 50;

comment on column public.events.image_focal_x is
  'Горизонталь: 0 = левый край кадра, 50 = центр, 100 = правый (CSS object-position).';

comment on column public.events.image_focal_y is
  'Вертикаль: 0 = верх, 50 = центр, 100 = низ (CSS object-position).';
