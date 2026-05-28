"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { applicationsAPI } from "@/lib/api";
import { toast } from "react-hot-toast";
import {
  MapPin,
  Calendar,
  Building2,
  Euro,
  Clock,
  ArrowLeft,
  Send,
  Heart,
  Home,
  Briefcase,
  Phone,
  Mail,
  User,
  Globe,
  Languages,
  ClipboardList,
  ExternalLink,
  Loader2,
  CheckCircle,
  AlertTriangle,
} from "lucide-react";

interface OtherLanguage {
  language: string;
  level: string;
}

interface Company {
  id: number;
  name: string;
  logo_url?: string;
  industry?: string;
  city?: string;
  country?: string;
  description?: string;
  website?: string;
}

interface Job {
  id: number;
  slug: string;
  title: string;
  description: string;
  tasks?: string;
  requirements?: string;
  benefits?: string;
  location: string;
  address?: string;
  postal_code?: string;
  salary_min?: number;
  salary_max?: number;
  salary_type?: string;
  employment_type?: string;
  position_type?: string;
  german_level?: string;
  english_level?: string;
  other_languages?: OtherLanguage[];
  remote_possible?: boolean;
  accommodation_provided?: boolean;
  start_date?: string;
  end_date?: string;
  contact_person?: string;
  contact_phone?: string;
  contact_email?: string;
  created_at: string;
  valid_until?: string;
  is_external?: boolean;
  external_source?: string;
  external_url?: string;
  external_employer_name?: string;
  company: Company;
}

interface Props {
  initialJob: Job;
  slug: string;
}

const positionTypeLabels: Record<string, string> = {
  general: "Allgemein",
  studentenferienjob: "Studentenferienjob",
  saisonjob: "Saisonjob",
  workandholiday: "Work & Holiday",
  fachkraft: "Fachkraft",
  ausbildung: "Ausbildung",
};

const employmentTypeLabels: Record<string, string> = {
  fulltime: "Vollzeit",
  parttime: "Teilzeit",
  both: "Vollzeit oder Teilzeit",
};

const salaryTypeLabels: Record<string, string> = {
  hourly: "pro Stunde",
  monthly: "pro Monat",
  yearly: "pro Jahr",
};

const languageLevelLabels: Record<string, string> = {
  not_required: "Nicht erforderlich",
  a1: "A1",
  a2: "A2",
  b1: "B1",
  b2: "B2",
  c1: "C1",
  c2: "C2",
  basic: "A2",
  good: "B1",
  fluent: "C1",
};

const languageLevelColors: Record<string, string> = {
  a1: "bg-yellow-100 text-yellow-800",
  a2: "bg-yellow-100 text-yellow-800",
  b1: "bg-blue-100 text-blue-800",
  b2: "bg-blue-200 text-blue-900",
  c1: "bg-green-100 text-green-800",
  c2: "bg-green-200 text-green-900",
  basic: "bg-yellow-100 text-yellow-800",
  good: "bg-blue-100 text-blue-800",
  fluent: "bg-green-100 text-green-800",
};

const positionTypeColors: Record<string, string> = {
  general: "bg-gray-100 text-gray-800 border-gray-200",
  studentenferienjob: "bg-blue-100 text-blue-800 border-blue-200",
  saisonjob: "bg-orange-100 text-orange-800 border-orange-200",
  workandholiday: "bg-pink-100 text-pink-800 border-pink-200",
  fachkraft: "bg-purple-100 text-purple-800 border-purple-200",
  ausbildung: "bg-green-100 text-green-800 border-green-200",
};

