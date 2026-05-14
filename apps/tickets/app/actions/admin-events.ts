"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireServiceSupabase } from "@/lib/supabase/admin";
import { setMapsUrlRpc } from "@/lib/supabase/mapsUrlRpc";
import { uploadEventCoverImage } from "@/lib/supabase/eventImageUpload";
import { requireAdmin } from "@/lib/adminGuard";
import { routing } from "@/i18n/routing";

export type UpsertEventState = { error: string } | null;

/** Пустая строка, абсолютный URL или путь с сайта (как в сиде `/events/...`). */
const optionalImageRef = z.preprocess(
  (v) => (typeof v === "string" ? v.trim() : ""),
  z
    .string()
    .max(2000)
    .refine(
      (s) =>
        s === "" ||
        /^https?:\/\//i.test(s) ||
        (s.startsWith("/") && s.length > 1 && !s.includes("://")),
      "Картинка: пусто, https://… или путь с /"
    )
);

const EventSchema = z.object({
  id: z.string().uuid().optional(),
  slug: z
    .string()
    .min(2)
    .max(80)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "slug: только латиница, цифры и дефис"),
  title: z.string().min(2).max(200),
  description: z.string().max(20000).optional().default(""),
  imageUrl: optionalImageRef,
  mapsUrl: z.string().url().optional().or(z.literal("")),
  venue: z.string().min(2).max(200),
  startsAt: z.string().min(1),
  pricePln: z.coerce.number().positive(),
  totalTickets: z.coerce.number().int().min(1).max(5000),
  isPublished: z.preprocess(
    (v) => v === "on" || v === true || v === "true",
    z.boolean()
  ).default(false),
  listingKind: z.enum(["performance", "trial"]).default("performance"),
});

function groszeFromPln(pln: number): number {
  return Math.round(pln * 100);
}

function isNextRedirectError(e: unknown): boolean {
  return (
    e instanceof Error &&
    "digest" in e &&
    typeof (e as Error & { digest?: string }).digest === "string" &&
    String((e as Error & { digest: string }).digest).startsWith("NEXT_REDIRECT")
  );
}

export async function upsertEvent(_prev: UpsertEventState, formData: FormData): Promise<UpsertEventState> {
  try {
    await requireAdmin();

    const parsed = EventSchema.safeParse({
      id: formData.get("id") || undefined,
      slug: formData.get("slug"),
      title: formData.get("title"),
      description: formData.get("description") || "",
      imageUrl: formData.get("imageUrl") || "",
      mapsUrl: formData.get("mapsUrl") || "",
      venue: formData.get("venue"),
      startsAt: formData.get("startsAt"),
      pricePln: formData.get("pricePln"),
      totalTickets: formData.get("totalTickets"),
      isPublished: formData.get("isPublished"),
      listingKind: formData.get("listingKind") || "performance",
    });

    if (!parsed.success) {
      return { error: parsed.error.errors.map((e) => e.message).join(", ") };
    }

    const v = parsed.data;
    const priceGrosze = groszeFromPln(v.pricePln);
    const isPublished = Boolean(v.isPublished);

    const supabase = requireServiceSupabase();

    const imageFile = formData.get("imageFile");
    let imageUrlFinal: string | null = v.imageUrl || null;
    if (imageFile instanceof File && imageFile.size > 0) {
      imageUrlFinal = await uploadEventCoverImage(supabase, imageFile, v.slug);
    }

    const payload = {
      slug: v.slug,
      title: v.title,
      description: v.description,
      image_url: imageUrlFinal,
      venue: v.venue,
      starts_at: new Date(v.startsAt).toISOString(),
      price_grosze: priceGrosze,
      total_tickets: v.totalTickets,
      is_published: isPublished,
      listing_kind: v.listingKind,
    };

    let eventIdForMaps: string;

    if (v.id) {
      const { error } = await supabase.from("events").update(payload).eq("id", v.id);
      if (error) return { error: error.message };
      eventIdForMaps = v.id;
    } else {
      const { data: inserted, error } = await supabase.from("events").insert(payload).select("id").single();
      if (error || !inserted?.id) return { error: error?.message ?? "insert events" };
      eventIdForMaps = inserted.id as string;
    }

    const mapsErr = await setMapsUrlRpc(supabase, eventIdForMaps, v.mapsUrl || null);
    if (mapsErr.error) {
      return {
        error: `${mapsErr.error} — выполните в Supabase SQL из репозитория supabase/add-maps-url.sql (функции pt_event_*).`,
      };
    }

    for (const loc of routing.locales) {
      revalidatePath(`/${loc}`);
      revalidatePath(`/${loc}/events/${v.slug}`);
    }
    revalidatePath("/admin");
    revalidatePath("/admin/orders");
    redirect("/admin");
  } catch (e) {
    if (isNextRedirectError(e)) throw e;
    console.error("[upsertEvent]", e);
    return { error: e instanceof Error ? e.message : "Не удалось сохранить событие" };
  }
}
