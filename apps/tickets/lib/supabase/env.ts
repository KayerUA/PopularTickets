/**
 * Имена переменных из Supabase Dashboard (в т.ч. новые sb_* ключи).
 * Publishable / anon здесь не используется — только URL и service role для серверного клиента.
 */

export function getSupabaseProjectUrl(): string | undefined {
  const raw =
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ||
    process.env.SUPABASE_URL?.trim();
  if (!raw) return undefined;
  return raw.replace(/\/+$/, "");
}

export function getSupabaseServiceRoleKey(): string | undefined {
  return (
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    process.env.SUPABASE_SECRET_KEY?.trim() ||
    undefined
  );
}