export default function JobDetailClient({ initialJob, slug }: Props) {
  const router = useRouter();
  const { isAuthenticated, isApplicant } = useAuth();
  const [liked, setLiked] = useState(false);
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState(false);
  const [message, setMessage] = useState("");
  const [showApplyForm, setShowApplyForm] = useState(false);
  const [profileIncomplete, setProfileIncomplete] = useState(false);
  const [profileError, setProfileError] = useState("");
  const job = initialJob;

  const handleApply = async () => {
    if (!isAuthenticated) {
      toast.error("Bitte melden Sie sich an, um sich zu bewerben");
      router.push("/login");
      return;
    }

    if (!isApplicant) {
      toast.error("Nur Bewerber können sich auf Stellen bewerben");
      return;
    }

    setApplying(true);
    try {
      await applicationsAPI.create({
        job_posting_id: job.id,
        applicant_message: message || undefined,
      });
      toast.success("Bewerbung erfolgreich eingereicht!");
      setApplied(true);
      setShowApplyForm(false);
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || "Bewerbung fehlgeschlagen";
      // Prüfen ob Pflichtfelder fehlen
      if (errorMessage.includes("Pflichtfeld fehlt") || errorMessage.includes("Profil")) {
        setProfileIncomplete(true);
        setProfileError(errorMessage);
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setApplying(false);
    }
  };

  const formatSalary = () => {
    if (!job.salary_min && !job.salary_max) return null;
    const min = job.salary_min?.toLocaleString("de-DE");
    const max = job.salary_max?.toLocaleString("de-DE");
    const type = salaryTypeLabels[job.salary_type || "monthly"];
    if (min && max) return `${min} - ${max} € ${type}`;
    if (min) return `ab ${min} € ${type}`;
    if (max) return `bis ${max} € ${type}`;
    return null;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const hasLanguageRequirements =
    (job.german_level && job.german_level !== "not_required") ||
    (job.english_level && job.english_level !== "not_required") ||
    (job.other_languages && job.other_languages.length > 0);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Back Button */}
      <div className="max-w-6xl mx-auto px-4 py-4">
        <Link
          href="/jobs"
          className="inline-flex items-center text-gray-600 hover:text-primary-600 transition-colors group"
        >
          <ArrowLeft className="h-4 w-4 mr-2 group-hover:-translate-x-1 transition-transform" />
          Zurück zur Jobsuche
        </Link>
      </div>

      {/* Main Content - 2 Column Layout */}
      <div className="max-w-6xl mx-auto px-4 pb-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* LEFT COLUMN - Job Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Job Header Card */}
            <div className="card">
              <div className="flex items-start justify-between gap-4 mb-4">
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900">{job.title}</h1>
                {job.position_type && (
                  <span className={`px-4 py-1.5 rounded-full text-sm font-semibold whitespace-nowrap border ${positionTypeColors[job.position_type] || positionTypeColors.general}`}>
                    {positionTypeLabels[job.position_type] || job.position_type}
                  </span>
                )}
              </div>

              {/* Extern-Badge */}
              {job.is_external && (
                <div className="flex items-center gap-2 mb-3 px-3 py-2 bg-orange-50 border border-orange-200 rounded-lg text-sm text-orange-700 font-medium">
                  <ExternalLink className="h-4 w-4" />
                  Externes Stellenangebot · Bewerbung direkt beim Arbeitgeber
                </div>
              )}

              {/* Meta Info */}
              <div className="flex flex-wrap items-center gap-4 text-gray-600 mb-6">
                <span className="flex items-center gap-1.5">
                  <Building2 className="h-5 w-5 text-gray-400" />
                  <span className="font-medium">
                    {job.is_external && job.external_employer_name
                      ? job.external_employer_name
                      : job.company.name}
                  </span>
                </span>
                {job.location && (
                  <span className="flex items-center gap-1.5">
                    <MapPin className="h-5 w-5 text-gray-400" />
                    {job.location}
                    {job.postal_code && ` (${job.postal_code})`}
                  </span>
                )}
                {job.employment_type && (
                  <span className="flex items-center gap-1.5">
                    <Briefcase className="h-5 w-5 text-gray-400" />
                    {employmentTypeLabels[job.employment_type]}
                  </span>
                )}
                {job.remote_possible && (
                  <span className="flex items-center gap-1.5 text-teal-600">
                    <Globe className="h-5 w-5" />
                    Remote möglich
                  </span>
                )}
                {job.accommodation_provided && (
                  <span className="flex items-center gap-1.5 text-amber-600">
                    🏠 Unterkunft vorhanden
                  </span>
                )}
              </div>

              {/* Description */}
              {job.description && (
                <div className="prose max-w-none">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Beschreibung</h3>
                  <div dangerouslySetInnerHTML={{ __html: job.description }} className="text-gray-600" />
                </div>
              )}

              {/* Tasks */}
              {job.tasks && (
                <div className="mt-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Aufgaben</h3>
                  <div dangerouslySetInnerHTML={{ __html: job.tasks }} className="text-gray-600 prose max-w-none" />
                </div>
              )}

              {/* Requirements */}
              {job.requirements && (
                <div className="mt-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Anforderungen</h3>
                  <div dangerouslySetInnerHTML={{ __html: job.requirements }} className="text-gray-600 prose max-w-none" />
                </div>
              )}

              {/* Benefits */}
              {job.benefits && (
                <div className="mt-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Wir bieten</h3>
                  <div dangerouslySetInnerHTML={{ __html: job.benefits }} className="text-gray-600 prose max-w-none" />
                </div>
              )}

              {/* Address */}
              {job.address && (
                <div className="mt-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2 flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-primary-600" />
                    Arbeitsort
                  </h3>
                  <p className="text-gray-600">
                    {job.address}
                    {job.postal_code && <><br />{job.postal_code} </>}
                    {job.location}
                  </p>
                </div>
              )}

              {/* Language Requirements - inside main content */}
              {hasLanguageRequirements && (
                <div className="mt-6 pt-6 border-t">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Languages className="h-5 w-5 text-blue-600" />
                    Sprachkenntnisse
                  </h3>
                  <div className="space-y-4">
                    {/* Erforderliche Sprachen */}
                    {((job.german_level && job.german_level !== "not_required") || (job.english_level && job.english_level !== "not_required")) && (
                      <div>
                        <p className="text-xs font-semibold text-red-600 uppercase tracking-wide mb-2">Erforderlich</p>
                        <div className="flex flex-wrap gap-2">
                          {job.german_level && job.german_level !== "not_required" && (
                            <div className="flex items-center gap-2 px-4 py-2 bg-red-50 rounded-lg border border-red-100">
                              <span className="font-medium text-gray-700">🇩🇪 Deutsch</span>
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${languageLevelColors[job.german_level] || "bg-gray-100"}`}>
                                {languageLevelLabels[job.german_level]}
                              </span>
                            </div>
                          )}
                          {job.english_level && job.english_level !== "not_required" && (
                            <div className="flex items-center gap-2 px-4 py-2 bg-red-50 rounded-lg border border-red-100">
                              <span className="font-medium text-gray-700">🇬🇧 Englisch</span>
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${languageLevelColors[job.english_level] || "bg-gray-100"}`}>
                                {languageLevelLabels[job.english_level]}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    {/* Wünschenswerte Sprachen */}
                    {job.other_languages && job.other_languages.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-amber-600 uppercase tracking-wide mb-2">Wünschenswert</p>
                        <div className="flex flex-wrap gap-2">
                          {job.other_languages.map((lang, idx) => (
                            <div key={idx} className="flex items-center gap-2 px-4 py-2 bg-amber-50 rounded-lg border border-amber-100">
                              <span className="font-medium text-gray-700">🌐 {lang.language}</span>
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${languageLevelColors[lang.level] || "bg-gray-100"}`}>
                                {languageLevelLabels[lang.level]}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT COLUMN - Sidebar (order changes on mobile) */}
          <div className="flex flex-col gap-6">
            {/* Apply Button Card - Mobile: 3rd, Desktop: 1st */}
            <div className="card order-3 lg:order-1" id="apply">
              {job.is_external ? (
                /* Externes Inserat: Weiterleitungsbutton statt Bewerbungsformular */
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-orange-600 font-semibold text-base">
                    <ExternalLink className="h-5 w-5" />
                    Externe Stelle
                  </div>
                  <p className="text-sm text-gray-600">
                    Diese Stelle wird vom Arbeitgeber direkt verwaltet. Bewerbungen laufen
                    nicht über diese Plattform.
                  </p>
                  {job.external_url ? (
                    <a
                      href={job.external_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-lg transition-colors"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Jetzt beim Arbeitgeber bewerben
                    </a>
                  ) : (
                    <p className="text-sm text-gray-400 italic">Kein direkter Bewerbungslink verfügbar.</p>
                  )}
                  <p className="text-xs text-gray-400 text-center">
                    Quelle: Bundesagentur für Arbeit
                  </p>
                </div>
              ) : (
              /* Normale interne Stelle */
              <>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Jetzt bewerben</h3>
              {profileIncomplete ? (
                <div className="text-center py-4">
                  <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-3" />
                  <p className="text-lg font-semibold text-gray-900 mb-2">Profil unvollständig</p>
                  <p className="text-gray-600 text-sm mb-4">{profileError}</p>
                  <Link href="/applicant/profile" className="btn-primary w-full flex items-center justify-center gap-2 py-2">
                    Profil vervollständigen
                  </Link>
                  <button
                    onClick={() => setProfileIncomplete(false)}
                    className="w-full text-gray-500 hover:text-gray-700 text-sm mt-2"
                  >
                    Zurück
                  </button>
                </div>
              ) : applied ? (
                <div className="text-center py-4">
                  <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
                  <p className="text-lg font-semibold text-gray-900 mb-2">Bewerbung eingereicht!</p>
                  <p className="text-gray-600 text-sm mb-4">Sie können den Status in Ihrem Profil verfolgen.</p>
                  <Link href="/applicant/applications" className="btn-primary w-full flex items-center justify-center gap-2 py-2">
                    Zu meinen Bewerbungen
                  </Link>
                </div>
              ) : isAuthenticated && isApplicant ? (
                <div className="space-y-3">
                  {showApplyForm ? (
                    <>
                      <textarea
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="Optionale Nachricht an das Unternehmen..."
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none"
                        rows={4}
                      />
                      <button
                        onClick={handleApply}
                        disabled={applying}
                        className="btn-primary w-full flex items-center justify-center gap-2 py-3 disabled:opacity-50"
                      >
                        {applying ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Wird gesendet...
                          </>
                        ) : (
                          <>
                            <Send className="h-4 w-4" />
                            Bewerbung absenden
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => setShowApplyForm(false)}
                        className="w-full text-gray-500 hover:text-gray-700 text-sm"
                      >
                        Abbrechen
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => setShowApplyForm(true)}
                        className="btn-primary w-full flex items-center justify-center gap-2 py-3"
                      >
                        <Send className="h-4 w-4" />
                        Jetzt bewerben
                      </button>
                      <button
                        onClick={() => setLiked(!liked)}
                        className={`w-full flex items-center justify-center gap-2 py-2 px-4 rounded-lg font-medium transition-all ${
                          liked ? "bg-red-100 text-red-700 border-2 border-red-300" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        }`}
                      >
                        <Heart className={`h-4 w-4 ${liked ? "fill-red-500" : ""}`} />
                        {liked ? "Gemerkt" : "Merken"}
                      </button>
                    </>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <Link href="/login" className="btn-primary w-full flex items-center justify-center gap-2 py-3">
                    Anmelden zum Bewerben
                  </Link>
                  <p className="text-sm text-gray-500 text-center">
                    <Link href="/register" className="text-primary-600 hover:underline font-medium">Jetzt registrieren</Link> um sich zu bewerben
                  </p>
                </div>
              )}
              </>
              )}
            </div>

            {/* Company Profile Card - Mobile: 2nd, Desktop: 2nd */}
            {job.is_external ? (
              <div className="card order-2 lg:order-2">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Arbeitgeber</h3>
                <div className="flex items-start gap-4">
                  <div className="w-16 h-16 rounded-lg bg-orange-100 flex items-center justify-center flex-shrink-0">
                    <Building2 className="h-8 w-8 text-orange-500" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 text-lg">
                      {job.external_employer_name || "Arbeitgeber"}
                    </p>
                    {job.location && (
                      <p className="text-gray-600 flex items-center gap-1 mt-1">
                        <MapPin className="h-4 w-4" />
                        {job.location}
                      </p>
                    )}
                    <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
                      <ExternalLink className="h-3 w-3" />
                      Quelle: Bundesagentur für Arbeit
                    </p>
                  </div>
                </div>
              </div>
            ) : (
            <Link href={`/companies/${job.company.id}`} className="card block hover:shadow-lg hover:border-primary-300 transition-all cursor-pointer group order-2 lg:order-2">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center justify-between">
                Über das Unternehmen
                <ExternalLink className="h-4 w-4 text-gray-400 group-hover:text-primary-600 transition-colors" />
              </h3>
              <div className="flex items-start gap-4">
                {job.company.logo_url ? (
                  <img src={job.company.logo_url} alt={job.company.name} className="w-16 h-16 rounded-lg object-contain bg-gray-100 p-2" />
                ) : (
                  <div className="w-16 h-16 rounded-lg bg-primary-100 flex items-center justify-center">
                    <Building2 className="h-8 w-8 text-primary-600" />
                  </div>
                )}
                <div>
                  <p className="font-semibold text-gray-900 text-lg group-hover:text-primary-600 transition-colors">{job.company.name}</p>
                  {job.company.industry && <p className="text-primary-600 font-medium">{job.company.industry}</p>}
                  {job.company.city && (
                    <p className="text-gray-600 flex items-center gap-1 mt-1">
                      <MapPin className="h-4 w-4" />
                      {job.company.city}{job.company.country && `, ${job.company.country}`}
                    </p>
                  )}
                </div>
              </div>
            </Link>
            )}

            {/* Details Card - Mobile: 1st, Desktop: 3rd */}
            <div className="card order-1 lg:order-3">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Details</h3>
              <div className="space-y-4">
                {(job.salary_min || job.salary_max) && (
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 rounded-lg"><Euro className="h-5 w-5 text-green-600" /></div>
                    <div>
                      <p className="text-sm text-gray-500">Gehalt</p>
                      <p className="font-semibold text-gray-900">{formatSalary()}</p>
                    </div>
                  </div>
                )}
                {job.start_date && (
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg"><Calendar className="h-5 w-5 text-blue-600" /></div>
                    <div>
                      <p className="text-sm text-gray-500">Startdatum</p>
                      <p className="font-semibold text-gray-900">{formatDate(job.start_date)}</p>
                    </div>
                  </div>
                )}
                {job.end_date && (
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-orange-100 rounded-lg"><Clock className="h-5 w-5 text-orange-600" /></div>
                    <div>
                      <p className="text-sm text-gray-500">Enddatum</p>
                      <p className="font-semibold text-gray-900">{formatDate(job.end_date)}</p>
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gray-100 rounded-lg"><Calendar className="h-5 w-5 text-gray-600" /></div>
                  <div>
                    <p className="text-sm text-gray-500">Veröffentlicht am</p>
                    <p className="font-semibold text-gray-900">{formatDate(job.created_at)}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* IJP Service Card - Mobile: 5th (last), Desktop: 4th */}
            <div className="card bg-gradient-to-br from-primary-50 to-blue-50 border-2 border-primary-200 order-5 lg:order-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-primary-600 rounded-lg"><ClipboardList className="h-6 w-6 text-white" /></div>
                <h3 className="text-lg font-semibold text-gray-900">IJP beauftragen</h3>
              </div>
              <p className="text-gray-600 text-sm mb-4">
                Lassen Sie sich von unserem Team bei der Bewerbung unterstützen. Wir helfen Ihnen bei allen Formalitäten.
              </p>
              <Link href="/applicant/ijp-auftrag" className="btn-primary w-full flex items-center justify-center gap-2">
                <ClipboardList className="h-4 w-4" />
                IJP beauftragen
              </Link>
            </div>

            {/* Contact Person Card - Mobile: 4th, Desktop: 5th */}
            {(job.contact_person || job.contact_email || job.contact_phone) && (
              <div className="card border-l-4 border-l-green-500 order-4 lg:order-5">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <User className="h-5 w-5 text-green-600" />
                  Ansprechpartner
                </h3>
                <div className="space-y-3">
                  {job.contact_person && <p className="font-semibold text-gray-900">{job.contact_person}</p>}
                  {job.contact_phone && (
                    <a href={`tel:${job.contact_phone}`} className="flex items-center gap-2 text-gray-600 hover:text-primary-600">
                      <Phone className="h-4 w-4" />{job.contact_phone}
                    </a>
                  )}
                  {job.contact_email && (
                    <a href={`mailto:${job.contact_email}`} className="flex items-center gap-2 text-gray-600 hover:text-primary-600">
                      <Mail className="h-4 w-4" />{job.contact_email}
                    </a>
                  )}
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
