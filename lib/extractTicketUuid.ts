/** Достаёт UUID билета из текста QR (сырой UUID или внутри URL). */
export function extractTicketUuid(text: string): string | null {
  const m = text.trim().match(
    /[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i
  );
  return m ? m[0].toLowerCase() : null;
}
