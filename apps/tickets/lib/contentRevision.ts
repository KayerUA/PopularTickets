export const CONTENT_UPDATED_AT = "2026-10-26T18:17:05Z";

export function latestContentDate(...values: (string | null | undefined)[]): Date {
  return new Date(Math.max(Date.parse(CONTENT_UPDATED_AT), ...values.map(value => value ? Date.parse(value) : 0).filter(Number.isFinite)));
}
