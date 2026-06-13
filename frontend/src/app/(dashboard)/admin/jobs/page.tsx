"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Briefcase, Trash2, Eye, Edit,
  MapPin, Building2, Users, Languages, Loader2, Check, X,
  Heart, ExternalLink
} from "lucide-react";
import { adminAPI } from "@/lib/api";
import toast from "react-hot-toast";

const positionTypeLabels: Record<string, string> = {
  studentenferienjob: "Studentenferienjob",
  saisonjob: "Saisonjob",
  workandholiday: "Work & Holiday",
  fachkraft: "Fachkräfte",
  ausbildung: "Ausbildung"
};

const positionTypeColors: Record<string, string> = {
  studentenferienjob: "bg-blue-100 text-blue-800",
  saisonjob: "bg-green-100 text-green-800",
  workandholiday: "bg-teal-100 text-teal-800",
  fachkraft: "bg-purple-100 text-purple-800",
  ausbildung: "bg-orange-100 text-orange-800"
};

const AVAILABLE_LANGUAGES = [
  { code: "en", name: "English", flag: "🇬🇧" },
  { code: "es", name: "Español", flag: "🇪🇸" },
  { code: "ru", name: "Русский", flag: "🇷🇺" },
];

interface Job {
  id: number;
  title: string;
  slug?: string;
  company_name: string;
  location?: string;
  position_type: string;
  is_active: boolean;
  is_external?: boolean;
  enrichment_source?: string | null;
  view_count?: number;
  like_count?: number;
  external_click_count?: number;
  application_count: number;
  available_languages?: string[];
  admin_translated_languages?: string[];
  created_at: string;
}

