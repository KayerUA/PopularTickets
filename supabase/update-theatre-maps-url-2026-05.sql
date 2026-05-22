-- Обновить ссылку на карту театра Popular Poet (Domaniewska 37) для пробных и событий на этой площадке.
-- Выполнить один раз в Supabase SQL Editor (prod).

update public.events
set
  maps_url = 'https://maps.app.goo.gl/BtaKyKYvp6nGZbx37',
  updated_at = now()
where listing_kind = 'trial'
   or venue ilike '%domaniewska%37%'
   or maps_url ilike '%jz9E6JUn8rcymRoH7%';
