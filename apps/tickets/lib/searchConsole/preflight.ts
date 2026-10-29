import { createHash } from "node:crypto";

function decodeXml(value: string): string {
  return value.replace(/&(?:amp|lt|gt|quot|apos);/g, (entity) =>
    ({ "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&apos;": "'" })[entity]!,
  );
}

export function sitemapEntries(xml: string, baseUrl: string): Map<string, string> {
  if (!/<urlset(?:\s|>)/i.test(xml) || !/<\/urlset\s*>/i.test(xml)) throw new Error("sitemap_invalid_xml");
  const entries = new Map<string, string>();
  for (const match of xml.matchAll(/<url\s*>([\s\S]*?)<\/url\s*>/gi)) {
    const location = match[1].match(/<loc\s*>([\s\S]*?)<\/loc\s*>/i)?.[1]?.trim();
    if (!location) throw new Error("sitemap_location_missing");
    const url = new URL(decodeXml(location));
    if (url.origin !== new URL(baseUrl).origin) throw new Error("sitemap_foreign_host");
    const modified = match[1].match(/<lastmod\s*>(.*?)<\/lastmod\s*>/i)?.[1]?.trim() ?? "";
    if (modified && !Number.isFinite(Date.parse(modified))) throw new Error("sitemap_invalid_lastmod");
    entries.set(url.href, modified);
  }
  if (!entries.size) throw new Error("sitemap_empty");
  return entries;
}

export function sitemapFingerprint(entries: Map<string, string>): string {
  return createHash("sha256").update(JSON.stringify([...entries].sort(([a], [b]) => a.localeCompare(b)))).digest("hex");
}

function attributes(tag: string): Record<string, string> {
  return Object.fromEntries([...tag.matchAll(/([^\s=<>/]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g)]
    .map((match) => [match[1].toLowerCase(), match[2] ?? match[3] ?? match[4]]));
}

export async function checkPublishedPage(url: string): Promise<void> {
  const response = await fetch(url, { redirect: "manual", cache: "no-store", signal: AbortSignal.timeout(10_000) });
  if (response.status !== 200) throw new Error(`page_http_${response.status}: ${url}`);
  if (!response.headers.get("content-type")?.includes("text/html")) throw new Error(`page_not_html: ${url}`);
  const blocked = /(?:^|[\s,:;])(?:noindex|none)(?:$|[\s,;])/i;
  if (blocked.test(response.headers.get("x-robots-tag") ?? "")) throw new Error(`page_noindex: ${url}`);
  const html = (await response.text()).replace(/<!--[\s\S]*?-->|<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, "");
  let canonical: string | undefined;
  for (const match of html.matchAll(/<(?:meta|link)\b[^>]*>/gi)) {
    const attrs = attributes(match[0]);
    if (["robots", "googlebot"].includes(attrs.name?.toLowerCase()) && blocked.test(attrs.content ?? "")) {
      throw new Error(`page_noindex: ${url}`);
    }
    if (attrs.rel?.toLowerCase().split(/\s+/).includes("canonical")) canonical = attrs.href;
  }
  if (!canonical || new URL(decodeXml(canonical), url).href !== url) throw new Error(`page_canonical_mismatch: ${url}`);
}
