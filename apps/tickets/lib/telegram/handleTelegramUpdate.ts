import { randomUUID } from "node:crypto";
import { DateTime } from "luxon";
import { z } from "zod";
import { requireServiceSupabase } from "@/lib/supabase/admin";
import { getPublicAppUrl } from "@/lib/publicAppUrl";
import { routing } from "@/i18n/routing";
import { EVENT_ADMIN_TIMEZONE } from "@/lib/warsawEventDatetime";
import { getTelegramAdminUserIds } from "@/lib/telegram/config";
import { createEventFromParsed } from "@/lib/telegram/createEventDraft";
import {
  cancelActiveDraftForChat,
  getActiveDraftForChat,
  getTelegramDraft,
  saveTelegramDraft,
  updateTelegramDraftStatus,
} from "@/lib/telegram/draftStore";
import {
  applyClarificationReply,
  applyDatePolicy,
  clarificationQuestion,
  finalizeParsed,
  missingClarificationFields,
  parseEventWithGemini,
  type ClarificationField,
  type ParsedTelegramEvent,
} from "@/lib/telegram/parseEventWithGemini";
import {
  answerCallbackQuery,
  downloadTelegramFile,
  editTelegramMessage,
  sendTelegramMessage,
} from "@/lib/telegram/telegramBotApi";

type TelegramUser = { id: number; username?: string };
type TelegramPhotoSize = { file_id: string; width: number; height: number };
type TelegramMessage = {
  message_id: number;
  chat: { id: number; type: string };
  from?: TelegramUser;
  text?: string;
  caption?: string;
  photo?: TelegramPhotoSize[];
  document?: { file_id: string; mime_type?: string; file_name?: string };
};

type TelegramCallbackQuery = {
  id: string;
  from: TelegramUser;
  message?: TelegramMessage;
  data?: string;
};

export type TelegramUpdate = {
  update_id: number;
  message?: TelegramMessage;
  callback_query?: TelegramCallbackQuery;
};

const RawStoredSchema = z.object({
  title: z.string(),
  titlePl: z.string(),
  titleUk: z.string(),
  description: z.string(),
  descriptionPl: z.string(),
  descriptionUk: z.string(),
  startsAtWarsaw: z.string().nullable(),
  pricePln: z.number().nullable(),
  totalTickets: z.number().nullable(),
  venue: z.string(),
  listingKind: z.enum(["performance", "trial"]),
  eventLanguage: z.enum(["ru", "uk", "ru_uk", "pl", "en", "mixed"]),
  confidence: z.enum(["high", "medium", "low"]).optional(),
  notes: z.string().optional(),
});

/** Один апдейт на чат — иначе два параллельных Gemini дают «уточните» + превью с 19/19. */
const chatLocks = new Map<number, Promise<void>>();
const seenUpdateIds = new Set<number>();

async function withChatLock(chatId: number, fn: () => Promise<void>): Promise<void> {
  const prev = chatLocks.get(chatId) ?? Promise.resolve();
  const next = prev.then(fn, fn);
  chatLocks.set(
    chatId,
    next.finally(() => {
      if (chatLocks.get(chatId) === next) chatLocks.delete(chatId);
    }),
  );
  await next;
}

function looksLikeNewAfisha(text: string, hasPhoto: boolean): boolean {
  if (hasPhoto) return true;
  if (text.length >= 80) return true;
  return /театр|afish|мероприят|шоу|спектакл|impro|poet|domaniewska|занят|playback|pln|zł/i.test(text);
}

function messageBody(msg: TelegramMessage): string {
  return [msg.text, msg.caption].filter(Boolean).join("\n\n").trim();
}

function photoFileId(msg: TelegramMessage): string | undefined {
  if (msg.photo?.length) return msg.photo[msg.photo.length - 1]!.file_id;
  if (msg.document?.mime_type?.startsWith("image/")) return msg.document.file_id;
  return undefined;
}

