"use server";

import { headers } from "next/headers";
import { getServiceSupabase } from "@/lib/supabase/admin";
import { rateLimit, clientIp, timingSafeEqualString } from "@/lib/security";

function checkinToken(): string | undefined {
  return process.env.CHECKIN_OPERATOR_TOKEN;
}

function verifyCheckinToken(token: string | undefined): boolean {
  const expected = checkinToken();
  if (!expected) return true;
  if (!token) return false;
  if (token.length !== expected.length) return false;
  return timingSafeEqualString(token, expected);
}

export type CheckinLookup =
  | { status: "idle" }
  | { status: "unconfigured" }
  | { status: "invalid" }
  | { status: "valid"; ticketId: string; ticketNumber: string; eventTitle: string; used: boolean }
  | { status: "rate_limited" };

export async function lookupTicketAction(
  _prev: CheckinLookup,
  formData: FormData
): Promise<CheckinLookup> {
  const h = await headers();
  const ip = clientIp(h);
  if (!rateLimit(`checkin-lookup:${ip}`, 120, 60_000)) {
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
  const h = await headers();
  const ip = clientIp(h);
  if (!rateLimit(`checkin-mark:${ip}`, 200, 60_000)) {
    return { ok: false, error: "Слишком много запросов" };
  }

  const token = String(formData.get("operatorToken") || "");
  if (!verifyCheckinToken(token)) {
    return { ok: false, error: "Неверный код контролёра" };
  }

  const ticketId = String(formData.get("ticketId") || "").trim();
  if (!ticketId) return { ok: false, error: "Нет билета" };

  const supabase = getServiceSupabase();
  if (!supabase) return { ok: false, error: "База не настроена (.env.local)" };

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
