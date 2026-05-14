import { PoetCourseForm } from "@/components/PoetCourseForm";

export default function NewPoetCoursePage() {
  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-semibold text-zinc-50">Новый курс</h1>
      <PoetCourseForm />
    </div>
  );
}
