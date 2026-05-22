-- Обновление описаний курсов improv и acting (RU / PL / UK).
-- Выполните в Supabase → SQL Editor после деплоя popularpoet.pl.

UPDATE public.poet_course SET
  body = 'Импровизация — это занятия, где человек учится быть свободнее, быстрее реагировать, легче общаться и не бояться проявляться. Это формат про игру, живой контакт, смех, раскрепощение и ощущение, что можно быть собой здесь и сейчас.',
  body_pl = 'Improwizacja to zajęcia, podczas których uczysz się być swobodniejszy, szybciej reagować, łatwiej rozmawiać i nie bać się pokazywać. To format o grze, żywym kontakcie, śmiechu, rozluźnieniu i poczuciu, że możesz być sobą tu i teraz.',
  body_uk = 'Імпровізація — це заняття, де людина вчиться бути вільнішою, швидше реагувати, легше спілкуватися й не боятися проявлятися. Це формат про гру, живий контакт, сміх, розкріплення й відчуття, що можна бути собою тут і зараз.',
  updated_at = now()
WHERE slug = 'improv';

UPDATE public.poet_course SET
  body = 'Актёрское мастерство — это работа с голосом, телом, вниманием и подачей, которая помогает человеку увереннее чувствовать себя и на сцене, и в жизни. На занятиях участники развивают свободу самовыражения и умение быть в контакте с собой и другими.',
  body_pl = 'Mistrzostwo aktorskie to praca z głosem, ciałem, uwagą i grą, która pomaga czuć się pewniej na scenie i w życiu. Na zajęciach rozwijasz swobodę wyrażania siebie i umiejętność bycia w kontakcie ze sobą i innymi.',
  body_uk = 'Акторська майстерність — це робота з голосом, тілом, увагою й подачею, яка допомагає людині впевненіше почуватися і на сцені, і в житті. На заняттях учасники розвивають свободу самовираження й уміння бути в контакті з собою та іншими.',
  updated_at = now()
WHERE slug = 'acting';
