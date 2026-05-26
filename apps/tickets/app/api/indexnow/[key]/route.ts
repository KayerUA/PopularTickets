import { NextResponse } from "next/server";

/** IndexNow key file: https://www.populartickets.pl/{INDEXNOW_KEY}.txt (rewrite в next.config). */
export async function GET(_req: Request, ctx: { params: Promise<{ key: string }> }) {
  const { key } = await ctx.params;
  const expected = process.env.INDEXNOW_KEY?.trim();
  if (!expected || key !== expected) {
    return new NextResponse("Not Found", { status: 404 });
  }
  return new NextResponse(expected, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
