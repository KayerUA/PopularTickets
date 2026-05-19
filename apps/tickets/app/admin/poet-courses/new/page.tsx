import { PoetCourseForm } from "@/components/PoetCourseForm";
import { isTranslateConfigured, translateProviderLabel } from "@/lib/translateContent";

export default function NewPoetCoursePage() {
  const translateProviderHint = isTranslateConfigured()
    ? translateProviderLabel()
    : "не настроен (DEEPL_AUTH_KEY или LIBRETRANSLATE_URL)";

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-semibold text-zinc-50">Новый курс</h1>
      <PoetCourseForm translateProviderHint={translateProviderHint} />
    </div>
  );
}
