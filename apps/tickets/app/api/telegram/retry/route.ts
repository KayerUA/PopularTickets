import { NextRequest, NextResponse } from "next/server";
import { handleTelegramUpdate } from "@/lib/telegram/handleTelegramUpdate";
import {
  claimRetryableTelegramUpdates,
  completeTelegramWebhookUpdate,
  failTelegramWebhookUpdate,
} from "@/lib/telegram/telegramWebhookUpdateStore";

export const maxDuration = 60;

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  return Boolean(secret && req.headers.get("authorization") === `Bearer ${secret}`);
}

/** Vercel Cron: повторяет только ранее сохранённые сбойные webhook-обновления. */
export async function GET(req: NextRequest): Promise<NextResponse> {
  if (!isAuthorized(req)) return new NextResponse("not found", { status: 404 });

  const retries = await claimRetryableTelegramUpdates();
  let completed = 0;
  for (const { update, updateId } of retries) {
    try {
      const { background } = await handleTelegramUpdate(update);
      if (background) await background;
      await completeTelegramWebhookUpdate(updateId);
      completed++;
    } catch (error) {
      await failTelegramWebhookUpdate(updateId, error);
      console.error("[telegram retry]", updateId, error);
    }
  }
  return NextResponse.json({ ok: true, claimed: retries.length, completed });
}
