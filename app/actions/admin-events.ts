"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireServiceSupabase } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/adminGuard";
import { routing } from "@/i18n/routing";

const EventSchema = z.object({
  id: z.string().uuid().optional(),
  slug: z
    .string()
    .min(2)
    .max(80)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "slug: только латиница, цифры и дефис"),
  title: z.string().min(2).max(200),
  description: z.string().max(20000).optional().default(""),
  imageUrl: z.string().url().optional().or(z.literal("")),
  mapsUrl: z.string().url().optional().or(z.literal("")),
  venue: z.string().min(2).max(200),
  startsAt: z.string().min(1),
  pricePln: z.coerce.number().positive(),
  totalTickets: z.coerce.number().int().min(1).max(5000),
  isPublished: z.preprocess(
    (v) => v === "on" || v === true || v === "true",
    z.boolean()
  ).default(false),
});

function groszeFromPln(pln: number): number {
  return Math.round(pln * 100);
}

export async function upsertEvent(formData: FormData) {
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
  });

  if (!parsed.success) {
    throw new Error(parsed.error.errors.map((e) => e.message).join(", "));
  }

  const v = parsed.data;
  const priceGrosze = groszeFromPln(v.pricePln);
  const isPublished = Boolean(v.isPublished);

  const supabase = requireServiceSupabase();
  const payload = {
    slug: v.slug,
    title: v.title,
    description: v.description,
    image_url: v.imageUrl || null,
    maps_url: v.mapsUrl || null,
    venue: v.venue,
    starts_at: new Date(v.startsAt).toISOString(),
    price_grosze: priceGrosze,
    total_tickets: v.totalTickets,
    is_published: isPublished,
  };

  if (v.id) {
    const { error } = await supabase.from("events").update(payload).eq("id", v.id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase.from("events").insert(payload);
    if (error) throw new Error(error.message);
  }

  for (const loc of routing.locales) {
    revalidatePath(`/${loc}`);
    revalidatePath(`/${loc}/events/${v.slug}`);
  }
  revalidatePath("/admin");
  revalidatePath("/admin/orders");
  redirect("/admin");
}
