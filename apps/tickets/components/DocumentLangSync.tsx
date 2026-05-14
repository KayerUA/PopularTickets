"use client";

import { useLocale } from "next-intl";
import { useEffect } from "react";

/** Синхронизирует `<html lang>` при смене локали (клиентская навигация). */
export function DocumentLangSync() {
  const locale = useLocale();

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  return null;
}
