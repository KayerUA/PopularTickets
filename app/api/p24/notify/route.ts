import { NextRequest, NextResponse } from "next/server";
import { handleP24Notification } from "@/lib/fulfillment";
import { clientIp, rateLimit } from "@/lib/security";

export async function POST(req: NextRequest) {
  const ip = clientIp(req.headers);
  if (!(await rateLimit(`p24:${ip}`, 120, 60_000))) {
    return new NextResponse("rate limited", { status: 429 });
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return new NextResponse("bad json", { status: 400 });
  }

  const result = await handleP24Notification(json);
  return new NextResponse(result.body, { status: result.status });
}
