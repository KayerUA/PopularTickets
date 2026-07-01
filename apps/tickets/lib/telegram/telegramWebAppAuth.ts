import { getTelegramBotToken, getTelegramOwnerUserIds } from "@/lib/telegram/config";
import { resolveBotOperatorIds } from "@/lib/telegram/botAdminStore";
import { validateTelegramWebAppInitData, type TelegramWebAppUser } from "@/lib/telegram/validateWebAppInitData";
import { requireServiceSupabase } from "@/lib/supabase/admin";

export function readInitDataFromRequest(req: Request): string | null {
  const header = req.headers.get("x-telegram-init-data");
  if (header?.trim()) return header.trim();
  return null;
}

export async function authenticateTelegramWebApp(
  initData: string | null,
): Promise<TelegramWebAppUser | null> {
  const token = getTelegramBotToken();
  if (!initData || !token) return null;
  return validateTelegramWebAppInitData(initData, token);
}

export async function assertTelegramOperator(userId: number): Promise<boolean> {
  const owners = getTelegramOwnerUserIds();
  if (owners.has(userId)) return true;
  try {
    const supabase = requireServiceSupabase();
    const operators = await resolveBotOperatorIds(supabase);
    return operators.has(userId);
  } catch {
    return false;
  }
}
