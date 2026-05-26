import { getGoogleGbpConfig } from "@/lib/googleBusinessProfile/config";
import { getGoogleGbpAccessToken } from "@/lib/googleBusinessProfile/oauth";
import { gbpScheduleFromIso } from "@/lib/googleBusinessProfile/warsawSchedule";

export type CreateGbpEventInput = {
  title: string;
  description: string;
  startsAtIso: string;
  ticketUrl: string;
  imageUrl?: string | null;
};

export type CreateGbpEventResult =
  | { ok: true; searchUrl?: string; name?: string }
  | { ok: false; error: string; status?: number };

function summaryText(title: string, description: string): string {
  const base = `${title.trim()}. ${description.replace(/\s+/g, " ").trim()}`.trim();
  return base.slice(0, 1500);
}

/**
 * Создаёт LocalPost topicType=EVENT в Google Business Profile.
 * Документация: https://developers.google.com/my-business/content/posts-data
 */
export async function createGoogleBusinessProfileEventPost(input: CreateGbpEventInput): Promise<CreateGbpEventResult> {
  const cfg = getGoogleGbpConfig();
  if (!cfg) return { ok: false, error: "not_configured" };

  const schedule = gbpScheduleFromIso(input.startsAtIso);
  if (!schedule) return { ok: false, error: "invalid_starts_at" };

  let accessToken: string;
  try {
    accessToken = await getGoogleGbpAccessToken();
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "oauth_failed" };
  }

  const parent = `accounts/${cfg.accountId}/locations/${cfg.locationId}`;
  const body: Record<string, unknown> = {
    languageCode: cfg.languageCode,
    summary: summaryText(input.title, input.description),
    topicType: "EVENT",
    event: {
      title: input.title.trim().slice(0, 200),
      schedule,
    },
    callToAction: {
      actionType: "BOOK",
      url: input.ticketUrl,
    },
  };

  const image = input.imageUrl?.trim();
  if (image?.startsWith("https://")) {
    body.media = [{ mediaFormat: "PHOTO", sourceUrl: image }];
  }

  try {
    const res = await fetch(`https://mybusiness.googleapis.com/v4/${parent}/localPosts`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const json = (await res.json()) as { searchUrl?: string; name?: string; error?: { message?: string } };
    if (!res.ok) {
      const msg = json.error?.message ?? `GBP API ${res.status}`;
      console.warn("[gbp] create localPost failed:", res.status, msg);
      return { ok: false, error: msg, status: res.status };
    }

    return { ok: true, searchUrl: json.searchUrl, name: json.name };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "network_error";
    console.warn("[gbp] create localPost:", msg);
    return { ok: false, error: msg };
  }
}
