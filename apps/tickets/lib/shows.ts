import { getServiceSupabase } from "@/lib/supabase/admin";

export type Show = { id: string; slug: string; title: string; format: "improv" | "theatre" | "playback"; updated_at: string };

export async function fetchShows(): Promise<Show[]> {
  const db = getServiceSupabase();
  if (!db) return [];
  const { data, error } = await db.from("shows").select("id,slug,title,format,updated_at").order("title");
  if (error) throw new Error("Не удалось загрузить репертуар");
  return data ?? [];
}

export const showText = {
  ru: { repertoire: "Репертуар", upcoming: "Ближайшие показы", past: "Прошедшие показы", empty: "Новые даты пока не объявлены. Посмотрите ближайшие события в афише.", afisha: "Вся афиша", archive: "Архив событий", show: "Об этом шоу", ticket: "Дата, место и билеты", course: "Хотите на сцену?", learn: "Курс импровизации", acting: "Курс актёрского мастерства", formats: { improv: "Шоу импровизации", theatre: "Спектакль", playback: "PLAY-BACK" }, description: "Даты показов, места проведения и билеты. Прошедшие показы сохраняются в архиве." },
  uk: { repertoire: "Репертуар", upcoming: "Найближчі покази", past: "Минулі покази", empty: "Нові дати поки не оголошені. Перегляньте найближчі події в афіші.", afisha: "Уся афіша", archive: "Архів подій", show: "Про це шоу", ticket: "Дата, місце та квитки", course: "Хочете на сцену?", learn: "Курс імпровізації", acting: "Курс акторської майстерності", formats: { improv: "Шоу імпровізації", theatre: "Вистава", playback: "PLAY-BACK" }, description: "Дати показів, місця проведення та квитки. Минулі покази зберігаються в архіві." },
  pl: { repertoire: "Repertuar", upcoming: "Najbliższe pokazy", past: "Poprzednie pokazy", empty: "Nowe terminy nie zostały jeszcze ogłoszone. Zobacz najbliższe wydarzenia w kalendarzu.", afisha: "Wszystkie wydarzenia", archive: "Archiwum wydarzeń", show: "O tym przedstawieniu", ticket: "Termin, miejsce i bilety", course: "Chcesz wejść na scenę?", learn: "Kurs improwizacji", acting: "Kurs aktorski", formats: { improv: "Show improwizacji", theatre: "Spektakl", playback: "PLAY-BACK" }, description: "Terminy pokazów, miejsca i bilety. Poprzednie pokazy pozostają dostępne w archiwum." },
} as const;
