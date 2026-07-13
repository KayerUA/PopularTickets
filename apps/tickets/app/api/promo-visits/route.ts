import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import { requireServiceSupabase } from "@/lib/supabase/admin";
import { clientIp, rateLimit } from "@/lib/security";

const VisitSchema = z.object({ promoCodeId: z.string().uuid(), eventId: z.string().uuid() });

export async function POST(req: NextRequest) {
  if (!(await rateLimit(`promo-visit:${clientIp(req.headers)}`, 30, 60_000))) {
    return new NextResponse(null, { status: 204 });
  }
  const parsed = VisitSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return new NextResponse(null, { status: 400 });
  const { error } = await requireServiceSupabase().from("promo_code_visits").insert({
    promo_code_id: parsed.data.promoCodeId,
    event_id: parsed.data.eventId,
  });
  return new NextResponse(null, { status: error ? 204 : 201 });
}
