import { NextResponse } from "next/server";
import { requireServiceSupabase } from "@/lib/supabase/admin";
import { fetchDraftFocalImage, fetchEventCoverImage } from "@/lib/telegram/focalWebAppService";
import {
  assertTelegramOperator,
  authenticateTelegramWebApp,
  readInitDataFromRequest,
} from "@/lib/telegram/telegramWebAppAuth";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const initData = readInitDataFromRequest(req);
  const user = await authenticateTelegramWebApp(initData);
  if (!user || !(await assertTelegramOperator(user.userId))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const draftId = url.searchParams.get("draftId")?.trim() || undefined;
  const eventId = url.searchParams.get("eventId")?.trim() || undefined;
  const eventIndex = Math.max(0, Number(url.searchParams.get("eventIndex") ?? "0"));

  const supabase = requireServiceSupabase();
  let image: { buffer: Buffer; mimeType: string } | null = null;

  if (draftId) {
    image = await fetchDraftFocalImage(supabase, { draftId, eventIndex, userId: user.userId });
  } else if (eventId) {
    image = await fetchEventCoverImage(supabase, eventId);
  }

  if (!image) return NextResponse.json({ error: "no image" }, { status: 404 });

  return new NextResponse(new Uint8Array(image.buffer), {
    headers: {
      "Content-Type": image.mimeType,
      "Cache-Control": "private, max-age=300",
    },
  });
}
