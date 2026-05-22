"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireServiceSupabase } from "@/lib/supabase/admin";
import { setMapsUrlRpc } from "@/lib/supabase/mapsUrlRpc";
import { uploadEventCoverImage } from "@/lib/supabase/eventImageUpload";
import { requireAdmin } from "@/lib/adminGuard";
import { routing } from "@/i18n/routing";
import {
  isEventsPoetCourseIdUnavailable,
  isEventsImageFocalUnavailable,
  isEventsLanguageUnavailable,
} from "@/lib/supabase/eventsPoetCourseColumn";
import { contentVisibilitySchema } from "@/lib/contentVisibility";
import { fallbackEventSlug, slugifyEventTitle } from "@/lib/eventSlugFromTitle";
import { parseStartsAtFromAdminForm } from "@/lib/warsawEventDatetime";
import { DEFAULT_EVENT_LANGUAGE, normalizeEventLanguage } from "@/lib/eventLanguage";

const MIN_EVENT_DESCRIPTION_PUBLISH_CHARS = 300;

export type UpsertEventRetryFields = {
  slug: string;
  title: string;
  description: string;
  titlePl: string;
  descriptionPl: string;
  titleUk: string;
  descriptionUk: string;
  imageUrl: string;
  mapsUrl: string;
  venue: string;
  startsAt: string;
  pricePln: string;
  totalTickets: string;
  visibility: string;
  listingKind: "performance" | "trial";
  eventLanguage: string;
  poetCourseId: string;
  imageFocalX: string;
  imageFocalY: string;
};

export type UpsertEventState = {
  error?: string;
  /** После успешного сохранения — клиент делает router.push (не redirect() из action: ломает useActionState). */
  redirectTo?: string;
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
    titlePl: String(formData.get("titlePl") ?? ""),
    descriptionPl: String(formData.get("descriptionPl") ?? ""),
    titleUk: String(formData.get("titleUk") ?? ""),
    descriptionUk: String(formData.get("descriptionUk") ?? ""),
    imageUrl: String(formData.get("imageUrl") ?? ""),
    mapsUrl: String(formData.get("mapsUrl") ?? ""),
    venue: String(formData.get("venue") ?? ""),
    startsAt: String(formData.get("startsAt") ?? ""),
    pricePln: String(formData.get("pricePln") ?? ""),
    totalTickets: String(formData.get("totalTickets") ?? ""),
    visibility: String(formData.get("visibility") ?? "inactive"),
    listingKind: lk === "trial" ? "trial" : "performance",
    eventLanguage: String(formData.get("eventLanguage") ?? DEFAULT_EVENT_LANGUAGE),
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
    titlePl: v.titlePl,
    descriptionPl: v.descriptionPl,
    titleUk: v.titleUk,
    descriptionUk: v.descriptionUk,
    imageUrl,
    mapsUrl: v.mapsUrl || "",
    venue: v.venue,
    startsAt: String(formData.get("startsAt") ?? ""),
    pricePln: String(formData.get("pricePln") ?? ""),
    totalTickets: String(v.totalTickets),
    visibility: v.visibility,
    listingKind: v.listingKind,
    eventLanguage: v.eventLanguage,
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
  titlePl: z.string().max(200).optional().default(""),
  descriptionPl: z.string().max(20000).optional().default(""),
  titleUk: z.string().max(200).optional().default(""),
  descriptionUk: z.string().max(20000).optional().default(""),
  imageUrl: optionalImageRef,
  mapsUrl: z.string().url().optional().or(z.literal("")),
  venue: z.string().min(2).max(200),
  startsAt: z.string().min(1),
  pricePln: z.coerce.number().positive(),
  totalTickets: z.coerce.number().int().min(1).max(5000),
  visibility: contentVisibilitySchema.default("inactive"),
  listingKind: z.enum(["performance", "trial"]).default("performance"),
  eventLanguage: z
    .enum(["ru", "uk", "ru_uk", "pl", "en", "mixed"])
    .default(DEFAULT_EVENT_LANGUAGE),
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
})
  .superRefine((data, ctx) => {
    if (data.visibility === "published" || data.visibility === "unlisted") {
      const len = data.description.trim().length;
      if (len < MIN_EVENT_DESCRIPTION_PUBLISH_CHARS) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Для публикации (published / unlisted) описание RU не короче ${MIN_EVENT_DESCRIPTION_PUBLISH_CHARS} символов (сейчас ${len}).`,
          path: ["description"],
        });
      }
      const plTitle = data.titlePl.trim();
      if (plTitle.length < 2) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Для публикации нужен польский заголовок (title_pl) — переведите или заполните вручную.",
          path: ["titlePl"],
        });
      }
      const plDescLen = data.descriptionPl.trim().length;
      if (plDescLen < MIN_EVENT_DESCRIPTION_PUBLISH_CHARS) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Для публикации описание PL не короче ${MIN_EVENT_DESCRIPTION_PUBLISH_CHARS} символов (сейчас ${plDescLen}).`,
          path: ["descriptionPl"],
        });
      }
    }
  });

