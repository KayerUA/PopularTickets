import { revalidatePath } from "next/cache";
import { routing } from "@/i18n/routing";
import { INDEXABLE_TRIAL_HUB_COURSE_SLUGS, TRIAL_HUB_SEGMENT } from "@/lib/trialCourseHub";

export function revalidateEventPages(slug: string): void {
  revalidatePath("/sitemap.xml");
  for (const locale of routing.locales) {
    revalidatePath(`/${locale}`);
    revalidatePath(`/${locale}/events`);
    revalidatePath(`/${locale}/events/arhiv`);
    revalidatePath(`/${locale}/events/${slug}`);
    revalidatePath(`/${locale}/special/${slug}`);
    for (const course of INDEXABLE_TRIAL_HUB_COURSE_SLUGS) {
      revalidatePath(`/${locale}/${TRIAL_HUB_SEGMENT}/${course}`);
    }
  }
}
