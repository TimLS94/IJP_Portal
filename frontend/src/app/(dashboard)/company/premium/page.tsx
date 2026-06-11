"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { billingAPI, companyAPI } from "@/lib/api";
import toast from "react-hot-toast";
import {
  Sparkles, Star, Rocket, Filter, Check, X, Crown, ArrowLeft, Loader2, Mail, CheckCircle2, Settings
} from "lucide-react";

interface FeatureRow {
  label: string;
  free: boolean;
  premium: boolean;
  icon: React.ComponentType<{ className?: string }>;
}

const FEATURES: FeatureRow[] = [
  { label: "Stellenanzeigen erstellen & verwalten", free: true, premium: true, icon: Check },
  { label: "Bewerbungen empfangen & verwalten", free: true, premium: true, icon: Check },
  { label: "Match-Score sehen", free: true, premium: true, icon: Check },
  { label: "KI-Stellengenerator (Anzeige automatisch ausfüllen)", free: false, premium: true, icon: Sparkles },
  { label: "Score-Filter & Sortierung nach Match-Score", free: false, premium: true, icon: Filter },
  { label: "Stellen hervorheben (1× pro Monat)", free: false, premium: true, icon: Star },
  { label: "Booster für mehr Reichweite (2× pro Monat)", free: false, premium: true, icon: Rocket },
];

interface BillingStatus {
  is_premium: boolean;
  has_subscription: boolean;
  premium_until: string | null;
  cancel_at_period_end: boolean;
  price_eur: number;
  trial_days: number;
  stripe_configured: boolean;
}

