import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { routing } from "@/i18n/routing";
import { getServiceSupabase } from "@/lib/supabase/admin";
import { getSearchConsoleConfig, SearchConsoleClient, type GoogleIndexStatus } from "./client";
import { checkPublishedPage, sitemapEntries, sitemapFingerprint } from "./preflight";

export type InspectionReport = GoogleIndexStatus & {
  url: string;
  checkedAt: string;
  inspectionResultLink?: string;
  error?: string;
  needsAttention: boolean;
};

export type SearchConsoleSyncResult = {
  status: "submitted" | "unchanged" | "skipped" | "busy" | "failed";
  reason?: string;
  submittedAt?: string;
  report?: InspectionReport[];
};

type State = {
  sitemap_hash: string | null;
  submitted_at: string | null;
  inspection_report: InspectionReport[];
};

async function updateState(db: SupabaseClient, siteUrl: string, token: string, patch: Record<string, unknown>): Promise<void> {
  const result = await db.from("search_console_state").update(patch).eq("site_url", siteUrl).eq("lock_token", token);
  if (result.error) throw new Error(`gsc_state: ${result.error.message}`);
}

async function inBatches<T>(items: T[], work: (item: T) => Promise<void>): Promise<void> {
  for (let index = 0; index < items.length; index += 3) {
    await Promise.all(items.slice(index, index + 3).map((item) => work(item)));
  }
}

export async function syncSearchConsole(options: {
  inspect?: boolean;
  expectedUrls?: string[];
  db?: SupabaseClient;
} = {}): Promise<SearchConsoleSyncResult> {
  let db: SupabaseClient | null = null;
  let siteUrl: string | undefined;
  let lockToken: string | undefined;
  try {
    const config = getSearchConsoleConfig();
    if (!config) return { status: "skipped", reason: "not_configured_or_not_production" };
    siteUrl = config.siteUrl;
    db = options.db ?? getServiceSupabase();
    if (!db) throw new Error("gsc_database_not_configured");
    const initialized = await db.from("search_console_state").upsert({ site_url: siteUrl }, {
      onConflict: "site_url", ignoreDuplicates: true,
    });
    if (initialized.error) throw new Error(`gsc_state: ${initialized.error.message}`);
    const token = randomUUID();
    const now = new Date();
    const claim = await db.from("search_console_state")
      .update({ lock_token: token, locked_until: new Date(now.getTime() + 5 * 60_000).toISOString() })
      .eq("site_url", siteUrl)
      .or(`locked_until.is.null,locked_until.lt.${now.toISOString()}`)
      .select("sitemap_hash,submitted_at,inspection_report")
      .maybeSingle();
    if (claim.error) throw new Error(`gsc_state: ${claim.error.message}`);
    if (!claim.data) return { status: "busy" };
    lockToken = token;
    const state = claim.data as State;
    const save = (patch: Record<string, unknown>) => updateState(db!, siteUrl!, token, patch);
    await save({ attempted_at: now.toISOString() });

    const sitemapUrl = `${config.baseUrl}/sitemap.xml`;
    const response = await fetch(sitemapUrl, { redirect: "manual", cache: "no-store", signal: AbortSignal.timeout(10_000) });
    if (response.status !== 200) throw new Error(`sitemap_http_${response.status}`);
    const entries = sitemapEntries(await response.text(), config.baseUrl);
    const urls = new Set(options.expectedUrls ?? []);
    const startsAt = new Map<string, number>();
    if (options.inspect) {
      const events = await db.from("events").select("slug,starts_at")
        .eq("visibility", "published").eq("listing_kind", "performance")
        .gt("starts_at", now.toISOString()).order("starts_at").limit(100);
      if (events.error) throw new Error(`gsc_events: ${events.error.message}`);
      for (const event of events.data ?? []) {
        for (const locale of routing.locales) {
          const url = `${config.baseUrl}/${locale}/events/${event.slug}`;
          urls.add(url);
          startsAt.set(url, Date.parse(event.starts_at));
        }
      }
      for (const locale of routing.locales) urls.add(`${config.baseUrl}/${locale}/events/arhiv`);
    }
    for (const url of urls) {
      if (!entries.has(url)) throw new Error(`sitemap_url_missing: ${url}`);
    }

    const previous = new Map((state.inspection_report ?? []).map((row) => [row.url, row]));
    const oldestFirst = [...urls].sort((a, b) =>
      (Date.parse(previous.get(a)?.checkedAt ?? "") || 0) - (Date.parse(previous.get(b)?.checkedAt ?? "") || 0),
    );
    await inBatches(oldestFirst.slice(0, 30), checkPublishedPage);

    const client = new SearchConsoleClient(config);
    const hash = sitemapFingerprint(entries);
    let submittedAt = state.submitted_at ?? undefined;
    const changed = hash !== state.sitemap_hash;
    if (changed) {
      await client.submitSitemap(sitemapUrl);
      submittedAt = new Date().toISOString();
      await save({ sitemap_hash: hash, submitted_at: submittedAt, last_error: null });
    }

    let report: InspectionReport[] | undefined;
    if (options.inspect) {
      const due = oldestFirst.filter((url) => !previous.has(url) ||
        now.getTime() - Date.parse(previous.get(url)!.checkedAt) >= 23 * 60 * 60_000).slice(0, 12);
      await inBatches(due, async (url) => {
        const checkedAt = new Date().toISOString();
        try {
          const status = await client.inspectUrl(url);
          previous.set(url, {
            url, checkedAt, ...status,
            needsAttention: status.verdict !== "PASS" || Boolean(status.googleCanonical && status.googleCanonical !== url),
          });
        } catch (error) {
          previous.set(url, { url, checkedAt, error: error instanceof Error ? error.message : "inspection_failed", needsAttention: true });
        }
      });
      report = [...previous.values()].filter((row) => urls.has(row.url));
      await save({ inspection_report: report, inspected_at: new Date().toISOString() });
      const urgent = report.filter((row) => row.needsAttention && (startsAt.get(row.url) ?? Infinity) - now.getTime() < 7 * 86_400_000);
      if (urgent.length) console.warn("[searchConsole] upcoming_events_need_attention", urgent);
    }
    await save({ last_error: null });
    return { status: changed ? "submitted" : "unchanged", submittedAt, report };
  } catch (error) {
    const reason = error instanceof Error ? error.message : "gsc_sync_failed";
    console.error("[searchConsole]", reason);
    if (db && siteUrl && lockToken) {
      await updateState(db, siteUrl, lockToken, { last_error: reason })
        .catch(() => console.error("[searchConsole] failed_to_save_error"));
    }
    return { status: "failed", reason };
  } finally {
    if (db && siteUrl && lockToken) {
      await updateState(db, siteUrl, lockToken, { lock_token: null, locked_until: null })
        .catch(() => console.error("[searchConsole] failed_to_release_lock"));
    }
  }
}
