/**
 * Сборка афиши из частей: альбом, отдельный текст, подпись на любом фото — порядок не важен.
 */

const PARSE_WHEN_READY_MS = 700;
const WAIT_PHOTOS_AFTER_TEXT_MS = 12_000;
const WAIT_TEXT_AFTER_PHOTOS_MS = 3_000;
const BUNDLE_TTL_MS = 3 * 60 * 1000;

export type AfishaBundleReady = {
  chatId: number;
  userId: number;
  text: string;
  fileIds: string[];
};

type AfishaBundle = {
  userId: number;
  text: string;
  fileIds: string[];
  updatedAt: number;
  flushTimer?: ReturnType<typeof setTimeout>;
  notifiedWaitingForText?: boolean;
};

type BundleStore = Map<number, AfishaBundle>;

function store(): BundleStore {
  const g = globalThis as typeof globalThis & { __telegramAfishaBundles?: BundleStore };
  if (!g.__telegramAfishaBundles) g.__telegramAfishaBundles = new Map();
  return g.__telegramAfishaBundles;
}

export function cancelAfishaBundle(chatId: number): void {
  const b = store().get(chatId);
  if (b?.flushTimer) clearTimeout(b.flushTimer);
  store().delete(chatId);
}

export function getAfishaBundle(chatId: number): AfishaBundle | undefined {
  const b = store().get(chatId);
  if (!b) return undefined;
  if (Date.now() - b.updatedAt > BUNDLE_TTL_MS) {
    cancelAfishaBundle(chatId);
    return undefined;
  }
  return b;
}

export function mergeAfishaPart(
  chatId: number,
  userId: number,
  part: { text?: string; fileIds?: string[] },
  onReady: (payload: AfishaBundleReady) => Promise<void>,
  onWaitingForText?: (payload: { chatId: number; photoCount: number }) => Promise<void>,
): void {
  const bundles = store();
  const now = Date.now();
  const prev = getAfishaBundle(chatId);
  const buf: AfishaBundle = prev ?? {
    userId,
    text: "",
    fileIds: [],
    updatedAt: now,
  };

  buf.userId = userId;
  buf.updatedAt = now;

  if (part.text?.trim()) {
    const next = part.text.trim();
    buf.text = next.length >= buf.text.length ? next : buf.text;
  }

  for (const id of part.fileIds ?? []) {
    if (!buf.fileIds.includes(id)) buf.fileIds.push(id);
  }

  if (buf.flushTimer) clearTimeout(buf.flushTimer);

  const hasText = buf.text.length > 0;
  const hasPhotos = buf.fileIds.length > 0;

  let delay = PARSE_WHEN_READY_MS;
  if (hasText && !hasPhotos) delay = WAIT_PHOTOS_AFTER_TEXT_MS;
  else if (hasPhotos && !hasText) delay = WAIT_TEXT_AFTER_PHOTOS_MS;
  else if (hasText && hasPhotos) delay = PARSE_WHEN_READY_MS;

  buf.flushTimer = setTimeout(() => {
    void tryFlushBundle(chatId, onReady, onWaitingForText).catch((e) =>
      console.error("[telegram bot] afisha bundle flush", e),
    );
  }, delay);

  bundles.set(chatId, buf);
}

async function tryFlushBundle(
  chatId: number,
  onReady: (payload: AfishaBundleReady) => Promise<void>,
  onWaitingForText?: (payload: { chatId: number; photoCount: number }) => Promise<void>,
): Promise<void> {
  const bundles = store();
  const buf = getAfishaBundle(chatId);
  if (!buf) return;

  const hasText = buf.text.length > 0;
  const hasPhotos = buf.fileIds.length > 0;

  if (hasText && hasPhotos) {
    cancelAfishaBundle(chatId);
    await onReady({
      chatId,
      userId: buf.userId,
      text: buf.text,
      fileIds: [...buf.fileIds],
    });
    return;
  }

  if (hasText && !hasPhotos) {
    cancelAfishaBundle(chatId);
    await onReady({
      chatId,
      userId: buf.userId,
      text: buf.text,
      fileIds: [],
    });
    return;
  }

  if (hasPhotos && !hasText) {
    if (!buf.notifiedWaitingForText && onWaitingForText) {
      buf.notifiedWaitingForText = true;
      await onWaitingForText({ chatId, photoCount: buf.fileIds.length });
    }
    buf.flushTimer = undefined;
    bundles.set(chatId, buf);
  }
}
