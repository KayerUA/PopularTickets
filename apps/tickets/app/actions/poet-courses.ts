"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireServiceSupabase } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/adminGuard";
import { contentVisibilitySchema } from "@/lib/contentVisibility";

export type UpsertPoetCourseState = { error?: string; redirectTo?: string } | null;

const cardVariantSchema = z.enum(["improv", "acting", "masterclass", "playback"]);

const PoetCourseSchema = z.object({
  id: z.string().uuid().optional(),
  slug: z
    .string()
    .min(2)
    .max(80)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "slug: только латиница, цифры и дефис"),
  title: z.string().min(2).max(200),
  titlePl: z.string().max(200).optional().default(""),
  bodyPl: z.string().max(20000).optional().default(""),
  titleUk: z.string().max(200).optional().default(""),
  bodyUk: z.string().max(20000).optional().default(""),
  cardTagPl: z.string().max(120).optional().default(""),
  cardTagUk: z.string().max(120).optional().default(""),
  cardImageUrl: z.string().min(1).max(800),
  heroImageUrl: z.string().max(800).optional().default(""),
  cardVariant: cardVariantSchema,
  cardTag: z.string().max(120).optional().default(""),
  body: z.string().max(20000).optional().default(""),
  visibility: contentVisibilitySchema.default("inactive"),
  sortOrder: z.coerce.number().int().min(0).max(9999).default(0),
})
  .superRefine((data, ctx) => {
    if (data.visibility === "published" || data.visibility === "unlisted") {
      if (data.titlePl.trim().length < 2) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Для публикации нужен польский заголовок — переведите или заполните вручную.",
          path: ["titlePl"],
        });
      }
    }
  });

export async function deletePoetCourse(formData: FormData): Promise<{ error?: string; redirectTo?: string } | void> {
  try {
    await requireAdmin();

    const id = z.string().uuid().parse(formData.get("id"));
    const supabase = requireServiceSupabase();

    const { data: row, error: loadErr } = await supabase
      .from("poet_course")
      .select("id,slug")
      .eq("id", id)
      .maybeSingle();

    if (loadErr || !row) return { error: "Курс не найден" };

    const { error } = await supabase.from("poet_course").delete().eq("id", id);
    if (error) return { error: error.message };

    revalidatePath("/admin/poet-courses");
    return { redirectTo: "/admin/poet-courses" };
  } catch (e) {
    console.error("[deletePoetCourse]", e);
    return { error: e instanceof Error ? e.message : "Не удалось удалить курс" };
  }
}

export async function upsertPoetCourse(_prev: UpsertPoetCourseState, formData: FormData): Promise<UpsertPoetCourseState> {
  try {
    await requireAdmin();

    const heroRaw = String(formData.get("heroImageUrl") ?? "").trim();

    const parsed = PoetCourseSchema.safeParse({
      id: formData.get("id") || undefined,
      slug: formData.get("slug"),
      title: formData.get("title"),
      titlePl: formData.get("titlePl") || "",
      bodyPl: formData.get("bodyPl") || "",
      titleUk: formData.get("titleUk") || "",
      bodyUk: formData.get("bodyUk") || "",
      cardTagPl: formData.get("cardTagPl") || "",
      cardTagUk: formData.get("cardTagUk") || "",
      cardImageUrl: formData.get("cardImageUrl"),
      heroImageUrl: heroRaw,
      cardVariant: formData.get("cardVariant"),
      cardTag: formData.get("cardTag") ?? "",
      body: formData.get("body") || "",
      visibility: formData.get("visibility") || "inactive",
      sortOrder: formData.get("sortOrder"),
    });

    if (!parsed.success) {
      return { error: parsed.error.issues.map((e) => e.message).join(", ") };
    }

    const v = parsed.data;
    const supabase = requireServiceSupabase();

    const payload = {
      slug: v.slug,
      title: v.title,
      title_pl: v.titlePl.trim() || null,
      body_pl: v.bodyPl.trim() || null,
      title_uk: v.titleUk.trim() || null,
      body_uk: v.bodyUk.trim() || null,
      card_tag_pl: v.cardTagPl.trim() || null,
      card_tag_uk: v.cardTagUk.trim() || null,
      card_image_url: v.cardImageUrl.trim(),
      hero_image_url: v.heroImageUrl.trim() ? v.heroImageUrl.trim() : null,
      card_variant: v.cardVariant,
      card_tag: v.cardTag.trim(),
      body: v.body || null,
      visibility: v.visibility,
      sort_order: v.sortOrder,
    };

    if (v.id) {
      const { error } = await supabase.from("poet_course").update(payload).eq("id", v.id);
      if (error) return { error: error.message };
    } else {
      const { error } = await supabase.from("poet_course").insert(payload);
      if (error) return { error: error.message };
    }

    revalidatePath("/admin/poet-courses");
    return { redirectTo: "/admin/poet-courses" };
  } catch (e) {
    console.error("[upsertPoetCourse]", e);
    return { error: e instanceof Error ? e.message : "Не удалось сохранить курс" };
  }
}
