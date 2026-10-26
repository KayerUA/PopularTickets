import type { SupabaseClient } from "@supabase/supabase-js";
import { eventRatingToken, isEventRatingSigningConfigured } from "@/lib/ratings/tokens";
import { getPublicAppUrl } from "@/lib/publicAppUrl";
import { canonicalRatingTargets, groupRatingTargetsByEmail, normalizeBuyerEmail } from "@/lib/ratings/audience";
import { shortRatingEventTitle } from "@/lib/ratings/offer";
import { resolveEventCopy } from "@/lib/contentI18n";
import { formatEventDateTime } from "@/lib/format";
import type { AppLocale } from "@/i18n/routing";
import { ratingInviteEmailHtml, ratingInviteEmailSubject, ratingInviteEmailText } from "@/lib/email/ratingInviteEmail";

function orderLocale(raw: string | null | undefined): AppLocale {
  return raw === "uk" || raw === "ru" || raw === "pl" ? raw : "pl";
}

async function eventRatingLink(orderId: string, locale: AppLocale) {
  const base = getPublicAppUrl();
  if (!base) throw new Error("NEXT_PUBLIC_APP_URL не задан");
  return `${base}/${locale}/rate/${await eventRatingToken(orderId)}`;
}

function fromEmail() {
  return process.env.RESEND_FROM_EMAIL?.trim() || "PopularTickets <noreply@populartickets.pl>";
}

export type SendRatingInviteOptions = {
  allowMarketingOptIn?: boolean;
};

async function loadPaidOrders(db: SupabaseClient) {
  const { data, error } = await db
    .from("orders")
    .select("id,email,locale,event_id,status,marketing_email_opt_in,created_at,rating_invited_at");
  if (error) throw new Error("Не удалось загрузить заказы");
  return data ?? [];
}

export async function sendRatingInviteEmail(
  db: SupabaseClient,
  orderId: string,
  opts: SendRatingInviteOptions = {},
) {
  if (!isEventRatingSigningConfigured()) throw new Error("Не задан секрет для ссылок оценки");
  if (!process.env.RESEND_API_KEY) throw new Error("Email не настроен");

  const { data: order, error } = await db
    .from("orders")
    .select("id,email,locale,event_id,status,marketing_email_opt_in,created_at")
    .eq("id", orderId)
    .single();
  if (error || !order || order.status !== "paid") throw new Error("Нет оплаченного заказа");

  const email = normalizeBuyerEmail(order.email);
  const { data: siblingOrders, error: se } = await db
    .from("orders")
    .select("id,email,event_id,status,marketing_email_opt_in,created_at")
    .ilike("email", email);
  if (se) throw new Error("Не удалось загрузить заказы");

  const targets = canonicalRatingTargets(siblingOrders ?? [], {
    includeMarketingOptIn: opts.allowMarketingOptIn,
  }).filter((row) => row.event_id);
  if (!opts.allowMarketingOptIn && !targets.some((row) => row.id === orderId && row.event_id === order.event_id)) {
    throw new Error("Этому покупателю оценку не отправляем: есть согласие на рассылку или это не канонический заказ");
  }

  const eventIds = [...new Set(targets.map((row) => row.event_id))];
  if (!eventIds.length) throw new Error("Нечего отправлять: прошедших неоценённых мероприятий нет");

  const [{ data: events, error: ee }, { data: ratings, error: re }] = await Promise.all([
    db.from("events").select("id,title,title_pl,title_uk,starts_at").in("id", eventIds),
    db.from("event_ratings").select("event_id").in("event_id", eventIds).ilike("buyer_email", email),
  ]);
  if (ee || re) throw new Error("Не удалось загрузить события");

  const eventById = new Map((events ?? []).map((event) => [event.id, event]));
  const rated = new Set((ratings ?? []).map((row) => row.event_id));
  const now = Date.now();
  const pending = targets
    .map((row) => ({ order: row, event: eventById.get(row.event_id) }))
    .filter((row): row is { order: (typeof targets)[number]; event: NonNullable<(typeof events)[number]> } => {
      if (!row.event) return false;
      if (rated.has(row.order.event_id)) return false;
      return Date.parse(row.event.starts_at) <= now;
    })
    .sort((a, b) => Date.parse(a.event.starts_at) - Date.parse(b.event.starts_at));

  if (!pending.length) {
    const current = eventById.get(order.event_id);
    if (current && Date.parse(current.starts_at) > now) throw new Error("Оценку можно слать только после начала события");
    throw new Error("Нечего отправлять: прошедших неоценённых мероприятий нет");
  }

  const locale = orderLocale(order.locale);
  const inviteEvents = await Promise.all(
    pending.map(async (row) => ({
      title: shortRatingEventTitle(resolveEventCopy(row.event, locale)?.title ?? row.event.title),
      whenLabel: formatEventDateTime(row.event.starts_at, locale),
      url: await eventRatingLink(row.order.id, locale),
    })),
  );

  const { Resend } = await import("resend");
  const { error: sendError } = await new Resend(process.env.RESEND_API_KEY).emails.send(
    {
      from: fromEmail(),
      to: order.email,
      subject: ratingInviteEmailSubject({ locale, events: inviteEvents }),
      text: ratingInviteEmailText({ locale, events: inviteEvents }),
      html: ratingInviteEmailHtml({ locale, events: inviteEvents }),
    },
    {
      idempotencyKey: `rating-invite-${email}-${pending
        .map((row) => row.order.event_id)
        .sort()
        .join("-")}-${new Date().toISOString().slice(0, 10)}`,
    },
  );
  if (sendError) throw new Error("Не удалось отправить письмо");
  const { error: updateError } = await db
    .from("orders")
    .update({ rating_invited_at: new Date().toISOString() })
    .in(
      "id",
      pending.map((row) => row.order.id),
    );
  if (updateError) console.error("[rating invite] mark sent", updateError.message);
}

export async function sendPendingRatingInvites(
  db: SupabaseClient,
  opts: SendRatingInviteOptions & { emails?: string[]; skipInvited?: boolean } = {},
) {
  const orders = await loadPaidOrders(db);
  const groups = groupRatingTargetsByEmail(orders, { includeMarketingOptIn: opts.allowMarketingOptIn });
  const wanted = opts.emails ? new Set(opts.emails.map((email) => normalizeBuyerEmail(email))) : null;
  let sent = 0;
  let skipped = 0;
  const failures: string[] = [];
  for (const group of groups) {
    const email = normalizeBuyerEmail(group[0]?.email);
    if (wanted && !wanted.has(email)) continue;
    const pick = opts.skipInvited === false ? group[0] : group.find((row) => !row.rating_invited_at) ?? group[0];
    if (!pick) continue;
    if (opts.skipInvited !== false && group.every((row) => row.rating_invited_at)) {
      skipped += 1;
      continue;
    }
    try {
      await sendRatingInviteEmail(db, pick.id, opts);
      sent += 1;
      await new Promise((resolve) => setTimeout(resolve, 350));
    } catch (err) {
      skipped += 1;
      failures.push(`${email}: ${err instanceof Error ? err.message : "ошибка"}`);
    }
  }
  return { sent, skipped, failures };
}
