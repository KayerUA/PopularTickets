"use client";

import { useEffect } from "react";

export function PromoVisitTracker({ promoCodeId, eventId }: { promoCodeId: string; eventId: string }) {
  useEffect(() => {
    void fetch("/api/promo-visits", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ promoCodeId, eventId }),
      keepalive: true,
    });
  }, [promoCodeId, eventId]);
  return null;
}
