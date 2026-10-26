export type RatingOrder = {
  id: string;
  email: string;
  event_id: string;
  status: string;
  marketing_email_opt_in?: boolean | null;
  created_at?: string;
  rating_invited_at?: string | null;
};

export function normalizeBuyerEmail(email: string | null | undefined): string {
  return String(email ?? "").trim().toLowerCase();
}

/** Emails that ever agreed to the newsletter — rating invites must not go to them. */
export function marketingOptInEmails(orders: RatingOrder[]): Set<string> {
  const emails = new Set<string>();
  for (const order of orders) {
    if (!order.marketing_email_opt_in) continue;
    const email = normalizeBuyerEmail(order.email);
    if (email.includes("@")) emails.add(email);
  }
  return emails;
}

/**
 * One paid order per buyer per event.
 * By default skips anyone who ever opted into marketing (rating invites).
 */
export function canonicalRatingTargets<T extends RatingOrder>(
  orders: T[],
  opts?: { includeMarketingOptIn?: boolean },
): T[] {
  const optedIn = opts?.includeMarketingOptIn ? new Set<string>() : marketingOptInEmails(orders);
  const byPair = new Map<string, T>();
  for (const order of orders) {
    if (order.status !== "paid") continue;
    const email = normalizeBuyerEmail(order.email);
    if (!email.includes("@") || optedIn.has(email)) continue;
    const key = `${email}\0${order.event_id}`;
    const prev = byPair.get(key);
    if (!prev || Date.parse(order.created_at ?? "") > Date.parse(prev.created_at ?? "")) {
      byPair.set(key, order);
    }
  }
  return [...byPair.values()];
}

/** Одна пачка заказов на человека: несколько мероприятий — одно письмо с несколькими кнопками. */
export function groupRatingTargetsByEmail<T extends RatingOrder>(
  orders: T[],
  opts?: { includeMarketingOptIn?: boolean },
): T[][] {
  const byEmail = new Map<string, T[]>();
  for (const order of canonicalRatingTargets(orders, opts)) {
    const email = normalizeBuyerEmail(order.email);
    const list = byEmail.get(email) ?? [];
    list.push(order);
    byEmail.set(email, list);
  }
  return [...byEmail.values()];
}
