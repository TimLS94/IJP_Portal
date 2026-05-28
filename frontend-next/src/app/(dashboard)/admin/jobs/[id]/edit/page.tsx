"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { adminAPI, jobsAPI } from "@/lib/api";
import toast from "react-hot-toast";
import RichTextEditor from "@/components/RichTextEditor";
import { 
  Briefcase, ArrowLeft, Save, Loader2, MapPin, Building2, 
  Eye, AlertTriangle, Languages, Check
} from "lucide-react";

const positionTypeLabels: Record<string, string> = {
  studentenferienjob: "Studentenferienjob",
  saisonjob: "Saisonjob",
  workandholiday: "Work & Holiday",
  fachkraft: "Fachkräfte",
  ausbildung: "Ausbildung",
  general: "Allgemein"
};

interface JobData {
  id: number;
  title: string;
  description: string;
  tasks?: string;
  requirements?: string;
  benefits?: string;
  location?: string;
  company_name?: string;
  position_type?: string;
  is_active: boolean;
  translations?: Record<string, {
    title: string;
    description: string;
    tasks?: string;
    requirements?: string;
    benefits?: string;
  }>;
  available_languages?: string[];
}

const LANGUAGES = [
  { code: "de", name: "Deutsch", flag: "🇩🇪" },
  { code: "en", name: "English", flag: "🇬🇧" },
  { code: "es", name: "Español", flag: "🇪🇸" },
  { code: "ru", name: "Русский", flag: "🇷🇺" },
];

