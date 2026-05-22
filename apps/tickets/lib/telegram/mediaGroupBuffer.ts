/** Буфер альбома Telegram (media_group_id): собираем фото ~2.5 с, затем один парсинг. */

const FLUSH_MS = 2500;

export type MediaGroupFlushPayload = {
  chatId: number;
  userId: number;
  fileIds: string[];
  text: string;
};

type MediaGroupBuffer = {
  chatId: number;
  userId: number;
  fileIds: string[];
  text: string;
  flushTimer?: ReturnType<typeof setTimeout>;
  flushPromise?: Promise<void>;
  resolveFlush?: () => void;
};

type MediaGroupStore = Map<string, MediaGroupBuffer>;

function store(): MediaGroupStore {
  const g = globalThis as typeof globalThis & { __telegramMediaGroupBuffers?: MediaGroupStore };
  if (!g.__telegramMediaGroupBuffers) g.__telegramMediaGroupBuffers = new Map();
  return g.__telegramMediaGroupBuffers;
}

/** Ждём сбор альбома — webhook не должен отвечать 200 до flush (иначе таймер на Vercel не сработает). */
export function enqueueMediaGroupPart(
  mediaGroupId: string,
  chatId: number,
  userId: number,
  fileId: string | undefined,
  text: string,
  onFlush: (payload: MediaGroupFlushPayload) => Promise<void>,
): Promise<void> {
  const key = `${chatId}:${mediaGroupId}`;
  const buffers = store();
  const existing = buffers.get(key);
  const buf: MediaGroupBuffer = existing ?? {
    chatId,
    userId,
    fileIds: [],
    text: "",
  };

  buf.chatId = chatId;
  buf.userId = userId;
  if (fileId && !buf.fileIds.includes(fileId)) buf.fileIds.push(fileId);
  if (text.trim()) buf.text = text.trim();

  if (buf.flushTimer) clearTimeout(buf.flushTimer);

  if (!buf.flushPromise) {
    buf.flushPromise = new Promise<void>((resolve) => {
      buf.resolveFlush = resolve;
    });
  }

  buf.flushTimer = setTimeout(() => {
    buffers.delete(key);
    const payload: MediaGroupFlushPayload = {
      chatId: buf.chatId,
      userId: buf.userId,
      fileIds: [...buf.fileIds],
      text: buf.text,
    };
    void onFlush(payload)
      .catch((e) => console.error("[telegram bot] media group flush", e))
      .finally(() => buf.resolveFlush?.());
  }, FLUSH_MS);

  buffers.set(key, buf);
  return buf.flushPromise;
}

export function cancelMediaGroupBuffersForChat(chatId: number): void {
  const buffers = store();
  for (const [key, buf] of buffers) {
    if (buf.chatId === chatId) {
      if (buf.flushTimer) clearTimeout(buf.flushTimer);
      buf.resolveFlush?.();
      buffers.delete(key);
    }
  }
}
