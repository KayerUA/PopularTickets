import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseProjectUrl, getSupabaseServiceRoleKey } from "@/lib/supabase/env";

let cached: SupabaseClient | null = null;
let missingEnvLogged = false;

/** Есть ли переменные для серверного клиента Supabase. */
export function isSupabaseConfigured(): boolean {
  return Boolean(getSupabaseProjectUrl() && getSupabaseServiceRoleKey());
}

/**
 * Клиент с service role. Без env — `null` (подсказка в UI); оплата и webhooks — через {@link requireServiceSupabase}.
 */
export function getServiceSupabase(): SupabaseClient | null {
  if (cached) return cached;
  const url = getSupabaseProjectUrl();
  const key = getSupabaseServiceRoleKey();
  if (!url || !key) {
    if (!missingEnvLogged) {
      missingEnvLogged = true;
      console.warn(
        "[PopularTickets] Нет URL или service role Supabase — задайте NEXT_PUBLIC_SUPABASE_URL и SUPABASE_SERVICE_ROLE_KEY в .env / Vercel (см. .env.example). Критичные API используют requireServiceSupabase()."
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
