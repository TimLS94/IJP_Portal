"use client";

import Link from "next/link";
import {
  HelpCircle, Download, HelpCircle as FaqIcon, Mail, Building2, Briefcase,
  FileText, Calendar, Users, Crown, Settings, ShieldCheck, Languages, Rocket,
} from "lucide-react";

// Hilfe & Support für Unternehmen inkl. vollständigem Nutzerhandbuch.
// Druckbar / als PDF speicherbar über den Button (window.print).

interface Section {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  steps: (string | { sub: string[] })[];
}

const SECTIONS: Section[] = [
  {
    id: "konto",
    icon: ShieldCheck,
    title: "1. Konto & Anmeldung",
    steps: [
      "Nach der Registrierung wird Ihr Firmenkonto von uns geprüft und freigeschaltet. Sie erhalten eine Bestätigung und können sich dann unter „Anmelden“ einloggen.",
      "Passwort vergessen? Über „Anmelden → Passwort vergessen“ setzen Sie es per E-Mail neu.",
      "Weitere Mitarbeitende können Sie unter „Team“ einladen – so arbeiten mehrere Personen auf demselben Firmenkonto.",
    ],
  },
  {
    id: "profil",
    icon: Building2,
    title: "2. Firmenprofil pflegen",
    steps: [
      "Unter „Firmenprofil“ hinterlegen Sie Firmenname, Logo, Branche, Standort, Website und eine Beschreibung.",
      "Ein vollständiges Profil mit Logo wirkt seriöser und verbessert die Sichtbarkeit Ihrer Stellen – Bewerber:innen sehen diese Angaben auf jeder Stellenanzeige.",
    ],
  },
  {
    id: "stellen",
    icon: Briefcase,
    title: "3. Stellenanzeigen erstellen & verwalten",
    steps: [
      "Unter „Meine Stellen“ → „Neue Stelle“ legen Sie eine Anzeige an.",
      { sub: [
        "Titel inkl. (m/w/d), z. B. „Servicekraft (m/w/d)“",
        "Stellenart (Saisonjob, Studentenferienjob, Fachkraft, Ausbildung, Work & Holiday …)",
        "Beschreibung, Aufgaben, Anforderungen und Benefits",
        "Ort, Gehalt, benötigte Sprachkenntnisse, ob eine Unterkunft gestellt wird, sowie eine Bewerbungsfrist",
      ]},
      "Sie können eine Stelle zunächst als Entwurf speichern und später veröffentlichen. Erst beim Veröffentlichen wird sie für Bewerber:innen sichtbar.",
      "Veröffentlichte Stellen können Sie jederzeit bearbeiten, archivieren (offline nehmen) oder wieder reaktivieren.",
      "Mehrsprachigkeit: Eigene Stellen werden automatisch ins Englische übersetzt und bekommen eine eigene englische URL – so werden Sie auch international gefunden. Sie können Übersetzungen bei Bedarf nachbearbeiten.",
    ],
  },
  {
    id: "bewerbungen",
    icon: FileText,
    title: "4. Bewerbungen verwalten",
    steps: [
      "Unter „Bewerbungen“ sehen Sie alle eingehenden Bewerbungen – je Stelle gebündelt.",
      "Zu jeder Bewerbung sehen Sie das Profil, die hochgeladenen Dokumente (Lebenslauf etc.) und einen Matching-Hinweis, wie gut die Person zur Stelle passt.",
      "Setzen Sie den Status (z. B. in Prüfung, eingeladen, zugesagt, abgesagt), um den Überblick zu behalten. Bewerber:innen sehen einen passenden öffentlichen Status.",
    ],
  },
  {
    id: "gespraeche",
    icon: Calendar,
    title: "5. Vorstellungsgespräche & Kalender",
    steps: [
      "Unter „Kalender“ planen Sie Vorstellungsgespräche und sehen anstehende Termine auf einen Blick.",
      "Ein Gespräch können Sie absagen oder verschieben – die Bewerber:innen werden informiert, der Status bleibt nachvollziehbar.",
    ],
  },
  {
    id: "absagen",
    icon: FileText,
    title: "6. Absagen (manuell & automatisch)",
    steps: [
      "In den „Absage-Einstellungen“ hinterlegen Sie Vorlagen für freundliche, einheitliche Absagen.",
      "Optional können Sie automatische Absagen konfigurieren (z. B. für Bewerbungen, die klar nicht passen), um Zeit zu sparen.",
    ],
  },
  {
    id: "team",
    icon: Users,
    title: "7. Team verwalten",
    steps: [
      "Unter „Team“ laden Sie Kolleg:innen ein, die ebenfalls Stellen und Bewerbungen bearbeiten dürfen.",
      "So bleibt die Arbeit auf mehrere Schultern verteilt – alle sehen denselben Stand.",
    ],
  },
  {
    id: "premium",
    icon: Crown,
    title: "8. Premium & Stellen hervorheben",
    steps: [
      "Unter „Premium“ finden Sie Optionen, um Stellen hervorzuheben bzw. zu boosten – für mehr Reichweite und schnellere Besetzung.",
      "Hervorgehobene Stellen werden prominenter ausgespielt und gezielter an passende Kandidat:innen verteilt.",
    ],
  },
  {
    id: "ijp",
    icon: Rocket,
    title: "9. IJP beauftragen & IJP-Stellenservice",
    steps: [
      "Unter „IJP beauftragen“ können Sie uns damit beauftragen, passende Kandidat:innen für Sie zu finden und vorzuschlagen.",
      "In den „Einstellungen“ können Sie zusätzlich den IJP-Stellenservice aktivieren: Damit erlauben Sie IJP, nach Absprache automatisiert Stellen für Ihr Konto zu schalten (z. B. aus von Ihnen gelieferten Links). Diese erscheinen dann als normale Stellen in Ihrem Konto und können von Ihnen bearbeitet oder gelöscht werden.",
    ],
  },
  {
    id: "einstellungen",
    icon: Settings,
    title: "10. Einstellungen & Benachrichtigungen",
    steps: [
      "In den „Einstellungen“ verwalten Sie Ihr Konto, Benachrichtigungen und den IJP-Stellenservice.",
      "Über die „Digest-Einstellungen“ legen Sie fest, wie oft Sie zusammenfassende E-Mails zu neuen Bewerbungen erhalten möchten.",
    ],
  },
  {
    id: "sprache",
    icon: Languages,
    title: "11. Sprache der Oberfläche",
    steps: [
      "Oben rechts können Sie die Sprache der Oberfläche umstellen (Deutsch, Englisch, Spanisch, Russisch).",
    ],
  },
];

