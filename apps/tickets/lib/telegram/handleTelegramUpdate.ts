import { randomUUID } from "node:crypto";
import { DateTime } from "luxon";
import { requireServiceSupabase } from "@/lib/supabase/admin";
import { getPublicAppUrl } from "@/lib/publicAppUrl";
import { EVENT_ADMIN_TIMEZONE } from "@/lib/warsawEventDatetime";
import { getTelegramAdminUserIds, getTelegramBroadcastChatIds, isTelegramAutoBroadcast } from "@/lib/telegram/config";
import { createEventFromParsed } from "@/lib/telegram/createEventDraft";
import {
  cancelActiveDraftForChat,
  getActiveDraftForChat,
  getTelegramDraft,
  saveTelegramDraft,
  updateTelegramDraftStatus,
} from "@/lib/telegram/draftStore";
import {
  appendMediaGroupPartPersistent,
  cancelAfishaBuffer,
  claimTelegramBuffer,
  mergeAfishaPartPersistent,
  MEDIA_GROUP_DEBOUNCE_MS,
  mediaGroupBufferKey,
  peekAfishaBuffer,
  sleepMs,
} from "@/lib/telegram/telegramMessageBuffer";
import {
  applyClarificationReplyBatch,
  applyDatePolicyBatch,
  clarificationQuestion,
  draftParsedPayload,
  finalizeParsed,
  missingClarificationFieldsBatch,
  parseEventWithGemini,
  parseStoredEvents,
  previewNoteFromDraft,
  sortEventsByDate,
  storedImageFileIds,
  withImageFileIds,
  type ClarificationField,
  type ParsedTelegramEvent,
  type RawParsedEvent,
} from "@/lib/telegram/parseEventWithGemini";
import {
  answerCallbackQuery,
  downloadTelegramFile,
  editTelegramMessage,
  sendTelegramMessage,
} from "@/lib/telegram/telegramBotApi";
import {
  broadcastDraftToGroups,
  mergePublishedIntoParsed,
  type PublishedEventInfo,
} from "@/lib/telegram/broadcastToGroups";

