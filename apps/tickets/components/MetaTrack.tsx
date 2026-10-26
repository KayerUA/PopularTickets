"use client";

import { useEffect } from "react";
import { trackPurchaseOnce, trackViewContent, type ProductType } from "@/lib/metaPixel";

/** Runs `fn` now if the pixel is loaded, otherwise once it becomes ready (after consent). */
function whenReady(fn: () => boolean | void): () => void {
  if (typeof window.fbq === "function") {
    if (fn() !== false) return () => {};
  }
  const h = () => {
    // fbq stub exists synchronously after init script
    fn();
  };
  window.addEventListener("meta-pixel-ready", h, { once: true });
  return () => window.removeEventListener("meta-pixel-ready", h);
}

export function MetaViewContent(p: { slug: string; name?: string; valuePln: number; productType: ProductType }) {
  useEffect(() => whenReady(() => trackViewContent(p)), [p.slug]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

export function MetaPurchase(p: {
  orderId: string;
  slug: string;
  name?: string;
  totalPln: number;
  quantity: number;
  productType: ProductType;
}) {
  useEffect(
    () => whenReady(() => trackPurchaseOnce({ ...p, valuePln: p.quantity ? p.totalPln / p.quantity : p.totalPln })),
    [p.orderId] // eslint-disable-line react-hooks/exhaustive-deps
  );
  return null;
}
