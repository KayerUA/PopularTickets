/** Конфиг Telegram-бота для черновиков событий (env). */

export function getTelegramBotToken(): string | undefined {
  return (
    (process.env.TELEGRAM_BOT_TOKEN ?? process.env.Telegram_bot_token ?? "").trim() || undefined
  );
}

export function getTelegramWebhookSecret(): string | undefined {
  return (process.env.TELEGRAM_WEBHOOK_SECRET ?? "").trim() || undefined;
}

export function getGeminiApiKey(): string | undefined {
  return (process.env.GEMINI_API_KEY ?? "").trim() || undefined;
}

/** Whitelist Telegram user id (числа через запятую). */
export function getTelegramAdminUserIds(): Set<number> {
  const raw = (process.env.TELEGRAM_ADMIN_USER_IDS ?? "").trim();
  if (!raw) return new Set();
  const ids = raw
    .split(/[,;\s]+/)
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isFinite(n) && n > 0);
  return new Set(ids);
}

export function isTelegramBotConfigured(): boolean {
  return Boolean(getTelegramBotToken() && getTelegramWebhookSecret() && getGeminiApiKey());
}

/** Free tier AI Studio. Alias на актуальный Flash (не gemini-2.0-flash — quota 0). */
export const GEMINI_EVENT_MODEL = (process.env.GEMINI_MODEL ?? "gemini-flash-latest").trim();

/** Запасные free-модели, если основная недоступна (503 / 429). */
export const GEMINI_EVENT_MODEL_FALLBACKS = [
  "gemini-2.5-flash-lite",
  "gemini-flash-lite-latest",
  "gemini-2.5-flash",
] as const;