function CompanyPremiumContent() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<BillingStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [redirecting, setRedirecting] = useState(false);
  const [showContact, setShowContact] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    billingAPI.getStatus()
      .then(r => setStatus(r.data))
      .catch(() => setStatus(null))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (searchParams.get("success")) {
      toast.success("Zahlung erfolgreich – dein Premium wird in wenigen Sekunden aktiviert.");
    } else if (searchParams.get("canceled")) {
      toast("Vorgang abgebrochen – kein Problem, du kannst es jederzeit erneut versuchen.", { icon: "ℹ️" });
    }
  }, [searchParams]);

  const isPremium = !!status?.is_premium;
  const priceEur = status?.price_eur ?? 29;
  const trialDays = status?.trial_days ?? 0;

  const handleCheckout = async () => {
    setRedirecting(true);
    try {
      const r = await billingAPI.createCheckout();
      if (r.data?.url) {
        window.location.href = r.data.url;
      } else {
        toast.error("Checkout konnte nicht gestartet werden.");
        setRedirecting(false);
      }
    } catch (e: unknown) {
      const detail = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      toast.error(detail || "Checkout konnte nicht gestartet werden.");
      setRedirecting(false);
    }
  };

  const handlePortal = async () => {
    setRedirecting(true);
    try {
      const r = await billingAPI.openPortal();
      if (r.data?.url) {
        window.location.href = r.data.url;
      } else {
        toast.error("Kundenportal konnte nicht geöffnet werden.");
        setRedirecting(false);
      }
    } catch {
      toast.error("Kundenportal konnte nicht geöffnet werden.");
      setRedirecting(false);
    }
  };

  const handleInterest = async () => {
    setSending(true);
    try {
      await companyAPI.requestPremiumInterest(message.trim() || undefined);
      setSent(true);
      toast.success("Anfrage gesendet – wir melden uns bei dir!");
    } catch {
      toast.error("Fehler beim Senden. Bitte später erneut versuchen.");
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-primary-600" /></div>;
  }

  return (
    <div className="max-w-3xl mx-auto">
      <Link href="/company/dashboard" className="inline-flex items-center gap-2 text-gray-600 hover:text-primary-600 mb-6">
        <ArrowLeft className="h-4 w-4" /> Zurück
      </Link>

      {/* Hero */}
      <div className="rounded-2xl bg-gradient-to-br from-primary-600 via-primary-500 to-indigo-500 text-white p-8 mb-8 text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 bg-white/20 rounded-2xl mb-3">
          <Crown className="h-8 w-8" />
        </div>
        <h1 className="text-3xl font-bold mb-2">JobOn Premium</h1>
        <p className="text-white/85 max-w-xl mx-auto">
          Schneller die richtigen Mitarbeiter finden – mit KI-Tools, mehr Sichtbarkeit und smartem Bewerbungs-Filter.
        </p>
        {isPremium && (
          <div className="inline-flex items-center gap-2 mt-4 bg-white/20 px-4 py-2 rounded-full text-sm font-medium">
            <CheckCircle2 className="h-4 w-4" /> Dein Account ist Premium
          </div>
        )}
      </div>

      {/* Vergleich */}
      <div className="card overflow-hidden mb-8 p-0">
        <div className="grid grid-cols-[1fr_auto_auto] text-sm">
          <div className="px-4 py-3 font-semibold text-gray-500 bg-gray-50">Funktion</div>
          <div className="px-4 py-3 font-semibold text-gray-500 bg-gray-50 text-center w-24">Free</div>
          <div className="px-4 py-3 font-semibold text-primary-700 bg-primary-50 text-center w-24 flex items-center justify-center gap-1">
            <Crown className="h-4 w-4" /> Premium
          </div>
          {FEATURES.map((f, i) => {
            const Icon = f.icon;
            return (
              <div key={i} className="contents">
                <div className={`px-4 py-3 flex items-center gap-2 text-gray-700 ${i % 2 ? "bg-white" : "bg-gray-50/50"}`}>
                  <Icon className="h-4 w-4 text-primary-500 shrink-0" />{f.label}
                </div>
                <div className={`px-4 py-3 text-center ${i % 2 ? "bg-white" : "bg-gray-50/50"}`}>
                  {f.free ? <Check className="h-5 w-5 text-green-500 mx-auto" /> : <X className="h-5 w-5 text-gray-300 mx-auto" />}
                </div>
                <div className={`px-4 py-3 text-center ${i % 2 ? "bg-primary-50/40" : "bg-primary-50/60"}`}>
                  {f.premium ? <Check className="h-5 w-5 text-primary-600 mx-auto" /> : <X className="h-5 w-5 text-gray-300 mx-auto" />}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Preis + Abschluss */}
      {isPremium ? (
        <div className="card text-center mb-8">
          <CheckCircle2 className="h-10 w-10 text-green-500 mx-auto mb-2" />
          <h2 className="text-xl font-bold text-gray-900 mb-1">Du nutzt JobOn Premium</h2>
          {status?.premium_until && (
            <p className="text-sm text-gray-600 mb-1">
              {status.cancel_at_period_end ? "Läuft noch bis" : "Nächste Verlängerung am"}{" "}
              {new Date(status.premium_until).toLocaleDateString("de-DE", { day: "2-digit", month: "long", year: "numeric" })}
            </p>
          )}
          {status?.cancel_at_period_end && (
            <p className="text-sm text-amber-600 mb-3">Dein Abo wurde gekündigt und endet zum genannten Datum.</p>
          )}
          {status?.has_subscription && (
            <button onClick={handlePortal} disabled={redirecting} className="btn-secondary inline-flex items-center gap-2 mt-3">
              {redirecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Settings className="h-4 w-4" />}
              Abo verwalten
            </button>
          )}
        </div>
      ) : (
        <div className="card text-center mb-8">
          <p className="text-gray-500 text-sm mb-1">Preis</p>
          <p className="text-4xl font-bold text-gray-900">
            {priceEur.toLocaleString("de-DE")} €
            <span className="text-base font-medium text-gray-500"> / Monat</span>
          </p>
          <p className="text-gray-500 text-sm mt-1 mb-5">
            Monatlich kündbar{trialDays > 0 ? ` · ${trialDays} Tage kostenlos testen` : ""}.
          </p>
          <button
            onClick={handleCheckout}
            disabled={redirecting || (status ? !status.stripe_configured : false)}
            className="btn-primary inline-flex items-center gap-2 text-base px-6 py-3"
          >
            {redirecting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Crown className="h-5 w-5" />}
            {trialDays > 0 ? `${trialDays} Tage kostenlos testen` : "Premium buchen"}
          </button>
          {status && !status.stripe_configured && (
            <p className="text-xs text-amber-600 mt-3">
              Online-Zahlung ist gerade nicht verfügbar. Nutze unten den Kontakt-Button.
            </p>
          )}
          <p className="text-xs text-gray-400 mt-3">
            Sichere Zahlung über Stripe. Du wirst zum Bezahlvorgang weitergeleitet.
          </p>
        </div>
      )}

      {/* Kontakt (Rückfragen) */}
      {!isPremium && (
        <div className="text-center">
          {sent ? (
            <div className="card bg-green-50 border border-green-200">
              <CheckCircle2 className="h-8 w-8 text-green-500 mx-auto mb-2" />
              <p className="text-sm text-gray-700">Danke! Wir haben deine Anfrage erhalten und melden uns in Kürze.</p>
            </div>
          ) : !showContact ? (
            <button onClick={() => setShowContact(true)} className="text-sm text-gray-500 hover:text-primary-600 inline-flex items-center gap-1.5">
              <Mail className="h-4 w-4" /> Fragen? Schreib uns vor dem Buchen
            </button>
          ) : (
            <div className="card text-left">
              <h2 className="text-base font-bold text-gray-900 mb-2 flex items-center gap-2">
                <Mail className="h-5 w-5 text-primary-600" /> Frage zu Premium
              </h2>
              <textarea
                className="input-styled w-full mb-3"
                rows={3}
                placeholder="z.B. Wir suchen regelmäßig Saisonkräfte und möchten den KI-Generator nutzen…"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                disabled={sending}
              />
              <div className="flex items-center gap-3">
                <button onClick={handleInterest} disabled={sending} className="btn-primary flex items-center gap-2">
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                  Nachricht senden
                </button>
                <button onClick={() => setShowContact(false)} className="btn-secondary text-sm">Abbrechen</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function CompanyPremiumPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-primary-600" /></div>}>
      <CompanyPremiumContent />
    </Suspense>
  );
}
