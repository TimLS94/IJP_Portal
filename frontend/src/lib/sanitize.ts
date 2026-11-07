import DOMPurify from "isomorphic-dompurify";

/**
 * Bereinigt HTML vor dem Einsatz in dangerouslySetInnerHTML.
 *
 * Entfernt <script>, Event-Handler (onerror, onclick, …), javascript:-URLs und
 * andere XSS-Vektoren. Erlaubt nur eine sichere Teilmenge an Formatierungs-Tags.
 * Funktioniert serverseitig (SSR/SSG via jsdom) und im Browser.
 *
 * Nutze das IMMER, wenn Inhalt aus der DB/aus Nutzer-/Scrape-/KI-Quellen als HTML
 * gerendert wird (Stellen-Texte, Blog). Niemals rohen Inhalt direkt in
 * dangerouslySetInnerHTML geben.
 */
const ALLOWED_TAGS = [
  "p", "br", "b", "strong", "i", "em", "u", "s",
  "ul", "ol", "li",
  "h1", "h2", "h3", "h4", "h5", "h6",
  "a", "span", "div", "blockquote", "hr",
  "table", "thead", "tbody", "tr", "th", "td",
];

const ALLOWED_ATTR = ["href", "target", "rel", "class"];

export function sanitizeHtml(dirty: string | null | undefined): string {
  if (!dirty) return "";
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    // Nur sichere URL-Schemata bei href (kein javascript:, data:, vbscript:)
    ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|tel):|[^a-z]|[a-z+.-]+(?:[^a-z+.\-:]|$))/i,
    FORBID_TAGS: ["script", "style", "iframe", "object", "embed", "form", "input"],
    FORBID_ATTR: ["style", "onerror", "onload", "onclick"],
  });
}
