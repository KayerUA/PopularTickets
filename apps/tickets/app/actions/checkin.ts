"use server";

import { cookies } from "next/headers";
import { getServiceSupabase } from "@/lib/supabase/admin";
import {
  CHECKIN_SESSION_COOKIE,
  checkinAuthRequired,
  verifyCheckinSessionToken,
} from "@/lib/checkinSession";
import { rateLimit, clientIp } from "@/lib/security";
import { headers } from "next/headers";

async function assertCheckinAuthorized(): Promise<boolean> {
  if (!checkinAuthRequired()) return true;
  const token = (await cookies()).get(CHECKIN_SESSION_COOKIE)?.value;
  return verifyCheckinSessionToken(token);
}

export type CheckinLookup =
  | { status: "idle" }
  | { status: "unauthorized" }
  | { status: "unconfigured" }
  | { status: "invalid" }
  | { status: "valid"; ticketId: string; ticketNumber: string; eventTitle: string; used: boolean }
  | { status: "rate_limited" };

export async function lookupTicketAction(
  _prev: CheckinLookup,
  formData: FormData,
): Promise<CheckinLookup> {
  if (!(await assertCheckinAuthorized())) {
    return { status: "unauthorized" };
  }

  const h = await headers();
  const ip = clientIp(h);
  if (!(await rateLimit(`checkin-lookup:${ip}`, 120, 60_000))) {
    return { status: "rate_limited" };
  }

  const raw = String(formData.get("code") || "").trim();
  if (!raw) return { status: "invalid" };

  const supabase = getServiceSupabase();
  if (!supabase) return { status: "unconfigured" };

  const { data: ticket, error } = await supabase
    .from("tickets")
    .select("id,ticket_number,used_at,event_id")
    .eq("id", raw)
    .maybeSingle();

  if (error || !ticket) return { status: "invalid" };

  const { data: ev } = await supabase.from("events").select("title").eq("id", ticket.event_id).single();

  const eventTitle = ev?.title ?? "";

  return {
    status: "valid",
    ticketId: ticket.id,
    ticketNumber: ticket.ticket_number,
    eventTitle,
    used: Boolean(ticket.used_at),
  };
}

export async function markTicketUsedAction(formData: FormData): Promise<{ ok: boolean; error?: string }> {
  if (!(await assertCheckinAuthorized())) {
    return { ok: false, error: "Сессия истекла — войдите снова с кодом контролёра" };
  }

  const h = await headers();
  const ip = clientIp(h);
  if (!(await rateLimit(`checkin-mark:${ip}`, 200, 60_000))) {
    return { ok: false, error: "Слишком много запросов" };
  }

  const ticketId = String(formData.get("ticketId") || "").trim();
  if (!ticketId) return { ok: false, error: "Нет билета" };

  const supabase = getServiceSupabase();
  if (!supabase) return { ok: false, error: "База не настроена" };

  const { data: ticket, error: tErr } = await supabase
    .from("tickets")
    .select("id,used_at")
    .eq("id", ticketId)
    .maybeSingle();

  if (tErr || !ticket) return { ok: false, error: "Билет не найден" };
  if (ticket.used_at) return { ok: false, error: "Уже использован" };

  const { error: uErr } = await supabase.from("tickets").update({ used_at: new Date().toISOString() }).eq("id", ticketId);
  if (uErr) return { ok: false, error: uErr.message };

  const { error: cErr } = await supabase.from("checkins").insert({
    ticket_id: ticketId,
    source_ip: ip,
  });
  if (cErr) console.error(cErr);

  return { ok: true };
}
