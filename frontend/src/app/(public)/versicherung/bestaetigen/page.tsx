"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { insuranceAPI } from "@/lib/api";

function BestaetigenInner() {
  const params = useSearchParams();
  const token = params.get("token") || "";
  const [state, setState] = useState<"loading" | "ok" | "already" | "error">("loading");
  const [redirectUrl, setRedirectUrl] = useState<string | null>(null);
  const [needsEmbassy, setNeedsEmbassy] = useState(false);

  useEffect(() => {
    let active = true;
    if (!token) { setState("error"); return; }
    (async () => {
      try {
        const res = await insuranceAPI.verifyEmail(token);
        if (!active) return;
        if (res.data?.ok) {
          setRedirectUrl(res.data?.redirect_url || null);
          setNeedsEmbassy(!!res.data?.needs_embassy_proof);
          setState(res.data?.already ? "already" : "ok");
        } else {
          setState("error");
        }
      } catch {
        if (active) setState("error");
      }
    })();
    return () => { active = false; };
  }, [token]);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
        {state === "loading" && (
          <>
            <Loader2 className="h-10 w-10 animate-spin text-primary-600 mx-auto mb-4" />
            <p className="text-slate-600">Wird bestätigt…</p>
          </>
        )}
        {(state === "ok" || state === "already") && (
          <>
            <div className="h-16 w-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="h-9 w-9 text-emerald-600" />
            </div>
            <h1 className="text-xl font-bold text-slate-900 mb-2">E-Mail bestätigt ✅</h1>
            <p className="text-slate-600">
              {needsEmbassy
                ? "Danke! Deine Anmeldung ist bestätigt. Wir stellen dir den Versicherungsnachweis für die Botschaft bereit und melden uns."
                : "Danke! Deine Anmeldung ist bestätigt. Du kannst jetzt direkt mit dem Anmeldeformular fortfahren."}
            </p>
            {redirectUrl && !needsEmbassy ? (
              <a
                href={redirectUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block mt-6 px-6 py-3 rounded-xl bg-primary-600 text-white font-semibold hover:bg-primary-700 transition"
              >
                Zum Anmeldeformular →
              </a>
            ) : (
              <Link href="/arbeitnehmer/krankenkasse" className="inline-block mt-6 px-6 py-3 rounded-xl bg-primary-600 text-white font-semibold hover:bg-primary-700 transition">
                Zur Krankenkassen-Seite
              </Link>
            )}
          </>
        )}
        {state === "error" && (
          <>
            <div className="h-16 w-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <XCircle className="h-9 w-9 text-red-600" />
            </div>
            <h1 className="text-xl font-bold text-slate-900 mb-2">Link ungültig oder abgelaufen</h1>
            <p className="text-slate-600">
              Dieser Bestätigungslink ist ungültig oder abgelaufen. Bitte melde dich erneut an.
            </p>
            <Link href="/arbeitnehmer/krankenkasse#anmelden" className="inline-block mt-6 px-6 py-3 rounded-xl bg-primary-600 text-white font-semibold hover:bg-primary-700 transition">
              Erneut anmelden
            </Link>
          </>
        )}
      </div>
    </div>
  );
}

export default function VersicherungBestaetigenPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50" />}>
      <BestaetigenInner />
    </Suspense>
  );
}
