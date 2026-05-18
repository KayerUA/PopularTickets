"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireServiceSupabase } from "@/lib/supabase/admin";
import { setMapsUrlRpc } from "@/lib/supabase/mapsUrlRpc";
import { uploadEventCoverImage } from "@/lib/supabase/eventImageUpload";
import { requireAdmin } from "@/lib/adminGuard";
import { routing } from "@/i18n/routing";
import { isEventsPoetCourseIdUnavailable, isEventsImageFocalUnavailable } from "@/lib/supabase/eventsPoetCourseColumn";
import { contentVisibilitySchema } from "@/lib/contentVisibility";

export type UpsertEventRetryFields = {
  slug: string;
  title: string;
  description: string;
  imageUrl: string;
  mapsUrl: string;
  venue: string;
  startsAt: string;
  pricePln: string;
  totalTickets: string;
  visibility: string;
  listingKind: "performance" | "trial";
  poetCourseId: string;
  imageFocalX: string;
  imageFocalY: string;
};

export type UpsertEventState = {
  error: string;
  /** Снимок полей после ошибки — форма перемонтируется и подставляет их обратно. */
  fields?: UpsertEventRetryFields;
  nonce?: string;
} | null;

function newRetryEnvelope(fields: UpsertEventRetryFields): Pick<NonNullable<UpsertEventState>, "fields" | "nonce"> {
  return { fields, nonce: crypto.randomUUID() };
}

function formRetryFromFormData(formData: FormData): UpsertEventRetryFields {
  const lk = String(formData.get("listingKind") ?? "performance");
  return {
    slug: String(formData.get("slug") ?? ""),
    title: String(formData.get("title") ?? ""),
    description: String(formData.get("description") ?? ""),
    imageUrl: String(formData.get("imageUrl") ?? ""),
    mapsUrl: String(formData.get("mapsUrl") ?? ""),
    venue: String(formData.get("venue") ?? ""),
    startsAt: String(formData.get("startsAt") ?? ""),
    pricePln: String(formData.get("pricePln") ?? ""),
    totalTickets: String(formData.get("totalTickets") ?? ""),
    visibility: String(formData.get("visibility") ?? "inactive"),
    listingKind: lk === "trial" ? "trial" : "performance",
    poetCourseId: String(formData.get("poetCourseId") ?? ""),
    imageFocalX: String(formData.get("imageFocalX") ?? "50"),
    imageFocalY: String(formData.get("imageFocalY") ?? "50"),
  };
}