export default function HilfePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Kopf */}
        <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <HelpCircle className="h-7 w-7 text-primary-600" />
              Hilfe & Support
            </h1>
            <p className="text-gray-600 mt-1">Nutzerhandbuch für Unternehmen – alles Wichtige auf einen Blick.</p>
          </div>
          <a
            href="/nutzerhandbuch-unternehmen.pdf"
            download
            className="inline-flex items-center gap-2 btn-primary"
          >
            <Download className="h-4 w-4" />
            Nutzerhandbuch herunterladen (PDF)
          </a>
        </div>

        {/* Schnellhilfe-Karten */}
        <div className="no-print grid sm:grid-cols-3 gap-4 mb-8">
          <Link href="/faq" className="help-card bg-white rounded-xl border p-5 hover:border-primary-300 hover:shadow-sm transition">
            <FaqIcon className="h-6 w-6 text-primary-600 mb-2" />
            <p className="font-semibold text-gray-900">FAQ</p>
            <p className="text-sm text-gray-500">Häufige Fragen & schnelle Antworten</p>
          </Link>
          <Link href="/contact" className="help-card bg-white rounded-xl border p-5 hover:border-primary-300 hover:shadow-sm transition">
            <Mail className="h-6 w-6 text-primary-600 mb-2" />
            <p className="font-semibold text-gray-900">Kontakt & Support</p>
            <p className="text-sm text-gray-500">Persönliche Unterstützung anfragen</p>
          </Link>
          <a href="/nutzerhandbuch-unternehmen.pdf" download className="help-card bg-white rounded-xl border p-5 hover:border-primary-300 hover:shadow-sm transition">
            <FileText className="h-6 w-6 text-primary-600 mb-2" />
            <p className="font-semibold text-gray-900">Nutzerhandbuch (PDF)</p>
            <p className="text-sm text-gray-500">Ausführlich mit Screenshots – zum Herunterladen</p>
          </a>
        </div>

        {/* Handbuch */}
        <div id="handbuch" className="space-y-4">
          {/* Vollständiges PDF-Handbuch mit Screenshots */}
          <div className="help-card bg-primary-600 text-white rounded-xl p-5 flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-start gap-3 min-w-0">
              <FileText className="h-7 w-7 shrink-0" />
              <div>
                <p className="font-semibold">Vollständiges Nutzerhandbuch (PDF)</p>
                <p className="text-sm text-white/80">Ausführliche Schritt-für-Schritt-Anleitung mit Screenshots.</p>
              </div>
            </div>
            <a
              href="/nutzerhandbuch-unternehmen.pdf"
              download
              className="inline-flex items-center gap-2 bg-white text-primary-700 font-medium px-4 py-2 rounded-lg hover:bg-primary-50 shrink-0"
            >
              <Download className="h-4 w-4" />
              Herunterladen
            </a>
          </div>

          <h2 className="text-xl font-bold text-gray-900 scroll-mt-24 pt-2">Schnellüberblick</h2>
          <p className="text-sm text-gray-500 -mt-2">Das Wichtigste auf einen Blick – Details stehen im PDF-Handbuch oben.</p>
          {SECTIONS.map((s) => {
            const Icon = s.icon;
            return (
              <section key={s.id} className="help-card bg-white rounded-xl border p-5">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-3">
                  <Icon className="h-5 w-5 text-primary-600 shrink-0" />
                  {s.title}
                </h3>
                <ul className="space-y-2 text-sm text-gray-700">
                  {s.steps.map((step, i) =>
                    typeof step === "string" ? (
                      <li key={i} className="flex gap-2">
                        <span className="text-primary-500 mt-1">•</span>
                        <span>{step}</span>
                      </li>
                    ) : (
                      <li key={i} className="pl-4">
                        <ul className="space-y-1">
                          {step.sub.map((x, j) => (
                            <li key={j} className="flex gap-2 text-gray-600">
                              <span className="text-gray-300 mt-1">–</span>
                              <span>{x}</span>
                            </li>
                          ))}
                        </ul>
                      </li>
                    )
                  )}
                </ul>
              </section>
            );
          })}

          {/* Support-Hinweis */}
          <section className="help-card bg-primary-50 border border-primary-100 rounded-xl p-5">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-2">
              <Mail className="h-5 w-5 text-primary-600" />
              Noch Fragen?
            </h3>
            <p className="text-sm text-gray-700">
              Unser Team hilft Ihnen gern weiter. Schauen Sie zuerst in die{" "}
              <Link href="/faq" className="text-primary-700 underline">FAQ</Link>{" "}
              oder schreiben Sie uns über das{" "}
              <Link href="/contact" className="text-primary-700 underline">Kontaktformular</Link>.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
