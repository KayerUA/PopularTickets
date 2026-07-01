import { getPublicAppUrl } from "@/lib/publicAppUrl";

export function telegramFocalWebAppUrl(opts: {
  draftId?: string;
  eventId?: string;
  eventIndex?: number;
}): string {
  const base = getPublicAppUrl()?.replace(/\/$/, "") ?? "https://www.populartickets.pl";
  const url = new URL(`${base}/telegram/focal`);
  if (opts.draftId) url.searchParams.set("draft", opts.draftId);
  if (opts.eventId) url.searchParams.set("event", opts.eventId);
  if (opts.eventIndex != null && opts.eventIndex > 0) {
    url.searchParams.set("i", String(opts.eventIndex));
  }
  return url.toString();
}
