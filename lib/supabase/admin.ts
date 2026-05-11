import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseProjectUrl, getSupabaseServiceRoleKey } from "@/lib/supabase/env";

let cached: SupabaseClient | null = null;
let missingEnvLogged = false;

/** Есть ли переменные для серверного клиента Supabase. */
export function isSupabaseConfigured(): boolean {
  return Boolean(getSupabaseProjectUrl() && getSupabaseServiceRoleKey());
}

/**
 * Клиент с service role. В production без env — исключение.
 * В development без env — `null`, чтобы можно было смотреть UI без базы.
 */
export function getServiceSupabase(): SupabaseClient | null {
  if (cached) return cached;
  const url = getSupabaseProjectUrl();
  const key = getSupabaseServiceRoleKey();
  if (!url || !key) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "NEXT_PUBLIC_SUPABASE_URL (или SUPABASE_URL) и SUPABASE_SERVICE_ROLE_KEY (или SUPABASE_SECRET_KEY) обязательны"
      );
    }
    if (!missingEnvLogged) {
      missingEnvLogged = true;
      console.warn(
        "[PopularTickets] Нет URL или service role Supabase — задайте NEXT_PUBLIC_SUPABASE_URL и SUPABASE_SERVICE_ROLE_KEY в .env / .env.local (см. .env.example)."
      );
    }
    return null;
  }
  cached = createClient(url, key, {
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
