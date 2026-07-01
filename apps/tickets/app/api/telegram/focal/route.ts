import { NextResponse } from "next/server";
import { requireServiceSupabase } from "@/lib/supabase/admin";
import {
  fetchDraftFocalImage,
  fetchEventCoverImage,
  loadFocalWebAppState,
  saveFocalWebAppState,
} from "@/lib/telegram/focalWebAppService";
import {
  assertTelegramOperator,
  authenticateTelegramWebApp,
  readInitDataFromRequest,
} from "@/lib/telegram/telegramWebAppAuth";

export const runtime = "nodejs";

async function authorize(req: Request) {
  let initData = readInitDataFromRequest(req);
  if (!initData) {
    try {
      const body = (await req.clone().json()) as { initData?: string };
      initData = body.initData?.trim() ?? null;
    } catch {
      /* GET without body */
    }
  }
  const user = await authenticateTelegramWebApp(initData);
  if (!user) return null;
  if (!(await assertTelegramOperator(user.userId))) return null;
  return user;
}

export async function POST(req: Request) {
  const user = await authorize(req);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: {
    initData?: string;
    action?: string;
    draftId?: string;
    eventId?: string;
    eventIndex?: number;
    focalX?: number;
    focalY?: number;
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const draftId = body.draftId?.trim() || undefined;
  const eventId = body.eventId?.trim() || undefined;
  const eventIndex = Number.isFinite(body.eventIndex) ? Math.max(0, Number(body.eventIndex)) : 0;

  if (!draftId && !eventId) {
    return NextResponse.json({ error: "draftId or eventId required" }, { status: 400 });
  }

  const supabase = requireServiceSupabase();

  if (body.action === "save") {
    try {
      await saveFocalWebAppState(supabase, {
        draftId,
        eventId,
        eventIndex,
        userId: user.userId,
        focal: { x: Number(body.focalX), y: Number(body.focalY) },
      });
      return NextResponse.json({ ok: true });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "save failed";
      return NextResponse.json({ error: msg }, { status: 400 });
    }
  }

  const state = await loadFocalWebAppState(supabase, { draftId, eventId, eventIndex, userId: user.userId });
  if (!state) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(state);
}

export async function GET(req: Request) {
  const user = await authorize(req);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const draftId = url.searchParams.get("draftId")?.trim() || undefined;
  const eventId = url.searchParams.get("eventId")?.trim() || undefined;
  const eventIndex = Number(url.searchParams.get("eventIndex") ?? "0");

  if (!draftId && !eventId) {
    return NextResponse.json({ error: "draftId or eventId required" }, { status: 400 });
  }

  const supabase = requireServiceSupabase();
  const state = await loadFocalWebAppState(supabase, {
    draftId,
    eventId,
    eventIndex: Number.isFinite(eventIndex) ? Math.max(0, eventIndex) : 0,
    userId: user.userId,
  });
  if (!state) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(state);
}
