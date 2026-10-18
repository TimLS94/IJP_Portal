"use client";

import { useEffect, useState } from "react";

// Fängt Fehler ab, die im Root-Layout auftreten (z.B. Provider-Initialisierung).
// Muss eigenes <html>/<body> mitbringen und ohne Tailwind auskommen (Inline-Styles),
// da es das Root-Layout ersetzt.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [ref] = useState(
    () => error.digest || "ERR-" + Date.now().toString(36).slice(-6).toUpperCase()
  );
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    console.error("Globaler App-Fehler [" + ref + "]:", error);
  }, [error, ref]);

  const copy = async () => {
    try {
      const w = typeof window !== "undefined" ? window : ({} as Window);
      const txt = [
        "Fehlercode: " + ref,
        "Meldung: " + (error?.message || "—"),
        error.digest ? "Digest: " + error.digest : "",
        "Zeit: " + new Date().toISOString(),
        "URL: " + (w.location ? w.location.href : "—"),
        "Browser: " + (typeof navigator !== "undefined" ? navigator.userAgent : "—"),
      ]
        .filter(Boolean)
        .join("\n");
      await navigator.clipboard.writeText(txt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  const box: React.CSSProperties = {
    width: "100%",
    maxWidth: 420,
    textAlign: "left",
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  };

  return (
    <html lang="de">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", background: "#f9fafb" }}>
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
            padding: "0 16px",
          }}
        >
          <h1 style={{ fontSize: 24, fontWeight: 700, color: "#111827", marginBottom: 8 }}>
            Etwas ist schiefgelaufen
          </h1>
          <p style={{ color: "#4b5563", marginBottom: 16, maxWidth: 420 }}>
            Es ist ein unerwarteter Fehler aufgetreten. Bitte lade die Seite neu.
          </p>

          <div style={box}>
            <p style={{ fontSize: 12, color: "#6b7280", margin: "0 0 4px" }}>Fehlercode</p>
            <p style={{ fontFamily: "monospace", fontSize: 14, fontWeight: 600, color: "#111827", margin: "0 0 12px", wordBreak: "break-all" }}>
              {ref}
            </p>
            {error?.message && (
              <>
                <p style={{ fontSize: 12, color: "#6b7280", margin: "0 0 4px" }}>Meldung</p>
                <p style={{ fontFamily: "monospace", fontSize: 12, color: "#b91c1c", margin: 0, wordBreak: "break-all", whiteSpace: "pre-wrap" }}>
                  {error.message}
                </p>
              </>
            )}
            <button
              onClick={copy}
              style={{ marginTop: 12, background: "none", border: "none", color: "#2563eb", fontSize: 14, fontWeight: 500, cursor: "pointer", padding: 0 }}
            >
              {copied ? "✓ Kopiert" : "Details kopieren"}
            </button>
          </div>

          <button
            onClick={reset}
            style={{
              background: "#2563eb",
              color: "#fff",
              border: "none",
              padding: "10px 20px",
              borderRadius: 8,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Erneut versuchen
          </button>
        </div>
      </body>
    </html>
  );
}
