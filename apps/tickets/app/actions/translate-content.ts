"use server";

import { requireAdmin } from "@/lib/adminGuard";
import {
  isTranslateConfigured,
  translateAdminRuContent,
  translateProviderLabel,
  type AdminTranslatePayload,
} from "@/lib/translateContent";

export type TranslateContentState =
  | {
      ok: true;
      title_pl: string;
      body_pl: string;
      title_uk: string;
      body_uk: string;
      card_tag_pl: string;
      card_tag_uk: string;
      provider: string;
    }
  | { ok: false; error: string };

export async function translateContentFromRu(input: AdminTranslatePayload): Promise<TranslateContentState> {
  try {
    await requireAdmin();

    if (!isTranslateConfigured()) {
      return {
        ok: false,
        error:
          "Перевод не настроен. Добавьте DEEPL_AUTH_KEY (бесплатно 500k симв./мес) или LIBRETRANSLATE_URL в .env",
      };
    }

    if (!input.title.trim() && !input.body.trim()) {
      return { ok: false, error: "Заполните название или описание на русском" };
    }

    const result = await translateAdminRuContent(input);
    return {
      ok: true,
      title_pl: result.title_pl,
      body_pl: result.body_pl,
      title_uk: result.title_uk,
      body_uk: result.body_uk,
      card_tag_pl: result.card_tag_pl,
      card_tag_uk: result.card_tag_uk,
      provider: result.provider === "deepl" ? "DeepL" : "LibreTranslate",
    };
  } catch (e) {
    console.error("[translateContentFromRu]", e);
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Ошибка перевода",
    };
  }
}

export async function getTranslateProviderHint(): Promise<string> {
  await requireAdmin();
  if (!isTranslateConfigured()) {
    return "Не настроено — нужен DEEPL_AUTH_KEY или LIBRETRANSLATE_URL";
  }
  return translateProviderLabel();
}
