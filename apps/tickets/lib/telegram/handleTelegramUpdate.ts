import { randomUUID } from "node:crypto";
import { DateTime } from "luxon";
import { requireServiceSupabase } from "@/lib/supabase/admin";
import { getPublicAppUrl } from "@/lib/publicAppUrl";
import { EVENT_ADMIN_TIMEZONE } from "@/lib/warsawEventDatetime";
import { getTelegramOwnerUserIds } from "@/lib/telegram/config";
import {
  addBotAdmin,
  listBotAdmins,
  removeBotAdmin,
  resolveBotOperatorIds,
} from "@/lib/telegram/botAdminStore";
import {
  registerBroadcastChat,
  listBroadcastChats,
  getMasterBroadcastChat,
  setMasterBroadcastChat,
  resolveBroadcastChatIds,
  unregisterBroadcastChat,
  type MasterBroadcastChat,
} from "@/lib/telegram/broadcastChatStore";
import { formatDiscoveryStatusForTelegram } from "@/lib/eventDiscovery/formatDiscoveryStatus";
import { formatGbpManualTelegramMessage } from "@/lib/googleBusinessProfile/gbpManualFallback";
import type { EventDiscoveryResult } from "@/lib/eventDiscovery/notifyEventPublished";
import {
  attachTelegramImageToEvent,
  createEventFromParsed,
  hideEventFromSite,
  revealEventOnSite,
} from "@/lib/telegram/createEventDraft";
import {
  createPendingEventImageAttachment,
  takePendingEventImageAttachment,
} from "@/lib/telegram/eventImageAttachmentStore";
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
  isTelegramBotAdministrator,
  sendTelegramMessage,
  setTelegramBotCommands,
  type InlineKeyboardButton,
} from "@/lib/telegram/telegramBotApi";
import {
  broadcastDraftToGroups,
  broadcastEventToGroups,
  isDraftOnSite,
  mergePublishedIntoParsed,
  ON_SITE_KEY,
  readPublishedEvents,
  type PublishedEventInfo,
} from "@/lib/telegram/broadcastToGroups";
import { saveBroadcastRetry } from "@/lib/telegram/broadcastReportStore";
import { retryBroadcast } from "@/lib/telegram/retryBroadcast";
import {
  fetchUpcomingEventsForBot,
  formatUpcomingEventsMessage,
  upcomingEventsKeyboard,
} from "@/lib/telegram/upcomingEventsBot";
import { getDraftImageFocals } from "@/lib/telegram/draftImageFocal";
import { telegramFocalWebAppUrl } from "@/lib/telegram/telegramFocalWebAppUrl";
import {
  clearAwaitingBroadcastPost,
  clearAiBroadcastRewrite,
  confirmBroadcastPost,
  broadcastInstruction,
  handleBroadcastPostInput,
  handleAiBroadcastRewriteInput,
  isAwaitingBroadcastPost,
  isBroadcastPostCommand,
  offerBroadcastPostConfirm,
  offerBroadcastMode,
  offerGeneratedBroadcastPost,
  startBroadcastPostFlow,
  startAiBroadcastRewriteFlow,
} from "@/lib/telegram/broadcastPostHandlers";
import { rewriteBroadcastWithGemini } from "@/lib/telegram/rewriteBroadcastWithGemini";

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
function revealKeyboard(
  draftId: string,
  opts?: { hasImage?: boolean; eventId?: string },
): InlineKeyboardButton[][] {
  const rows: InlineKeyboardButton[][] = [
    [{ text: "🌍 Опубликовать на сайте", callback_data: `show:${draftId}` }],
  ];
  if (opts?.hasImage) {
    rows.push([
      {
        text: "🖼 Точка фокуса",
        web_app: {
          url: telegramFocalWebAppUrl(
            opts.eventId ? { eventId: opts.eventId } : { draftId },
          ),
        },
      },
    ]);
  }
  rows.push([{ text: "🗑 Удалить", callback_data: `del:${draftId}` }]);
  return rows;
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

  const keyboard: InlineKeyboardButton[][] = [
    [
      { text: publishLabel, callback_data: `pub:${draftId}` },
      { text: "❌ Отмена", callback_data: `cancel:${draftId}` },
    ],
  ];
  if (imageCount > 0) {
    keyboard.push([
      {
        text: batch ? "🖼 Обложки" : "🖼 Точка фокуса",
        web_app: { url: telegramFocalWebAppUrl({ draftId }) },
      },
    ]);
  }

  await sendTelegramMessage(chatId, text, { inlineKeyboard: keyboard });
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
  // Если расписание уже написано текстом, Gemini не нужен тяжёлый vision-ввод:
  // это существенно сокращает время разбора альбома и исключает Vercel timeout.
  const needsVision = text.trim().length < 40;
  if (primaryFileId && needsVision) {
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

type MissingImageEvent = {
  id: string;
  title: string;
  starts_at: string;
  visibility: string;
};

function imageAttachmentButtonLabel(event: MissingImageEvent): string {
  const when = DateTime.fromISO(event.starts_at, { zone: "utc" })
    .setZone(EVENT_ADMIN_TIMEZONE)
    .setLocale("ru")
    .toFormat("d MMM");
  const title = event.title.length > 30 ? `${event.title.slice(0, 29)}…` : event.title;
  return `🖼 ${when} · ${title}`.slice(0, 64);
}

/** Одиночное фото без активного черновика можно быстро прикрепить к уже созданному событию без обложки. */
async function offerImageAttachment(chatId: number, userId: number, fileId: string): Promise<boolean> {
  const supabase = requireServiceSupabase();
  const { data, error } = await supabase
    .from("events")
    .select("id,title,starts_at,visibility")
    .in("visibility", ["published", "unlisted"])
    .is("image_url", null)
    .gte("starts_at", new Date().toISOString())
    .order("starts_at", { ascending: true })
    .limit(8);
  if (error) throw new Error(error.message);
  const events = (data ?? []) as MissingImageEvent[];
  if (!events.length) return false;

  const token = await createPendingEventImageAttachment(userId, fileId);
  const keyboard: InlineKeyboardButton[][] = events.map((event) => [
    { text: imageAttachmentButtonLabel(event), callback_data: `attachimg:${token}:${event.id}` },
  ]);
  keyboard.push([{ text: "✖️ Не прикреплять", callback_data: "attachimg:cancel" }]);
  await sendTelegramMessage(
    chatId,
    "🖼 Нашёл события без обложки. К какому прикрепить это фото?",
    { inlineKeyboard: keyboard },
  );
  return true;
}

async function attachImageToEventFromTelegram(
  chatId: number,
  userId: number,
  token: string,
  eventId: string,
): Promise<void> {
  const pending = await takePendingEventImageAttachment(token, userId);
  if (!pending) {
    await sendTelegramMessage(chatId, "⌛ Выбор фото устарел. Пришлите фотографию ещё раз.");
    return;
  }
  const image = await downloadTelegramFile(pending.fileId);
  const event = await attachTelegramImageToEvent(requireServiceSupabase(), eventId, image);
  await sendTelegramMessage(chatId, `✅ Обложка добавлена: ${event.title}.`);
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
    if (!claimed) return;
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

  if (fileIds.length > 0 && !text.trim() && !active) {
    const offered = await offerImageAttachment(chatId, userId, fileIds[0]!);
    if (offered) return;
  }

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
  const focals = getDraftImageFocals(draft.parsed, storedEvents.length);

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
        imageFocal: focals[i],
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
  await sendTelegramMessage(chatId, text, {
    inlineKeyboard: revealKeyboard(draftId, {
      hasImage: imageFileIds.some(Boolean),
      eventId: published.length === 1 ? published[0]!.id : undefined,
    }),
  });

  return true;
}

function isUpcomingEventsCommand(text: string): boolean {
  return (
    text === "/events" ||
    text.startsWith("/events@") ||
    text === "/upcoming" ||
    text.startsWith("/upcoming@") ||
    text === "/афиша" ||
    text.startsWith("/афиша@")
  );
}

function mainMenuKeyboard(): InlineKeyboardButton[][] {
  return [
    [
      { text: "✨ Новое событие", callback_data: "menu:events" },
      { text: "📣 Новая рассылка", callback_data: "menu:post" },
    ],
    [
      { text: "📅 Афиша", callback_data: "menu:upcoming" },
      { text: "🖼 Добавить обложку", callback_data: "menu:cover" },
    ],
    [
      { text: "⚙️ Группы", callback_data: "menu:groups" },
      { text: "ℹ️ Помощь", callback_data: "menu:help" },
    ],
  ];
}

const TELEGRAM_EDITOR_COMMANDS = [
  { command: "start", description: "Открыть пульт редактора" },
  { command: "event", description: "Создать событие из афиши" },
  { command: "broadcast", description: "Отправить пост в группы" },
  { command: "events", description: "Предстоящие события" },
  { command: "groups", description: "Группы и мастер-группа" },
  { command: "cancel", description: "Отменить текущий шаг" },
  { command: "help", description: "Как пользоваться ботом" },
] as const;

function broadcastAudienceKeyboard(
  prefix: string,
  id: string,
  groups: number,
  master: MasterBroadcastChat,
): InlineKeyboardButton[][] {
  return [
    [{ text: `🌐 Во все группы (${groups})`, callback_data: `${prefix}:all:${id}` }],
    [{ text: `⭐ ${master.title}`, callback_data: `${prefix}:master:${id}` }],
    [{ text: "🗂 Выбрать конкретную группу", callback_data: `${prefix}pickgrp:${id}:0` }],
    [{ text: "‹ Главное меню", callback_data: "menu:home" }],
  ];
}

function retryBroadcastKeyboard(token: string, failed: number): InlineKeyboardButton[][] {
  return [[{ text: `🔁 Повторить ошибки (${failed})`, callback_data: `retrycast:${token}` }]];
}

function specificGroupLabel(group: { chat_id: number; chat_title: string }): string {
  const title = group.chat_title?.trim() || String(group.chat_id);
  return `📣 ${title}`.slice(0, 64);
}

async function offerSpecificBroadcastGroup(
  chatId: number,
  prefix: "rebcast" | "bcast" | "postcast",
  operationId: string,
  page = 0,
): Promise<void> {
  const groups = await listBroadcastChats(requireServiceSupabase());
  const pageSize = 8;
  const totalPages = Math.max(1, Math.ceil(groups.length / pageSize));
  const safePage = Math.min(Math.max(0, page), totalPages - 1);
  const slice = groups.slice(safePage * pageSize, safePage * pageSize + pageSize);
  if (!slice.length) {
    await sendTelegramMessage(chatId, "Нет подключённых групп. Добавьте бота администратором в нужную группу.");
    return;
  }
  const keyboard: InlineKeyboardButton[][] = slice.map((group) => [
    { text: specificGroupLabel(group), callback_data: `${prefix}group:${operationId}:${group.chat_id}` },
  ]);
  if (totalPages > 1) {
    const nav: InlineKeyboardButton[] = [];
    if (safePage > 0) nav.push({ text: "◀️", callback_data: `${prefix}pickgrp:${operationId}:${safePage - 1}` });
    nav.push({ text: `${safePage + 1}/${totalPages}`, callback_data: "menu:groups" });
    if (safePage + 1 < totalPages) nav.push({ text: "▶️", callback_data: `${prefix}pickgrp:${operationId}:${safePage + 1}` });
    keyboard.push(nav);
  }
  keyboard.push([{ text: "🏠 Главное меню", callback_data: "menu:home" }]);
  await sendTelegramMessage(chatId, "🗂 Выберите одну группу для отправки:", { inlineKeyboard: keyboard });
}

async function sendBotHome(chatId: number, userId: number): Promise<void> {
  const supabase = requireServiceSupabase();
  const groups = (await resolveBroadcastChatIds(supabase)).length;
  const master = await getMasterBroadcastChat(supabase);
  await sendTelegramMessage(
    chatId,
    [
      "🎭 PopularEvents · пульт редактора",
      "",
      "Создавайте события из афиши и рассылайте анонсы без лишних команд.",
      "",
      "✨ Событие — пришлите афишу: фото и текст в любом порядке.",
      "📣 Рассылка — пришлите готовый текст, фото, видео или альбом.",
      "",
      groups
        ? `🟢 Подключено групп: ${groups} · мастер: ⭐ ${master.title}`
        : "🟠 Группы пока не подключены.",
      getTelegramOwnerUserIds().has(userId) ? "\n👑 У владельца есть управление редакторами: /listadmins" : "",
    ]
      .filter(Boolean)
      .join("\n"),
    { inlineKeyboard: mainMenuKeyboard() },
  );
}

async function sendGroupsSettings(chatId: number): Promise<void> {
  const supabase = requireServiceSupabase();
  const groups = await listBroadcastChats(supabase);
  const master = await getMasterBroadcastChat(supabase);
  const rows = groups.map((group) => {
    const mark = group.chat_id === master.id ? "⭐ " : "• ";
    return `${mark}${group.chat_title || group.chat_id} · ${group.chat_type}`;
  });
  await sendTelegramMessage(
    chatId,
    [
      "⚙️ Группы рассылки",
      "",
      `Мастер-группа: ⭐ ${master.title}`,
      rows.length ? `\nПодключены:\n${rows.join("\n")}` : "\nПока нет подключённых групп.",
      "\nДобавьте бота администратором в группу — она подключится автоматически. В самой группе /unsubscribe отключает рассылку.",
    ].join("\n"),
    {
      inlineKeyboard: [
        ...groups.filter((group) => group.chat_id !== master.id).slice(0, 8).map((group) => [
          { text: `⭐ Сделать мастер-группой: ${group.chat_title || group.chat_id}`.slice(0, 64), callback_data: `groupmaster:${group.chat_id}` },
        ]),
        [{ text: "🔄 Обновить", callback_data: "menu:groups" }],
        [{ text: "‹ Главное меню", callback_data: "menu:home" }],
      ],
    },
  );
}

async function offerEventBroadcast(chatId: number, eventId: string): Promise<void> {
  const supabase = requireServiceSupabase();
  const groups = await resolveBroadcastChatIds(supabase);
  const master = await getMasterBroadcastChat(supabase);
  if (!groups.length) {
    await sendTelegramMessage(chatId, "Нет подключённых групп. Добавьте бота администратором в нужную группу.");
    return;
  }
  await sendTelegramMessage(chatId, "📢 Куда отправить событие?", {
    inlineKeyboard: broadcastAudienceKeyboard("rebcast", eventId, groups.length, master),
  });
}

async function sendUpcomingEventsList(
  chatId: number,
  page = 0,
  editMessageId?: number,
): Promise<void> {
  const supabase = requireServiceSupabase();
  const events = await fetchUpcomingEventsForBot(supabase);
  const base = getPublicAppUrl()?.replace(/\/$/, "") ?? "https://www.populartickets.pl";
  const text = formatUpcomingEventsMessage(events, page, base);
  const keyboard = upcomingEventsKeyboard(events, page);

  if (editMessageId) {
    await editTelegramMessage(chatId, editMessageId, text, { inlineKeyboard: keyboard });
    return;
  }
  await sendTelegramMessage(chatId, text, { inlineKeyboard: keyboard });
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
  const master = await getMasterBroadcastChat(supabase);
  await sendTelegramMessage(chatId, "📢 Событие опубликовано. Куда отправить анонс?", {
    inlineKeyboard: broadcastAudienceKeyboard("bcast", draftId, broadcastChats.length, master),
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
      if (data === "attachimg:cancel") {
        if (cq.id) await answerCallbackQuery(cq.id, "Отменено");
        await sendTelegramMessage(chatId, "Ок, фото не прикреплено.");
        return {};
      }
      if (data.startsWith("attachimg:")) {
        const [, token, eventId] = data.split(":", 3);
        if (!token || !eventId) return {};
        if (cq.id) await answerCallbackQuery(cq.id, "Добавляю обложку…");
        await attachImageToEventFromTelegram(chatId, userId, token, eventId);
        if (cq.message?.message_id) {
          try {
            await editTelegramMessage(chatId, cq.message.message_id, "🖼 Фото прикреплено к событию.");
          } catch {
            /* ignore */
          }
        }
        return {};
      }
      if (data === "menu:home" || data === "menu:help") {
        if (cq.id) await answerCallbackQuery(cq.id);
        if (data === "menu:help") {
          await sendTelegramMessage(
            chatId,
            [
              "ℹ️ Как пользоваться",
              "",
              "1. ✨ «Новое событие» — пришлите афишу с фото и текстом; порядок не важен.",
              "2. Проверьте превью, создайте событие и опубликуйте его на сайте.",
              "3. Выберите аудиторию: 🌐 все группы или ⭐ мастер-группа POPULAR IMPRO.",
              "4. 📣 «Новая рассылка» — для обычного текста, фото, видео или альбома; контент уйдёт без изменений.",
              "5. 🖼 «Добавить обложку» — отправьте фото и выберите событие без обложки.",
              "",
              "Если Telegram временно не доставил сообщение, в отчёте появится кнопка «Повторить ошибки» — она отправит только в проблемные группы.",
              "",
              "/cancel — отменить текущий шаг · /events — список событий · /broadcast — отправить сообщение · /start — открыть пульт.",
            ].join("\n"),
            { inlineKeyboard: [[{ text: "‹ Главное меню", callback_data: "menu:home" }]] },
          );
          return {};
        }
        await sendBotHome(chatId, userId);
        return {};
      }
      if (data === "menu:events") {
        if (cq.id) await answerCallbackQuery(cq.id);
        await sendTelegramMessage(
          chatId,
          "🗓 Пришлите фото и текст афиши. Можно несколькими сообщениями и в любом порядке — бот соберёт их в одно событие.",
          { inlineKeyboard: [[{ text: "‹ Главное меню", callback_data: "menu:home" }]] },
        );
        return {};
      }
      if (data === "menu:cover") {
        if (cq.id) await answerCallbackQuery(cq.id);
        await sendTelegramMessage(
          chatId,
          "🖼 Пришлите одну фотографию без текста. Я покажу будущие события без обложки — выберите нужное кнопкой.",
          { inlineKeyboard: [[{ text: "‹ Главное меню", callback_data: "menu:home" }]] },
        );
        return {};
      }
      if (data === "menu:post") {
        if (cq.id) await answerCallbackQuery(cq.id);
        await offerBroadcastMode(chatId);
        return {};
      }
      if (data === "menu:upcoming") {
        if (cq.id) await answerCallbackQuery(cq.id);
        await sendUpcomingEventsList(chatId, 0);
        return {};
      }
      if (data === "menu:groups") {
        if (cq.id) await answerCallbackQuery(cq.id);
        await sendGroupsSettings(chatId);
        return {};
      }
      if (data.startsWith("groupmaster:")) {
        const groupId = Number(data.slice("groupmaster:".length));
        const groups = await listBroadcastChats(requireServiceSupabase());
        const group = groups.find((item) => item.chat_id === groupId);
        if (!group) {
          if (cq.id) await answerCallbackQuery(cq.id, "Группа больше не подключена");
          return {};
        }
        await setMasterBroadcastChat(requireServiceSupabase(), group);
        if (cq.id) await answerCallbackQuery(cq.id, "Мастер-группа обновлена");
        await sendTelegramMessage(chatId, `⭐ Мастер-группа: ${group.chat_title || group.chat_id}.`);
        return {};
      }
      if (data.startsWith("rebcastpickgrp:")) {
        const [eventId, pageRaw] = data.slice("rebcastpickgrp:".length).split(":", 2);
        await offerSpecificBroadcastGroup(chatId, "rebcast", eventId ?? "", Number(pageRaw) || 0);
        return {};
      }
      if (data.startsWith("rebcastgroup:")) {
        const [eventId, groupRaw] = data.slice("rebcastgroup:".length).split(":", 2);
        const targetChatId = Number(groupRaw);
        if (!eventId || !Number.isFinite(targetChatId)) return {};
        if (cq.id) await answerCallbackQuery(cq.id, "Рассылаю…");
        const result = await broadcastEventToGroups(requireServiceSupabase(), eventId, "all", [targetChatId]);
        const retryToken = await saveBroadcastRetry(userId, { kind: "event", audience: "all", eventId }, result.failedChatIds);
        await sendTelegramMessage(
          chatId,
          `📣 Готово: событие отправлено в ${result.sent} из ${result.chats} выбранной группы.`,
          retryToken ? { inlineKeyboard: retryBroadcastKeyboard(retryToken, result.failed) } : undefined,
        );
        return {};
      }
      if (data.startsWith("rebcastpick:")) {
        if (cq.id) await answerCallbackQuery(cq.id);
        await offerEventBroadcast(chatId, data.slice("rebcastpick:".length));
        return {};
      }
      if (data.startsWith("rebcast:")) {
        const [audienceRaw, eventId] = data.slice(8).split(":", 2);
        if (!eventId || (audienceRaw !== "all" && audienceRaw !== "master")) {
          await offerEventBroadcast(chatId, data.slice(8));
          return {};
        }
        if (cq.id) await answerCallbackQuery(cq.id, "Рассылаю…");
        try {
          const supabase = requireServiceSupabase();
          const result = await broadcastEventToGroups(supabase, eventId, audienceRaw);
          const retryToken = await saveBroadcastRetry(userId, {
            kind: "event",
            audience: audienceRaw,
            eventId,
          }, result.failedChatIds);
          await sendTelegramMessage(
            chatId,
            `📢 Готово: событие разослано в ${result.sent} из ${result.chats} групп${result.failed ? `, ошибок: ${result.failed}` : ""}.`,
            retryToken ? { inlineKeyboard: retryBroadcastKeyboard(retryToken, result.failed) } : undefined,
          );
        } catch (e) {
          const err = e instanceof Error ? e.message : "unknown error";
          await sendTelegramMessage(chatId, `❌ Рассылка: ${err}`);
        }
        return {};
      }
      if (data.startsWith("evpage:")) {
        const page = Math.max(0, Number(data.slice(7)) || 0);
        if (cq.id) await answerCallbackQuery(cq.id);
        try {
          if (cq.message?.message_id) {
            await sendUpcomingEventsList(chatId, page, cq.message.message_id);
          } else {
            await sendUpcomingEventsList(chatId, page);
          }
        } catch (e) {
          const err = e instanceof Error ? e.message : "unknown error";
          await sendTelegramMessage(chatId, `❌ ${err}`);
        }
        return {};
      }
      if (data.startsWith("bcast:")) {
        const [audienceRaw, draftId] = data.slice(6).split(":", 2);
        if (!draftId || (audienceRaw !== "all" && audienceRaw !== "master")) {
          const supabase = requireServiceSupabase();
          const groups = await resolveBroadcastChatIds(supabase);
          const master = await getMasterBroadcastChat(supabase);
          await sendTelegramMessage(chatId, "📢 Куда отправить анонс?", {
            inlineKeyboard: broadcastAudienceKeyboard("bcast", data.slice(6), groups.length, master),
          });
          return {};
        }
        if (cq.id) await answerCallbackQuery(cq.id, "Рассылаю…");
        try {
          const supabase = requireServiceSupabase();
          const result = await broadcastDraftToGroups(supabase, draftId, audienceRaw);
          const retryToken = await saveBroadcastRetry(userId, {
            kind: "draft",
            audience: audienceRaw,
            draftId,
          }, result.failedChatIds);
          await sendTelegramMessage(
            chatId,
            `📢 Готово: ${result.sent} сообщ. в ${result.chats} групп(ы)${result.failed ? `, ошибок: ${result.failed}` : ""}`,
            retryToken ? { inlineKeyboard: retryBroadcastKeyboard(retryToken, result.failed) } : undefined,
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
      if (data.startsWith("bcastpickgrp:")) {
        const [draftId, pageRaw] = data.slice("bcastpickgrp:".length).split(":", 2);
        await offerSpecificBroadcastGroup(chatId, "bcast", draftId ?? "", Number(pageRaw) || 0);
        return {};
      }
      if (data.startsWith("bcastgroup:")) {
        const [draftId, groupRaw] = data.slice("bcastgroup:".length).split(":", 2);
        const targetChatId = Number(groupRaw);
        if (!draftId || !Number.isFinite(targetChatId)) return {};
        if (cq.id) await answerCallbackQuery(cq.id, "Рассылаю…");
        const result = await broadcastDraftToGroups(requireServiceSupabase(), draftId, "all", [targetChatId]);
        const retryToken = await saveBroadcastRetry(userId, { kind: "draft", audience: "all", draftId }, result.failedChatIds);
        await sendTelegramMessage(
          chatId,
          `📣 Готово: ${result.sent} сообщ. в ${result.chats} выбранной группе.`,
          retryToken ? { inlineKeyboard: retryBroadcastKeyboard(retryToken, result.failed) } : undefined,
        );
        return {};
      }
      if (data === "postcast:cancel") {
        await clearAwaitingBroadcastPost(chatId);
        await clearAiBroadcastRewrite(chatId);
        if (cq.id) await answerCallbackQuery(cq.id, "Отменено");
        await sendTelegramMessage(chatId, "❌ Рассылка поста отменена.");
        return {};
      }
      if (data === "postmode:plain") {
        if (cq.id) await answerCallbackQuery(cq.id);
        await startBroadcastPostFlow(chatId, userId);
        return {};
      }
      if (data === "postmode:rewrite") {
        if (cq.id) await answerCallbackQuery(cq.id);
        await startAiBroadcastRewriteFlow(chatId, userId);
        return {};
      }
      if (data.startsWith("postcastpickgrp:")) {
        const [token, pageRaw] = data.slice("postcastpickgrp:".length).split(":", 2);
        await offerSpecificBroadcastGroup(chatId, "postcast", token ?? "", Number(pageRaw) || 0);
        return {};
      }
      if (data.startsWith("postcastgroup:")) {
        const [token, groupRaw] = data.slice("postcastgroup:".length).split(":", 2);
        const targetChatId = Number(groupRaw);
        if (!token || !Number.isFinite(targetChatId)) return {};
        if (cq.id) await answerCallbackQuery(cq.id, "Рассылаю…");
        const result = await confirmBroadcastPost(chatId, userId, token, "all", [targetChatId]);
        if (cq.message?.message_id) {
          await editTelegramMessage(chatId, cq.message.message_id, result.chats ? "📣 Отправлено в выбранную группу." : "⌛ Сессия рассылки устарела.");
        }
        return {};
      }
      if (data.startsWith("postcast:")) {
        const [audienceRaw, token] = data.slice(9).split(":", 2);
        if (!token || (audienceRaw !== "all" && audienceRaw !== "master")) return {};
        if (cq.id) await answerCallbackQuery(cq.id, "Рассылаю…");
        try {
          const result = await confirmBroadcastPost(chatId, userId, token, audienceRaw);
          if (cq.message?.message_id) {
            try {
              await editTelegramMessage(
                chatId,
                cq.message.message_id,
                result.chats ? `📢 Пост разослан в ${result.sent} из ${result.chats} групп.` : "⌛ Сессия рассылки устарела.",
              );
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
      if (data.startsWith("retrycast:")) {
        if (cq.id) await answerCallbackQuery(cq.id, "Повторяю неудачные отправки…");
        const result = await retryBroadcast(userId, data.slice("retrycast:".length));
        if (!result) {
          await sendTelegramMessage(chatId, "⌛ Кнопка повтора устарела. Запустите рассылку ещё раз.");
          return {};
        }
        await sendTelegramMessage(
          chatId,
          `🔁 Повтор завершён: ${result.sent} из ${result.chats} групп${result.failed ? `, осталось ошибок: ${result.failed}` : ""}.`,
          result.retryToken ? { inlineKeyboard: retryBroadcastKeyboard(result.retryToken, result.failed) } : undefined,
        );
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
        if (!(await isTelegramBotAdministrator(chatId))) {
          await sendTelegramMessage(chatId, "Сначала назначьте бота администратором — иначе он не сможет отправлять сообщения.");
          return {};
        }
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

  if (text === "/start" || text.startsWith("/start@") || text === "/help" || text.startsWith("/help@")) {
    void setTelegramBotCommands([...TELEGRAM_EDITOR_COMMANDS]).catch((error) =>
      console.warn("[telegram commands]", error),
    );
    await cancelAfishaBuffer(chatId);
    await clearAwaitingBroadcastPost(chatId);
    await sendBotHome(chatId, userId);
    return {};
  }

  if (text === "/event" || text.startsWith("/event@")) {
    await sendTelegramMessage(chatId, "✨ Пришлите фото и текст афиши. Можно несколькими сообщениями и в любом порядке.");
    return {};
  }

  if (text === "/groups" || text.startsWith("/groups@")) {
    await sendGroupsSettings(chatId);
    return {};
  }

  if (text === "/cancel") {
    const supabase = requireServiceSupabase();
    await cancelAfishaBuffer(chatId);
    const wasAwaitingBroadcast = await isAwaitingBroadcastPost(chatId, userId);
    await clearAwaitingBroadcastPost(chatId);
    await clearAiBroadcastRewrite(chatId);
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

  if (isUpcomingEventsCommand(text)) {
    try {
      await sendUpcomingEventsList(chatId, 0);
    } catch (e) {
      const err = e instanceof Error ? e.message : "unknown error";
      await sendTelegramMessage(chatId, `❌ Не удалось загрузить события:\n${err}`);
    }
    return {};
  }

  if (isBroadcastPostCommand(text)) {
    if (msg.reply_to_message) {
      const reply = msg.reply_to_message;
      try {
        const instruction = broadcastInstruction(text);
        if (instruction) {
          const source = messageBody(reply);
          if (!source) {
            await sendTelegramMessage(chatId, "Для переписывания ответьте командой на текстовое сообщение.");
            return {};
          }
          await sendTelegramMessage(chatId, "✨ Переписываю анонс, сохраняя дату, стоимость и остальные факты…");
          const rewritten = await rewriteBroadcastWithGemini(source, instruction);
          await offerGeneratedBroadcastPost(chatId, userId, rewritten, photoFileId(reply));
          return {};
        }
        await offerBroadcastPostConfirm(chatId, userId, chatId, [reply.message_id], messageBody(reply));
      } catch (e) {
        const err = e instanceof Error ? e.message : "unknown error";
        await sendTelegramMessage(chatId, `❌ Рассылка: ${err}`);
      }
      return {};
    }
    await offerBroadcastMode(chatId);
    return {};
  }

  try {
    if (await handleAiBroadcastRewriteInput(chatId, userId, text, fileIds[0])) return {};
  } catch (e) {
    const err = e instanceof Error ? e.message : "unknown error";
    await sendTelegramMessage(chatId, `❌ Gemini: ${err}`);
    return {};
  }

  if (await isAwaitingBroadcastPost(chatId, userId)) {
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
