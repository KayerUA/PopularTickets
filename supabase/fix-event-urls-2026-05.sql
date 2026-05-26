-- Нормализация битых maps_url и image_url в events (prod, один раз).
-- maps_url без схемы → https://; явно битые image_url → NULL.

update public.events
set
  maps_url = case
    when maps_url is null or trim(maps_url) = '' then maps_url
    when trim(maps_url) ~* '^https?://' then trim(maps_url)
    when trim(maps_url) ~* '^(maps\.app\.goo\.gl|www\.google\.com/maps|google\.com/maps)' then 'https://' || trim(maps_url)
    else null
  end,
  image_url = case
    when image_url is null or trim(image_url) = '' then image_url
    when trim(image_url) ~* '^(https?://|/)' then trim(image_url)
    else null
  end,
  updated_at = now()
where
  (maps_url is not null and trim(maps_url) <> '' and trim(maps_url) !~* '^https?://')
  or (image_url is not null and trim(image_url) <> '' and trim(image_url) !~* '^(https?://|/)');