function formatWarsawLocal(startsAtWarsaw: string): string {
  const dt = DateTime.fromFormat(startsAtWarsaw, "yyyy-MM-dd'T'HH:mm", { zone: EVENT_ADMIN_TIMEZONE });
  return dt.isValid ? dt.setLocale("ru").toFormat("d MMMM yyyy, HH:mm") : startsAtWarsaw;
}

function eventPublicUrls(base: string, slug: string): string[] {
  return routing.locales.map((loc) => `${base}/${loc}/events/${slug}`);
}

function previewText(parsed: ParsedTelegramEvent, hasImage: boolean, previewNote?: string): string {
  return [
    "📋 Превью — проверьте и опубликуйте:",
    "",
    `📌 ${parsed.title}`,
    `📅 ${formatWarsawLocal(parsed.startsAtWarsaw)} (Warsaw)`,
    `💰 ${parsed.pricePln} PLN · ${parsed.totalTickets} мест`,
    `📍 ${parsed.venue}`,
    `🏷 ${parsed.listingKind === "trial" ? "пробное" : "шоу/спектакль"}`,
    hasImage ? "🖼 Фото будет загружено при публикации" : "🖼 Без обложки",
    "🌐 RU + PL + UK (Gemini)",
    previewNote?.trim() ? `\nℹ️ ${previewNote.trim()}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

function publishedText(
  base: string,
  event: { id: string; slug: string; title: string; startsAtIso: string; imageUrl: string | null },
): string {
  const urls = eventPublicUrls(base, event.slug);
  const dt = DateTime.fromISO(event.startsAtIso, { zone: "utc" }).setZone(EVENT_ADMIN_TIMEZONE);
  const when = dt.isValid ? dt.setLocale("ru").toFormat("d MMMM yyyy, HH:mm") : event.startsAtIso;

  return [
    "✅ Событие опубликовано (published)",
    "",
    `📌 ${event.title}`,
    `📅 ${when} (Warsaw)`,
    "",
    "🎫 Афиша:",
    ...urls.map((u) => u),
    "",
    `✏️ Админка: ${base}/admin/events/${event.id}/edit`,
    "",
    event.imageUrl ? "🖼 Обложка загружена" : "🖼 Без обложки — добавьте в админке",
  ].join("\n");
}

const PREVIEW_NOTE_KEY = "_previewNote";

function draftParsedPayload(raw: Record<string, unknown>, previewNote?: string): Record<string, unknown> {
  const parsed = { ...raw };
  if (previewNote) parsed[PREVIEW_NOTE_KEY] = previewNote;
  else delete parsed[PREVIEW_NOTE_KEY];
  return parsed;
}

function previewNoteFromDraft(parsed: Record<string, unknown>): string | undefined {
  const note = parsed[PREVIEW_NOTE_KEY];
  return typeof note === "string" ? note : undefined;
}

function parseStoredRaw(parsed: Record<string, unknown>): z.infer<typeof RawStoredSchema> {
  const { [PREVIEW_NOTE_KEY]: _note, ...rest } = parsed;
  if (typeof rest.confidence === "number") delete rest.confidence;
  return RawStoredSchema.parse(rest);
}

async function showPreview(
  chatId: number,
  draftId: string,
  parsed: ParsedTelegramEvent,
  hasImage: boolean,
  previewNote?: string,
): Promise<void> {
  await sendTelegramMessage(chatId, previewText(parsed, hasImage, previewNote), {
    inlineKeyboard: [
      [
        { text: "✅ Опубликовать", callback_data: `pub:${draftId}` },
        { text: "❌ Отмена", callback_data: `cancel:${draftId}` },
      ],
    ],
  });
}

async function processNewAfisha(chatId: number, userId: number, text: string, fileId?: string): Promise<void> {
  const supabase = requireServiceSupabase();
  await cancelActiveDraftForChat(supabase, chatId);

  await sendTelegramMessage(chatId, "⏳ Разбираю афишу (Gemini)…");

  let imageForGemini: { base64: string; mimeType: string } | undefined;
  if (fileId) {
    const downloaded = await downloadTelegramFile(fileId);
    imageForGemini = { base64: downloaded.buffer.toString("base64"), mimeType: downloaded.mimeType };
  }

  const { raw, missing, previewNote } = await parseEventWithGemini(text, imageForGemini);
  const draftId = randomUUID();
  const parsedPayload = draftParsedPayload(raw as unknown as Record<string, unknown>, previewNote);

  if (missing.length > 0) {
    await saveTelegramDraft(supabase, {
      id: draftId,
      telegram_chat_id: chatId,
      telegram_user_id: userId,
      status: "awaiting_clarification",
      source_text: text,
      image_file_id: fileId ?? null,
      parsed: parsedPayload,
      missing_fields: missing,
    });
    const question = clarificationQuestion(missing);
    await sendTelegramMessage(
      chatId,
      previewNote ? `${previewNote}\n\n${question}` : question,
    );
    return;
  }

  const parsed = finalizeParsed(raw);
  await saveTelegramDraft(supabase, {
    id: draftId,
    telegram_chat_id: chatId,
    telegram_user_id: userId,
    status: "preview",
    source_text: text,
    image_file_id: fileId ?? null,
    parsed: parsedPayload,
    missing_fields: [],
  });
  await showPreview(chatId, draftId, parsed, Boolean(fileId), previewNote);
}

async function applyDraftFieldsFromReply(
  chatId: number,
  userId: number,
  active: NonNullable<Awaited<ReturnType<typeof getActiveDraftForChat>>>,
  replyText: string,
  fields: ClarificationField[],
): Promise<void> {
  const supabase = requireServiceSupabase();
  const rawParsed = parseStoredRaw(active.parsed);
  const merged = applyClarificationReply(rawParsed, replyText, fields);
  const datePolicy = applyDatePolicy(merged);
  let stillMissing = missingClarificationFields(merged);
  if (datePolicy.forceDateClarification && !stillMissing.includes("startsAtWarsaw")) {
    stillMissing = ["startsAtWarsaw", ...stillMissing];
  }
  const previewNote = datePolicy.previewNote;

  if (stillMissing.length > 0) {
    await saveTelegramDraft(supabase, {
      ...active,
      parsed: draftParsedPayload(merged as unknown as Record<string, unknown>, previewNote),
      missing_fields: stillMissing,
      status: "awaiting_clarification",
    });
    const question = `Не удалось разобрать ответ. ${clarificationQuestion(stillMissing)}`;
    await sendTelegramMessage(chatId, previewNote ? `${previewNote}\n\n${question}` : question);
    return;
  }

  const parsed = finalizeParsed(merged);
  await saveTelegramDraft(supabase, {
    ...active,
    telegram_user_id: userId,
    parsed: draftParsedPayload(merged as unknown as Record<string, unknown>, previewNote),
    missing_fields: [],
    status: "preview",
  });
  await showPreview(chatId, active.id, parsed, Boolean(active.image_file_id), previewNote);
}

async function processClarificationReply(chatId: number, userId: number, replyText: string): Promise<void> {
  const supabase = requireServiceSupabase();
  const active = await getActiveDraftForChat(supabase, chatId);
  if (!active || active.status !== "awaiting_clarification" || active.telegram_user_id !== userId) {
    await sendTelegramMessage(chatId, "Черновик не найден. Перешлите афишу заново.");
    return;
  }

  const fields = active.missing_fields as ClarificationField[];
  await applyDraftFieldsFromReply(chatId, userId, active, replyText, fields);
}

async function processPreviewCorrection(
  chatId: number,
  userId: number,
  replyText: string,
  active: NonNullable<Awaited<ReturnType<typeof getActiveDraftForChat>>>,
): Promise<void> {
  if (active.telegram_user_id !== userId) return;

  const fields: ClarificationField[] = ["pricePln", "totalTickets", "startsAtWarsaw"];
  await applyDraftFieldsFromReply(chatId, userId, active, replyText, fields);
}

async function handleChatMessage(chatId: number, userId: number, text: string, fileId?: string): Promise<void> {
  const supabase = requireServiceSupabase();
  const active = await getActiveDraftForChat(supabase, chatId);

  if (text && !text.startsWith("/") && !fileId && active) {
    if (active.status === "awaiting_clarification") {
      await processClarificationReply(chatId, userId, text);
      return;
    }
    if (active.status === "preview") {
      await sendTelegramMessage(chatId, "✏️ Обновляю превью…");
      await processPreviewCorrection(chatId, userId, text, active);
      return;
    }
  }

  if (active && !fileId && !looksLikeNewAfisha(text, false)) {
    await sendTelegramMessage(
      chatId,
      "Есть незавершённый черновик. Ответьте на вопрос выше, исправьте цифры (например «50, 100»), нажмите кнопку в превью, или пришлите новую афишу с фото.",
    );
    return;
  }

  if (!active && !fileId && looksLikeClarificationReply(text)) {
    await sendTelegramMessage(
      chatId,
      "Не вижу активный черновик (на проде нужна таблица telegram_event_drafts в Supabase). Перешлите афишу заново.",
    );
    return;
  }

  await processNewAfisha(chatId, userId, text, fileId);
}

function looksLikeClarificationReply(text: string): boolean {
  const t = text.trim();
  if (/^\d+(?:[.,]\d+)?(?:\s*[,;\s]\s*\d+(?:[.,]\d+)?)*$/.test(t)) return true;
  if (/^\d{1,2}[./]\d{1,2}/.test(t)) return true;
  return false;
}

async function publishDraft(
  chatId: number,
  userId: number,
  draftId: string,
  callbackQueryId?: string,
): Promise<boolean> {
  const supabase = requireServiceSupabase();
  let draft = await getTelegramDraft(supabase, draftId);
  if (!draft) draft = await getActiveDraftForChat(supabase, chatId);

  if (!draft || draft.telegram_user_id !== userId) {
    if (callbackQueryId) await answerCallbackQuery(callbackQueryId, "Черновик не найден");
    await sendTelegramMessage(
      chatId,
      "Черновик не найден — перешлите афишу заново и опубликуйте с нового превью.",
    );
    return false;
  }
  if (draft.status === "awaiting_clarification") {
    if (callbackQueryId) await answerCallbackQuery(callbackQueryId, "Сначала ответьте на вопрос");
    const fields = draft.missing_fields as ClarificationField[];
    await sendTelegramMessage(
      chatId,
      `Сначала ответьте на вопрос выше.\n${clarificationQuestion(fields)}`,
    );
    return false;
  }
  if (draft.status !== "preview") {
    if (callbackQueryId) await answerCallbackQuery(callbackQueryId, "Черновик уже закрыт");
    await sendTelegramMessage(
      chatId,
      "Этот черновик уже закрыт. Перешлите афишу заново, если нужно новое событие.",
    );
    return false;
  }

  // ack уже отправлен в route.ts до компиляции/логики
  const parsed = finalizeParsed(parseStoredRaw(draft.parsed));
  draftId = draft.id;

  let imageUpload: { buffer: Buffer; mimeType: string } | undefined;
  if (draft.image_file_id) {
    imageUpload = await downloadTelegramFile(draft.image_file_id);
  }

  const event = await createEventFromParsed(supabase, parsed, {
    visibility: "published",
    image: imageUpload,
  });

  await updateTelegramDraftStatus(supabase, draftId, "published");

  const base = getPublicAppUrl()?.replace(/\/$/, "") ?? "https://www.populartickets.pl";
  await sendTelegramMessage(chatId, publishedText(base, event));
  return true;
}

async function cancelDraft(chatId: number, userId: number, draftId: string, callbackQueryId?: string): Promise<void> {
  const supabase = requireServiceSupabase();
  const draft = await getTelegramDraft(supabase, draftId);
  if (!draft || draft.telegram_user_id !== userId) {
    if (callbackQueryId) await answerCallbackQuery(callbackQueryId, "Черновик не найден");
    return;
  }
  await updateTelegramDraftStatus(supabase, draftId, "cancelled");
  if (callbackQueryId) await answerCallbackQuery(callbackQueryId, "Отменено");
  await sendTelegramMessage(chatId, "❌ Публикация отменена.");
}

export async function handleTelegramUpdate(update: TelegramUpdate): Promise<void> {
  if (seenUpdateIds.has(update.update_id)) return;
  seenUpdateIds.add(update.update_id);
  if (seenUpdateIds.size > 500) {
    const oldest = seenUpdateIds.values().next().value;
    if (oldest != null) seenUpdateIds.delete(oldest);
  }

  const admins = getTelegramAdminUserIds();

  if (update.callback_query) {
    const cq = update.callback_query;
    const userId = cq.from.id;
    const chatId = cq.message?.chat.id;
    const data = cq.data ?? "";

    if (!admins.has(userId)) {
      await answerCallbackQuery(cq.id, "Нет доступа");
      return;
    }
    if (!chatId) return;

    try {
      if (data.startsWith("pub:")) {
        const ok = await publishDraft(chatId, userId, data.slice(4), cq.id);
        if (ok && cq.message?.message_id) {
          try {
            await editTelegramMessage(chatId, cq.message.message_id, "✅ Опубликовано — см. сообщение ниже.");
          } catch {
            /* inline keyboard исчезает после edit — ок */
          }
        }
        return;
      }
      if (data.startsWith("cancel:")) {
        await cancelDraft(chatId, userId, data.slice(7), cq.id);
        if (cq.message?.message_id) {
          try {
            await editTelegramMessage(chatId, cq.message.message_id, "❌ Отменено.");
          } catch {
            /* ignore */
          }
        }
        return;
      }
    } catch (e) {
      console.error("[telegram bot] callback", e);
      const err = e instanceof Error ? e.message : "unknown error";
      try {
        await answerCallbackQuery(cq.id, `Ошибка: ${err.slice(0, 180)}`);
      } catch {
        /* ignore */
      }
      await sendTelegramMessage(chatId, `❌ Ошибка публикации:\n${err}`);
    }
    return;
  }

  const msg = update.message;
  if (!msg?.from) return;

  const chatId = msg.chat.id;
  const userId = msg.from.id;

  if (!admins.has(userId)) {
    await sendTelegramMessage(chatId, "Нет доступа. Добавьте ваш Telegram user id в TELEGRAM_ADMIN_USER_IDS.");
    return;
  }

  const text = messageBody(msg);
  const fileId = photoFileId(msg);

  if (text === "/start" || text === "/help") {
    await sendTelegramMessage(
      chatId,
      "Popular Poet → публикация события\n\n1. Перешлите афишу (текст + фото)\n2. Проверьте превью\n3. Нажмите «Опубликовать»\n\nGemini заполнит RU + PL + UK. Если не хватает даты/цены/мест — спросит.",
    );
    return;
  }

  if (!text && !fileId) {
    await sendTelegramMessage(chatId, "Пришлите текст афиши или фото с подписью.");
    return;
  }

  try {
    await withChatLock(chatId, () => handleChatMessage(chatId, userId, text, fileId));
  } catch (e) {
    console.error("[telegram bot]", e);
    const err = e instanceof Error ? e.message : "unknown error";
    await sendTelegramMessage(chatId, `❌ Ошибка:\n${err}`);
  }
}
