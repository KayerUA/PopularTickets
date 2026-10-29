import { NextRequest, NextResponse } from "next/server";
import { syncSearchConsole } from "@/lib/searchConsole/sync";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return new NextResponse("not found", { status: 404 });
  }
  const result = await syncSearchConsole({ inspect: true });
  return NextResponse.json(result, { status: result.status === "failed" ? 503 : 200 });
}
