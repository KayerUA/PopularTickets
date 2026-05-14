"use client";

import { useLayoutEffect } from "react";

/**
 * Po nawigacji z innej podstrony (np. formularz zamówienia) Next.js potrafi
 * zachować scroll — na stronie potwierdzenia płatności zawsze pokazujemy start od góry.
 */
export function ScrollToTopOnMount() {
  useLayoutEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, []);

  return null;
}