function groszeFromPln(pln: number): number {
  return Math.round(pln * 100);
}

/** Slug из формы или автогенерация из названия (если поле slug пустое). */
function effectiveSlugFromFormData(formData: FormData): string {
  const raw = String(formData.get("slug") ?? "").trim();
  if (raw !== "") return raw;
  const fromTitle = slugifyEventTitle(String(formData.get("title") ?? ""));
  if (fromTitle.length >= 2) return fromTitle;
  return fallbackEventSlug();
}

async function allocateUniqueEventSlugForInsert(
  supabase: ReturnType<typeof requireServiceSupabase>,
  baseSlug: string,
): Promise<string> {
  const base = (baseSlug.trim().slice(0, 72) || "event").replace(/-+$/g, "") || "event";
  let candidate = base;
  let n = 2;
  for (;;) {
    const { data, error } = await supabase.from("events").select("id").eq("slug", candidate).maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return candidate;
    candidate = `${base}-${n}`;
    n += 1;
    if (n > 500) throw new Error("Не удалось подобрать свободный slug");
  }
}

export async function upsertEvent(_prev: UpsertEventState, formData: FormData): Promise<UpsertEventState> {
  try {
    await requireAdmin();

    const parsed = EventSchema.safeParse({
      id: formData.get("id") || undefined,
      slug: effectiveSlugFromFormData(formData),
      title: formData.get("title"),
      description: formData.get("description") || "",
      titlePl: formData.get("titlePl") || "",
      descriptionPl: formData.get("descriptionPl") || "",
      titleUk: formData.get("titleUk") || "",
      descriptionUk: formData.get("descriptionUk") || "",
      imageUrl: formData.get("imageUrl") || "",
      mapsUrl: formData.get("mapsUrl") || "",
      venue: formData.get("venue"),
      startsAt: formData.get("startsAt"),
      pricePln: formData.get("pricePln"),
      totalTickets: formData.get("totalTickets"),
      visibility: formData.get("visibility") || "inactive",
      listingKind: formData.get("listingKind") || "performance",
      eventLanguage: normalizeEventLanguage(formData.get("eventLanguage")),
      poetCourseId: formData.get("poetCourseId"),
      imageFocalX: formData.get("imageFocalX"),
      imageFocalY: formData.get("imageFocalY"),
    });

    if (!parsed.success) {
      return {
        error: parsed.error.issues.map((e) => e.message).join(", "),
        ...newRetryEnvelope(formRetryFromFormData(formData)),
      };
    }

    const v0 = parsed.data;
    const supabase = requireServiceSupabase();
    let slugFinal = v0.slug;
    if (!v0.id) {
      slugFinal = await allocateUniqueEventSlugForInsert(supabase, v0.slug);
    }
    const v = { ...v0, slug: slugFinal };

    const priceGrosze = groszeFromPln(v.pricePln);

    let startsAtIso: string;
    try {
      startsAtIso = parseStartsAtFromAdminForm(v.startsAt);
    } catch {
      return {
        error: "Дата и время: укажите корректно (Europe/Warsaw).",
        ...newRetryEnvelope(formRetryFromFormData(formData)),
      };
    }

    const imageFile = formData.get("imageFile");
    let imageUrlFinal: string | null = v.imageUrl || null;
    if (imageFile instanceof File && imageFile.size > 0) {
      try {
        imageUrlFinal = await uploadEventCoverImage(supabase, imageFile, v.slug);
      } catch (e) {
        return {
          error: e instanceof Error ? e.message : "Не удалось загрузить обложку",
          ...newRetryEnvelope(formRetryFromParsed(v, formData, imageUrlFinal)),
        };
      }
    }

    const payload: Record<string, unknown> = {
      slug: v.slug,
      title: v.title,
      description: v.description,
      title_pl: v.titlePl.trim() || null,
      description_pl: v.descriptionPl.trim() || null,
      title_uk: v.titleUk.trim() || null,
      description_uk: v.descriptionUk.trim() || null,
      image_url: imageUrlFinal,
      venue: v.venue,
      starts_at: startsAtIso,
      price_grosze: priceGrosze,
      total_tickets: v.totalTickets,
      visibility: v.visibility,
      listing_kind: v.listingKind,
      event_language: v.eventLanguage,
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
      if (error && isEventsLanguageUnavailable(error.message)) {
        const { event_language: _lang, ...withoutLanguage } = payload;
        const r4 = await supabase.from("events").update(withoutLanguage).eq("id", v.id);
        error = r4.error;
        if (!error) {
          console.warn(
            "[upsertEvent] колонка events.event_language недоступна — сохранено без языка события. Выполните supabase/add-events-event-language.sql в SQL Editor.",
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
      if (ins.error && isEventsLanguageUnavailable(ins.error.message)) {
        const { event_language: _lang, ...withoutLanguage } = payload;
        ins = await supabase.from("events").insert(withoutLanguage).select("id").single();
        if (!ins.error) {
          console.warn(
            "[upsertEvent] колонка events.event_language недоступна — событие создано без языка события. Выполните supabase/add-events-event-language.sql в SQL Editor.",
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
    return { redirectTo: "/admin" };
  } catch (e) {
    console.error("[upsertEvent]", e);
    return {
      error: e instanceof Error ? e.message : "Не удалось сохранить событие",
      ...newRetryEnvelope(formRetryFromFormData(formData)),
    };
  }
}

export async function deleteEvent(formData: FormData): Promise<{ error?: string; redirectTo?: string } | void> {
  try {
    await requireAdmin();

    const id = z.string().uuid().parse(formData.get("id"));
    const supabase = requireServiceSupabase();

    const { data: ev, error: evErr } = await supabase
      .from("events")
      .select("id,slug")
      .eq("id", id)
      .maybeSingle();

    if (evErr || !ev) return { error: "Событие не найдено" };

    const { count: paidCount, error: paidErr } = await supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("event_id", id)
      .eq("status", "paid");

    if (paidErr) return { error: paidErr.message };
    if ((paidCount ?? 0) > 0) {
      return {
        error: `Нельзя удалить: ${paidCount} оплаченных заказов. Скройте событие (inactive) или оставьте в архиве.`,
      };
    }

    const slug = ev.slug as string;

    const slotDel = await supabase.from("poet_trial_slot").delete().eq("tickets_checkout_event_slug", slug);
    if (slotDel.error && !/does not exist|schema cache/i.test(slotDel.error.message)) {
      console.warn("[deleteEvent] poet_trial_slot", slotDel.error.message);
    }

    const { error: ordErr } = await supabase.from("orders").delete().eq("event_id", id);
    if (ordErr) return { error: ordErr.message };

    const { error: delErr } = await supabase.from("events").delete().eq("id", id);
    if (delErr) return { error: delErr.message };

    for (const loc of routing.locales) {
      revalidatePath(`/${loc}`);
      revalidatePath(`/${loc}/events/${slug}`);
    }
    revalidatePath("/admin");
    revalidatePath("/admin/orders");
    return { redirectTo: "/admin" };
  } catch (e) {
    console.error("[deleteEvent]", e);
    return { error: e instanceof Error ? e.message : "Не удалось удалить событие" };
  }
}
