import { EventForm } from "@/components/EventForm";
import { fetchPoetCourseSelectOptions } from "@/lib/fetchPoetCourseSelectOptions";

export default async function NewEventPage() {
  const poetCourseOptions = await fetchPoetCourseSelectOptions();

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-semibold text-zinc-50">Новое событие</h1>
      <EventForm poetCourseOptions={poetCourseOptions} />
    </div>
  );
}
