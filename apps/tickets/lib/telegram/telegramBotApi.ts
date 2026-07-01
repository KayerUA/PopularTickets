import { getTelegramBotToken } from "@/lib/telegram/config";

type TelegramApiResponse<T> = { ok: true; result: T } | { ok: false; description?: string };

export type InlineKeyboardButton = {
  text: string;
  callback_data?: string;
  url?: string;
  web_app?: { url: string };
};

async function telegramApi<T>(method: string, body: Record<string, unknown>): Promise<T> {
  const token = getTelegramBotToken();
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN не задан");

  const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const json = (await res.json()) as TelegramApiResponse<T>;
  if (!json.ok) {
    throw new Error(json.description ?? `Telegram API ${method} failed`);
  }
  return json.result;
}

export async function sendTelegramMessage(
  chatId: number,
  text: string,
  opts?: {
    parseMode?: "HTML" | "Markdown";
    inlineKeyboard?: InlineKeyboardButton[][];
    disableWebPagePreview?: boolean;
    replyToMessageId?: number;
  },
): Promise<number | undefined> {
  const result = await telegramApi<{ message_id?: number }>("sendMessage", {
    chat_id: chatId,
    text,
    parse_mode: opts?.parseMode,
    disable_web_page_preview: opts?.disableWebPagePreview ?? false,
    ...(opts?.replyToMessageId ? { reply_to_message_id: opts.replyToMessageId } : {}),
    ...(opts?.inlineKeyboard?.length
      ? { reply_markup: { inline_keyboard: opts.inlineKeyboard } }
      : {}),
  });
  return result.message_id;
}

export async function sendTelegramPhoto(
  chatId: number,
  photoFileId: string,
  caption: string,
  opts?: {
    parseMode?: "HTML" | "Markdown";
    inlineKeyboard?: InlineKeyboardButton[][];
  },
): Promise<number | undefined> {
  const result = await telegramApi<{ message_id?: number }>("sendPhoto", {
    chat_id: chatId,
    photo: photoFileId,
    caption: caption.slice(0, 1024),
    parse_mode: opts?.parseMode,
    ...(opts?.inlineKeyboard?.length
      ? { reply_markup: { inline_keyboard: opts.inlineKeyboard } }
      : {}),
  });
  return result.message_id;
}

export async function copyTelegramMessages(
  toChatId: number,
  fromChatId: number,
  messageIds: number[],
): Promise<void> {
  if (!messageIds.length) throw new Error("messageIds пуст");
  if (messageIds.length === 1) {
    await telegramApi("copyMessage", {
      chat_id: toChatId,
      from_chat_id: fromChatId,
      message_id: messageIds[0],
    });
    return;
  }
  await telegramApi("copyMessages", {
    chat_id: toChatId,
    from_chat_id: fromChatId,
    message_ids: messageIds,
  });
}

export async function answerCallbackQuery(callbackQueryId: string, text?: string): Promise<void> {
  try {
    await telegramApi("answerCallbackQuery", {
      callback_query_id: callbackQueryId,
      ...(text ? { text, show_alert: text.length > 80 } : {}),
    });
  } catch (e) {
    console.warn("[telegram] answerCallbackQuery:", e instanceof Error ? e.message : e);
  }
}

/** Мгновенный ack кнопки — вызывать до тяжёлой логики (компиляция Next.js ~5 сек). */
export function ackCallbackQueryImmediate(callbackQueryId: string, text?: string): void {
  const token = getTelegramBotToken();
  if (!token) return;
  void fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      callback_query_id: callbackQueryId,
      ...(text ? { text } : {}),
    }),
  }).catch(() => {});
}

export async function editTelegramMessage(chatId: number, messageId: number, text: string): Promise<void> {
  await telegramApi("editMessageText", {
    chat_id: chatId,
    message_id: messageId,
    text,
    disable_web_page_preview: false,
  });
}

export async function downloadTelegramFile(fileId: string): Promise<{ buffer: Buffer; mimeType: string }> {
  const token = getTelegramBotToken();
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN не задан");

  const file = await telegramApi<{ file_path: string }>("getFile", { file_id: fileId });
  const filePath = file.file_path;
  const res = await fetch(`https://api.telegram.org/file/bot${token}/${filePath}`);
  if (!res.ok) throw new Error(`Не удалось скачать файл Telegram (${res.status})`);

  const buffer = Buffer.from(await res.arrayBuffer());
  const ext = filePath.split(".").pop()?.toLowerCase() ?? "jpg";
  const mimeType =
    ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : ext === "gif" ? "image/gif" : "image/jpeg";
  return { buffer, mimeType };
}
