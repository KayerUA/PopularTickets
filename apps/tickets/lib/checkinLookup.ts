const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const TICKET_NUM_RE = /^TKT-[A-Z0-9-]+$/i;

export type CheckinQueryKind = "uuid" | "ticket_number" | "email" | "phone" | "unknown";

export function classifyCheckinQuery(raw: string): CheckinQueryKind {
  const t = raw.trim();
  if (!t) return "unknown";
  if (UUID_RE.test(t)) return "uuid";
  if (TICKET_NUM_RE.test(t)) return "ticket_number";
  if (t.includes("@")) return "email";
  const digits = t.replace(/\D/g, "");
  if (digits.length >= 7) return "phone";
  return "unknown";
}

export function normalizePhoneDigits(raw: string): string {
  return raw.replace(/\D/g, "");
}

export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}
