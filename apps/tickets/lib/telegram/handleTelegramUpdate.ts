import { randomUUID } from "node:crypto";
import { DateTime } from "luxon";
import { requireServiceSupabase } from "@/lib/supabase/admin";
import { getPublicAppUrl } from "@/lib/publicAppUrl";
import { EVENT_ADMIN_TIMEZONE } from "@/lib/warsawEventDatetime";
import { getTelegramOwnerUserIds, isTelegramAutoBroadcast } from "@/lib/telegram/config";
import {
  addBotAdmin,
  listBotAdmins,
  removeBotAdmin,
  resolveBotOperatorIds,
} from "@/lib/telegram/botAdminStore";
import {
  registerBroadcastChat,
  resolveBroadcastChatIds,
  unregisterBroadcastChat,
} from "@/lib/telegram/broadcastChatStore";
import { formatDiscoveryStatusForTelegram } from "@/lib/eventDiscovery/formatDiscoveryStatus";
import { formatGbpManualTelegramMessage } from "@/lib/googleBusinessProfile/gbpManualFallback";
import type { EventDiscoveryResult } from "@/lib/eventDiscovery/notifyEventPublished";
import {
  createEventFromParsed,
  hideEventFromSite,
  revealEventOnSite,
} from "@/lib/telegram/createEventDraft";
import {
  cancelActiveDraftForChat,
  claimDraftForPublish,
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
  type ClarificationField,
  type ParsedTelegramEvent,
  type RawParsedEvent,
} from "@/lib/telegram/parseEventWithGemini";
import {
  answerCallbackQuery,
  downloadTelegramFile,
  editTelegramMessage,
  sendTelegramMessage,
  type InlineKeyboardButton,
} from "@/lib/telegram/telegramBotApi";
import {
  broadcastDraftToGroups,
  isDraftOnSite,
  mergePublishedIntoParsed,
  ON_SITE_KEY,
  readPublishedEvents,
  type PublishedEventInfo,
} from "@/lib/telegram/broadcastToGroups";
import {
  clearAwaitingBroadcastPost,
  confirmBroadcastPost,
  handleBroadcastPostInput,
  isAwaitingBroadcastPost,
  isBroadcastPostCommand,
  offerBroadcastPostConfirm,
  startBroadcastPostFlow,
} from "@/lib/telegram/broadcastPostHandlers";

type TelegramUser = { id: number; username?: string; first_name?: string; is_bot?: boolean };
type TelegramPhotoSize = { file_id: string; width: number; height: number };
type TelegramMessage = {
  message_id: number;
  chat: { id: number; type: string; title?: string };
  from?: TelegramUser;
  text?: string;
  caption?: string;
  photo?: TelegramPhotoSize[];
  media_group_id?: string;
  document?: { file_id: string; mime_type?: string; file_name?: string };
  video?: { file_id: string };
  animation?: { file_id: string };
  voice?: { file_id: string };
  audio?: { file_id: string };
  sticker?: { file_id: string };
  reply_to_message?: TelegramMessage;
  forward_from?: TelegramUser;
};

type TelegramCallbackQuery = {
  id: string;
  from: TelegramUser;
  message?: TelegramMessage;
  data?: string;
};

type TelegramChatMemberStatus =
  | "creator"
  | "administrator"
  | "member"
  | "restricted"
  | "left"
  | "kicked";

type TelegramChatMember = {
  user: { id: number; is_bot?: boolean };
  status: TelegramChatMemberStatus;
};

type TelegramMyChatMember = {
  chat: { id: number; type: string; title?: string };
  from: TelegramUser;
  old_chat_member: TelegramChatMember;
  new_chat_member: TelegramChatMember;
};

