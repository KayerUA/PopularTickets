import { EventForm } from "@/components/EventForm";

export default function NewEventPage() {
  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-semibold text-zinc-50">Новое событие</h1>
      <EventForm />
    </div>
  );
}
