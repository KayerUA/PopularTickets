"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireServiceSupabase } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/adminGuard";

export type UpsertPoetCourseState = { error: string } | null;

const PoetCourseSchema = z.object({
  id: z.string().uuid().optional(),
  slug: z
    .string()
    .min(2)
    .max(80)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "slug: только латиница, цифры и дефис"),
  title: z.string().min(2).max(200),
  kind: z.enum(["improvisation", "acting", "playback", "other"]),
  body: z.string().max(20000).optional().default(""),
  isPublished: z.preprocess((v) => v === "on" || v === true || v === "true", z.boolean()).default(false),
  sortOrder: z.coerce.number().int().min(0).max(9999).default(0),
});

function isNextRedirectError(e: unknown): boolean {
  return (
    e instanceof Error &&
    "digest" in e &&
    typeof (e as Error & { digest?: string }).digest === "string" &&
    String((e as Error & { digest: string }).digest).startsWith("NEXT_REDIRECT")
  );
}

export async function upsertPoetCourse(_prev: UpsertPoetCourseState, formData: FormData): Promise<UpsertPoetCourseState> {
  try {
    await requireAdmin();

    const parsed = PoetCourseSchema.safeParse({
      id: formData.get("id") || undefined,
      slug: formData.get("slug"),
      title: formData.get("title"),
      kind: formData.get("kind"),
      body: formData.get("body") || "",
      isPublished: formData.get("isPublished"),
      sortOrder: formData.get("sortOrder"),
    });

    if (!parsed.success) {
      return { error: parsed.error.errors.map((e) => e.message).join(", ") };
    }

    const v = parsed.data;
    const supabase = requireServiceSupabase();

    const payload = {
      slug: v.slug,
      title: v.title,
      kind: v.kind,
      body: v.body || null,
      is_published: Boolean(v.isPublished),
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
    redirect("/admin/poet-courses");
  } catch (e) {
    if (isNextRedirectError(e)) throw e;
    console.error("[upsertPoetCourse]", e);
    return { error: e instanceof Error ? e.message : "Не удалось сохранить курс" };
  }
}
