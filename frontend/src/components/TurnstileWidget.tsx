"use client";

import { useEffect, useRef } from "react";

// Cloudflare Turnstile (unsichtbares/verwaltetes Captcha). Rendert das Widget und
// liefert das Token per onToken. Aktiv nur, wenn ein Site-Key uebergeben wird
// (NEXT_PUBLIC_TURNSTILE_SITE_KEY). Ohne Key wird die Komponente nicht eingebunden.

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opts: Record<string, unknown>) => string;
      remove: (id: string) => void;
      reset: (id?: string) => void;
    };
  }
}

let scriptPromise: Promise<void> | null = null;
function loadTurnstileScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.turnstile) return Promise.resolve();
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise<void>((resolve) => {
    const s = document.createElement("script");
    s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => resolve(); // bei Ladefehler nicht blockieren
    document.head.appendChild(s);
  });
  return scriptPromise;
}

export default function TurnstileWidget({
  siteKey,
  onToken,
}: {
  siteKey: string;
  onToken: (token: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);

  useEffect(() => {
    let active = true;
    loadTurnstileScript().then(() => {
      if (!active || !ref.current || !window.turnstile) return;
      try {
        widgetId.current = window.turnstile.render(ref.current, {
          sitekey: siteKey,
          callback: (token: string) => onToken(token),
          "error-callback": () => onToken(""),
          "expired-callback": () => onToken(""),
        });
      } catch {
        /* ignore */
      }
    });
    return () => {
      active = false;
      try {
        if (widgetId.current && window.turnstile) window.turnstile.remove(widgetId.current);
      } catch {
        /* ignore */
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteKey]);

  return <div ref={ref} className="my-1" />;
}