export type TelegramUpdate = {
  update_id: number;
  message?: TelegramMessage;
  callback_query?: TelegramCallbackQuery;
  my_chat_member?: TelegramMyChatMember;
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
  const priceLine = parsed.dayOfEventPricePln
    ? `💰 ${parsed.pricePln} PLN заранее · ${parsed.dayOfEventPricePln} PLN в день события · ${parsed.totalTickets} мест`
    : `💰 ${parsed.pricePln} PLN · ${parsed.totalTickets} мест`;
  return [
    "📋 Превью. Создам скрытый черновик — потом проверите и опубликуете на сайт:",
    "",
    `📌 ${parsed.title}`,
    `📅 ${formatWarsawLocal(parsed.startsAtWarsaw)} (Warsaw)`,
    priceLine,
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
    const dayPrice = ev.dayOfEventPricePln != null ? ` → ${ev.dayOfEventPricePln} PLN в день события` : "";
    const seats = ev.totalTickets != null ? `${ev.totalTickets} мест` : "места ?";
    const photoMark = i < imageCount ? " 🖼" : "";
    return `${i + 1}. ${ev.title}${photoMark}\n   📅 ${when} · 💰 ${price}${dayPrice} · ${seats}`;
  });

  return [
    `📋 Превью — ${events.length} событий. Создам скрытые черновики, потом опубликуете на сайт:`,
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

type PublishedEventInfoLocal = PublishedEventInfo & { discovery?: EventDiscoveryResult };

function publishedTextSingle(base: string, event: PublishedEventInfoLocal): string {
  const dt = DateTime.fromISO(event.startsAtIso, { zone: "utc" }).setZone(EVENT_ADMIN_TIMEZONE);
  const when = dt.isValid ? dt.setLocale("ru").toFormat("d MMMM yyyy, HH:mm") : event.startsAtIso;

  return (
    [
      "✅ Событие опубликовано",
      "",
      `📌 ${event.title}`,
      `📅 ${when} (Warsaw)`,
      "",
      `🎫 ${eventPublicUrlRu(base, event.slug)}`,
    ].join("\n") + formatDiscoveryStatusForTelegram(event.discovery)
  );
}

function publishedTextBatch(base: string, events: PublishedEventInfoLocal[]): string {
  const blocks = events.map((event, i) => {
    const dt = DateTime.fromISO(event.startsAtIso, { zone: "utc" }).setZone(EVENT_ADMIN_TIMEZONE);
    const when = dt.isValid ? dt.setLocale("ru").toFormat("d MMMM yyyy, HH:mm") : event.startsAtIso;
    const status = formatDiscoveryStatusForTelegram(event.discovery).replace(/^\n\n/, "");
    return `${i + 1}. ${event.title}\n   📅 ${when}\n   🎫 ${eventPublicUrlRu(base, event.slug)}${status ? `\n   ${status.replace(/\n/g, "\n   ")}` : ""}`;
  });

  return [`✅ Опубликовано ${events.length} событий`, "", ...blocks].join("\n\n");
}

/** Кнопки после создания скрытого черновика: показать на сайте / удалить. */
function revealKeyboard(draftId: string): InlineKeyboardButton[][] {
  return [
    [{ text: "🌍 Опубликовать на сайте", callback_data: `show:${draftId}` }],
    [{ text: "🗑 Удалить", callback_data: `del:${draftId}` }],
  ];
}

function createdHiddenTextSingle(base: string, event: PublishedEventInfoLocal): string {
  const dt = DateTime.fromISO(event.startsAtIso, { zone: "utc" }).setZone(EVENT_ADMIN_TIMEZONE);
  const when = dt.isValid ? dt.setLocale("ru").toFormat("d MMMM yyyy, HH:mm") : event.startsAtIso;
  return [
    "💾 Черновик создан — пока скрыт от поиска и не в афише.",
    "",
    `📌 ${event.title}`,
    `📅 ${when} (Warsaw)`,
    "",
    `👀 Предпросмотр (по ссылке, не на сайте):`,
    eventPublicUrlRu(base, event.slug),
    "",
    "Проверьте страницу и нажмите «Опубликовать на сайте» — тогда событие попадёт в афишу и в поиск (IndexNow + Google).",
  ].join("\n");
}

function createdHiddenTextBatch(base: string, events: PublishedEventInfoLocal[]): string {
  const blocks = events.map((event, i) => {
    const dt = DateTime.fromISO(event.startsAtIso, { zone: "utc" }).setZone(EVENT_ADMIN_TIMEZONE);
    const when = dt.isValid ? dt.setLocale("ru").toFormat("d MMMM yyyy, HH:mm") : event.startsAtIso;
    return `${i + 1}. ${event.title}\n   📅 ${when}\n   👀 ${eventPublicUrlRu(base, event.slug)}`;
  });
  return [
    `💾 Создано ${events.length} черновиков — пока скрыты от поиска и не в афише.`,
    "",
    ...blocks,
    "",
    "Проверьте страницы и нажмите «Опубликовать на сайте» — все попадут в афишу и в поиск.",
  ].join("\n");
}

/** Кнопки для уточнения: быстрый выбор цены/мест + переключатели типа и языка. */
function clarificationKeyboard(
  draftId: string,
  fields: ClarificationField[],
  events: RawParsedEvent[] = [],
): InlineKeyboardButton[][] {
  const rows: InlineKeyboardButton[][] = [];
  if (fields.includes("pricePln")) {
    rows.push([50, 70, 100, 150].map((v) => ({ text: `${v} zł`, callback_data: `set:p:${v}:${draftId}` })));
  }
  if (fields.includes("totalTickets")) {
    const isTrial = events.some((e) => e.listingKind === "trial");
    const seatOptions = isTrial ? [12, 20, 30, 50, 100] : [20, 30, 50, 100];
    rows.push(seatOptions.map((v) => ({ text: `${v} мест`, callback_data: `set:s:${v}:${draftId}` })));
  }
  rows.push([
    { text: "🎭 Шоу", callback_data: `set:k:performance:${draftId}` },
    { text: "🎓 Пробное", callback_data: `set:k:trial:${draftId}` },
  ]);
  rows.push([
    { text: "RU", callback_data: `set:l:ru:${draftId}` },
    { text: "UK", callback_data: `set:l:uk:${draftId}` },
    { text: "RU+UK", callback_data: `set:l:ru_uk:${draftId}` },
    { text: "PL", callback_data: `set:l:pl:${draftId}` },
  ]);
  return rows;
}

function clarificationKeyboardHint(fields: ClarificationField[]): string {
  const quick = fields.includes("pricePln") || fields.includes("totalTickets");
  if (fields.includes("startsAtWarsaw")) {
    return quick
      ? "\n\nДату/время — текстом (например 23.05 19:00). Цену и места можно кнопкой ниже или текстом."
      : "\n\nДату/время — текстом (например 23.05 19:00). Тип/язык можно поправить кнопкой.";
  }
  return "\n\nНажмите кнопку ниже или ответьте текстом (например «70, 30»).";
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
  const publishLabel = batch ? `💾 Создать (${events.length}, скрыто)` : "💾 Создать (скрыто)";

  await sendTelegramMessage(chatId, text, {
    inlineKeyboard: [
      [
        { text: publishLabel, callback_data: `pub:${draftId}` },
        { text: "❌ Отмена", callback_data: `cancel:${draftId}` },
      ],
    ],
  });
}

async function runGeminiForAfisha(
  chatId: number,
  userId: number,
  text: string,
  fileIds: string[] = [],
): Promise<void> {
  const supabase = requireServiceSupabase();

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
    const question = clarificationQuestion(missing, events.length) + clarificationKeyboardHint(missing);
    await sendTelegramMessage(
      chatId,
      previewNote ? `${previewNote}\n\n${question}` : question,
      { inlineKeyboard: clarificationKeyboard(draftId, missing, events) },
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
  await runGeminiForAfisha(chatId, userId, text, fileIds);
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
    const question =
      `Не удалось разобрать ответ. ${clarificationQuestion(stillMissing, mergedEvents.length)}` +
      clarificationKeyboardHint(stillMissing);
    await sendTelegramMessage(chatId, previewNote ? `${previewNote}\n\n${question}` : question, {
      inlineKeyboard: clarificationKeyboard(active.id, stillMissing, mergedEvents),
    });
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

type SetField = "p" | "s" | "k" | "l";

const SET_LANGUAGES = new Set(["ru", "uk", "ru_uk", "pl", "en", "mixed"]);

/** Применяет одно поле к черновику по нажатию инлайн-кнопки уточнения. */
async function applySingleFieldToDraft(
  chatId: number,
  userId: number,
  draftId: string,
  field: SetField,
  value: string,
  callbackQueryId?: string,
): Promise<void> {
  const supabase = requireServiceSupabase();
  const draft = await getTelegramDraft(supabase, draftId);
  if (!draft || draft.telegram_user_id !== userId) {
    if (callbackQueryId) await answerCallbackQuery(callbackQueryId, "Черновик не найден");
    return;
  }
  if (draft.status !== "awaiting_clarification" && draft.status !== "preview") {
    if (callbackQueryId) await answerCallbackQuery(callbackQueryId, "Черновик уже закрыт");
    return;
  }

  const events = sortEventsByDate(parseStoredEvents(draft.parsed));
  let ack = "Готово";
  for (const ev of events) {
    if (field === "p") {
      const n = Math.round(Number(value));
      if (Number.isFinite(n) && n > 0) ev.pricePln = n;
      ack = `Цена: ${value} zł`;
    } else if (field === "s") {
      const n = Math.round(Number(value));
      if (Number.isFinite(n) && n > 0) ev.totalTickets = n;
      ack = `Мест: ${value}`;
    } else if (field === "k") {
      ev.listingKind = value === "trial" ? "trial" : "performance";
      if (ev.listingKind === "performance") delete ev.poetCourseSlug;
      ack = ev.listingKind === "trial" ? "Тип: пробное" : "Тип: шоу";
    } else if (field === "l" && SET_LANGUAGES.has(value)) {
      ev.eventLanguage = value as RawParsedEvent["eventLanguage"];
      ack = `Язык: ${value.toUpperCase()}`;
    }
  }

  const datePolicy = applyDatePolicyBatch(events);
  let missing = missingClarificationFieldsBatch(events);
  if (datePolicy.forceDateClarification && !missing.includes("startsAtWarsaw")) {
    missing = ["startsAtWarsaw", ...missing];
  }
  const previewNote = datePolicy.previewNote ?? previewNoteFromDraft(draft.parsed);
  const imageFileIds = storedImageFileIds(draft.parsed, draft.image_file_id);
  const isBatch = events.length > 1;

  if (callbackQueryId) await answerCallbackQuery(callbackQueryId, ack);

  if (missing.length > 0) {
    await saveTelegramDraft(supabase, {
      ...draft,
      telegram_user_id: userId,
      parsed: draftParsedPayload(events, previewNote, isBatch, imageFileIds),
      missing_fields: missing,
      status: "awaiting_clarification",
    });
    const question = clarificationQuestion(missing, events.length) + clarificationKeyboardHint(missing);
    await sendTelegramMessage(chatId, previewNote ? `${previewNote}\n\n${question}` : question, {
      inlineKeyboard: clarificationKeyboard(draftId, missing, events),
    });
    return;
  }

  await saveTelegramDraft(supabase, {
    ...draft,
    telegram_user_id: userId,
    parsed: draftParsedPayload(events, previewNote, isBatch, imageFileIds),
    missing_fields: [],
    status: "preview",
  });
  await showPreview(chatId, draftId, events, imageFileIds.length, previewNote, isBatch);
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
  fileIds: string[],
): Promise<void> {
  if (!fileIds.length) return;

  const supabase = requireServiceSupabase();
  const active = await getActiveDraftForChat(supabase, chatId);
  if (!active || active.telegram_user_id !== userId) return;

  const existing = storedImageFileIds(active.parsed, active.image_file_id);
  const nextIds = [...existing];
  let added = 0;
  for (const fileId of fileIds) {
    if (nextIds.includes(fileId)) continue;
    nextIds.push(fileId);
    added += 1;
  }
  if (added === 0) return;

  const events = sortEventsByDate(parseStoredEvents(active.parsed));
  const previewNote = previewNoteFromDraft(active.parsed);
  const isBatch = events.length > 1;

  await saveTelegramDraft(supabase, {
    ...active,
    image_file_id: nextIds[0] ?? active.image_file_id,
    parsed: draftParsedPayload(events, previewNote, isBatch, nextIds),
  });

  if (active.status === "preview") {
    await showPreview(chatId, active.id, events, nextIds.length, previewNote, isBatch);
    return;
  }

  await sendTelegramMessage(
    chatId,
    added === 1
      ? `🖼 Фото ${nextIds.length} прикреплено к черновику (по порядку на события).`
      : `🖼 +${added} фото (всего ${nextIds.length}) — по порядку дат на события.`,
  );
}

async function mergePhotosIntoPreviewDraft(
  chatId: number,
  userId: number,
  fileIds: string[],
): Promise<boolean> {
  if (!fileIds.length) return false;

  const supabase = requireServiceSupabase();
  const active = await getActiveDraftForChat(supabase, chatId);
  if (!active || active.telegram_user_id !== userId || active.status !== "preview") return false;

  await appendPhotosToDraft(chatId, userId, fileIds);
  return true;
}

export type TelegramUpdateHandleResult = {
  /** Gemini / тяжёлая работа после быстрого ответа webhook (несколько фото в одном пересыле). */
  background?: Promise<void>;
};

type HandleChatContext = {
  deferGemini?: (work: Promise<void>) => void;
};

async function startMultiPhotoAfisha(
  chatId: number,
  userId: number,
  text: string,
  fileIds: string[],
  ctx?: HandleChatContext,
): Promise<void> {
  const supabase = requireServiceSupabase();

  const mergedIntoPreview = await mergePhotosIntoPreviewDraft(chatId, userId, fileIds);
  if (mergedIntoPreview) {
    await cancelAfishaBuffer(chatId);
    return;
  }

  await cancelActiveDraftForChat(supabase, chatId);
  await cancelAfishaBuffer(chatId);
  await sendTelegramMessage(chatId, "⏳ Разбираю афишу (Gemini)…");

  const geminiWork = runGeminiForAfisha(chatId, userId, text, fileIds).catch(async (e) => {
    console.error("[telegram bot] gemini", e);
    const err = e instanceof Error ? e.message : "unknown error";
    await sendTelegramMessage(chatId, `❌ Ошибка разбора:\n${err}`);
  });

  if (ctx?.deferGemini) {
    ctx.deferGemini(geminiWork);
    return;
  }
  await geminiWork;
}

async function handleChatMessage(
  chatId: number,
  userId: number,
  text: string,
  fileIds: string[] = [],
  mediaGroupId?: string,
  ctx?: HandleChatContext,
): Promise<void> {
  if (mediaGroupId) {
    await appendMediaGroupPartPersistent(mediaGroupId, chatId, userId, fileIds[0], text);
    await sleepMs(MEDIA_GROUP_DEBOUNCE_MS);

    const bufferKey = mediaGroupBufferKey(chatId, mediaGroupId);
    let claimed = await claimTelegramBuffer(bufferKey, MEDIA_GROUP_DEBOUNCE_MS - 400);
    if (!claimed) {
      await sleepMs(1200);
      claimed = await claimTelegramBuffer(bufferKey, 800);
    }
    if (!claimed) {
      // Другой serverless-инстанс уже обрабатывает эти фото.
      return;
    }

    await withChatLock(chatId, () =>
      startMultiPhotoAfisha(chatId, userId, claimed.text_content.trim(), claimed.file_ids, ctx),
    );
    return;
  }

  const supabase = requireServiceSupabase();

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
    await appendPhotosToDraft(chatId, userId, fileIds);
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

  // Атомарный захват: защищает от двойного тапа «Опубликовать» (две гонки → дубли событий).
  const claimed = await claimDraftForPublish(supabase, draft.id);
  if (!claimed) {
    if (callbackQueryId) await answerCallbackQuery(callbackQueryId, "Уже публикуется…");
    return false;
  }
  draft = claimed;
  draftId = draft.id;

  const storedEvents = sortEventsByDate(parseStoredEvents(draft.parsed));
  const imageFileIds = storedImageFileIds(draft.parsed, draft.image_file_id);

  const base = getPublicAppUrl()?.replace(/\/$/, "") ?? "https://www.populartickets.pl";
  const published: PublishedEventInfoLocal[] = [];

  try {
    for (let i = 0; i < storedEvents.length; i++) {
      const raw = storedEvents[i]!;
      const parsed = finalizeParsed(raw);
      const fileId = imageFileIds[i];

      let imageUpload: { buffer: Buffer; mimeType: string } | undefined;
      if (fileId) {
        imageUpload = await downloadTelegramFile(fileId);
      }

      // Создаём СКРЫТО (unlisted): страница доступна по ссылке для проверки,
      // но не в афише и не пингуем поиск. Публикация на сайт — отдельной кнопкой.
      const event = await createEventFromParsed(supabase, parsed, {
        visibility: "unlisted",
        image: imageUpload,
      });

      published.push({
        id: event.id,
        title: event.title,
        slug: event.slug,
        startsAtIso: event.startsAtIso,
      });
    }
  } catch (e) {
    // Создание событий сорвалось — возвращаем черновик в preview, чтобы можно было повторить.
    if (published.length === 0) {
      await updateTelegramDraftStatus(supabase, draftId, "preview");
    }
    throw e;
  }

  await updateTelegramDraftStatus(supabase, draftId, "published", {
    ...mergePublishedIntoParsed(draft.parsed, published),
    [ON_SITE_KEY]: false,
  });

  const text =
    published.length === 1
      ? createdHiddenTextSingle(base, published[0]!)
      : createdHiddenTextBatch(base, published);
  await sendTelegramMessage(chatId, text, { inlineKeyboard: revealKeyboard(draftId) });

  return true;
}

function isGroupChatType(type: string): boolean {
  return type === "group" || type === "supergroup";
}

function userLabel(user: TelegramUser): string {
  if (user.username) return `@${user.username}`;
  if (user.first_name) return user.first_name;
  return String(user.id);
}

function parseAdminTargetFromMessage(msg: TelegramMessage, text: string): TelegramUser | null {
  const replyFrom = msg.reply_to_message?.from;
  if (replyFrom?.id && !replyFrom.is_bot) return replyFrom;
  if (msg.forward_from?.id && !msg.forward_from.is_bot) return msg.forward_from;

  const idMatch = text.match(/^\/(?:add|remove)admin(?:@\w+)?\s+(\d+)\s*$/i);
  if (idMatch) {
    return { id: Number(idMatch[1]), username: undefined, first_name: idMatch[1] };
  }
  return null;
}

async function handleOwnerAdminCommands(
  chatId: number,
  ownerId: number,
  msg: TelegramMessage,
  text: string,
): Promise<boolean> {
  const supabase = requireServiceSupabase();

  if (text === "/listadmins" || text.startsWith("/listadmins@")) {
    const owners = getTelegramOwnerUserIds();
    const delegated = await listBotAdmins(supabase);
    const ownerLines = [...owners].map((id) => `👑 ${id} (владелец)`);
    const editorLines = delegated.map((row) => {
      const name = row.username ? `@${row.username}` : row.display_name ?? String(row.telegram_user_id);
      return `✏️ ${name} · id ${row.telegram_user_id}`;
    });
    await sendTelegramMessage(
      chatId,
      ["Редакторы бота:", "", ...ownerLines, ...editorLines].join("\n") || "Список пуст.",
    );
    return true;
  }

  if (text.startsWith("/addadmin")) {
    const target = parseAdminTargetFromMessage(msg, text);
    if (!target) {
      await sendTelegramMessage(
        chatId,
        "Как добавить редактора:\n• ответьте /addadmin на его сообщение\n• или /addadmin 123456789 (Telegram user id)\n\n/myid — узнать свой id",
      );
      return true;
    }
    if (getTelegramOwnerUserIds().has(target.id)) {
      await sendTelegramMessage(chatId, "Этот пользователь уже владелец (TELEGRAM_ADMIN_USER_IDS).");
      return true;
    }
    await addBotAdmin(supabase, target.id, {
      username: target.username,
      displayName: target.first_name,
      addedBy: ownerId,
    });
    await sendTelegramMessage(
      chatId,
      `✅ Редактор добавлен: ${userLabel(target)} (id ${target.id}).\nМожет создавать и публиковать события.`,
    );
    return true;
  }

  if (text.startsWith("/removeadmin")) {
    const target = parseAdminTargetFromMessage(msg, text);
    if (!target) {
      await sendTelegramMessage(chatId, "Ответьте /removeadmin на сообщение человека или: /removeadmin 123456789");
      return true;
    }
    if (getTelegramOwnerUserIds().has(target.id)) {
      await sendTelegramMessage(chatId, "Владельца из env нельзя удалить через бота.");
      return true;
    }
    const removed = await removeBotAdmin(supabase, target.id);
    await sendTelegramMessage(
      chatId,
      removed
        ? `🗑 Редактор удалён: ${userLabel(target)} (id ${target.id}).`
        : `Редактор id ${target.id} не найден.`,
    );
    return true;
  }

  return false;
}

function isBotAdminStatus(status: TelegramChatMemberStatus): boolean {
  return status === "administrator" || status === "creator";
}

async function offerBroadcast(chatId: number, draftId: string): Promise<void> {
  const supabase = requireServiceSupabase();
  const broadcastChats = await resolveBroadcastChatIds(supabase);
  if (broadcastChats.length === 0) return;

  if (isTelegramAutoBroadcast()) {
    try {
      const supabase = requireServiceSupabase();
      const result = await broadcastDraftToGroups(supabase, draftId);
      await sendTelegramMessage(
        chatId,
        `📢 Разослано в ${result.chats} групп(ы): ${result.sent} сообщ.${result.failed ? `, ошибок: ${result.failed}` : ""}`,
      );
    } catch (e) {
      const err = e instanceof Error ? e.message : "unknown";
      await sendTelegramMessage(chatId, `⚠️ Рассылка в группы не удалась: ${err}`);
    }
    return;
  }

  await sendTelegramMessage(chatId, "Разослать афишу в Telegram-группы?", {
    inlineKeyboard: [[{ text: "📢 В группы", callback_data: `bcast:${draftId}` }]],
  });
}

/** Кнопка «Опубликовать на сайте»: unlisted → published + discovery (IndexNow/GBP) + рассылка. */
async function revealDraftOnSite(
  chatId: number,
  userId: number,
  draftId: string,
  callbackQueryId?: string,
): Promise<boolean> {
  const supabase = requireServiceSupabase();
  const draft = await getTelegramDraft(supabase, draftId);

  if (!draft || draft.telegram_user_id !== userId) {
    if (callbackQueryId) await answerCallbackQuery(callbackQueryId, "Черновик не найден");
    return false;
  }
  if (draft.status === "cancelled") {
    if (callbackQueryId) await answerCallbackQuery(callbackQueryId, "Черновик удалён");
    return false;
  }
  if (isDraftOnSite(draft.parsed)) {
    if (callbackQueryId) await answerCallbackQuery(callbackQueryId, "Уже на сайте");
    return false;
  }

  const published = readPublishedEvents(draft.parsed);
  if (published.length === 0) {
    if (callbackQueryId) await answerCallbackQuery(callbackQueryId, "Нет созданных событий");
    await sendTelegramMessage(chatId, "Сначала создайте черновик из афиши, затем публикуйте.");
    return false;
  }

  const base = getPublicAppUrl()?.replace(/\/$/, "") ?? "https://www.populartickets.pl";
  const revealed: PublishedEventInfoLocal[] = [];

  for (const ev of published) {
    if (!ev.id) {
      revealed.push(ev);
      continue;
    }
    const result = await revealEventOnSite(supabase, ev.id);
    revealed.push({
      ...ev,
      startsAtIso: result?.startsAtIso ?? ev.startsAtIso,
      discovery: result?.discovery,
    });
  }

  await updateTelegramDraftStatus(supabase, draftId, "published", {
    ...draft.parsed,
    [ON_SITE_KEY]: true,
  });

  for (const item of revealed) {
    const manual = item.discovery?.gbpManual;
    if (manual && item.discovery?.gbp !== "created") {
      await sendTelegramMessage(chatId, formatGbpManualTelegramMessage(manual));
    }
  }

  await sendTelegramMessage(
    chatId,
    revealed.length === 1
      ? publishedTextSingle(base, revealed[0]!)
      : publishedTextBatch(base, revealed),
  );

  await offerBroadcast(chatId, draftId);
  return true;
}

/** Кнопка «Удалить»: скрывает созданные события с сайта (visibility=inactive). */
async function deleteDraftEvents(
  chatId: number,
  userId: number,
  draftId: string,
  callbackQueryId?: string,
): Promise<void> {
  const supabase = requireServiceSupabase();
  const draft = await getTelegramDraft(supabase, draftId);
  if (!draft || draft.telegram_user_id !== userId) {
    if (callbackQueryId) await answerCallbackQuery(callbackQueryId, "Черновик не найден");
    return;
  }

  const published = readPublishedEvents(draft.parsed);
  let hidden = 0;
  for (const ev of published) {
    if (!ev.id) continue;
    try {
      const r = await hideEventFromSite(supabase, ev.id);
      if (r) hidden += 1;
    } catch (e) {
      console.error("[telegram bot] hide event", ev.id, e);
    }
  }

  await updateTelegramDraftStatus(supabase, draftId, "cancelled");
  if (callbackQueryId) await answerCallbackQuery(callbackQueryId, "Удалено");
  await sendTelegramMessage(
    chatId,
    hidden > 0
      ? `🗑 Скрыто с сайта (${hidden}). Можно прислать афишу заново.`
      : "🗑 Удалено. Можно прислать афишу заново.",
  );
}

async function cancelDraft(chatId: number, userId: number, draftId: string, callbackQueryId?: string): Promise<void> {
  const supabase = requireServiceSupabase();
  const draft = await getTelegramDraft(supabase, draftId);
  if (!draft || draft.telegram_user_id !== userId) {
    if (callbackQueryId) await answerCallbackQuery(callbackQueryId, "Черновик не найден");
    return;
  }
  if (draft.status === "published") {
    if (callbackQueryId) await answerCallbackQuery(callbackQueryId, "Уже опубликовано");
    return;
  }
  if (draft.status === "cancelled") {
    if (callbackQueryId) await answerCallbackQuery(callbackQueryId, "Уже отменено");
    return;
  }
  await updateTelegramDraftStatus(supabase, draftId, "cancelled");
  if (callbackQueryId) await answerCallbackQuery(callbackQueryId, "Отменено");
  await sendTelegramMessage(chatId, "❌ Публикация отменена.");
}

export async function handleTelegramUpdate(update: TelegramUpdate): Promise<TelegramUpdateHandleResult> {
  if (seenUpdateIds.has(update.update_id)) return {};
  seenUpdateIds.add(update.update_id);
  if (seenUpdateIds.size > 500) {
    const oldest = seenUpdateIds.values().next().value;
    if (oldest != null) seenUpdateIds.delete(oldest);
  }

  const owners = getTelegramOwnerUserIds();
  let operators = owners;
  try {
    const supabase = requireServiceSupabase();
    operators = await resolveBotOperatorIds(supabase);
  } catch {
    /* локально без Supabase — только владельцы из env */
  }
  const isOperator = (id: number) => operators.has(id);
  const isOwner = (id: number) => owners.has(id);

  if (update.my_chat_member) {
    const mcm = update.my_chat_member;
    const chat = mcm.chat;
    if (isGroupChatType(chat.type) && mcm.new_chat_member.user.is_bot) {
      try {
        const supabase = requireServiceSupabase();
        const wasAdmin = isBotAdminStatus(mcm.old_chat_member.status);
        const isAdmin = isBotAdminStatus(mcm.new_chat_member.status);

        if (isAdmin && !wasAdmin) {
          await registerBroadcastChat(supabase, chat.id, chat.title ?? "", chat.type);
          if (isOperator(mcm.from.id)) {
            await sendTelegramMessage(
              chat.id,
              "📢 Группа подключена к рассылке афиш.\n/unsubscribe — отключить.",
            );
          }
        } else if (!isAdmin && wasAdmin) {
          await unregisterBroadcastChat(supabase, chat.id);
        }
      } catch (e) {
        console.error("[telegram bot] my_chat_member", e);
      }
    }
    return {};
  }

  if (update.callback_query) {
    const cq = update.callback_query;
    const userId = cq.from.id;
    const chatId = cq.message?.chat.id;
    const data = cq.data ?? "";

    if (!isOperator(userId)) {
      await answerCallbackQuery(cq.id, "Нет доступа");
      return {};
    }
    if (!chatId) return {};

    if (cq.message && !isPrivateTelegramChat(cq.message.chat)) {
      return {};
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
        return {};
      }
      if (data === "postcast:cancel") {
        clearAwaitingBroadcastPost(chatId);
        if (cq.id) await answerCallbackQuery(cq.id, "Отменено");
        await sendTelegramMessage(chatId, "❌ Рассылка поста отменена.");
        return {};
      }
      if (data.startsWith("postcast:")) {
        const token = data.slice(9);
        if (!token) return {};
        if (cq.id) await answerCallbackQuery(cq.id, "Рассылаю…");
        try {
          await confirmBroadcastPost(chatId, userId, token);
          if (cq.message?.message_id) {
            try {
              await editTelegramMessage(chatId, cq.message.message_id, "📢 Пост разослан в группы.");
            } catch {
              /* ignore */
            }
          }
        } catch (e) {
          const err = e instanceof Error ? e.message : "unknown error";
          await sendTelegramMessage(chatId, `❌ Рассылка: ${err}`);
        }
        return {};
      }
      if (data.startsWith("pub:")) {
        const ok = await publishDraft(chatId, userId, data.slice(4), cq.id);
        if (ok && cq.message?.message_id) {
          try {
            await editTelegramMessage(chatId, cq.message.message_id, "💾 Черновик создан — см. кнопки ниже.");
          } catch {
            /* inline keyboard исчезает после edit — ок */
          }
        }
        return {};
      }
      if (data.startsWith("set:")) {
        const [field, value, ...idParts] = data.slice(4).split(":");
        const draftId = idParts.join(":");
        if (field && value && draftId) {
          await applySingleFieldToDraft(chatId, userId, draftId, field as SetField, value, cq.id);
        }
        return {};
      }
      if (data.startsWith("show:")) {
        const ok = await revealDraftOnSite(chatId, userId, data.slice(5), cq.id);
        if (ok && cq.message?.message_id) {
          try {
            await editTelegramMessage(chatId, cq.message.message_id, "🌍 Опубликовано на сайте — см. сообщение ниже.");
          } catch {
            /* ignore */
          }
        }
        return {};
      }
      if (data.startsWith("del:")) {
        await deleteDraftEvents(chatId, userId, data.slice(4), cq.id);
        if (cq.message?.message_id) {
          try {
            await editTelegramMessage(chatId, cq.message.message_id, "🗑 Удалено.");
          } catch {
            /* ignore */
          }
        }
        return {};
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
        return {};
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
    return {};
  }

  const msg = update.message;
  if (!msg?.from) return {};

  const chatId = msg.chat.id;
  const userId = msg.from.id;

  // В группах бот молчит — только команды админа (рассылка, /chatid).
  if (!isPrivateTelegramChat(msg.chat)) {
    const text = messageBody(msg);
    if (!isOperator(userId)) return {};

    if (text === "/subscribe" || text.startsWith("/subscribe@")) {
      try {
        const supabase = requireServiceSupabase();
        await registerBroadcastChat(supabase, chatId, msg.chat.title ?? "", msg.chat.type);
        await sendTelegramMessage(
          chatId,
          "📢 Группа подключена к рассылке афиш.\n/unsubscribe — отключить.",
        );
      } catch (e) {
        const err = e instanceof Error ? e.message : "unknown";
        await sendTelegramMessage(chatId, `❌ Не удалось подключить: ${err}`);
      }
      return {};
    }

    if (text === "/unsubscribe" || text.startsWith("/unsubscribe@")) {
      try {
        const supabase = requireServiceSupabase();
        await unregisterBroadcastChat(supabase, chatId);
        await sendTelegramMessage(chatId, "🔕 Рассылка в эту группу отключена.");
      } catch (e) {
        const err = e instanceof Error ? e.message : "unknown";
        await sendTelegramMessage(chatId, `❌ Ошибка: ${err}`);
      }
      return {};
    }

    if (text === "/chatid" || text.startsWith("/chatid@")) {
      await sendTelegramMessage(
        chatId,
        `Chat ID: \`${chatId}\`\n\nБот подключает рассылку автоматически при назначении админом.\n/subscribe — вручную · /unsubscribe — отключить`,
        { parseMode: "Markdown" },
      );
    }
    return {};
  }

  const textEarly = messageBody(msg);
  if (textEarly === "/myid" || textEarly.startsWith("/myid@")) {
    await sendTelegramMessage(chatId, `Ваш Telegram ID: \`${userId}\``, { parseMode: "Markdown" });
    return {};
  }

  if (!isOperator(userId)) {
    await sendTelegramMessage(
      chatId,
      [
        "Нет доступа к боту.",
        "",
        `Ваш Telegram ID: \`${userId}\``,
        "",
        "Попросите владельца бота добавить вас:",
        `/addadmin ${userId}`,
      ].join("\n"),
      { parseMode: "Markdown" },
    );
    return {};
  }

  const text = messageBody(msg);
  const fileId = photoFileId(msg);
  const fileIds = fileId ? [fileId] : [];

  if (isOwner(userId)) {
    const handled = await handleOwnerAdminCommands(chatId, userId, msg, text);
    if (handled) return {};
  } else if (
    text.startsWith("/addadmin") ||
    text.startsWith("/removeadmin") ||
    text === "/listadmins" ||
    text.startsWith("/listadmins@")
  ) {
    await sendTelegramMessage(chatId, "Только владелец бота может управлять редакторами (/addadmin, /removeadmin).");
    return {};
  }

  if (text === "/start" || text === "/help") {
    await cancelAfishaBuffer(chatId);
    const supabase = requireServiceSupabase();
    const hasBroadcast = (await resolveBroadcastChatIds(supabase)).length > 0;
    const broadcastHint = hasBroadcast
      ? "\n\n📢 После публикации на сайт — кнопка «В группы» (или авто при TELEGRAM_AUTO_BROADCAST=1)."
      : "\n\n📢 Рассылка в группы: добавьте бота админом в группу (подключится автоматически) или /subscribe в группе.";
    await sendTelegramMessage(
      chatId,
      [
        "Popular Poet → публикация события",
        "",
        "1. Пришлите фото и текст афиши (в любом порядке; альбом + текст отдельным сообщением — ок).",
        "2. Проверьте превью. Если чего-то не хватает — нажмите кнопку (цена/места/тип/язык) или ответьте текстом.",
        "3. «💾 Создать (скрыто)» — событие появится по ссылке для проверки, но НЕ в афише и НЕ в поиске.",
        "4. Откройте ссылку, проверьте страницу.",
        "5. «🌍 Опубликовать на сайте» — только теперь событие в афише и уходит в поиск. Или «🗑 Удалить».",
        "",
        "Несколько дат → несколько событий. Несколько фото → по порядку дат.",
        "Команды: /cancel — отменить черновик · /myid — ваш Telegram ID.",
        "📢 /broadcast — разослать произвольный пост во все группы (не афишу события).",
        isOwner(userId)
          ? "\nВладелец: /addadmin · /removeadmin · /listadmins — редакторы бота."
          : "",
      ]
        .filter(Boolean)
        .join("\n") + broadcastHint,
    );
    return {};
  }

  if (text === "/cancel") {
    const supabase = requireServiceSupabase();
    await cancelAfishaBuffer(chatId);
    const wasAwaitingBroadcast = isAwaitingBroadcastPost(chatId, userId);
    clearAwaitingBroadcastPost(chatId);
    const active = await getActiveDraftForChat(supabase, chatId);
    if (active) {
      await cancelActiveDraftForChat(supabase, chatId);
      await sendTelegramMessage(chatId, "❌ Текущий черновик отменён. Пришлите афишу заново.");
    } else if (wasAwaitingBroadcast) {
      await sendTelegramMessage(chatId, "❌ Режим рассылки отменён.");
    } else {
      await sendTelegramMessage(chatId, "Активного черновика нет. Пришлите афишу — начнём заново.");
    }
    return {};
  }

  if (isBroadcastPostCommand(text)) {
    if (msg.reply_to_message) {
      const reply = msg.reply_to_message;
      try {
        await offerBroadcastPostConfirm(chatId, userId, chatId, [reply.message_id], messageBody(reply));
      } catch (e) {
        const err = e instanceof Error ? e.message : "unknown error";
        await sendTelegramMessage(chatId, `❌ Рассылка: ${err}`);
      }
      return {};
    }
    await startBroadcastPostFlow(chatId, userId);
    return {};
  }

  if (isAwaitingBroadcastPost(chatId, userId)) {
    try {
      await handleBroadcastPostInput(chatId, userId, msg, msg.media_group_id);
    } catch (e) {
      const err = e instanceof Error ? e.message : "unknown error";
      await sendTelegramMessage(chatId, `❌ Рассылка: ${err}`);
    }
    return {};
  }

  if (text === "/chatid" || text.startsWith("/chatid@")) {
    await sendTelegramMessage(
      chatId,
      `Chat ID: \`${chatId}\`\n\nЭто личный чат. Для группы добавьте бота туда и отправьте /chatid в группе.`,
      { parseMode: "Markdown" },
    );
    return {};
  }

  if (!text && fileIds.length === 0) {
    await sendTelegramMessage(chatId, "Пришлите текст афиши или фото с подписью.");
    return {};
  }

  try {
    let background: Promise<void> | undefined;
    const ctx: HandleChatContext = {
      deferGemini: (work) => {
        background = work;
      },
    };
    await withChatLock(chatId, () =>
      handleChatMessage(chatId, userId, text, fileIds, msg.media_group_id, ctx),
    );
    return { background };
  } catch (e) {
    console.error("[telegram bot]", e);
    const err = e instanceof Error ? e.message : "unknown error";
    await sendTelegramMessage(chatId, `❌ Ошибка:\n${err}`);
    return {};
  }
}
