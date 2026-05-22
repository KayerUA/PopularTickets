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
};

type MediaGroupStore = Map<string, MediaGroupBuffer>;

function store(): MediaGroupStore {
  const g = globalThis as typeof globalThis & { __telegramMediaGroupBuffers?: MediaGroupStore };
  if (!g.__telegramMediaGroupBuffers) g.__telegramMediaGroupBuffers = new Map();
  return g.__telegramMediaGroupBuffers;
}

export function enqueueMediaGroupPart(
  mediaGroupId: string,
  chatId: number,
  userId: number,
  fileId: string | undefined,
  text: string,
  onFlush: (payload: MediaGroupFlushPayload) => Promise<void>,
): void {
  const key = `${chatId}:${mediaGroupId}`;
  const buffers = store();
  const buf: MediaGroupBuffer = buffers.get(key) ?? {
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
  buf.flushTimer = setTimeout(() => {
    buffers.delete(key);
    void onFlush({
      chatId: buf.chatId,
      userId: buf.userId,
      fileIds: [...buf.fileIds],
      text: buf.text,
    }).catch((e) => console.error("[telegram bot] media group flush", e));
  }, FLUSH_MS);

  buffers.set(key, buf);
}

export function cancelMediaGroupBuffersForChat(chatId: number): void {
  const buffers = store();
  for (const [key, buf] of buffers) {
    if (buf.chatId === chatId) {
      if (buf.flushTimer) clearTimeout(buf.flushTimer);
      buffers.delete(key);
    }
  }
}
