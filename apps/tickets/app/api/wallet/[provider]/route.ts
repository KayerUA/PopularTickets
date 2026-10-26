import { getServiceSupabase } from "@/lib/supabase/admin";
import { clientIp, rateLimit } from "@/lib/security";
import { isAppleWalletConfigured, generateAppleWalletPass } from "@/lib/wallet/apple";
import { isGoogleWalletConfigured, generateGoogleWalletSaveUrl } from "@/lib/wallet/google";
import { loadWalletTicket } from "@/lib/wallet/loadTicket";
import { verifyWalletTicketToken } from "@/lib/wallet/token";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const privateHeaders = {
  "Cache-Control": "private, no-store, max-age=0",
  "Referrer-Policy": "no-referrer",
  "X-Robots-Tag": "noindex, nofollow, noarchive",
  "X-Content-Type-Options": "nosniff",
};

function errorResponse(message: string, status: number) {
  return Response.json({ error: message }, { status, headers: privateHeaders });
}

export async function GET(request: Request, context: { params: Promise<{ provider: string }> }) {
  const { provider } = await context.params;
  if (provider !== "apple" && provider !== "google") return errorResponse("Not found", 404);
  try {
    if (!(await rateLimit(`wallet:${clientIp(request.headers)}`, 30, 60_000))) {
      return errorResponse("Too many requests. Please try again shortly.", 429);
    }
    const token = new URL(request.url).searchParams.get("token") ?? "";
    const claim = await verifyWalletTicketToken(token);
    if (!claim) return errorResponse("This ticket link is invalid or expired.", 401);
    const configured = provider === "apple" ? isAppleWalletConfigured() : isGoogleWalletConfigured();
    if (!configured) return errorResponse("This wallet is not available yet.", 503);
    const supabase = getServiceSupabase();
    if (!supabase) return errorResponse("Tickets are temporarily unavailable.", 503);
    const ticket = await loadWalletTicket(supabase, claim.ticketId, claim.locale);
    if (!ticket) return errorResponse("This ticket is unavailable or has already been used.", 404);
    if (provider === "google") {
      const url = await generateGoogleWalletSaveUrl(ticket);
      return new Response(null, { status: 302, headers: { ...privateHeaders, Location: url } });
    }
    const pass = await generateAppleWalletPass(ticket);
    const filename = ticket.ticketNumber.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 64) || "ticket";
    return new Response(new Uint8Array(pass), {
      headers: {
        ...privateHeaders,
        "Content-Type": "application/vnd.apple.pkpass",
        "Content-Disposition": `attachment; filename="${filename}.pkpass"`,
      },
    });
  } catch {
    console.error("[wallet] Pass generation failed", { provider });
    return errorResponse("Unable to prepare this ticket. Please try again later.", 503);
  }
}
