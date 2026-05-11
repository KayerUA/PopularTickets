import { createClient, SupabaseClient } from "@supabase/supabase-js";

let cached: SupabaseClient | null = null;
let missingEnvLogged = false;

/** Есть ли переменные для серверного клиента Supabase. */
export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() && process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  );
}

/**
 * Клиент с service role. В production без env — исключение.
 * В development без env — `null`, чтобы можно было смотреть UI без базы.
 */
export function getServiceSupabase(): SupabaseClient | null {
  if (cached) return cached;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("NEXT_PUBLIC_SUPABASE_URL и SUPABASE_SERVICE_ROLE_KEY обязательны");
    }
    if (!missingEnvLogged) {
      missingEnvLogged = true;
      console.warn(
        "[PopularTickets] Нет NEXT_PUBLIC_SUPABASE_URL или SUPABASE_SERVICE_ROLE_KEY — скопируйте .env.example в .env.local и заполните ключи."
      );
    }
    return null;
  }
  const normalizedUrl = url.replace(/\/+$/, "");
  cached = createClient(normalizedUrl, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}

/** Для критичных путей (оплата, webhook): без БД — ошибка в любом режиме. */
export function requireServiceSupabase(): SupabaseClient {
  const c = getServiceSupabase();
  if (!c) {
    throw new Error(
      "Supabase не настроен: задайте NEXT_PUBLIC_SUPABASE_URL и SUPABASE_SERVICE_ROLE_KEY в .env.local"
    );
  }
  return c;
}