function formRetryFromParsed(
  v: z.infer<typeof EventSchema>,
  formData: FormData,
  imageUrlFinal: string | null,
): UpsertEventRetryFields {
  const fromForm = String(formData.get("imageUrl") ?? "");
  const imageUrl =
    imageUrlFinal && imageUrlFinal.trim() !== ""
      ? imageUrlFinal
      : v.imageUrl || fromForm;
  return {
    slug: v.slug,
    title: v.title,
    description: v.description,
    imageUrl,
    mapsUrl: v.mapsUrl || "",
    venue: v.venue,
    startsAt: String(formData.get("startsAt") ?? ""),
    pricePln: String(formData.get("pricePln") ?? ""),
    totalTickets: String(v.totalTickets),
    visibility: v.visibility,
    listingKind: v.listingKind,
    poetCourseId: v.poetCourseId ?? "",
    imageFocalX: String(v.imageFocalX),
    imageFocalY: String(v.imageFocalY),
  };
}

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
  visibility: contentVisibilitySchema.default("inactive"),
  listingKind: z.enum(["performance", "trial"]).default("performance"),
  poetCourseId: z.preprocess(
    (v) => (typeof v === "string" && v.trim() !== "" ? v.trim() : undefined),
    z.string().uuid().optional(),
  ),
  imageFocalX: z.preprocess(
    (v) => (v === "" || v === undefined || v === null ? 50 : Number(v)),
    z.number().min(0).max(100)
  ),
  imageFocalY: z.preprocess(
    (v) => (v === "" || v === undefined || v === null ? 50 : Number(v)),
    z.number().min(0).max(100)
  ),
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
      visibility: formData.get("visibility") || "inactive",
      listingKind: formData.get("listingKind") || "performance",
      poetCourseId: formData.get("poetCourseId"),
      imageFocalX: formData.get("imageFocalX"),
      imageFocalY: formData.get("imageFocalY"),
    });

    if (!parsed.success) {
      return {
        error: parsed.error.errors.map((e) => e.message).join(", "),
        ...newRetryEnvelope(formRetryFromFormData(formData)),
      };
    }

    const v = parsed.data;
    const priceGrosze = groszeFromPln(v.pricePln);

    const supabase = requireServiceSupabase();

    const imageFile = formData.get("imageFile");
    let imageUrlFinal: string | null = v.imageUrl || null;
    if (imageFile instanceof File && imageFile.size > 0) {
      imageUrlFinal = await uploadEventCoverImage(supabase, imageFile, v.slug);
    }

    const payload: Record<string, unknown> = {
      slug: v.slug,
      title: v.title,
      description: v.description,
      image_url: imageUrlFinal,
      venue: v.venue,
      starts_at: new Date(v.startsAt).toISOString(),
      price_grosze: priceGrosze,
      total_tickets: v.totalTickets,
      visibility: v.visibility,
      listing_kind: v.listingKind,
      poet_course_id: v.listingKind === "trial" && v.poetCourseId ? v.poetCourseId : null,
      image_focal_x: v.imageFocalX,
      image_focal_y: v.imageFocalY,
    };

    let eventIdForMaps: string;

    if (v.id) {
      let error = (await supabase.from("events").update(payload).eq("id", v.id)).error;
      if (error && isEventsPoetCourseIdUnavailable(error.message)) {
        const { poet_course_id: _drop, ...withoutCourse } = payload;
        const r2 = await supabase.from("events").update(withoutCourse).eq("id", v.id);
        error = r2.error;
        if (!error) {
          console.warn(
            "[upsertEvent] колонка events.poet_course_id недоступна в API — сохранено без привязки к курсу. Выполните supabase/add-events-poet-course-id-column.sql в SQL Editor.",
          );
        }
      }
      if (error && isEventsImageFocalUnavailable(error.message)) {
        const { image_focal_x: _fx, image_focal_y: _fy, ...withoutFocal } = payload;
        const r3 = await supabase.from("events").update(withoutFocal).eq("id", v.id);
        error = r3.error;
        if (!error) {
          console.warn(
            "[upsertEvent] колонки events.image_focal_* недоступны — сохранено без точки фокуса. Выполните supabase/add-events-image-focal.sql в SQL Editor.",
          );
        }
      }
      if (error) return { error: error.message, ...newRetryEnvelope(formRetryFromParsed(v, formData, imageUrlFinal)) };
      eventIdForMaps = v.id;
    } else {
      let ins = await supabase.from("events").insert(payload).select("id").single();
      if (ins.error && isEventsPoetCourseIdUnavailable(ins.error.message)) {
        const { poet_course_id: _drop, ...withoutCourse } = payload;
        ins = await supabase.from("events").insert(withoutCourse).select("id").single();
        if (!ins.error) {
          console.warn(
            "[upsertEvent] колонка events.poet_course_id недоступна в API — событие создано без привязки к курсу. Выполните supabase/add-events-poet-course-id-column.sql в SQL Editor.",
          );
        }
      }
      if (ins.error && isEventsImageFocalUnavailable(ins.error.message)) {
        const { image_focal_x: _fx, image_focal_y: _fy, ...withoutFocal } = payload;
        ins = await supabase.from("events").insert(withoutFocal).select("id").single();
        if (!ins.error) {
          console.warn(
            "[upsertEvent] колонки events.image_focal_* недоступны — событие без точки фокуса. Выполните supabase/add-events-image-focal.sql в SQL Editor.",
          );
        }
      }
      if (ins.error || !ins.data?.id)
        return {
          error: ins.error?.message ?? "insert events",
          ...newRetryEnvelope(formRetryFromParsed(v, formData, imageUrlFinal)),
        };
      eventIdForMaps = ins.data.id as string;
    }

    const mapsErr = await setMapsUrlRpc(supabase, eventIdForMaps, v.mapsUrl || null);
    if (mapsErr.error) {
      return {
        error: `${mapsErr.error} — выполните в Supabase SQL из репозитория supabase/add-maps-url.sql (функции pt_event_*).`,
        ...newRetryEnvelope(formRetryFromParsed(v, formData, imageUrlFinal)),
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
    return {
      error: e instanceof Error ? e.message : "Не удалось сохранить событие",
      ...newRetryEnvelope(formRetryFromFormData(formData)),
    };
  }
}
