"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { companyAPI } from "@/lib/api";
import toast from "react-hot-toast";
import {
  Sparkles, Star, Rocket, Filter, Check, X, Crown, ArrowLeft, Loader2, Mail, CheckCircle2
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

export default function CompanyPremiumPage() {
  const [isPremium, setIsPremium] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    companyAPI.getProfile()
      .then(r => setIsPremium(!!r.data?.is_premium))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

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

      {/* Preis */}
      <div className="card text-center mb-8">
        <p className="text-gray-500 text-sm mb-1">Preis</p>
        <p className="text-3xl font-bold text-gray-900 mb-1">Auf Anfrage</p>
        <p className="text-gray-500 text-sm">Individuelles Angebot – passend zu deinem Bedarf.</p>
      </div>

      {/* Interesse */}
      {!isPremium && (
        sent ? (
          <div className="card text-center bg-green-50 border border-green-200">
            <CheckCircle2 className="h-10 w-10 text-green-500 mx-auto mb-2" />
            <h2 className="text-lg font-bold text-gray-900 mb-1">Danke für dein Interesse!</h2>
            <p className="text-sm text-gray-600">Wir haben deine Anfrage erhalten und melden uns in Kürze bei dir.</p>
          </div>
        ) : (
          <div className="card">
            <h2 className="text-lg font-bold text-gray-900 mb-2 flex items-center gap-2">
              <Mail className="h-5 w-5 text-primary-600" /> Interesse an Premium?
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              Hinterlass uns kurz eine Nachricht (optional) – wir melden uns mit einem passenden Angebot.
            </p>
            <textarea
              className="input-styled w-full mb-3"
              rows={3}
              placeholder="z.B. Wir suchen regelmäßig Saisonkräfte und möchten den KI-Generator nutzen…"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              disabled={sending}
            />
            <button onClick={handleInterest} disabled={sending} className="btn-primary flex items-center gap-2">
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Crown className="h-4 w-4" />}
              Premium anfragen
            </button>
          </div>
        )
      )}
    </div>
  );
}
