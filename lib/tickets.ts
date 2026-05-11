import crypto from "crypto";

export function randomTicketNumber(): string {
  const n = crypto.randomBytes(3).toString("hex").toUpperCase();
  return `TKT-${n}`;
}
