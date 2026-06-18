// Sicheres Einbetten von JSON-LD in <script type="application/ld+json">.
// JSON.stringify escaped "<" nicht – ein Wert mit "</script>" könnte sonst aus
// dem Script-Tag ausbrechen (XSS). Hier werden die kritischen Zeichen escaped.
export function jsonLdHtml(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026");
}
