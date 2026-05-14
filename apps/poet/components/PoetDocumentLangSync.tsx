"use client";

import { useLocale } from "next-intl";
import { useEffect } from "react";

/** Синхронізує `<html lang>` при зміні локалі (клієнтська навігація). */
export function PoetDocumentLangSync() {
  const locale = useLocale();

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  return null;
}
