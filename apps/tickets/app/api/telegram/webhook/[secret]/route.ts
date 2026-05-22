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
    const hint = data.startsWith("pub:") ? "Публикую…" : data.startsWith("cancel:") ? "Отменяю…" : undefined;
    ackCallbackQueryImmediate(update.callback_query.id, hint);
  }

  try {
    await handleTelegramUpdate(update);
  } catch (e) {
    console.error("[telegram webhook]", e);
  }

  return NextResponse.json({ ok: true });
}
