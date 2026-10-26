import { NextRequest, NextResponse } from "next/server";
import { requireServiceSupabase } from "@/lib/supabase/admin";
import { sendRatingFollowupAfterNewsletter } from "@/lib/ratings/followup";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  return Boolean(secret && req.headers.get("authorization") === `Bearer ${secret}`);
}

/** Через ~сутки после рекламной рассылки: оценка тем, кто подписан, но билет на Boeing не купил. */
export async function GET(req: NextRequest): Promise<NextResponse> {
  if (!isAuthorized(req)) return new NextResponse("not found", { status: 404 });
  try {
    const result = await sendRatingFollowupAfterNewsletter(requireServiceSupabase());
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error("[rating followup]", error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
