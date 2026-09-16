import { NextResponse } from "next/server";
import { requireServiceSupabase } from "@/lib/supabase/admin";
import { loadSeatMap } from "@/lib/seating/server";
export const dynamic = "force-dynamic";
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const db = requireServiceSupabase();
  const { data: event } = await db.from("events").select("id").eq("slug", slug).in("visibility", ["published", "unlisted"]).maybeSingle();
  if (!event) return NextResponse.json({ error: "not_found" }, { status: 404 });
  try { return NextResponse.json({ map: await loadSeatMap(event.id) }, { headers: { "Cache-Control": "no-store" } }); }
  catch { return NextResponse.json({ error: "unavailable" }, { status: 503 }); }
}