export default function AdminEditJobPage() {
  const router = useRouter();
  const params = useParams();
  const jobId = params.id as string;
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [job, setJob] = useState<JobData | null>(null);
  const [activeLanguage, setActiveLanguage] = useState("de");
  
  // Editable content
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tasks, setTasks] = useState("");
  const [requirements, setRequirements] = useState("");
  const [benefits, setBenefits] = useState("");
  
  // Translations
  const [translations, setTranslations] = useState<Record<string, {
    title: string;
    description: string;
    tasks: string;
    requirements: string;
    benefits: string;
  }>>({});

  useEffect(() => {
    loadJob();
  }, [jobId]);

  const loadJob = async () => {
    try {
      const response = await jobsAPI.get(jobId);
      const data = response.data;
      setJob(data);
      
      // Set German content
      setTitle(data.title || "");
      setDescription(data.description || "");
      setTasks(data.tasks || "");
      setRequirements(data.requirements || "");
      setBenefits(data.benefits || "");
      
      // Set translations
      if (data.translations) {
        setTranslations(data.translations);
      }
    } catch {
      toast.error("Fehler beim Laden der Stelle");
      router.push("/admin/jobs");
    } finally {
      setLoading(false);
    }
  };

  const getCurrentContent = () => {
    if (activeLanguage === "de") {
      return { title, description, tasks, requirements, benefits };
    }
    return translations[activeLanguage] || { title: "", description: "", tasks: "", requirements: "", benefits: "" };
  };

  const updateContent = (field: string, value: string) => {
    if (activeLanguage === "de") {
      switch (field) {
        case "title": setTitle(value); break;
        case "description": setDescription(value); break;
        case "tasks": setTasks(value); break;
        case "requirements": setRequirements(value); break;
        case "benefits": setBenefits(value); break;
      }
    } else {
      setTranslations(prev => ({
        ...prev,
        [activeLanguage]: {
          ...prev[activeLanguage],
          [field]: value
        }
      }));
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Prepare update data
      const updateData = {
        title,
        description,
        tasks,
        requirements,
        benefits,
        translations: Object.keys(translations).length > 0 ? translations : undefined
      };
      
      await adminAPI.updateJob(parseInt(jobId), updateData);
      toast.success("Stelle erfolgreich aktualisiert");
      router.push("/admin/jobs");
    } catch (error: unknown) {
      const err = error as { response?: { data?: { detail?: string } } };
      toast.error(err.response?.data?.detail || "Fehler beim Speichern");
    } finally {
      setSaving(false);
    }
  };

  const content = getCurrentContent();
  const availableLanguages = job?.available_languages || ["de"];

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-12 w-12 animate-spin text-primary-600" />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="h-16 w-16 text-red-500 mx-auto mb-4" />
        <p className="text-gray-600">Stelle nicht gefunden</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link 
            href="/admin/jobs" 
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Briefcase className="h-6 w-6 text-primary-600" />
              Stelle bearbeiten (Admin)
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              Formatierung und Inhalte korrigieren
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href={`/jobs/${job.id}`}
            target="_blank"
            className="btn-secondary flex items-center gap-2"
          >
            <Eye className="h-4 w-4" />
            Vorschau
          </Link>
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn-primary flex items-center gap-2"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Speichern...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Speichern
              </>
            )}
          </button>
        </div>
      </div>

      {/* Job Info Card */}
      <div className="card mb-6 bg-gray-50">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-gray-500" />
            <span className="font-medium">{job.company_name}</span>
          </div>
          {job.location && (
            <div className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-gray-500" />
              <span>{job.location}</span>
            </div>
          )}
          {job.position_type && (
            <span className="px-3 py-1 rounded-full text-sm font-medium bg-primary-100 text-primary-800">
              {positionTypeLabels[job.position_type] || job.position_type}
            </span>
          )}
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
            job.is_active ? "bg-green-100 text-green-800" : "bg-gray-200 text-gray-600"
          }`}>
            {job.is_active ? "Aktiv" : "Inaktiv"}
          </span>
        </div>
      </div>

      {/* Language Tabs */}
      {availableLanguages.length > 1 && (
        <div className="card mb-6">
          <div className="flex items-center gap-2 mb-2">
            <Languages className="h-5 w-5 text-primary-600" />
            <span className="font-medium">Sprache bearbeiten:</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {LANGUAGES.filter(l => availableLanguages.includes(l.code)).map(lang => (
              <button
                key={lang.code}
                onClick={() => setActiveLanguage(lang.code)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                  activeLanguage === lang.code
                    ? "bg-primary-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                <span>{lang.flag}</span>
                {lang.name}
                {activeLanguage === lang.code && <Check className="h-4 w-4" />}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Content Editor */}
      <div className="space-y-6">
        {/* Title */}
        <div className="card">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Titel
          </label>
          <input
            type="text"
            value={content.title}
            onChange={(e) => updateContent("title", e.target.value)}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-primary-500 focus:ring-2 focus:ring-primary-200 focus:outline-none transition-all"
            placeholder="Stellentitel"
          />
        </div>

        {/* Description */}
        <div className="card">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Beschreibung
          </label>
          <RichTextEditor
            value={content.description}
            onChange={(value: string) => updateContent("description", value)}
            placeholder="Stellenbeschreibung..."
          />
        </div>

        {/* Tasks */}
        <div className="card">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Aufgaben
          </label>
          <RichTextEditor
            value={content.tasks || ""}
            onChange={(value: string) => updateContent("tasks", value)}
            placeholder="Aufgaben und Tätigkeiten..."
          />
        </div>

        {/* Requirements */}
        <div className="card">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Anforderungen
          </label>
          <RichTextEditor
            value={content.requirements || ""}
            onChange={(value: string) => updateContent("requirements", value)}
            placeholder="Anforderungen an Bewerber..."
          />
        </div>

        {/* Benefits */}
        <div className="card">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Benefits / Wir bieten
          </label>
          <RichTextEditor
            value={content.benefits || ""}
            onChange={(value: string) => updateContent("benefits", value)}
            placeholder="Was wir bieten..."
          />
        </div>
      </div>

      {/* Admin Note */}
      <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-xl">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
          <div>
            <p className="font-medium text-amber-800">Admin-Bearbeitung</p>
            <p className="text-sm text-amber-700 mt-1">
              Änderungen werden direkt gespeichert. Die Firma wird nicht automatisch benachrichtigt.
              Nutzen Sie diese Funktion nur für Formatierungskorrekturen oder inhaltliche Verbesserungen.
            </p>
          </div>
        </div>
      </div>

      {/* Bottom Save Button */}
      <div className="mt-6 flex justify-end gap-3">
        <Link href="/admin/jobs" className="btn-secondary">
          Abbrechen
        </Link>
        <button
          onClick={handleSave}
          disabled={saving}
          className="btn-primary flex items-center gap-2"
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Speichern...
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              Änderungen speichern
            </>
          )}
        </button>
      </div>
    </div>
  );
}
