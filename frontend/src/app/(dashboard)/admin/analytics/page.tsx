"use client";

import { BarChart3, Users, MousePointer, FileText, LogIn, LogOut, Upload, Send, Eye, Scroll, Clock, UserPlus } from "lucide-react";

const events = [
  {
    name: "page_view",
    label: "Seitenaufrufe",
    description: "Jemand hat eine Seite auf jobon.work aufgerufen",
    icon: Eye,
    color: "bg-blue-100 text-blue-600",
    category: "Standard",
  },
  {
    name: "user_engagement",
    label: "Aktive Nutzer",
    description: "User war mindestens 10 Sekunden aktiv auf der Seite oder hat interagiert",
    icon: Users,
    color: "bg-green-100 text-green-600",
    category: "Standard",
  },
  {
    name: "scroll",
    label: "Seite gescrollt",
    description: "User hat mindestens 90% der Seite nach unten gescrollt",
    icon: Scroll,
    color: "bg-purple-100 text-purple-600",
    category: "Standard",
  },
  {
    name: "session_start",
    label: "Neue Sitzung",
    description: "Eine neue Browsersitzung wurde gestartet (Besuch der Website)",
    icon: Clock,
    color: "bg-orange-100 text-orange-600",
    category: "Standard",
  },
  {
    name: "first_visit",
    label: "Erstbesucher",
    description: "Ein komplett neuer Besucher, der noch nie auf der Seite war",
    icon: UserPlus,
    color: "bg-teal-100 text-teal-600",
    category: "Standard",
  },
  {
    name: "form_start",
    label: "Formular begonnen",
    description: "Jemand hat angefangen ein Formular auszufüllen (z.B. Registrierung, Profil)",
    icon: FileText,
    color: "bg-yellow-100 text-yellow-600",
    category: "Formulare",
  },
  {
    name: "form_submit",
    label: "Formular abgeschickt",
    description: "Ein Formular wurde erfolgreich abgeschickt",
    icon: Send,
    color: "bg-emerald-100 text-emerald-600",
    category: "Formulare",
  },
  {
    name: "sign_up",
    label: "Registrierung",
    description: "Ein neuer User hat sich registriert (Bewerber oder Firma)",
    icon: UserPlus,
    color: "bg-emerald-100 text-emerald-600",
    category: "Auth",
  },
  {
    name: "login",
    label: "Login",
    description: "Ein User hat sich eingeloggt",
    icon: LogIn,
    color: "bg-indigo-100 text-indigo-600",
    category: "Auth",
  },
  {
    name: "logout",
    label: "Logout",
    description: "Ein User hat sich ausgeloggt",
    icon: LogOut,
    color: "bg-gray-100 text-gray-600",
    category: "Auth",
  },
  {
    name: "cv_auto_import",
    label: "CV Import",
    description: "Ein Lebenslauf wurde hochgeladen und automatisch geparst",
    icon: Upload,
    color: "bg-pink-100 text-pink-600",
    category: "Features",
  },
  {
    name: "job_view",
    label: "Job angesehen",
    description: "Eine Stellenanzeige wurde aufgerufen",
    icon: Eye,
    color: "bg-blue-100 text-blue-600",
    category: "Jobs",
  },
  {
    name: "job_apply_click",
    label: "Bewerben geklickt",
    description: "Der 'Jetzt bewerben' Button wurde geklickt",
    icon: MousePointer,
    color: "bg-green-100 text-green-600",
    category: "Jobs",
  },
  {
    name: "job_save",
    label: "Job gemerkt",
    description: "Eine Stelle wurde auf die Merkliste gesetzt",
    icon: FileText,
    color: "bg-red-100 text-red-600",
    category: "Jobs",
  },
];

const categories = ["Standard", "Formulare", "Auth", "Features", "Jobs"];

export default function AnalyticsHelpPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <div className="flex items-center gap-3 mb-8">
        <BarChart3 className="h-8 w-8 text-primary-600" />
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Analytics Events Übersicht</h1>
          <p className="text-gray-600">Was die Events in Google Analytics bedeuten</p>
        </div>
      </div>

      {/* Quick Stats Explanation */}
      <div className="card mb-8 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <h2 className="text-lg font-bold text-gray-900 mb-3">Wichtige Kennzahlen</h2>
        <div className="grid md:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="font-medium text-gray-700">Conversion Rate Registrierung:</p>
            <p className="text-gray-600">form_submit ÷ form_start × 100 = X%</p>
            <p className="text-xs text-gray-500 mt-1">Wie viele, die anfangen, schließen ab?</p>
          </div>
          <div>
            <p className="font-medium text-gray-700">Wiederkehrende Besucher:</p>
            <p className="text-gray-600">session_start - first_visit = Wiederkehrende</p>
            <p className="text-xs text-gray-500 mt-1">Wie viele kommen zurück?</p>
          </div>
          <div>
            <p className="font-medium text-gray-700">Engagement Rate:</p>
            <p className="text-gray-600">user_engagement ÷ page_view × 100 = X%</p>
            <p className="text-xs text-gray-500 mt-1">Wie viele bleiben länger als 10 Sek?</p>
          </div>
          <div>
            <p className="font-medium text-gray-700">CV Feature Nutzung:</p>
            <p className="text-gray-600">cv_auto_import ÷ form_submit × 100 = X%</p>
            <p className="text-xs text-gray-500 mt-1">Wie viele nutzen den CV-Import?</p>
          </div>
        </div>
      </div>

      {/* Events by Category */}
      {categories.map((category) => {
        const categoryEvents = events.filter((e) => e.category === category);
        if (categoryEvents.length === 0) return null;

        return (
          <div key={category} className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">{category} Events</h2>
            <div className="grid gap-3">
              {categoryEvents.map((event) => (
                <div
                  key={event.name}
                  className="card flex items-center gap-4 p-4 hover:shadow-md transition-shadow"
                >
                  <div className={`p-3 rounded-xl ${event.color}`}>
                    <event.icon className="h-6 w-6" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-gray-900">{event.label}</span>
                      <code className="text-xs bg-gray-100 px-2 py-0.5 rounded text-gray-600">
                        {event.name}
                      </code>
                    </div>
                    <p className="text-sm text-gray-600">{event.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {/* Link to GA4 */}
      <div className="card bg-gray-50 border-gray-200">
        <h2 className="text-lg font-bold text-gray-900 mb-2">Google Analytics öffnen</h2>
        <p className="text-gray-600 text-sm mb-4">
          Für detaillierte Auswertungen, Zeiträume und Vergleiche nutze Google Analytics direkt.
        </p>
        <a
          href="https://analytics.google.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="btn-primary inline-flex items-center gap-2"
        >
          <BarChart3 className="h-4 w-4" />
          Google Analytics öffnen
        </a>
      </div>
    </div>
  );
}
