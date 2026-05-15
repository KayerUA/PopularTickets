/** Нормализация фокуса обложки (проценты для CSS object-position). */
export function clampEventImageFocal(n: unknown): number {
  const num = typeof n === "number" ? n : typeof n === "string" ? Number(n) : NaN;
  if (Number.isNaN(num)) return 50;
  return Math.min(100, Math.max(0, num));
}

export function eventCoverObjectPosition(focalX?: number | null, focalY?: number | null): string {
  return `${clampEventImageFocal(focalX)}% ${clampEventImageFocal(focalY)}%`;
}
