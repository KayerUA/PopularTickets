import { EventForm } from "@/components/EventForm";
import { fetchPoetCourseSelectOptions } from "@/lib/fetchPoetCourseSelectOptions";
import { isTranslateConfigured, translateProviderLabel } from "@/lib/translateContent";
import { fetchShows } from "@/lib/shows";

export default async function NewEventPage() {
  const poetCourseOptions = await fetchPoetCourseSelectOptions();
  const showOptions = await fetchShows();
  const translateProviderHint = isTranslateConfigured()
    ? translateProviderLabel()
    : "не настроен (DEEPL_AUTH_KEY или LIBRETRANSLATE_URL)";

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-semibold text-zinc-50">Новое событие</h1>
      <EventForm poetCourseOptions={poetCourseOptions} showOptions={showOptions} translateProviderHint={translateProviderHint} />
    </div>
  );
}
