import { DateTime } from "luxon";

export const EVENT_ADMIN_TIMEZONE = "Europe/Warsaw";

/**
 * Значение для input[type=datetime-local]: «стеночное» время в Europe/Warsaw (не TZ сервера).
 */
export function toDatetimeLocalValueWarsaw(isoUtc: string): string {
  const dt = DateTime.fromISO(isoUtc.trim(), { zone: "utc" });
  if (!dt.isValid) return "";
  return dt.setZone(EVENT_ADMIN_TIMEZONE).toFormat("yyyy-MM-dd'T'HH:mm");
}

/**
 * Строка из админской формы без смещения — трактуем как Europe/Warsaw → ISO UTC для timestamptz.
 */
export function parseStartsAtFromAdminForm(datetimeLocal: string): string {
  const trimmed = datetimeLocal.trim();
  const dt = DateTime.fromFormat(trimmed, "yyyy-MM-dd'T'HH:mm", { zone: EVENT_ADMIN_TIMEZONE });
  if (!dt.isValid) {
    throw new Error(`INVALID_STARTS_AT: ${dt.invalidReason ?? "unknown"}`);
  }
  const utc = dt.toUTC();
  const iso = utc.toISO();
  if (!iso) throw new Error("INVALID_STARTS_AT: empty ISO");
  return iso;
}
