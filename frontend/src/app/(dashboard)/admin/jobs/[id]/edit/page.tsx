"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { adminAPI } from "@/lib/api";
import toast from "react-hot-toast";
import RichTextEditor from "@/components/RichTextEditor";
import {
  Briefcase, ArrowLeft, Save, Loader2, MapPin, Building2,
  Eye, AlertTriangle, Languages, Check, Phone, Mail, User,
  Euro, Calendar, Wifi, Home, ExternalLink,
} from "lucide-react";

const POSITION_TYPES = [
  { value: "studentenferienjob", label: "Studentenferienjob" },
  { value: "saisonjob", label: "Saisonjob" },
  { value: "workandholiday", label: "Work & Holiday" },
  { value: "fachkraft", label: "Fachkräfte" },
  { value: "ausbildung", label: "Ausbildung" },
  { value: "general", label: "Allgemein" },
];

const EMPLOYMENT_TYPES = [
  { value: "fulltime",   label: "Vollzeit" },
  { value: "parttime",   label: "Teilzeit" },
  { value: "mini_job",   label: "Minijob" },
  { value: "seasonal",   label: "Saisonstelle" },
  { value: "internship", label: "Praktikum" },
];

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
  const [job, setJob] = useState<Record<string, unknown> | null>(null);
  const [activeLanguage, setActiveLanguage] = useState("de");

  // Content
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tasks, setTasks] = useState("");
  const [requirements, setRequirements] = useState("");
  const [benefits, setBenefits] = useState("");

  // Grunddaten
  const [positionType, setPositionType] = useState("");
  const [employmentType, setEmploymentType] = useState("");
  const [isActive, setIsActive] = useState(false);
  const [isDraft, setIsDraft] = useState(false);
  
  // Premium: Hervorhebung
  const [isFeatured, setIsFeatured] = useState(false);
  const [featuredUntil, setFeaturedUntil] = useState<string | null>(null);
  const [togglingFeatured, setTogglingFeatured] = useState(false);

  // Kontakt
  const [contactPerson, setContactPerson] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [externalEmployerName, setExternalEmployerName] = useState("");
  const [externalUrl, setExternalUrl] = useState("");

  // Standort
  const [location, setLocation] = useState("");
  const [address, setAddress] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [remotePossible, setRemotePossible] = useState(false);
  const [accommodationProvided, setAccommodationProvided] = useState(false);

  // Gehalt
  const [salaryMin, setSalaryMin] = useState("");
  const [salaryMax, setSalaryMax] = useState("");
  const [salaryType, setSalaryType] = useState("hourly");

  // Zeitraum
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [deadline, setDeadline] = useState("");

  // Übersetzungen
  const [translations, setTranslations] = useState<Record<string, Record<string, string>>>({});

  useEffect(() => { loadJob(); }, [jobId]);

  const loadJob = async () => {
    try {
      const response = await adminAPI.getJob(parseInt(jobId));
      const data = response.data;
      setJob(data);

      setTitle(data.title || "");
      setDescription(data.description || "");
      setTasks(data.tasks || "");
      setRequirements(data.requirements || "");
      setBenefits(data.benefits || "");

      setPositionType(data.position_type || "");
      setEmploymentType(data.employment_type || "");
      setIsActive(data.is_active ?? false);
      setIsDraft(data.is_draft ?? false);
      setIsFeatured(data.is_featured ?? false);
      setFeaturedUntil(data.featured_until || null);

      setContactPerson(data.contact_person || "");
      setContactPhone(data.contact_phone || "");
      setContactEmail(data.contact_email || "");
      setExternalEmployerName(data.external_employer_name || "");
      setExternalUrl(data.external_url || "");

      setLocation(data.location || "");
      setAddress(data.address || "");
      setPostalCode(data.postal_code || "");
      setRemotePossible(data.remote_possible ?? false);
      setAccommodationProvided(data.accommodation_provided ?? false);

      setSalaryMin(data.salary_min != null ? String(data.salary_min) : "");
      setSalaryMax(data.salary_max != null ? String(data.salary_max) : "");
      setSalaryType(data.salary_type || "hourly");

      setStartDate(data.start_date || "");
      setEndDate(data.end_date || "");
      setDeadline(data.deadline || "");

      if (data.translations) setTranslations(data.translations as Record<string, Record<string, string>>);
    } catch {
      toast.error("Fehler beim Laden der Stelle");
      router.push("/admin/jobs");
    } finally {
      setLoading(false);
    }
  };

  const getContent = () => {
    if (activeLanguage === "de") return { title, description, tasks, requirements, benefits };
    return translations[activeLanguage] || { title: "", description: "", tasks: "", requirements: "", benefits: "" };
  };

  const updateContent = (field: string, value: string) => {
    if (activeLanguage === "de") {
      if (field === "title") setTitle(value);
      else if (field === "description") setDescription(value);
      else if (field === "tasks") setTasks(value);
      else if (field === "requirements") setRequirements(value);
      else if (field === "benefits") setBenefits(value);
    } else {
      setTranslations(prev => ({ ...prev, [activeLanguage]: { ...prev[activeLanguage], [field]: value } }));
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await adminAPI.updateJob(parseInt(jobId), {
        title, description, tasks, requirements, benefits,
        translations: Object.keys(translations).length > 0 ? translations : undefined,
        position_type: positionType || null,
        employment_type: employmentType || null,
        contact_person: contactPerson || null,
        contact_phone: contactPhone || null,
        contact_email: contactEmail || null,
        external_employer_name: externalEmployerName || null,
        external_url: externalUrl || null,
        location: location || null,
        address: address || null,
        postal_code: postalCode || null,
        remote_possible: remotePossible,
        accommodation_provided: accommodationProvided,
        salary_min: salaryMin ? parseFloat(salaryMin) : null,
        salary_max: salaryMax ? parseFloat(salaryMax) : null,
        salary_type: (salaryMin || salaryMax) ? salaryType : null,
        start_date: startDate || null,
        end_date: endDate || null,
        deadline: deadline || null,
        is_active: isActive,
        is_draft: isDraft,
      });
      toast.success("Stelle gespeichert");
      router.push("/admin/jobs");
    } catch (error: unknown) {
      const err = error as { response?: { data?: { detail?: string } } };
      toast.error(err.response?.data?.detail || "Fehler beim Speichern");
    } finally {
      setSaving(false);
    }
  };

  const toggleFeatured = async () => {
    setTogglingFeatured(true);
    try {
      const response = await adminAPI.toggleFeaturedJob(parseInt(jobId), {
        is_featured: !isFeatured,
        featured_days: !isFeatured ? 30 : null  // 30 Tage Standard
      });
      setIsFeatured(response.data.is_featured);
      setFeaturedUntil(response.data.featured_until);
      toast.success(response.data.message);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { detail?: string } } };
      toast.error(err.response?.data?.detail || "Fehler beim Ändern der Hervorhebung");
    } finally {
      setTogglingFeatured(false);
    }
  };

  const content = getContent();
  const availableLanguages = (job?.available_languages as string[]) || ["de"];
  const isExternal = job?.external_source === "bundesagentur";

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-12 w-12 animate-spin text-primary-600" /></div>;
  if (!job) return <div className="text-center py-12"><AlertTriangle className="h-16 w-16 text-red-500 mx-auto mb-4" /><p>Stelle nicht gefunden</p></div>;

  const inputCls = "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500";
  const labelCls = "block text-sm font-medium text-gray-700 mb-1";

  return (
    <div className="max-w-5xl mx-auto pb-12">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link href="/admin/jobs" className="p-2 hover:bg-gray-100 rounded-lg">
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Briefcase className="h-6 w-6 text-primary-600" />
              Stelle bearbeiten {isExternal && <span className="text-sm font-normal text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">BA-Stelle</span>}
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">{job.company_name as string}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {isActive && (
            <Link href={`/jobs/${jobId}`} target="_blank" className="btn-secondary flex items-center gap-2 text-sm">
              <Eye className="h-4 w-4" /> Vorschau
            </Link>
          )}
          <button onClick={handleSave} disabled={saving} className="btn-primary flex items-center gap-2">
            {saving ? <><Loader2 className="h-4 w-4 animate-spin" />Speichern...</> : <><Save className="h-4 w-4" />Speichern</>}
          </button>
        </div>
      </div>

      <div className="space-y-6">

        {/* ── Grunddaten ── */}
        <div className="card">
          <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2"><Briefcase className="h-4 w-4 text-primary-500" />Grunddaten</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Positionstyp</label>
              <select className={inputCls} value={positionType} onChange={e => setPositionType(e.target.value)}>
                <option value="">— wählen —</option>
                {POSITION_TYPES.map(pt => <option key={pt.value} value={pt.value}>{pt.label}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Beschäftigungsart</label>
              <select className={inputCls} value={employmentType} onChange={e => setEmploymentType(e.target.value)}>
                <option value="">— wählen —</option>
                {EMPLOYMENT_TYPES.map(et => <option key={et.value} value={et.value}>{et.label}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} className="h-4 w-4 rounded accent-primary-600" />
                <span className="text-sm font-medium text-gray-700">Aktiv (öffentlich sichtbar)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input type="checkbox" checked={isDraft} onChange={e => setIsDraft(e.target.checked)} className="h-4 w-4 rounded accent-amber-500" />
                <span className="text-sm font-medium text-gray-700">Entwurf</span>
              </label>
            </div>
            {/* Premium: Hervorhebung */}
            <div className="sm:col-span-2 mt-2 p-4 bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-amber-900 flex items-center gap-2">
                    ⭐ Premium: Anzeige hervorheben
                  </h3>
                  <p className="text-sm text-amber-700 mt-1">
                    Hervorgehobene Anzeigen erscheinen immer oben in der Stellenliste.
                    {featuredUntil && (
                      <span className="ml-2 font-medium">
                        Aktiv bis: {new Date(featuredUntil).toLocaleDateString('de-DE')}
                      </span>
                    )}
                  </p>
                </div>
                <button
                  onClick={toggleFeatured}
                  disabled={togglingFeatured}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                    isFeatured
                      ? 'bg-amber-500 text-white hover:bg-amber-600'
                      : 'bg-white border-2 border-amber-400 text-amber-700 hover:bg-amber-50'
                  }`}
                >
                  {togglingFeatured ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : isFeatured ? (
                    <>⭐ Hervorgehoben</>
                  ) : (
                    <>Hervorheben (30 Tage)</>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ── Kontakt ── */}
        <div className="card">
          <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2"><User className="h-4 w-4 text-primary-500" />Kontakt & Arbeitgeber</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {isExternal && (
              <div className="sm:col-span-2">
                <label className={labelCls}>Arbeitgebername (BA-Stelle)</label>
                <input className={inputCls} value={externalEmployerName} onChange={e => setExternalEmployerName(e.target.value)} placeholder="Firmenname des Arbeitgebers" />
              </div>
            )}
            <div>
              <label className={labelCls}><User className="inline h-3.5 w-3.5 mr-1" />Ansprechpartner</label>
              <input className={inputCls} value={contactPerson} onChange={e => setContactPerson(e.target.value)} placeholder="Max Mustermann" />
            </div>
            <div>
              <label className={labelCls}><Phone className="inline h-3.5 w-3.5 mr-1" />Telefon</label>
              <input className={inputCls} value={contactPhone} onChange={e => setContactPhone(e.target.value)} placeholder="+49 30 ..." />
            </div>
            <div>
              <label className={labelCls}><Mail className="inline h-3.5 w-3.5 mr-1" />E-Mail</label>
              <input type="email" className={inputCls} value={contactEmail} onChange={e => setContactEmail(e.target.value)} placeholder="jobs@firma.de" />
            </div>
            {isExternal && (
              <div>
                <label className={labelCls}><ExternalLink className="inline h-3.5 w-3.5 mr-1" />Externer Link (BA)</label>
                <input className={inputCls} value={externalUrl} onChange={e => setExternalUrl(e.target.value)} placeholder="https://www.arbeitsagentur.de/..." />
              </div>
            )}
          </div>
        </div>

        {/* ── Standort ── */}
        <div className="card">
          <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2"><MapPin className="h-4 w-4 text-primary-500" />Standort</h2>
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className={labelCls}>Ort / Stadt</label>
              <input className={inputCls} value={location} onChange={e => setLocation(e.target.value)} placeholder="Berlin, Hamburg..." />
            </div>
            <div>
              <label className={labelCls}>PLZ</label>
              <input className={inputCls} value={postalCode} onChange={e => setPostalCode(e.target.value)} placeholder="10115" />
            </div>
            <div className="sm:col-span-3">
              <label className={labelCls}>Straße / Adresse</label>
              <input className={inputCls} value={address} onChange={e => setAddress(e.target.value)} placeholder="Musterstraße 1" />
            </div>
          </div>
          <div className="flex items-center gap-6 mt-4">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input type="checkbox" checked={remotePossible} onChange={e => setRemotePossible(e.target.checked)} className="h-4 w-4 rounded accent-primary-600" />
              <Wifi className="h-4 w-4 text-gray-500" />
              <span className="text-sm text-gray-700">Remote möglich</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input type="checkbox" checked={accommodationProvided} onChange={e => setAccommodationProvided(e.target.checked)} className="h-4 w-4 rounded accent-primary-600" />
              <Home className="h-4 w-4 text-gray-500" />
              <span className="text-sm text-gray-700">Unterkunft vorhanden</span>
            </label>
          </div>
        </div>

        {/* ── Gehalt ── */}
        <div className="card">
          <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2"><Euro className="h-4 w-4 text-primary-500" />Gehalt / Vergütung</h2>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Minimum (€)</label>
              <input type="number" min={0} step={0.01} className={inputCls} value={salaryMin} onChange={e => setSalaryMin(e.target.value)} placeholder="13.90" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Maximum (€)</label>
              <input type="number" min={0} step={0.01} className={inputCls} value={salaryMax} onChange={e => setSalaryMax(e.target.value)} placeholder="16.00" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Typ</label>
              <select className={inputCls} value={salaryType} onChange={e => setSalaryType(e.target.value)}>
                <option value="hourly">Stundenlohn</option>
                <option value="monthly">Monatslohn</option>
                <option value="yearly">Jahreslohn</option>
              </select>
            </div>
          </div>
        </div>

        {/* ── Zeitraum ── */}
        <div className="card">
          <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2"><Calendar className="h-4 w-4 text-primary-500" />Zeitraum</h2>
          <div className="grid sm:grid-cols-3 gap-4">
            <div>
              <label className={labelCls}>Startdatum</label>
              <input type="date" className={inputCls} value={startDate} onChange={e => setStartDate(e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Enddatum</label>
              <input type="date" className={inputCls} value={endDate} onChange={e => setEndDate(e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Bewerbungsschluss</label>
              <input type="date" className={inputCls} value={deadline} onChange={e => setDeadline(e.target.value)} />
            </div>
          </div>
        </div>

        {/* ── Sprachen-Tabs ── */}
        {availableLanguages.length > 1 && (
          <div className="card">
            <div className="flex items-center gap-2 mb-3">
              <Languages className="h-5 w-5 text-primary-600" />
              <span className="font-medium">Sprache bearbeiten</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {LANGUAGES.filter(l => availableLanguages.includes(l.code)).map(lang => (
                <button key={lang.code} onClick={() => setActiveLanguage(lang.code)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all ${activeLanguage === lang.code ? "bg-primary-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}>
                  {lang.flag} {lang.name} {activeLanguage === lang.code && <Check className="h-4 w-4" />}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Inhalt ── */}
        <div className="card">
          <label className={labelCls}>Titel</label>
          <input className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-primary-500 focus:ring-2 focus:ring-primary-200 focus:outline-none" value={content.title} onChange={e => updateContent("title", e.target.value)} placeholder="Stellentitel" />
        </div>

        <div className="card">
          <label className={labelCls}>Beschreibung</label>
          <RichTextEditor value={content.description} onChange={(v: string) => updateContent("description", v)} placeholder="Stellenbeschreibung..." />
        </div>
        <div className="card">
          <label className={labelCls}>Aufgaben</label>
          <RichTextEditor value={content.tasks || ""} onChange={(v: string) => updateContent("tasks", v)} placeholder="Aufgaben und Tätigkeiten..." />
        </div>
        <div className="card">
          <label className={labelCls}>Anforderungen</label>
          <RichTextEditor value={content.requirements || ""} onChange={(v: string) => updateContent("requirements", v)} placeholder="Anforderungen..." />
        </div>
        <div className="card">
          <label className={labelCls}>Benefits / Wir bieten</label>
          <RichTextEditor value={content.benefits || ""} onChange={(v: string) => updateContent("benefits", v)} placeholder="Was wir bieten..." />
        </div>

        {/* ── Hinweis ── */}
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium text-amber-800">Admin-Bearbeitung</p>
            <p className="text-sm text-amber-700 mt-1">Änderungen werden direkt gespeichert. Wenn du den Job aktivierst, geht die Bewerber-Benachrichtigung raus.</p>
          </div>
        </div>

        {/* ── Speichern ── */}
        <div className="flex justify-end gap-3">
          <Link href="/admin/jobs" className="btn-secondary">Abbrechen</Link>
          <button onClick={handleSave} disabled={saving} className="btn-primary flex items-center gap-2">
            {saving ? <><Loader2 className="h-4 w-4 animate-spin" />Speichern...</> : <><Save className="h-4 w-4" />Änderungen speichern</>}
          </button>
        </div>

      </div>
    </div>
  );
}
