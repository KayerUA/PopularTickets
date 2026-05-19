export type TranslateLocale = "pl" | "uk";

export type TranslateProviderId = "deepl" | "libretranslate";

export type TranslateBatchResult = {
  provider: TranslateProviderId;
  /** Same length/order as input texts. */
  texts: string[];
};

function deeplApiBase(authKey: string): string {
  const fromEnv = (process.env.DEEPL_API_URL ?? "").trim().replace(/\/+$/, "");
  if (fromEnv) return fromEnv;
  return authKey.endsWith(":fx") ? "https://api-free.deepl.com" : "https://api.deepl.com";
}

function deeplTargetLang(locale: TranslateLocale): string {
  return locale === "pl" ? "PL" : "UK";
}

function libreTargetLang(locale: TranslateLocale): string {
  return locale;
}

function pickProvider(): TranslateProviderId | null {
  if ((process.env.DEEPL_AUTH_KEY ?? "").trim()) return "deepl";
  if ((process.env.LIBRETRANSLATE_URL ?? "").trim()) return "libretranslate";
  return null;
}

export function translateProviderLabel(): string {
  const p = pickProvider();
  if (p === "deepl") return "DeepL";
  if (p === "libretranslate") return "LibreTranslate";
  return "не настроен";
}

export function isTranslateConfigured(): boolean {
  if ((process.env.DEEPL_AUTH_KEY ?? "").trim()) return true;
  const url = (process.env.LIBRETRANSLATE_URL ?? "").trim();
  return url.length > 0;
}

/** Переводит массив строк; пустые остаются пустыми. */
export async function translateTextBatch(
  texts: string[],
  target: TranslateLocale,
  source: "ru" = "ru",
): Promise<TranslateBatchResult> {
  const provider = pickProvider();
  if (!provider) {
    throw new Error("Перевод не настроен: задайте DEEPL_AUTH_KEY или LIBRETRANSLATE_URL");
  }

  const normalized = texts.map((t) => (typeof t === "string" ? t : ""));
  const nonEmptyIdx: number[] = [];
  const toSend: string[] = [];
  for (let i = 0; i < normalized.length; i++) {
    if (normalized[i].trim()) {
      nonEmptyIdx.push(i);
      toSend.push(normalized[i]);
    }
  }

  if (toSend.length === 0) {
    return { provider, texts: normalized.map(() => "") };
  }

  const translated =
    provider === "deepl"
      ? await translateViaDeepL(toSend, target, source)
      : await translateViaLibreTranslate(toSend, target, source);

  const out = [...normalized];
  for (let j = 0; j < nonEmptyIdx.length; j++) {
    out[nonEmptyIdx[j]!] = translated[j] ?? "";
  }
  return { provider, texts: out };
}

async function translateViaDeepL(texts: string[], target: TranslateLocale, source: "ru"): Promise<string[]> {
  const key = (process.env.DEEPL_AUTH_KEY ?? "").trim();
  if (!key) throw new Error("DEEPL_AUTH_KEY не задан");

  const base = deeplApiBase(key);
  const res = await fetch(`${base}/v2/translate`, {
    method: "POST",
    headers: {
      Authorization: `DeepL-Auth-Key ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text: texts,
      source_lang: source.toUpperCase(),
      target_lang: deeplTargetLang(target),
    }),
  });

  if (!res.ok) {
    const detail = (await res.text()).slice(0, 400);
    throw new Error(`DeepL ${res.status}: ${detail}`);
  }

  const json = (await res.json()) as { translations?: { text: string }[] };
  const items = json.translations ?? [];
  if (items.length !== texts.length) {
    throw new Error("DeepL: неожиданное число переводов");
  }
  return items.map((t) => t.text);
}

async function translateViaLibreTranslate(
  texts: string[],
  target: TranslateLocale,
  source: "ru",
): Promise<string[]> {
  const base = (process.env.LIBRETRANSLATE_URL ?? "https://libretranslate.com").trim().replace(/\/+$/, "");
  const apiKey = (process.env.LIBRETRANSLATE_API_KEY ?? "").trim();

  const out: string[] = [];
  for (const text of texts) {
    const body: Record<string, string> = {
      q: text,
      source: source,
      target: libreTargetLang(target),
      format: "text",
    };
    if (apiKey) body.api_key = apiKey;

    const res = await fetch(`${base}/translate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const detail = (await res.text()).slice(0, 400);
      throw new Error(`LibreTranslate ${res.status}: ${detail}`);
    }

    const json = (await res.json()) as { translatedText?: string };
    out.push(json.translatedText ?? "");
  }
  return out;
}

export type AdminTranslatePayload = {
  title: string;
  body: string;
  cardTag?: string;
};

export type AdminTranslateLocalesResult = {
  title_pl: string;
  body_pl: string;
  title_uk: string;
  body_uk: string;
  card_tag_pl: string;
  card_tag_uk: string;
  provider: TranslateProviderId;
};

/** RU → PL + UK для админки (событие или курс). */
export async function translateAdminRuContent(input: AdminTranslatePayload): Promise<AdminTranslateLocalesResult> {
  const title = input.title.trim();
  const body = input.body.trim();
  const cardTag = (input.cardTag ?? "").trim();

  const fields = cardTag ? [title, body, cardTag] : [title, body];

  const [pl, uk] = await Promise.all([
    translateTextBatch(fields, "pl"),
    translateTextBatch(fields, "uk"),
  ]);

  const provider = pl.provider;
  const plTexts = pl.texts;
  const ukTexts = uk.texts;

  return {
    title_pl: plTexts[0] ?? "",
    body_pl: plTexts[1] ?? "",
    title_uk: ukTexts[0] ?? "",
    body_uk: ukTexts[1] ?? "",
    card_tag_pl: cardTag ? (plTexts[2] ?? "") : "",
    card_tag_uk: cardTag ? (ukTexts[2] ?? "") : "",
    provider,
  };
}
