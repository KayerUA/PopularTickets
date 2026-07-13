/* eslint-disable @next/next/no-img-element -- ImageResponse renders social preview markup, not browser DOM. */
import { ImageResponse } from "next/og";
import { getServiceSupabase } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NEXT_MODE_SLUG = "next-mode-2026-08-15";

function formatEventDate(value: string): string {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "";
  return new Intl.DateTimeFormat("ru-RU", {
    timeZone: "Europe/Warsaw",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

async function imageDataUrl(src: string | null): Promise<string | null> {
  if (!src?.startsWith("http")) return null;
  try {
    const response = await fetch(src, { cache: "no-store" });
    if (!response.ok) return null;
    const type = response.headers.get("content-type") || "image/jpeg";
    const bytes = Buffer.from(await response.arrayBuffer());
    return `data:${type};base64,${bytes.toString("base64")}`;
  } catch {
    return null;
  }
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const supabase = getServiceSupabase();
  const { data: event } = supabase
    ? await supabase
        .from("events")
        .select("title,image_url,starts_at,venue")
        .eq("slug", slug)
        .in("visibility", ["published", "unlisted"])
        .maybeSingle()
    : { data: null };

  const isNextMode = slug === NEXT_MODE_SLUG;
  const title = isNextMode ? "Next Mode Comedy" : (event?.title || "PopularTickets");
  const subtitle = isNextMode ? "P!MPRO × NEXT MODE" : "Билеты на события в Варшаве";
  const tagline = isNextMode ? "ЗРИТЕЛИ УПРАВЛЯЮТ ШОУ" : "ЖИВОЕ СОБЫТИЕ";
  const when = event?.starts_at ? formatEventDate(event.starts_at) : "";
  const photo = await imageDataUrl(event?.image_url ?? null);

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          position: "relative",
          width: "1200px",
          height: "630px",
          overflow: "hidden",
          background: "#08070d",
          color: "white",
          fontFamily: "Arial, sans-serif",
        }}
      >
        {photo ? (
          <img
            src={photo}
            alt=""
            width="1200"
            height="630"
            style={{ position: "absolute", inset: 0, width: "1200px", height: "630px", objectFit: "cover", objectPosition: "50% 61%", opacity: 0.32 }}
          />
        ) : null}
        <div style={{ position: "absolute", inset: 0, display: "flex", backgroundImage: "linear-gradient(90deg, rgba(8,7,13,0.98) 0%, rgba(8,7,13,0.88) 48%, rgba(8,7,13,0.18) 100%)" }} />

        <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", width: "720px", padding: "58px 0 54px 68px" }}>
          <div style={{ display: "flex", alignItems: "center", fontSize: "24px", fontWeight: 700, letterSpacing: "2px", color: "#c4b5fd" }}>
            {subtitle}
          </div>
          <div style={{ display: "flex", marginTop: "24px", fontSize: title.length > 34 ? "58px" : "72px", lineHeight: 1.02, fontWeight: 800, letterSpacing: "-2px" }}>
            {title}
          </div>
          <div style={{ display: "flex", marginTop: "24px", fontSize: "25px", fontWeight: 700, letterSpacing: "1px", color: "#e8d48b" }}>
            {tagline}
          </div>
          {when ? (
            <div style={{ display: "flex", marginTop: "42px", fontSize: "24px", color: "#e4e4e7" }}>
              {when} · Варшава
            </div>
          ) : null}
        </div>

        {photo ? (
          <div style={{ position: "absolute", right: "34px", top: "28px", display: "flex", width: "410px", height: "574px", overflow: "hidden", borderRadius: "28px", border: "2px solid rgba(139,92,246,0.72)", boxShadow: "0 0 50px rgba(124,58,237,0.28)" }}>
            <img src={photo} alt="" width="410" height="574" style={{ width: "410px", height: "574px", objectFit: "cover", objectPosition: "50% 61%" }} />
          </div>
        ) : null}
      </div>
    ),
    {
      width: 1200,
      height: 630,
      headers: {
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
      },
    },
  );
}
