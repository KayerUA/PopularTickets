"use server";

import { cookies } from "next/headers";
import { headers } from "next/headers";
import { getServiceSupabase } from "@/lib/supabase/admin";
import {
  classifyCheckinQuery,
  normalizeEmail,
  normalizePhoneDigits,
} from "@/lib/checkinLookup";
import {
  CHECKIN_SESSION_COOKIE,
  checkinAuthRequired,
  verifyCheckinSessionToken,
} from "@/lib/checkinSession";
import { rateLimit, clientIp } from "@/lib/security";

async function assertCheckinAuthorized(): Promise<boolean> {
  if (!checkinAuthRequired()) return true;
  const token = (await cookies()).get(CHECKIN_SESSION_COOKIE)?.value;
  return verifyCheckinSessionToken(token);
}

export type CheckinTicketRow = {
  ticketId: string;
  ticketNumber: string;
  eventTitle: string;
  used: boolean;
  buyerName: string;
  email: string;
  phone: string | null;
};

export type CheckinLookup =
  | { status: "idle" }
  | { status: "unauthorized" }
  | { status: "unconfigured" }
  | { status: "invalid" }
  | { status: "valid"; ticketId: string; ticketNumber: string; eventTitle: string; used: boolean }
  | { status: "choices"; tickets: CheckinTicketRow[] }
  | { status: "rate_limited" };

type SupabaseClient = NonNullable<ReturnType<typeof getServiceSupabase>>;

async function eventTitleMap(supabase: SupabaseClient, eventIds: string[]): Promise<Map<string, string>> {
  const uniq = [...new Set(eventIds.filter(Boolean))];
  const map = new Map<string, string>();
  if (!uniq.length) return map;
  const { data } = await supabase.from("events").select("id,title").in("id", uniq);
  for (const ev of data ?? []) {
    map.set(ev.id as string, ev.title as string);
  }
  return map;
}

function toRows(
  orders: {
    buyer_name: string;
    email: string;
    phone: string | null;
    event_id: string;
    tickets: { id: string; ticket_number: string; used_at: string | null }[] | null;
  }[],
  titles: Map<string, string>,
): CheckinTicketRow[] {
  const out: CheckinTicketRow[] = [];
  for (const o of orders) {
    const eventTitle = titles.get(o.event_id) ?? "";
    for (const t of o.tickets ?? []) {
      out.push({
        ticketId: t.id,
        ticketNumber: t.ticket_number,
        eventTitle,
        used: Boolean(t.used_at),
        buyerName: o.buyer_name,
        email: o.email,
        phone: o.phone,
      });
    }
  }
  return out;
}

const ORDER_TICKETS_SELECT =
  "id,buyer_name,email,phone,event_id,tickets(id,ticket_number,used_at)" as const;

async function lookupByContact(supabase: SupabaseClient, raw: string, kind: "email" | "phone"): Promise<CheckinTicketRow[]> {
  if (kind === "email") {
    const email = normalizeEmail(raw);
    const { data, error } = await supabase
      .from("orders")
      .select(ORDER_TICKETS_SELECT)
      .eq("status", "paid")
      .ilike("email", email);
    if (error || !data?.length) return [];
    const titles = await eventTitleMap(
      supabase,
      data.map((o) => o.event_id as string),
    );
    return toRows(data, titles);
  }

  const digits = normalizePhoneDigits(raw);
  const needle = digits.length >= 9 ? digits.slice(-9) : digits;
  const { data, error } = await supabase
    .from("orders")
    .select(ORDER_TICKETS_SELECT)
    .eq("status", "paid")
    .not("phone", "is", null)
    .ilike("phone", `%${needle}%`);
  if (error || !data?.length) return [];
  const titles = await eventTitleMap(
    supabase,
    data.map((o) => o.event_id as string),
  );
  return toRows(data, titles);
}

async function lookupSingleTicket(
  supabase: SupabaseClient,
  ticket: { id: string; ticket_number: string; used_at: string | null; event_id: string },
): Promise<CheckinLookup> {
  const { data: ev } = await supabase.from("events").select("title").eq("id", ticket.event_id).single();
  return {
    status: "valid",
    ticketId: ticket.id,
    ticketNumber: ticket.ticket_number,
    eventTitle: ev?.title ?? "",
    used: Boolean(ticket.used_at),
  };
}

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

  const kind = classifyCheckinQuery(raw);

  if (kind === "email" || kind === "phone") {
    const rows = await lookupByContact(supabase, raw, kind);
    if (!rows.length) return { status: "invalid" };
    if (rows.length === 1) {
      const t = rows[0]!;
      return {
        status: "valid",
        ticketId: t.ticketId,
        ticketNumber: t.ticketNumber,
        eventTitle: t.eventTitle,
        used: t.used,
      };
    }
    return { status: "choices", tickets: rows };
  }

  if (kind === "ticket_number") {
    const { data: ticket, error } = await supabase
      .from("tickets")
      .select("id,ticket_number,used_at,event_id")
      .ilike("ticket_number", raw.trim())
      .maybeSingle();
    if (error || !ticket) return { status: "invalid" };
    return lookupSingleTicket(supabase, ticket);
  }

  if (kind === "uuid") {
    const { data: ticket, error } = await supabase
      .from("tickets")
      .select("id,ticket_number,used_at,event_id")
      .eq("id", raw)
      .maybeSingle();
    if (error || !ticket) return { status: "invalid" };
    return lookupSingleTicket(supabase, ticket);
  }

  return { status: "invalid" };
}

export async function markTicketUsedAction(formData: FormData): Promise<{ ok: boolean; error?: string }> {
  if (!(await assertCheckinAuthorized())) {
    return { ok: false, error: "Сессия истекла — войдите снова с паролем контролёра" };
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
