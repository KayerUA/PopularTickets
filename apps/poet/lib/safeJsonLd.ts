/** Безопасная сериализация для <script type="application/ld+json">. */
export function safeJsonLdStringify(data: object): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
