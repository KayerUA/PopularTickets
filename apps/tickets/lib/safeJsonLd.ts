/** Безопасная сериализация для <script type="application/ld+json"> (без XSS / обрыва тега). */
export function safeJsonLdStringify(data: object): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
