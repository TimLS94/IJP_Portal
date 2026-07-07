"use client";

import { useEffect } from "react";

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
  useEffect(() => {
    console.error("Globaler App-Fehler:", error);
  }, [error]);

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
          <p style={{ color: "#4b5563", marginBottom: 24, maxWidth: 420 }}>
            Es ist ein unerwarteter Fehler aufgetreten. Bitte lade die Seite neu.
          </p>
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
