"use client";

import { useEffect, useState } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  // Referenz-Code: Next.js-digest (korreliert mit Server-Logs) oder generierter Code.
  const [ref] = useState(
    () => error.digest || "ERR-" + Date.now().toString(36).slice(-6).toUpperCase()
  );
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // Vollständig in der Browser-Konsole sichtbar machen
    console.error("App-Fehler [" + ref + "]:", error);
  }, [error, ref]);

  const diagnostics = () => {
    const w = typeof window !== "undefined" ? window : ({} as Window);
    return [
      "Fehlercode: " + ref,
      "Meldung: " + (error?.message || "—"),
      error.digest ? "Digest: " + error.digest : "",
      "Zeit: " + new Date().toISOString(),
      "URL: " + (w.location ? w.location.href : "—"),
      "Browser: " + (typeof navigator !== "undefined" ? navigator.userAgent : "—"),
    ]
      .filter(Boolean)
      .join("\n");
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(diagnostics());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 text-center bg-gray-50">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Etwas ist schiefgelaufen</h1>
      <p className="text-gray-600 mb-4 max-w-md">
        Es ist ein unerwarteter Fehler aufgetreten. Bitte versuche es erneut oder lade die Seite neu.
      </p>

      {/* Fehlercode + Meldung für Debugging */}
      <div className="w-full max-w-md text-left bg-white border border-gray-200 rounded-xl p-4 mb-6">
        <p className="text-xs text-gray-500 mb-1">Fehlercode</p>
        <p className="font-mono text-sm font-semibold text-gray-900 mb-3 break-all">{ref}</p>
        {error?.message && (
          <>
            <p className="text-xs text-gray-500 mb-1">Meldung</p>
            <p className="font-mono text-xs text-red-700 break-all whitespace-pre-wrap">
              {error.message}
            </p>
          </>
        )}
        <button onClick={copy} className="mt-3 text-sm text-primary-600 hover:text-primary-700 font-medium">
          {copied ? "✓ Kopiert" : "Details kopieren"}
        </button>
      </div>

      <div className="flex flex-wrap gap-3 justify-center">
        <button onClick={reset} className="btn-primary">
          Erneut versuchen
        </button>
        <button
          onClick={() => {
            if (typeof window !== "undefined") window.location.href = "/";
          }}
          className="btn-secondary"
        >
          Zur Startseite
        </button>
      </div>
    </div>
  );
}
