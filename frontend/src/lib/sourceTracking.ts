// Persistiert den ?source=-Tracking-Token (Partner-/Einladungs-Link) im localStorage,
// damit die Quelle erhalten bleibt, wenn der Nutzer vor der Registrierung erst
// auf der Plattform herumklickt (und der URL-Parameter dadurch verloren geht).

const STORAGE_KEY = "ijp_source";
const TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 Tage

// Liest einen ?source=-Parameter aus einem Query-String und speichert ihn (falls vorhanden).
export function captureSourceFromSearch(search: string): void {
  if (typeof window === "undefined") return;
  try {
    const token = new URLSearchParams(search).get("source");
    if (token) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ token, ts: Date.now() }));
    }
  } catch {
    /* localStorage nicht verfügbar – ignorieren */
  }
}

// Gibt den gespeicherten Source-Token zurück (oder null, wenn abgelaufen/nicht vorhanden).
export function getStoredSource(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const { token, ts } = JSON.parse(raw);
    if (!token || (ts && Date.now() - ts > TTL_MS)) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return token;
  } catch {
    return null;
  }
}

export function clearStoredSource(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignorieren */
  }
}
