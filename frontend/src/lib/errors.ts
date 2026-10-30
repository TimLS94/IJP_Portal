// Wandelt beliebige API-/Axios-Fehler in eine anzeigbare Zeichenkette um.
//
// WICHTIG: FastAPI/Pydantic liefert bei Validierungsfehlern (HTTP 422) unter
// `detail` ein ARRAY von Objekten ({type, loc, msg, input, url}). Wird dieses
// Array/Objekt direkt an toast.error(...) oder in JSX gegeben, stürzt React mit
// Error #31 ab ("Objects are not valid as a React child"). Darum alle API-Fehler
// vor der Anzeige durch getErrorMessage() schicken.

function normalizeDetail(detail: unknown): string | null {
  if (detail == null) return null;
  if (typeof detail === "string") return detail.trim() || null;
  if (Array.isArray(detail)) {
    const parts = detail
      .map((d) => {
        if (typeof d === "string") return d;
        if (d && typeof d === "object" && "msg" in (d as Record<string, unknown>)) {
          return String((d as Record<string, unknown>).msg);
        }
        return null;
      })
      .filter(Boolean) as string[];
    return parts.length ? parts.join(" · ") : null;
  }
  if (typeof detail === "object" && "msg" in (detail as Record<string, unknown>)) {
    return String((detail as Record<string, unknown>).msg);
  }
  return null;
}

export function getErrorMessage(error: unknown, fallback = "Etwas ist schiefgelaufen. Bitte versuche es erneut."): string {
  const anyErr = error as { response?: { data?: { detail?: unknown; message?: unknown } }; message?: unknown };
  const data = anyErr?.response?.data;
  const fromDetail = normalizeDetail(data?.detail);
  if (fromDetail) return fromDetail;
  if (typeof data?.message === "string" && data.message.trim()) return data.message.trim();
  if (typeof anyErr?.message === "string" && anyErr.message.trim()) return anyErr.message.trim();
  return fallback;
}
