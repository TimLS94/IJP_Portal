"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Für Debugging in der Browser-Konsole sichtbar machen
    console.error("App-Fehler:", error);
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 text-center bg-gray-50">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Etwas ist schiefgelaufen</h1>
      <p className="text-gray-600 mb-6 max-w-md">
        Es ist ein unerwarteter Fehler aufgetreten. Bitte versuche es erneut oder lade die Seite neu.
      </p>
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