type TelegramUser = { id: number; username?: string };
type TelegramPhotoSize = { file_id: string; width: number; height: number };
type TelegramMessage = {
  message_id: number;
  chat: { id: number; type: string };
  from?: TelegramUser;
  text?: string;
  caption?: string;
  photo?: TelegramPhotoSize[];
  media_group_id?: string;
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

function isPrivateTelegramChat(chat: { type: string }): boolean {
  return chat.type === "private";
}

/** Один апдейт на чат — иначе два параллельных Gemini дают «уточните» + превью с 19/19. */
const chatLocks = new Map<number, Promise<void>>();
const seenUpdateIds = new Set<number>();

async function onAfishaBundleReady(payload: {
  chatId: number;
  userId: number;
  text: string;
  fileIds: string[];
}): Promise<void> {
  await processNewAfisha(payload.chatId, payload.userId, payload.text, payload.fileIds);
}

async function onAfishaWaitingForText(payload: { chatId: number; photoCount: number }): Promise<void> {
  await sendTelegramMessage(
    payload.chatId,
    `🖼 ${payload.photoCount} фото. Отправьте текст расписания отдельным сообщением — подпись к фото не нужна, порядок не важен.`,
  );
}

function queueAfishaPart(
  chatId: number,
  userId: number,
  part: { text?: string; fileIds?: string[] },
): Promise<void> {
  return mergeAfishaPartPersistent(chatId, userId, part, onAfishaBundleReady, onAfishaWaitingForText);
}

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
  if (hasPhoto && text.trim().length > 0) return true;
  if (text.length >= 80) return true;
  return /театр|afish|мероприят|шоу|спектакл|impro|poet|domaniewska|занят|playback|pln|zł|пробн|импров|мастерств|\d{1,2}\.\d{1,2}/i.test(
    text,
  );
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

function eventPublicUrlRu(base: string, slug: string): string {
  return `${base}/ru/events/${slug}`;
}

function photoPreviewNote(imageCount: number, eventCount: number): string {
  if (imageCount === 0) return "🖼 Без обложки";
  if (eventCount <= 1) return "🖼 Фото будет загружено при публикации";
  if (imageCount >= eventCount) {
    return `🖼 ${imageCount} фото → по порядку на каждое событие (от ближайшей даты)`;
  }
  return `🖼 ${imageCount} фото → на первые ${imageCount} события (по дате)`;
}

function previewTextSingle(parsed: ParsedTelegramEvent, imageCount: number, previewNote?: string): string {
  return [
    "📋 Превью — проверьте и опубликуйте:",
    "",
    `📌 ${parsed.title}`,
    `📅 ${formatWarsawLocal(parsed.startsAtWarsaw)} (Warsaw)`,
    `💰 ${parsed.pricePln} PLN · ${parsed.totalTickets} мест`,
    `📍 ${parsed.venue}`,
    `🏷 ${parsed.listingKind === "trial" ? "пробное" : "шоу/спектакль"}${parsed.poetCourseSlug ? ` · курс ${parsed.poetCourseSlug}` : ""}`,
    photoPreviewNote(imageCount, 1),
    "🌐 RU + PL + UK (Gemini)",
    previewNote?.trim() ? `\nℹ️ ${previewNote.trim()}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

function previewTextBatch(
  events: RawParsedEvent[],
  imageCount: number,
  previewNote?: string,
): string {
  const lines = events.map((ev, i) => {
    const when = ev.startsAtWarsaw ? formatWarsawLocal(ev.startsAtWarsaw) : "дата ?";
    const price = ev.pricePln != null ? `${ev.pricePln} PLN` : "цена ?";
    const seats = ev.totalTickets != null ? `${ev.totalTickets} мест` : "места ?";
    const photoMark = i < imageCount ? " 🖼" : "";
    return `${i + 1}. ${ev.title}${photoMark}\n   📅 ${when} · 💰 ${price} · ${seats}`;
  });

  return [
    `📋 Превью — ${events.length} событий. Проверьте и опубликуйте все:`,
    "",
    ...lines,
    "",
    `📍 ${events[0]?.venue ?? "—"}`,
    photoPreviewNote(imageCount, events.length),
    "🌐 RU + PL + UK (Gemini)",
    previewNote?.trim() ? `\nℹ️ ${previewNote.trim()}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

type PublishedEventInfoLocal = PublishedEventInfo;

function publishedTextSingle(base: string, event: PublishedEventInfoLocal): string {
  const dt = DateTime.fromISO(event.startsAtIso, { zone: "utc" }).setZone(EVENT_ADMIN_TIMEZONE);
  const when = dt.isValid ? dt.setLocale("ru").toFormat("d MMMM yyyy, HH:mm") : event.startsAtIso;

  return [
    "✅ Событие опубликовано",
    "",
    `📌 ${event.title}`,
    `📅 ${when} (Warsaw)`,
    "",
    `🎫 ${eventPublicUrlRu(base, event.slug)}`,
  ].join("\n");
}

function publishedTextBatch(base: string, events: PublishedEventInfoLocal[]): string {
  const blocks = events.map((event, i) => {
    const dt = DateTime.fromISO(event.startsAtIso, { zone: "utc" }).setZone(EVENT_ADMIN_TIMEZONE);
    const when = dt.isValid ? dt.setLocale("ru").toFormat("d MMMM yyyy, HH:mm") : event.startsAtIso;
    return `${i + 1}. ${event.title}\n   📅 ${when}\n   🎫 ${eventPublicUrlRu(base, event.slug)}`;
  });

  return [`✅ Опубликовано ${events.length} событий`, "", ...blocks].join("\n\n");
}

async function showPreview(
  chatId: number,
  draftId: string,
  events: RawParsedEvent[],
  imageCount: number,
  previewNote?: string,
  isBatch?: boolean,
): Promise<void> {
  const batch = isBatch ?? events.length > 1;
  const text = batch
    ? previewTextBatch(events, imageCount, previewNote)
    : previewTextSingle(finalizeParsed(events[0]!), imageCount, previewNote);
  const publishLabel = batch ? `✅ Опубликовать все (${events.length})` : "✅ Опубликовать";

  await sendTelegramMessage(chatId, text, {
    inlineKeyboard: [
      [
        { text: publishLabel, callback_data: `pub:${draftId}` },
        { text: "❌ Отмена", callback_data: `cancel:${draftId}` },
      ],
    ],
  });
}

async function processNewAfisha(
  chatId: number,
  userId: number,
  text: string,
  fileIds: string[] = [],
): Promise<void> {
  const supabase = requireServiceSupabase();
  await cancelActiveDraftForChat(supabase, chatId);
  await cancelAfishaBuffer(chatId);

  await sendTelegramMessage(chatId, "⏳ Разбираю афишу (Gemini)…");

  let imageForGemini: { base64: string; mimeType: string } | undefined;
  const primaryFileId = fileIds[0];
  if (primaryFileId) {
    const downloaded = await downloadTelegramFile(primaryFileId);
    imageForGemini = { base64: downloaded.buffer.toString("base64"), mimeType: downloaded.mimeType };
  }

  const { events: parsedEvents, missing, previewNote, isBatch } = await parseEventWithGemini(
    text,
    imageForGemini,
  );
  const events = sortEventsByDate(parsedEvents);
  const draftId = randomUUID();
  const parsedPayload = draftParsedPayload(events, previewNote, isBatch, fileIds);

  if (missing.length > 0) {
    await saveTelegramDraft(supabase, {
      id: draftId,
      telegram_chat_id: chatId,
      telegram_user_id: userId,
      status: "awaiting_clarification",
      source_text: text,
      image_file_id: primaryFileId ?? null,
      parsed: parsedPayload,
      missing_fields: missing,
    });
    const question = clarificationQuestion(missing, events.length);
    await sendTelegramMessage(
      chatId,
      previewNote ? `${previewNote}\n\n${question}` : question,
    );
    return;
  }

  await saveTelegramDraft(supabase, {
    id: draftId,
    telegram_chat_id: chatId,
    telegram_user_id: userId,
    status: "preview",
    source_text: text,
    image_file_id: primaryFileId ?? null,
    parsed: parsedPayload,
    missing_fields: [],
  });
  await showPreview(chatId, draftId, events, fileIds.length, previewNote, isBatch);
}

async function applyDraftFieldsFromReply(
  chatId: number,
  userId: number,
  active: NonNullable<Awaited<ReturnType<typeof getActiveDraftForChat>>>,
  replyText: string,
  fields: ClarificationField[],
): Promise<void> {
  const supabase = requireServiceSupabase();
  const imageFileIds = storedImageFileIds(active.parsed, active.image_file_id);
  const storedEvents = sortEventsByDate(parseStoredEvents(active.parsed));
  const mergedEvents = sortEventsByDate(applyClarificationReplyBatch(storedEvents, replyText, fields));
  const datePolicy = applyDatePolicyBatch(mergedEvents);
  let stillMissing = missingClarificationFieldsBatch(mergedEvents);
  if (datePolicy.forceDateClarification && !stillMissing.includes("startsAtWarsaw")) {
    stillMissing = ["startsAtWarsaw", ...stillMissing];
  }
  const previewNote = datePolicy.previewNote ?? previewNoteFromDraft(active.parsed);
  const isBatch = mergedEvents.length > 1;

  if (stillMissing.length > 0) {
    await saveTelegramDraft(supabase, {
      ...active,
      parsed: draftParsedPayload(mergedEvents, previewNote, isBatch, imageFileIds),
      missing_fields: stillMissing,
      status: "awaiting_clarification",
    });
    const question = `Не удалось разобрать ответ. ${clarificationQuestion(stillMissing, mergedEvents.length)}`;
    await sendTelegramMessage(chatId, previewNote ? `${previewNote}\n\n${question}` : question);
    return;
  }

  await saveTelegramDraft(supabase, {
    ...active,
    telegram_user_id: userId,
    parsed: draftParsedPayload(mergedEvents, previewNote, isBatch, imageFileIds),
    missing_fields: [],
    status: "preview",
  });
  await showPreview(chatId, active.id, mergedEvents, imageFileIds.length, previewNote, isBatch);
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

async function appendPhotosToDraft(
  chatId: number,
  userId: number,
  fileId: string,
): Promise<void> {
  const supabase = requireServiceSupabase();
  const active = await getActiveDraftForChat(supabase, chatId);
  if (!active || active.telegram_user_id !== userId) return;

  const existing = storedImageFileIds(active.parsed, active.image_file_id);
  if (existing.includes(fileId)) return;

  const nextIds = [...existing, fileId];
  await saveTelegramDraft(supabase, {
    ...active,
    image_file_id: nextIds[0] ?? active.image_file_id,
    parsed: withImageFileIds(active.parsed, nextIds),
  });
  await sendTelegramMessage(
    chatId,
    `🖼 Фото ${nextIds.length} прикреплено к черновику (по порядку на события).`,
  );
}

async function handleChatMessage(
  chatId: number,
  userId: number,
  text: string,
  fileIds: string[] = [],
  mediaGroupId?: string,
): Promise<void> {
  const supabase = requireServiceSupabase();

  if (mediaGroupId) {
    await appendMediaGroupPartPersistent(mediaGroupId, chatId, userId, fileIds[0], text);
    await sleepMs(MEDIA_GROUP_DEBOUNCE_MS);
    const claimed = await claimTelegramBuffer(
      mediaGroupBufferKey(chatId, mediaGroupId),
      MEDIA_GROUP_DEBOUNCE_MS - 400,
    );
    if (claimed) {
      await withChatLock(chatId, () =>
        queueAfishaPart(chatId, userId, {
          fileIds: claimed.file_ids,
          text: claimed.text_content.trim() || undefined,
        }),
      );
    }
    return;
  }

  const active = await getActiveDraftForChat(supabase, chatId);

  if (text && !text.startsWith("/") && fileIds.length === 0 && active) {
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

  if (fileIds.length > 0 && !text.trim() && active && active.telegram_user_id === userId) {
    for (const id of fileIds) {
      await appendPhotosToDraft(chatId, userId, id);
    }
    return;
  }

  const waitingBundle = await peekAfishaBuffer(chatId);
  const hasText = text.trim().length > 0;
  const isNewAfishaPart =
    fileIds.length > 0 ||
    (hasText &&
      (looksLikeNewAfisha(text, fileIds.length > 0) || Boolean(waitingBundle?.fileIds.length)));

  if (isNewAfishaPart && (!active || looksLikeNewAfisha(text, fileIds.length > 0))) {
    await queueAfishaPart(chatId, userId, {
      text: hasText ? text.trim() : undefined,
      fileIds: fileIds.length > 0 ? fileIds : undefined,
    });
    return;
  }

  if (active && fileIds.length === 0 && hasText && !looksLikeNewAfisha(text, false)) {
    await sendTelegramMessage(
      chatId,
      "Есть незавершённый черновик. Ответьте на вопрос выше, исправьте цифры (например «50, 100»), нажмите кнопку в превью, или пришлите новую афишу.",
    );
    return;
  }

  if (!active && fileIds.length === 0 && looksLikeClarificationReply(text)) {
    await sendTelegramMessage(
      chatId,
      "Не вижу активный черновик (на проде нужна таблица telegram_event_drafts в Supabase). Перешлите афишу заново.",
    );
    return;
  }

  if (hasText || fileIds.length > 0) {
    await queueAfishaPart(chatId, userId, {
      text: hasText ? text.trim() : undefined,
      fileIds: fileIds.length > 0 ? fileIds : undefined,
    });
  }
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
    const eventCount = parseStoredEvents(draft.parsed).length;
    await sendTelegramMessage(
      chatId,
      `Сначала ответьте на вопрос выше.\n${clarificationQuestion(fields, eventCount)}`,
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

  const storedEvents = sortEventsByDate(parseStoredEvents(draft.parsed));
  const imageFileIds = storedImageFileIds(draft.parsed, draft.image_file_id);
  draftId = draft.id;

  const base = getPublicAppUrl()?.replace(/\/$/, "") ?? "https://www.populartickets.pl";
  const published: PublishedEventInfoLocal[] = [];

  for (let i = 0; i < storedEvents.length; i++) {
    const raw = storedEvents[i]!;
    const parsed = finalizeParsed(raw);
    const fileId = imageFileIds[i];

    let imageUpload: { buffer: Buffer; mimeType: string } | undefined;
    if (fileId) {
      imageUpload = await downloadTelegramFile(fileId);
    }

    const event = await createEventFromParsed(supabase, parsed, {
      visibility: "published",
      image: imageUpload,
    });

    published.push({
      title: event.title,
      slug: event.slug,
      startsAtIso: event.startsAtIso,
    });
  }

  await updateTelegramDraftStatus(
    supabase,
    draftId,
    "published",
    mergePublishedIntoParsed(draft.parsed, published),
  );

  if (published.length === 1) {
    await sendTelegramMessage(chatId, publishedTextSingle(base, published[0]!));
  } else {
    await sendTelegramMessage(chatId, publishedTextBatch(base, published));
  }

  const broadcastChats = getTelegramBroadcastChatIds();
  if (broadcastChats.length > 0) {
    if (isTelegramAutoBroadcast()) {
      try {
        const result = await broadcastDraftToGroups(supabase, draftId);
        await sendTelegramMessage(
          chatId,
          `📢 Разослано в ${result.chats} групп(ы): ${result.sent} сообщ.${result.failed ? `, ошибок: ${result.failed}` : ""}`,
        );
      } catch (e) {
        const err = e instanceof Error ? e.message : "unknown";
        await sendTelegramMessage(chatId, `⚠️ Рассылка в группы не удалась: ${err}`);
      }
    } else {
      await sendTelegramMessage(chatId, "Разослать афишу в Telegram-группы?", {
        inlineKeyboard: [[{ text: "📢 В группы", callback_data: `bcast:${draftId}` }]],
      });
    }
  }

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

    if (cq.message && !isPrivateTelegramChat(cq.message.chat)) {
      return;
    }

    try {
      if (data.startsWith("bcast:")) {
        const draftId = data.slice(6);
        if (cq.id) await answerCallbackQuery(cq.id, "Рассылаю…");
        try {
          const supabase = requireServiceSupabase();
          const result = await broadcastDraftToGroups(supabase, draftId);
          await sendTelegramMessage(
            chatId,
            `📢 Готово: ${result.sent} сообщ. в ${result.chats} групп(ы)${result.failed ? `, ошибок: ${result.failed}` : ""}`,
          );
          if (cq.message?.message_id) {
            try {
              await editTelegramMessage(chatId, cq.message.message_id, "📢 Разослано в группы.");
            } catch {
              /* ignore */
            }
          }
        } catch (e) {
          const err = e instanceof Error ? e.message : "unknown error";
          await sendTelegramMessage(chatId, `❌ Рассылка: ${err}`);
        }
        return;
      }
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

  // В группах бот молчит — только /chatid для админа (настройка TELEGRAM_BROADCAST_CHAT_IDS).
  if (!isPrivateTelegramChat(msg.chat)) {
    const text = messageBody(msg);
    if (admins.has(userId) && (text === "/chatid" || text.startsWith("/chatid@"))) {
      await sendTelegramMessage(
        chatId,
        `Chat ID: \`${chatId}\`\n\nДобавьте в TELEGRAM_BROADCAST_CHAT_IDS на Vercel (бот должен быть админом группы).`,
        { parseMode: "Markdown" },
      );
    }
    return;
  }

  if (!admins.has(userId)) {
    await sendTelegramMessage(chatId, "Нет доступа. Добавьте ваш Telegram user id в TELEGRAM_ADMIN_USER_IDS.");
    return;
  }

  const text = messageBody(msg);
  const fileId = photoFileId(msg);
  const fileIds = fileId ? [fileId] : [];

  if (text === "/start" || text === "/help") {
    const broadcastHint = getTelegramBroadcastChatIds().length
      ? "\n\n📢 После публикации — кнопка «В группы» (или авто при TELEGRAM_AUTO_BROADCAST=1).\n/chatid — id чата (добавьте бота в группу как админа, затем id в TELEGRAM_BROADCAST_CHAT_IDS)."
      : "\n\n/chatid — узнать id чата для TELEGRAM_BROADCAST_CHAT_IDS (бот должен быть админом группы).";
    await sendTelegramMessage(
      chatId,
      `Popular Poet → публикация события\n\n1. Фото и текст — в любом порядке (альбом + текст отдельным сообщением — ок)\n2. Проверьте превью\n3. Нажмите «Опубликовать»\n\nНесколько дат → несколько событий.\nНесколько фото → по порядку на события (от ближайшей даты).\nСсылки после публикации — только /ru/.${broadcastHint}`,
    );
    return;
  }

  if (text === "/chatid" || text.startsWith("/chatid@")) {
    await sendTelegramMessage(
      chatId,
      `Chat ID: \`${chatId}\`\n\nЭто личный чат. Для группы добавьте бота туда и отправьте /chatid в группе.`,
      { parseMode: "Markdown" },
    );
    return;
  }

  if (!text && fileIds.length === 0) {
    await sendTelegramMessage(chatId, "Пришлите текст афиши или фото с подписью.");
    return;
  }

  try {
    await withChatLock(chatId, () =>
      handleChatMessage(chatId, userId, text, fileIds, msg.media_group_id),
    );
  } catch (e) {
    console.error("[telegram bot]", e);
    const err = e instanceof Error ? e.message : "unknown error";
    await sendTelegramMessage(chatId, `❌ Ошибка:\n${err}`);
  }
}