export default function AdminJobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [page, setPage] = useState(0);
  const limit = 20;
  
  // Translation Modal State
  const [translateModal, setTranslateModal] = useState<Job | null>(null);
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);
  const [translating, setTranslating] = useState(false);

  useEffect(() => {
    loadJobs();
  }, [activeFilter, typeFilter, page]);

  const loadJobs = async () => {
    setLoading(true);
    try {
      const params = {
        skip: page * limit,
        limit,
        ...(activeFilter !== "" && { is_active: activeFilter === "true" }),
        ...(typeFilter && { position_type: typeFilter }),
        _t: Date.now()  // Cache-Busting: verhindert veraltete GET-Antwort aus dem Browser-Cache
      };
      const response = await adminAPI.listJobs(params);
      setJobs(response.data.jobs || []);
      setTotal(response.data.total || 0);
    } catch {
      toast.error("Fehler beim Laden der Stellen");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number, title: string) => {
    if (!confirm(`Möchten Sie die Stelle "${title}" wirklich löschen? Alle zugehörigen Bewerbungen werden ebenfalls gelöscht.`)) {
      return;
    }
    
    try {
      await adminAPI.deleteJob(id);
      toast.success("Stelle gelöscht");
      loadJobs();
    } catch {
      toast.error("Fehler beim Löschen");
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
  };

  const openTranslateModal = (job: Job) => {
    const existingLangs = job.available_languages || ["de"];
    const missingLangs = AVAILABLE_LANGUAGES
      .filter(l => !existingLangs.includes(l.code))
      .map(l => l.code);
    setSelectedLanguages(missingLangs);
    setTranslateModal(job);
  };

  const handleTranslate = async () => {
    if (!translateModal || selectedLanguages.length === 0) return;
    
    setTranslating(true);
    try {
      const response = await adminAPI.translateJob(translateModal.id, selectedLanguages);
      if (response.data.success) {
        toast.success(response.data.message);
        loadJobs();
      } else {
        toast.error("Übersetzung fehlgeschlagen");
      }
      if (response.data.errors?.length > 0) {
        response.data.errors.forEach((err: string) => toast.error(err));
      }
    } catch (error: unknown) {
      const err = error as { response?: { data?: { detail?: string } } };
      toast.error(err.response?.data?.detail || "Fehler bei der Übersetzung");
    } finally {
      setTranslating(false);
      setTranslateModal(null);
    }
  };

  const toggleLanguage = (code: string) => {
    setSelectedLanguages(prev =>
      prev.includes(code)
        ? prev.filter(l => l !== code)
        : [...prev, code]
    );
  };

  const handleToggleActive = async (job: Job) => {
    const newActive = !job.is_active;
    try {
      await adminAPI.updateJob(job.id, { is_active: newActive });
      // Optimistisch sofort aktualisieren, damit der Button-Status ohne Reload stimmt
      setJobs(prev => prev.map(j => j.id === job.id ? { ...j, is_active: newActive } : j));
      toast.success(newActive ? "Stelle aktiviert" : "Stelle deaktiviert");
      loadJobs();
    } catch {
      toast.error("Fehler beim Ändern des Status");
    }
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-8">
        <Briefcase className="h-8 w-8 text-primary-600" />
        <h1 className="text-3xl font-bold text-gray-900">Stellen verwalten</h1>
      </div>

      {/* Filter */}
      <div className="card mb-6">
        <div className="flex flex-wrap gap-4">
          <div>
            <select
              className="input-styled"
              value={activeFilter}
              onChange={(e) => {
                setActiveFilter(e.target.value);
                setPage(0);
              }}
            >
              <option value="">Alle Status</option>
              <option value="true">Aktiv</option>
              <option value="false">Inaktiv</option>
            </select>
          </div>
          <div>
            <select
              className="input-styled"
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setPage(0);
              }}
            >
              <option value="">Alle Stellenarten</option>
              {Object.entries(positionTypeLabels).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Stellen-Liste */}
      <div className="card">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-12 w-12 animate-spin text-primary-600" />
          </div>
        ) : jobs.length === 0 ? (
          <div className="text-center py-12">
            <Briefcase className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Keine Stellen gefunden</p>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              {jobs.map((job) => (
                <div 
                  key={job.id} 
                  className={`p-4 border rounded-lg ${!job.is_active ? "bg-gray-50 opacity-60" : ""}`}
                >
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <Link 
                          href={`/jobs/${job.slug ? `${job.slug}-${job.id}` : job.id}`}
                          className="text-lg font-semibold text-gray-900 hover:text-primary-600"
                        >
                          {job.title}
                        </Link>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${positionTypeColors[job.position_type] || "bg-gray-100 text-gray-800"}`}>
                          {positionTypeLabels[job.position_type] || job.position_type}
                        </span>
                        {!job.is_active && (
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-200 text-gray-600">
                            Inaktiv
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                        <span className="flex items-center gap-1">
                          <Building2 className="h-4 w-4" />
                          {job.company_name}
                        </span>
                        {job.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-4 w-4" />
                            {job.location}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Eye className="h-4 w-4" />
                          {job.view_count || 0} Aufrufe
                        </span>
                        <span className="flex items-center gap-1">
                          <Heart className="h-4 w-4" />
                          {job.like_count || 0} Gemerkt
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="h-4 w-4" />
                          {job.application_count} Bewerbungen
                        </span>
                        {job.is_external && (
                          <span className="flex items-center gap-1 text-orange-600">
                            <ExternalLink className="h-4 w-4" />
                            {job.external_click_count || 0} Ext. Klicks
                          </span>
                        )}
                        {job.enrichment_source && (
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                              job.enrichment_source === "fallback"
                                ? "bg-red-100 text-red-700"
                                : job.enrichment_source === "regelbasiert"
                                ? "bg-gray-100 text-gray-600"
                                : "bg-emerald-100 text-emerald-700"
                            }`}
                            title="Wie wurde diese Anzeige aufbereitet?"
                          >
                            {job.enrichment_source === "fallback"
                              ? "⚠ Fallback (Rohtext)"
                              : job.enrichment_source === "regelbasiert"
                              ? "Regelbasiert"
                              : `KI: ${job.enrichment_source}`}
                          </span>
                        )}
                        <span>Erstellt: {formatDate(job.created_at)}</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 sm:flex sm:flex-wrap sm:items-center gap-2 w-full sm:w-auto shrink-0">
                      {/* Aktivieren/Deaktivieren Toggle */}
                      <button
                        onClick={() => handleToggleActive(job)}
                        className={`text-sm px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1 ${
                          job.is_active
                            ? "bg-green-100 text-green-700 hover:bg-green-200"
                            : "bg-gray-200 text-gray-600 hover:bg-gray-300"
                        }`}
                        title={job.is_active ? "Deaktivieren" : "Aktivieren"}
                      >
                        <span className={`w-2 h-2 rounded-full ${job.is_active ? "bg-green-600" : "bg-gray-400"}`} />
                        {job.is_active ? "Aktiv" : "Inaktiv"}
                      </button>
                      {/* Übersetzungs-Button */}
                      <button
                        onClick={() => openTranslateModal(job)}
                        className="btn-secondary text-sm flex items-center gap-1"
                        title="Übersetzen"
                      >
                        <Languages className="h-4 w-4" />
                        {(job.available_languages && job.available_languages.length > 1) && (
                          <span className="bg-green-100 text-green-700 text-xs px-1.5 py-0.5 rounded-full">
                            {job.available_languages.length - 1}
                          </span>
                        )}
                      </button>
                      <Link 
                        href={`/jobs/${job.slug ? `${job.slug}-${job.id}` : job.id}`}
                        className="btn-secondary text-sm"
                      >
                        <Eye className="h-4 w-4 inline mr-1" />
                        Ansehen
                      </Link>
                      <Link 
                        href={`/admin/jobs/${job.id}/edit`}
                        className="btn-primary text-sm"
                      >
                        <Edit className="h-4 w-4 inline mr-1" />
                        Bearbeiten
                      </Link>
                      <button
                        onClick={() => handleDelete(job.id, job.title)}
                        className="btn-danger text-sm"
                      >
                        <Trash2 className="h-4 w-4 inline mr-1" />
                        Löschen
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between mt-6 pt-4 border-t">
              <p className="text-sm text-gray-600">
                Zeige {page * limit + 1}-{Math.min((page + 1) * limit, total)} von {total}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(p => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="btn-secondary text-sm disabled:opacity-50"
                >
                  Zurück
                </button>
                <button
                  onClick={() => setPage(p => p + 1)}
                  disabled={(page + 1) * limit >= total}
                  className="btn-secondary text-sm disabled:opacity-50"
                >
                  Weiter
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Translation Modal */}
      {translateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Languages className="h-5 w-5 text-primary-600" />
                Stelle übersetzen
              </h3>
              <button 
                onClick={() => setTranslateModal(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <p className="text-sm text-gray-600 mb-4">
              <strong>{translateModal.title}</strong>
              <br />
              <span className="text-gray-500">{translateModal.company_name}</span>
            </p>

            <div className="mb-4">
              <p className="text-sm font-medium text-gray-700 mb-2">Sprachen auswählen:</p>
              <div className="space-y-2">
                {AVAILABLE_LANGUAGES.map(lang => {
                  const isExisting = translateModal.available_languages?.includes(lang.code);
                  const isAdminTranslated = translateModal.admin_translated_languages?.includes(lang.code);
                  
                  return (
                    <label 
                      key={lang.code}
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors
                        ${selectedLanguages.includes(lang.code) ? "border-primary-500 bg-primary-50" : "border-gray-200 hover:bg-gray-50"}
                        ${isExisting ? "opacity-60" : ""}`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedLanguages.includes(lang.code)}
                        onChange={() => toggleLanguage(lang.code)}
                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                      <span className="text-xl">{lang.flag}</span>
                      <span className="flex-1">{lang.name}</span>
                      {isExisting && (
                        <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700 flex items-center gap-1">
                          <Check className="h-3 w-3" />
                          {isAdminTranslated ? "Admin übersetzt" : "Vorhanden"}
                        </span>
                      )}
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
              <p className="text-sm text-amber-800">
                <strong>Hinweis:</strong> Die Übersetzung erfolgt automatisch mit DeepL. 
                Der Arbeitgeber sieht einen Hinweis &quot;Automatisch übersetzt&quot;.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setTranslateModal(null)}
                className="btn-secondary flex-1"
                disabled={translating}
              >
                Abbrechen
              </button>
              <button
                onClick={handleTranslate}
                disabled={translating || selectedLanguages.length === 0}
                className="btn-primary flex-1 flex items-center justify-center gap-2"
              >
                {translating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Übersetze...
                  </>
                ) : (
                  <>
                    <Languages className="h-4 w-4" />
                    Übersetzen ({selectedLanguages.length})
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
