"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import toast from "react-hot-toast";
import { Loader2 } from "lucide-react";

const LANGS: { code: "de" | "en" | "es" | "ru"; flag: string; label: string }[] = [
  { code: "de", flag: "🇩🇪", label: "Deutsch" },
  { code: "en", flag: "🇬🇧", label: "English" },
  { code: "es", flag: "🇪🇸", label: "Español" },
  { code: "ru", flag: "🇷🇺", label: "Русский" },
];

/**
 * Fragt Bewerber beim ersten Login nach ihrer bevorzugten Sprache.
 * Zeigt sich nur, wenn eingeloggter Bewerber noch keine Sprache gewählt hat.
 */
export default function LanguagePrompt() {
  const { user, isApplicant, isAuthenticated, setLanguage } = useAuth();
  const [saving, setSaving] = useState<string | null>(null);

  const needsChoice =
    isAuthenticated && isApplicant && user != null && !user.preferred_language;

  if (!needsChoice) return null;

  const choose = async (code: "de" | "en" | "es" | "ru") => {
    setSaving(code);
    try {
      await setLanguage(code);
    } catch {
      toast.error("Fehler beim Speichern / Error saving");
      setSaving(null);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
        <div className="text-center mb-5">
          <div className="text-3xl mb-2">🌍</div>
          <h2 className="text-xl font-bold text-gray-900">Sprache wählen / Choose your language</h2>
          <p className="text-gray-500 text-sm mt-1">
            In welcher Sprache möchtest du das Portal nutzen? Du kannst das später in den Einstellungen ändern.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {LANGS.map((l) => (
            <button
              key={l.code}
              type="button"
              disabled={saving !== null}
              onClick={() => choose(l.code)}
              className="flex items-center justify-center gap-2 p-4 border-2 border-gray-200 rounded-xl hover:border-primary-500 hover:bg-primary-50 transition-all font-medium text-gray-800 disabled:opacity-60"
            >
              {saving === l.code ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <span className="text-2xl">{l.flag}</span>
              )}
              <span>{l.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
