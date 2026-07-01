import { createHmac, timingSafeEqual } from "node:crypto";

export type TelegramWebAppUser = {
  userId: number;
  username?: string;
  firstName?: string;
};

function safeEqualHex(a: string, b: string): boolean {
  try {
    const ba = Buffer.from(a, "hex");
    const bb = Buffer.from(b, "hex");
    if (ba.length !== bb.length) return false;
    return timingSafeEqual(ba, bb);
  } catch {
    return false;
  }
}

/** Проверка initData из Telegram Web App (HMAC-SHA256). */
export function validateTelegramWebAppInitData(
  initData: string,
  botToken: string,
  maxAgeSec = 86_400,
): TelegramWebAppUser | null {
  const trimmed = initData.trim();
  if (!trimmed || !botToken) return null;

  const params = new URLSearchParams(trimmed);
  const hash = params.get("hash");
  if (!hash) return null;
  params.delete("hash");

  const dataCheckString = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join("\n");

  const secret = createHmac("sha256", "WebAppData").update(botToken).digest();
  const calculated = createHmac("sha256", secret).update(dataCheckString).digest("hex");
  if (!safeEqualHex(calculated, hash)) return null;

  const authDate = Number(params.get("auth_date"));
  if (!Number.isFinite(authDate)) return null;
  if (Date.now() / 1000 - authDate > maxAgeSec) return null;

  const userRaw = params.get("user");
  if (!userRaw) return null;
  let user: { id?: number; username?: string; first_name?: string };
  try {
    user = JSON.parse(userRaw) as { id?: number; username?: string; first_name?: string };
  } catch {
    return null;
  }
  if (!user.id || !Number.isFinite(user.id)) return null;

  return {
    userId: user.id,
    username: user.username,
    firstName: user.first_name,
  };
}
