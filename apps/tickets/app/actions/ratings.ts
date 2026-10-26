"use server";

import { z } from "zod";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/adminGuard";
import { requireServiceSupabase } from "@/lib/supabase/admin";
import { eventRatingOrderId } from "@/lib/ratings/server";
import { ratingText } from "@/lib/ratings/i18n";
import { normalizeBuyerEmail } from "@/lib/ratings/audience";
import { sendPendingRatingInvites, sendRatingInviteEmail } from "@/lib/ratings/sendInvite";
import { notifyTelegramAboutEventRating } from "@/lib/ratings/notifyTelegram";
import { shortRatingEventTitle } from "@/lib/ratings/offer";
import { rateLimit, clientIp } from "@/lib/security";
import type { AppLocale } from "@/i18n/routing";

function isMissingRatingsTable(message: string | undefined): boolean {
  const m = (message ?? "").toLowerCase();
  return m.includes("event_ratings") || m.includes("schema cache") || m.includes("rating_invited_at") || m.includes("buyer_email");
}

export async function submitEventRating(input: {
  token: string;
  score: number;
  comment?: string;
  locale: AppLocale;
}) {
  const locale = z.enum(["pl", "ru", "uk"]).parse(input.locale);
  const t = ratingText[locale];
  if (!(await rateLimit(`event-rating:${clientIp(await headers())}`, 20, 60_000))) {
    return { error: t.unavailable };
  }
  const score = z.number().int().min(1).max(5).safeParse(input.score);
  if (!score.success) return { error: t.choose };
  const comment = z.string().trim().max(1000).optional().parse(input.comment || undefined) || null;
  const orderId = await eventRatingOrderId(input.token);
  if (!orderId) return { error: t.invalid };

  const db = requireServiceSupabase();
  const { data: order, error: oe } = await db
    .from("orders")
    .select("id,event_id,status,email")
    .eq("id", orderId)
    .maybeSingle();
  if (oe || !order || order.status !== "paid") return { error: t.invalid };
  const buyerEmail = normalizeBuyerEmail(order.email);
  if (!buyerEmail.includes("@")) return { error: t.invalid };

  const { data: event, error: ee } = await db.from("events").select("id,title,starts_at").eq("id", order.event_id).single();
  if (ee || !event) return { error: t.unavailable };
  if (Date.parse(event.starts_at) > Date.now()) return { error: t.tooEarly };

  const { data: existing } = await db
    .from("event_ratings")
    .select("score")
    .eq("event_id", order.event_id)
    .ilike("buyer_email", buyerEmail)
    .maybeSingle();
  if (existing) return { saved: true, already: true };

  const { error: insertError } = await db.from("event_ratings").insert({
    order_id: orderId,
    event_id: order.event_id,
    buyer_email: buyerEmail,
    score: score.data,
    comment,
  });
  if (insertError) {
    if (insertError.code === "23505") return { saved: true, already: true };
    console.error("event rating insert", insertError);
    return { error: t.unavailable };
  }
  void notifyTelegramAboutEventRating({
    eventTitle: shortRatingEventTitle(event.title),
    score: score.data,
    comment,
    buyerEmail,
    locale,
  });
  revalidatePath("/admin/ratings");
  return { saved: true, already: false };
}

export async function inviteEventRating(form: FormData) {
  await requireAdmin();
  await sendRatingInviteEmail(requireServiceSupabase(), z.string().uuid().parse(form.get("orderId")));
  revalidatePath("/admin/ratings");
}

export async function inviteEventRatingsForEvent(form: FormData) {
  await requireAdmin();
  const eventId = z.string().uuid().parse(form.get("eventId"));
  const db = requireServiceSupabase();
  const { data: orders, error } = await db
    .from("orders")
    .select("id,email,event_id,status,marketing_email_opt_in,created_at,rating_invited_at")
    .eq("event_id", eventId);
  if (error) {
    throw new Error(
      isMissingRatingsTable(error.message)
        ? "Выполните supabase/add-event-ratings.sql в SQL Editor и Reload schema cache."
        : "Не удалось загрузить заказы",
    );
  }
  const emails = [...new Set((orders ?? []).map((row) => normalizeBuyerEmail(row.email)).filter((email) => email.includes("@")))];
  const result = await sendPendingRatingInvites(db, { emails });
  revalidatePath("/admin/ratings");
  if (!result.sent && result.failures.length) throw new Error(result.failures[0]);
  if (!result.sent) throw new Error("Некому отправлять: без галочки на рассылку все уже оценили или список пуст");
}
