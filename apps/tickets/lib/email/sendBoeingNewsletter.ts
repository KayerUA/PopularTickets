import type { SupabaseClient } from "@supabase/supabase-js";
import { RATING_BOEING_OFFER_SLUG, formatOfferZloty, newsletterOfferHref, shortOfferVenue } from "@/lib/ratings/offer";
import { marketingOptInEmails, normalizeBuyerEmail } from "@/lib/ratings/audience";
import {
  BOEING_NEWSLETTER_CAMPAIGN,
  campaignAlreadySent,
  recordCampaignSend,
} from "@/lib/campaigns";
import {
  newsletterBoeingEmailHtml,
  newsletterBoeingEmailSubject,
  newsletterBoeingEmailText,
} from "@/lib/email/newsletterBoeingEmail";
import { formatEventDateTime } from "@/lib/format";
import { getPublicAppUrl } from "@/lib/publicAppUrl";
import type { AppLocale } from "@/i18n/routing";

function orderLocale(raw: string | null | undefined): AppLocale {
  return raw === "uk" || raw === "ru" || raw === "pl" ? raw : "pl";
}

function fromEmail() {
  return process.env.RESEND_FROM_EMAIL?.trim() || "PopularTickets <noreply@populartickets.pl>";
}

export async function sendBoeingNewsletterCampaign(db: SupabaseClient) {
  const [{ data: orders, error: oe }, { data: event, error: ee }] = await Promise.all([
    db.from("orders").select("id,email,locale,status,marketing_email_opt_in,event_id,created_at"),
    db
      .from("events")
      .select("id,slug,title,venue,starts_at,price_grosze,image_url")
      .eq("slug", RATING_BOEING_OFFER_SLUG)
      .maybeSingle(),
  ]);
  if (oe) throw new Error("Не удалось загрузить заказы");
  if (ee || !event) throw new Error("Событие «Боинг-Боинг» не найдено");
  if (!process.env.RESEND_API_KEY) throw new Error("Email не настроен");

  const base = getPublicAppUrl() || "https://www.populartickets.pl";
  const paid = (orders ?? []).filter((row) => row.status === "paid");
  const opted = marketingOptInEmails(paid);
  const alreadyBought = new Set(
    paid.filter((row) => row.event_id === event.id).map((row) => normalizeBuyerEmail(row.email)),
  );

  const byEmail = new Map<string, (typeof paid)[number]>();
  for (const row of paid) {
    const email = normalizeBuyerEmail(row.email);
    if (!opted.has(email) || alreadyBought.has(email)) continue;
    const prev = byEmail.get(email);
    if (!prev || Date.parse(row.created_at ?? "") > Date.parse(prev.created_at ?? "")) {
      byEmail.set(email, row);
    }
  }

  const { Resend } = await import("resend");
  const resend = new Resend(process.env.RESEND_API_KEY);
  let sent = 0;
  let skipped = 0;
  const failures: string[] = [];

  for (const [email, row] of byEmail) {
    if (await campaignAlreadySent(db, BOEING_NEWSLETTER_CAMPAIGN, email)) {
      skipped += 1;
      continue;
    }
    const locale = orderLocale(row.locale);
    const payload = {
      locale,
      whenLabel: formatEventDateTime(event.starts_at, locale),
      venue: shortOfferVenue(event.venue),
      priceLabel: formatOfferZloty(7_000),
      regularPriceLabel: formatOfferZloty(event.price_grosze),
      imageUrl: event.image_url ?? "",
      url: `${base.replace(/\/$/, "")}/${locale}${newsletterOfferHref(event.slug)}`,
    };
    const { error } = await resend.emails.send(
      {
        from: fromEmail(),
        to: row.email,
        subject: newsletterBoeingEmailSubject(locale),
        text: newsletterBoeingEmailText(payload),
        html: newsletterBoeingEmailHtml(payload),
      },
      { idempotencyKey: `${BOEING_NEWSLETTER_CAMPAIGN}-${email}-${new Date().toISOString().slice(0, 10)}` },
    );
    if (error) {
      failures.push(`${email}: ${error.message}`);
      continue;
    }
    await recordCampaignSend(db, BOEING_NEWSLETTER_CAMPAIGN, email, { locale });
    sent += 1;
    await new Promise((resolve) => setTimeout(resolve, 350));
  }

  return { sent, skipped, failures, considered: byEmail.size };
}
