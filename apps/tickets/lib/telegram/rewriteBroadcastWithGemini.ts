import { GEMINI_EVENT_MODEL, GEMINI_EVENT_MODEL_FALLBACKS, getGeminiApiKey } from "@/lib/telegram/config";

/** Переписывает текст, не позволяя модели менять даты, цены, ссылки и прочие факты. */
export async function rewriteBroadcastWithGemini(source: string, instruction: string): Promise<string> {
  const key = getGeminiApiKey();
  if (!key) throw new Error("GEMINI_API_KEY не задан");
  const prompt = [
    "Ты редактор Telegram-анонсов. Верни только готовый текст без комментариев и без Markdown-ограждений.",
    "Строго сохрани все факты из исходника: даты, время, цены, валюты, адреса, ссылки, названия, имена, хэштеги и CTA. Исключение: если редактор явно меняет конкретный факт в инструкции, его значение приоритетно. Не придумывай факты.",
    "Если инструкция просит сократить — убери воду, но не обязательные факты. Сохрани одну главную ссылку. Длина результата — максимум 900 символов. Язык оставь как в исходнике, если явно не сказано иначе.",
    `ИНСТРУКЦИЯ РЕДАКТОРА: ${instruction.trim()}`,
    "ИСТОЧНИК:",
    source.trim(),
  ].join("\n\n");
  let lastError = "";
  const models = [GEMINI_EVENT_MODEL, ...GEMINI_EVENT_MODEL_FALLBACKS.filter((model) => model !== GEMINI_EVENT_MODEL)];
  for (const model of models) {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: prompt }] }] }),
    });
    const data = (await response.json().catch(() => null)) as { candidates?: { content?: { parts?: { text?: string }[] } }[]; error?: { message?: string } } | null;
    const text = data?.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("").trim();
    if (response.ok && text) return text.slice(0, 900);
    lastError = data?.error?.message ?? `${model}: HTTP ${response.status}`;
    if (![404, 429, 503].includes(response.status)) break;
  }
  throw new Error(`Gemini не смог переписать пост: ${lastError}`);
}
