"use client";

import { useEffect, useState } from "react";

function remainingParts(expiresAt: string): { days: number; hours: number; minutes: number } | null {
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (!Number.isFinite(ms) || ms <= 0) return null;
  const allMinutes = Math.ceil(ms / 60_000);
  return {
    days: Math.floor(allMinutes / 1440),
    hours: Math.floor((allMinutes % 1440) / 60),
    minutes: allMinutes % 60,
  };
}

export function SpecialDiscountCountdown({ name, expiresAt }: { name: string; expiresAt: string }) {
  const [remaining, setRemaining] = useState(() => remainingParts(expiresAt));

  useEffect(() => {
    const update = () => {
      const next = remainingParts(expiresAt);
      setRemaining(next);
      // Сервер пересчитывает цену независимо, а страница синхронизируется
      // в момент смены периода, чтобы человек не видел устаревшую сумму.
      if (!next) window.location.reload();
    };
    const timer = window.setInterval(update, 30_000);
    return () => window.clearInterval(timer);
  }, [expiresAt]);

  if (!remaining) return null;
  return (
    <p className="mt-2 text-xs font-medium text-poet-gold-bright/90">
      {name} скидка заканчивается через {remaining.days} д. {remaining.hours} ч. {remaining.minutes} мин.
    </p>
  );
}
