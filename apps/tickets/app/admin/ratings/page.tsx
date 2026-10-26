import { SeatingAdminForm } from "@/components/SeatingAdminForm";
import { CopyTextButton } from "@/components/CopyTextButton";
import { requireAdmin } from "@/lib/adminGuard";
import { requireServiceSupabase } from "@/lib/supabase/admin";
import { eventRatingLink, isEventRatingSigningConfigured } from "@/lib/ratings/server";
import { inviteEventRating, inviteEventRatingsForEvent } from "@/app/actions/ratings";
import { canonicalRatingTargets, marketingOptInEmails, normalizeBuyerEmail } from "@/lib/ratings/audience";
import { formatPlDateTime } from "@/lib/format";
import type { AppLocale } from "@/i18n/routing";

function localeOf(raw: string | null | undefined): AppLocale {
  return raw === "ru" || raw === "uk" ? raw : "pl";
}

export default async function AdminRatings({
  searchParams,
}: {
  searchParams: Promise<{ event?: string }>;
}) {
  await requireAdmin();
  const { event: eventId } = await searchParams;
  const db = requireServiceSupabase();
  const { data: events, error: ee } = await db
    .from("events")
    .select("id,title,starts_at,venue")
    .order("starts_at", { ascending: false });
  if (ee) throw new Error("Не удалось загрузить события");
  const event = events?.find((e) => e.id === eventId);
  const signingOk = isEventRatingSigningConfigured();
  const eventStarted = event ? Date.parse(event.starts_at) <= Date.now() : false;

  const { data: orders, error: oe } = event
    ? await db
        .from("orders")
        .select("id,buyer_name,email,phone,quantity,locale,rating_invited_at,created_at,status,marketing_email_opt_in,event_id")
        .eq("event_id", event.id)
        .order("created_at")
    : { data: null, error: null };
  if (oe) {
    throw new Error(
      /rating_invited_at|schema cache/i.test(oe.message)
        ? "Выполните supabase/add-event-ratings.sql в SQL Editor, затем Reload schema cache."
        : "Не удалось загрузить заказы",
    );
  }

  const { data: ratings, error: re } = event
    ? await db.from("event_ratings").select("order_id,buyer_email,score,comment,created_at").eq("event_id", event.id)
    : { data: null, error: null };
  if (re) {
    throw new Error(
      /event_ratings|schema cache/i.test(re.message)
        ? "Выполните supabase/add-event-ratings.sql в SQL Editor, затем Reload schema cache."
        : "Не удалось загрузить оценки",
    );
  }

  const paid = (orders ?? []).filter((o) => o.status === "paid");
  const newsletter = marketingOptInEmails(paid);
  const targets = canonicalRatingTargets(paid);
  const ratingByEmail = new Map((ratings ?? []).map((r) => [normalizeBuyerEmail(r.buyer_email), r]));
  const scored = ratings ?? [];
  const avg = scored.length ? scored.reduce((sum, r) => sum + r.score, 0) / scored.length : 0;
  const unrated = targets.filter((o) => !ratingByEmail.has(normalizeBuyerEmail(o.email))).length;
  const skippedNewsletter = new Set(
    paid.filter((o) => newsletter.has(normalizeBuyerEmail(o.email))).map((o) => normalizeBuyerEmail(o.email)),
  ).size;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-poet-gold-bright">Оценки мероприятий</h1>
      <p className="text-sm text-zinc-400">
        Письмо и ссылка только тем, кто <span className="text-zinc-200">не</span> ставил галочку на рассылку.
        Одна страница на человека на каждое купленное мероприятие. Кто согласился на новости — оценку не шлём.
      </p>
      {!signingOk ? (
        <p className="rounded-xl border border-amber-400/30 bg-amber-950/30 p-4 text-sm text-amber-200">
          Задайте EVENT_RATING_SECRET, SEAT_SELECTION_SECRET или ORDER_RECEIPT_SECRET (от 16 символов).
        </p>
      ) : null}
      <form className="flex flex-wrap gap-3">
        <select
          aria-label="Событие"
          name="event"
          defaultValue={eventId ?? ""}
          className="max-w-full rounded border border-zinc-700 bg-zinc-950 p-3 text-white"
        >
          <option value="">Выберите событие</option>
          {events?.map((e) => (
            <option key={e.id} value={e.id}>
              {e.title} · {formatPlDateTime(e.starts_at)}
            </option>
          ))}
        </select>
        <button className="btn-poet px-4">Показать</button>
      </form>
      {event ? (
        <>
          <div className="flex flex-wrap items-baseline gap-4 text-zinc-300">
            <p>
              Страниц оценки: <span className="text-white">{targets.length}</span>
            </p>
            <p>
              Оценок: <span className="text-white">{scored.length}</span>
            </p>
            <p>
              Средняя:{" "}
              <span className="text-poet-gold-bright">{scored.length ? avg.toFixed(1) : "—"}</span>
            </p>
            <p>Без оценки: {unrated}</p>
            <p className="text-zinc-500">Пропущены из‑за рассылки: {skippedNewsletter}</p>
          </div>
          {unrated > 0 && signingOk && eventStarted ? (
            <SeatingAdminForm action={inviteEventRatingsForEvent} className="space-y-2">
              <input type="hidden" name="eventId" value={event.id} />
              <button className="btn-poet px-4 py-2">Отправить письмо всем без оценки ({unrated})</button>
            </SeatingAdminForm>
          ) : null}
          {!eventStarted ? (
            <p className="text-sm text-amber-200">Письмо можно отправить после начала события. Ссылку уже можно скопировать и проверить.</p>
          ) : null}
          <div className="space-y-3">
            {await Promise.all(
              targets.map(async (o) => {
                const rating = ratingByEmail.get(normalizeBuyerEmail(o.email));
                const locale = localeOf(o.locale);
                const url = signingOk ? await eventRatingLink(o.id, locale) : null;
                return (
                  <div key={o.id} className="space-y-2 rounded-xl border border-zinc-800 p-4 text-sm text-zinc-300">
                    <p>
                      {o.buyer_name} · {o.email} · {o.quantity} бил.
                    </p>
                    {rating ? (
                      <p className="text-poet-gold-bright">
                        {rating.score}/5
                        {rating.comment ? ` — ${rating.comment}` : ""}
                      </p>
                    ) : (
                      <p className="text-zinc-500">Ещё не оценил</p>
                    )}
                    {url && !rating ? (
                      <div className="flex flex-wrap items-center gap-4">
                        <CopyTextButton text={url} label="Копировать ссылку" copiedLabel="Скопировано" />
                        {eventStarted ? (
                          <SeatingAdminForm action={inviteEventRating}>
                            <input type="hidden" name="orderId" value={o.id} />
                            <button className="text-poet-gold underline">
                              {o.rating_invited_at ? "Отправить письмо повторно" : "Отправить письмо"}
                            </button>
                          </SeatingAdminForm>
                        ) : null}
                        {o.rating_invited_at ? (
                          <span className="text-zinc-500">Отправлено {formatPlDateTime(o.rating_invited_at)}</span>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                );
              }),
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}
