import type { PostgrestError } from "@supabase/supabase-js";

/** Лог в Vercel / терминал — по нему видно реальную причину (RLS, нет таблицы, ключ). */
export function logSupabasePostgrestError(context: string, error: PostgrestError): void {
  console.error(`[PopularTickets][Supabase] ${context}`, {
    message: error.message,
    code: error.code,
    details: error.details,
    hint: error.hint,
  });
}
