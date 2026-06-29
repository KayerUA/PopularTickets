import { waitUntil } from "@vercel/functions";
import { NextRequest, NextResponse } from "next/server";
import { getTelegramWebhookSecret } from "@/lib/telegram/config";
import { ackCallbackQueryImmediate } from "@/lib/telegram/telegramBotApi";
import { handleTelegramUpdate, type TelegramUpdate } from "@/lib/telegram/handleTelegramUpdate";

export const maxDuration = 60;

type RouteContext = { params: Promise<{ secret: string }> };

export async function POST(req: NextRequest, context: RouteContext): Promise<NextResponse> {
  const { secret } = await context.params;
  const expected = getTelegramWebhookSecret();
  if (!expected || secret !== expected) {
    return new NextResponse("not found", { status: 404 });
  }

  let update: TelegramUpdate;
  try {
    update = (await req.json()) as TelegramUpdate;
  } catch {
    return new NextResponse("bad json", { status: 400 });
  }

  if (update.update_id === -1) {
    return NextResponse.json({ ok: true, warmup: true });
  }

  if (update.callback_query?.id) {
    const data = update.callback_query.data ?? "";
    const hint = data.startsWith("pub:")
      ? "Создаю черновик…"
      : data.startsWith("show:")
        ? "Публикую на сайт…"
        : data.startsWith("del:")
          ? "Удаляю…"
          : data.startsWith("cancel:")
            ? "Отменяю…"
            : data.startsWith("bcast:")
              ? "Рассылаю…"
              : undefined;
    ackCallbackQueryImmediate(update.callback_query.id, hint);
  }

  const isMultiPhoto = Boolean(update.message?.media_group_id);

  try {
    if (process.env.NODE_ENV === "development") {
      const { background } = await handleTelegramUpdate(update);
      if (background) await background;
    } else if (isMultiPhoto) {
      // Несколько фото в одном пересыле: ~3 с debounce в запросе, Gemini — в фоне.
      const { background } = await handleTelegramUpdate(update);
      if (background) {
        waitUntil(
          background.catch((e) => {
            console.error("[telegram webhook] background gemini", e);
          }),
        );
      }
    } else {
      waitUntil(
        handleTelegramUpdate(update)
          .then(async ({ background }) => {
            if (background) await background;
          })
          .catch((e) => {
            console.error("[telegram webhook]", e);
          }),
      );
    }
  } catch (e) {
    console.error("[telegram webhook]", e);
  }

  return NextResponse.json({ ok: true });
}
