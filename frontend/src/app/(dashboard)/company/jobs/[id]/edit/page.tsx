"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useForm } from "react-hook-form";
import Link from "next/link";
import { jobsAPI } from "@/lib/api";
import toast from "react-hot-toast";
import RichTextEditor from "@/components/RichTextEditor";
import { Briefcase, ArrowLeft, Save, Loader2, MapPin, Euro, Languages, Plus, Minus, Clock, AlertTriangle, User, Phone, Mail, FileText, Globe, Eye, X, MessageCircle, Sparkles, Zap } from "lucide-react";

const JOB_LANGUAGES = [{ code: "de", name: "Deutsch", flag: "🇩🇪" }, { code: "en", name: "English", flag: "🇬🇧" }, { code: "es", name: "Español", flag: "🇪🇸" }, { code: "ru", name: "Русский", flag: "🇷🇺" }];
const positionTypes = [{ value: "general", label: "Allgemein" }, { value: "studentenferienjob", label: "Studentenferienjob" }, { value: "saisonjob", label: "Saisonjob" }, { value: "workandholiday", label: "Work & Holiday" }, { value: "fachkraft", label: "Fachkräfte" }, { value: "ausbildung", label: "Ausbildung" }];
const employmentTypes = [{ value: "fulltime", label: "Vollzeit" }, { value: "parttime", label: "Teilzeit" }, { value: "both", label: "Vollzeit/Teilzeit" }];
const salaryTypes = [{ value: "hourly", label: "Pro Stunde" }, { value: "monthly", label: "Pro Monat" }, { value: "yearly", label: "Pro Jahr" }];
const languageLevels = [{ value: "not_required", label: "Nicht erforderlich" }, { value: "a1", label: "A1 - Anfänger" }, { value: "a2", label: "A2 - Grundkenntnisse" }, { value: "b1", label: "B1 - Fortgeschritten" }, { value: "b2", label: "B2 - Fließend" }, { value: "c1", label: "C1 - Verhandlungssicher" }, { value: "c2", label: "C2 - Muttersprachlich" }];
const positionTypeColors: Record<string, string> = { general: "bg-gray-100 border-gray-400 text-gray-800", studentenferienjob: "bg-blue-100 border-blue-400 text-blue-800", saisonjob: "bg-orange-100 border-orange-400 text-orange-800", workandholiday: "bg-green-100 border-green-400 text-green-800", fachkraft: "bg-purple-100 border-purple-400 text-purple-800", ausbildung: "bg-pink-100 border-pink-400 text-pink-800" };
const allLanguagesList = ["Afrikaans", "Albanisch", "Arabisch", "Armenisch", "Bulgarisch", "Chinesisch", "Dänisch", "Finnisch", "Französisch", "Georgisch", "Griechisch", "Hindi", "Indonesisch", "Italienisch", "Japanisch", "Koreanisch", "Kroatisch", "Niederländisch", "Norwegisch", "Persisch", "Polnisch", "Portugiesisch", "Rumänisch", "Schwedisch", "Serbisch", "Slowakisch", "Slowenisch", "Spanisch", "Tschechisch", "Türkisch", "Ukrainisch", "Ungarisch", "Vietnamesisch"];
const contactMethods = [{ value: "email", label: "E-Mail", icon: Mail, color: "blue" }, { value: "phone", label: "Telefon", icon: Phone, color: "gray" }, { value: "whatsapp", label: "WhatsApp", icon: MessageCircle, color: "green" }];

interface Translation { title: string; description: string; tasks: string; requirements: string; benefits: string; }
interface OtherLang { language: string; level: string; required: boolean; }

export default function EditJobPage() {
  const router = useRouter();
  const params = useParams();
  const jobId = params.id as string;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [jobSettings, setJobSettings] = useState({ max_job_deadline_days: 90 });
  const [showPreview, setShowPreview] = useState(false);
  const [selectedPositionTypes, setSelectedPositionTypes] = useState<string[]>([]);
  const [activeLanguage, setActiveLanguage] = useState("de");
  const [enabledLanguages, setEnabledLanguages] = useState(["de"]);
  const [translations, setTranslations] = useState<Record<string, Translation>>({ de: { title: "", description: "", tasks: "", requirements: "", benefits: "" }, en: { title: "", description: "", tasks: "", requirements: "", benefits: "" }, es: { title: "", description: "", tasks: "", requirements: "", benefits: "" }, ru: { title: "", description: "", tasks: "", requirements: "", benefits: "" } });
  const [startImmediate, setStartImmediate] = useState(false);
  const [otherLanguages, setOtherLanguages] = useState<OtherLang[]>([]);

  const { register, handleSubmit, watch, setValue } = useForm<Record<string, string | boolean | number | undefined>>({ defaultValues: { german_required: "not_required", english_required: "not_required" } });

  useEffect(() => {
    loadJob();
    jobsAPI.getPublicSettings().then(r => setJobSettings(r.data)).catch(() => {});
  }, [jobId]);

  const loadJob = async () => {
    try {
      const response = await jobsAPI.get(jobId);
      const job = response.data;
      // Translations laden
      setTranslations({
        de: { title: job.title || "", description: job.description || "", tasks: job.tasks || "", requirements: job.requirements || "", benefits: job.benefits || "" },
        en: job.translations?.en || { title: "", description: "", tasks: "", requirements: "", benefits: "" },
        es: job.translations?.es || { title: "", description: "", tasks: "", requirements: "", benefits: "" },
        ru: job.translations?.ru || { title: "", description: "", tasks: "", requirements: "", benefits: "" },
      });
      // Position Types
      if (job.position_types?.length) setSelectedPositionTypes(job.position_types);
      else if (job.position_type) setSelectedPositionTypes([job.position_type]);
      // Enabled Languages
      if (job.available_languages?.length) setEnabledLanguages(job.available_languages);
      // Other Languages
      if (job.other_languages_required?.length) setOtherLanguages(job.other_languages_required);
      // Form Values
      ["location", "address", "postal_code", "employment_type", "salary_min", "salary_max", "salary_type", "german_required", "english_required", "contact_person", "contact_email", "contact_phone", "contact_whatsapp", "preferred_contact_method", "start_date", "end_date", "deadline", "remote_possible", "accommodation_provided"].forEach(k => {
        if (job[k] !== undefined && job[k] !== null) setValue(k, job[k]);
      });
      // Start Immediate Check
      if (job.start_date) {
        const startDate = new Date(job.start_date);
        const today = new Date(); today.setHours(0, 0, 0, 0);
        if (startDate <= today) setStartImmediate(true);
      }
    } catch {
      toast.error("Fehler beim Laden der Stelle");
      router.push("/company/jobs");
    } finally {
      setLoading(false);
    }
  };

  const toggleLanguage = (c: string) => { if (c === "de") return; enabledLanguages.includes(c) ? (setEnabledLanguages(enabledLanguages.filter(l => l !== c)), activeLanguage === c && setActiveLanguage("de")) : setEnabledLanguages([...enabledLanguages, c]); };
  const updateTranslation = (f: keyof Translation, v: string) => setTranslations({ ...translations, [activeLanguage]: { ...translations[activeLanguage], [f]: v } });
  const togglePositionType = (v: string) => { if (selectedPositionTypes.includes(v)) { let n = selectedPositionTypes.filter(t => t !== v); if (v === "workandholiday") n = n.filter(t => t !== "saisonjob"); setSelectedPositionTypes(n); } else { let n = [...selectedPositionTypes, v]; if (v === "workandholiday" && !n.includes("saisonjob")) n.push("saisonjob"); setSelectedPositionTypes(n); } };

  const handleStartImmediate = (checked: boolean) => { setStartImmediate(checked); if (checked) setValue("start_date", new Date().toISOString().split("T")[0]); };

  const addOtherLanguage = () => setOtherLanguages([...otherLanguages, { language: "", level: "a2", required: false }]);
  const removeOtherLanguage = (i: number) => setOtherLanguages(otherLanguages.filter((_, idx) => idx !== i));
  const updateOtherLanguage = (i: number, field: keyof OtherLang, value: string | boolean) => { const n = [...otherLanguages]; n[i] = { ...n[i], [field]: value }; setOtherLanguages(n); };

  const handleDeepLTranslate = async () => {
    if (!translations.de.title?.trim() && !translations.de.description?.trim()) { toast.error("Bitte deutsche Texte ausfüllen"); return; }
    const targets = enabledLanguages.filter(l => l !== "de");
    if (targets.length === 0) { toast.error("Weitere Sprache aktivieren"); return; }
    setTranslating(true); toast.loading("Übersetze mit DeepL...", { id: "deepl" });
    try {
      for (const lang of targets) {
        const r = await jobsAPI.translateText({ texts: { title: translations.de.title, description: translations.de.description, tasks: translations.de.tasks, requirements: translations.de.requirements, benefits: translations.de.benefits }, target_language: lang });
        if (r.data) setTranslations(p => ({ ...p, [lang]: { title: r.data.title || p[lang].title, description: r.data.description || p[lang].description, tasks: r.data.tasks || p[lang].tasks, requirements: r.data.requirements || p[lang].requirements, benefits: r.data.benefits || p[lang].benefits } }));
      }
      toast.success(`In ${targets.length} Sprache${targets.length > 1 ? "n" : ""} übersetzt`, { id: "deepl" });
    } catch (e: unknown) { 
      const err = e as { response?: { data?: { detail?: string } } };
      toast.error(err.response?.data?.detail || "Übersetzung fehlgeschlagen", { id: "deepl" }); 
    }
    finally { setTranslating(false); }
  };

  const stripHtml = (html: string) => html.replace(/<[^>]*>/g, "").trim();
  const onSubmit = async (data: Record<string, unknown>) => {
    if (!translations.de.title?.trim()) { toast.error("Bitte Stellentitel eingeben"); return; }
    if (!stripHtml(translations.de.description || "")) { toast.error("Bitte Beschreibung eingeben"); return; }
    const untranslated = enabledLanguages.filter(l => l !== "de" && !translations[l]?.title?.trim() && !stripHtml(translations[l]?.description || "") && !stripHtml(translations[l]?.tasks || "") && !stripHtml(translations[l]?.requirements || "") && !stripHtml(translations[l]?.benefits || ""));
    if (untranslated.length > 0) {
      const names = untranslated.map(c => JOB_LANGUAGES.find(l => l.code === c)?.name || c).join(", ");
      toast.error(`${names} ${untranslated.length === 1 ? "hat" : "haben"} keine Übersetzung. Bitte den Inhalt übersetzen (DeepL-Button) oder die Sprache entfernen.`);
      return;
    }
    setSaving(true);
    try {
      const translatedLangs = enabledLanguages.filter(l => l === "de" || translations[l]?.title?.trim() || translations[l]?.description?.trim());
      const d: Record<string, unknown> = { ...data, title: translations.de.title, description: translations.de.description, tasks: translations.de.tasks, requirements: translations.de.requirements, benefits: translations.de.benefits, position_type: selectedPositionTypes[0] || null, position_types: selectedPositionTypes, available_languages: translatedLangs, other_languages_required: otherLanguages.filter(l => l.language) };
      const tr: Record<string, Translation> = {}; translatedLangs.filter(l => l !== "de").forEach(l => { tr[l] = translations[l]; }); d.translations = tr;
      // Gehalt parsen oder entfernen wenn leer
      if (d.salary_min && String(d.salary_min).trim()) d.salary_min = parseFloat(String(d.salary_min).replace(",", ".")); else delete d.salary_min;
      if (d.salary_max && String(d.salary_max).trim()) d.salary_max = parseFloat(String(d.salary_max).replace(",", ".")); else delete d.salary_max;
      // Leere Datumsfelder entfernen
      if (!d.start_date || !String(d.start_date).trim()) delete d.start_date;
      if (!d.end_date || !String(d.end_date).trim()) delete d.end_date;
      // Leere optionale Felder entfernen
      if (!d.employment_type) delete d.employment_type;
      if (!d.salary_type) delete d.salary_type;
      await jobsAPI.update(jobId, d);
      toast.success("Stelle aktualisiert!");
      router.push("/company/jobs");
    } catch (e: unknown) { 
      const err = e as { response?: { data?: { detail?: string | Array<{msg: string}> } } }; 
      const detail = err.response?.data?.detail;
      const errorMsg = typeof detail === 'string' ? detail : Array.isArray(detail) ? detail.map(d => d.msg).join(', ') : "Fehler beim Speichern";
      toast.error(errorMsg); 
    }
    finally { setSaving(false); }
  };

  const maxDeadline = new Date(Date.now() + jobSettings.max_job_deadline_days * 86400000).toISOString().split("T")[0];
  const preferredContact = watch("preferred_contact_method");

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-12 w-12 text-primary-600 animate-spin" /></div>;

  return (
    <>
      <Link href="/company/jobs" className="inline-flex items-center text-gray-600 hover:text-primary-600 mb-6 group"><ArrowLeft className="h-4 w-4 mr-2 group-hover:-translate-x-1 transition-transform" />Zurück</Link>
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3"><div className="p-3 bg-primary-100 rounded-xl"><Briefcase className="h-8 w-8 text-primary-600" /></div><div><h1 className="text-3xl font-bold text-gray-900">Stelle bearbeiten</h1><p className="text-gray-600">Aktualisieren Sie Ihre Stellenanzeige</p></div></div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        {/* Mehrsprachig */}
        <div className="card border-l-4 border-l-indigo-500">
          <h2 className="text-xl font-semibold mb-2 flex items-center gap-2"><Globe className="h-5 w-5 text-indigo-600" />Mehrsprachige Stellenausschreibung</h2>
          <p className="text-gray-600 mb-4 text-sm">Erstellen Sie Ihre Stelle in mehreren Sprachen. Deutsch ist Pflicht, weitere Sprachen optional.</p>
          <div className="flex flex-wrap gap-2 mb-4">
            {JOB_LANGUAGES.map(l => <button key={l.code} type="button" onClick={() => toggleLanguage(l.code)} disabled={l.code === "de"} className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium border-2 transition-all ${enabledLanguages.includes(l.code) ? "bg-indigo-100 text-indigo-700 border-indigo-300" : "bg-gray-100 text-gray-500 border-transparent hover:bg-gray-200"} ${l.code === "de" ? "cursor-not-allowed" : ""}`}><span className="text-xl">{l.flag}</span>{l.name}{enabledLanguages.includes(l.code) && l.code !== "de" && <span className="text-xs bg-indigo-200 px-1.5 rounded">✓</span>}</button>)}
          </div>
          {enabledLanguages.length > 1 && (
            <div className="space-y-3">
              <p className="text-indigo-700 text-sm bg-indigo-50 rounded-lg p-3"><Globe className="h-4 w-4 inline mr-1" /><strong>{enabledLanguages.length} Sprachen aktiviert.</strong> Bewerber können zwischen den Sprachen wechseln.</p>
              <button type="button" onClick={handleDeepLTranslate} disabled={translating} className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-purple-600 text-white rounded-xl font-medium hover:bg-purple-700 transition-all disabled:opacity-50">
                {translating ? <Loader2 className="h-5 w-5 animate-spin" /> : <Sparkles className="h-5 w-5" />}
                {translating ? "Übersetze..." : "Mit DeepL automatisch übersetzen"}
              </button>
              <p className="text-xs text-gray-500 text-center">Übersetzt den deutschen Text automatisch in alle aktivierten Sprachen</p>
            </div>
          )}
        </div>

        {/* Grundinfo */}
        <div className="card">
          <h2 className="text-xl font-semibold mb-6 flex items-center gap-2"><Briefcase className="h-5 w-5 text-primary-600" />Grundinformationen</h2>
          {enabledLanguages.length > 1 && <div className="flex gap-1 mb-6 p-1 bg-gray-100 rounded-lg w-fit">{enabledLanguages.map(c => { const l = JOB_LANGUAGES.find(x => x.code === c); const missing = c !== "de" && !translations[c]?.title?.trim() && !translations[c]?.description?.trim(); return <button key={c} type="button" onClick={() => setActiveLanguage(c)} className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${activeLanguage === c ? "bg-white text-gray-900 shadow-sm" : "text-gray-600"}`}><span>{l?.flag}</span>{l?.name}{missing && <span className="text-amber-500 text-xs" title="Kein Inhalt übersetzt">⚠</span>}</button>; })}</div>}
          <div className="space-y-4">
            <div><label className="label">Stellentitel *{activeLanguage !== "de" && <span className="text-indigo-600 ml-2">({JOB_LANGUAGES.find(l => l.code === activeLanguage)?.name})</span>}</label><input type="text" className="input-styled" placeholder="z.B. Erntehelfer für Obstbau" value={translations[activeLanguage].title} onChange={e => updateTranslation("title", e.target.value)} /></div>
            <div className="grid md:grid-cols-2 gap-4">
              <div><label className="label">Stellenart (Mehrfachauswahl)</label><div className="flex flex-wrap gap-2">{positionTypes.map(t => <button key={t.value} type="button" onClick={() => togglePositionType(t.value)} className={`px-4 py-2 rounded-lg border-2 font-medium text-sm transition-all ${selectedPositionTypes.includes(t.value) ? positionTypeColors[t.value] : "bg-white border-gray-200 text-gray-600 hover:border-gray-300"}`}>{t.label}{selectedPositionTypes.includes(t.value) && " ✓"}</button>)}</div></div>
              <div><label className="label">Einstellungsart</label><select className="input-styled" {...register("employment_type")}><option value="">Wählen (optional)</option>{employmentTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}</select></div>
            </div>
            <div>
              <label className="label">Beschreibung *{activeLanguage !== "de" && <span className="text-indigo-600 ml-2">({JOB_LANGUAGES.find(l => l.code === activeLanguage)?.name})</span>}</label>
              <RichTextEditor value={translations[activeLanguage].description} onChange={(v: string) => updateTranslation("description", v)} placeholder="Beschreiben Sie die Stelle allgemein..." rows={6} helpText="Nutzen Sie Fett, Kursiv und Aufzählungen für bessere Lesbarkeit." />
            </div>
          </div>
        </div>

        {/* Aufgaben & Anforderungen */}
        <div className="card border-l-4 border-l-purple-500">
          <h2 className="text-xl font-semibold mb-2 flex items-center gap-2"><FileText className="h-5 w-5 text-purple-600" />Aufgaben & Anforderungen</h2>
          <p className="text-gray-600 mb-6 text-sm">Beschreiben Sie die Aufgaben und welche Qualifikationen benötigt werden.</p>
          {enabledLanguages.length > 1 && <div className="flex gap-1 mb-4 p-1 bg-gray-100 rounded-lg w-fit">{enabledLanguages.map(c => { const l = JOB_LANGUAGES.find(x => x.code === c); const missing = c !== "de" && !translations[c]?.title?.trim() && !translations[c]?.description?.trim(); return <button key={c} type="button" onClick={() => setActiveLanguage(c)} className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${activeLanguage === c ? "bg-white text-gray-900 shadow-sm" : "text-gray-600"}`}><span>{l?.flag}</span>{l?.name}{missing && <span className="text-amber-500 text-xs" title="Kein Inhalt übersetzt">⚠</span>}</button>; })}</div>}
          <div className="space-y-4">
            <div><label className="label">Aufgaben{activeLanguage !== "de" && <span className="text-indigo-600 ml-2">({JOB_LANGUAGES.find(l => l.code === activeLanguage)?.name})</span>}</label><RichTextEditor value={translations[activeLanguage].tasks} onChange={(v: string) => updateTranslation("tasks", v)} placeholder="Was sind die Hauptaufgaben?" rows={5} helpText="Nutzen Sie Listen für eine übersichtliche Auflistung." /></div>
            <div><label className="label">Anforderungen{activeLanguage !== "de" && <span className="text-indigo-600 ml-2">({JOB_LANGUAGES.find(l => l.code === activeLanguage)?.name})</span>}</label><RichTextEditor value={translations[activeLanguage].requirements} onChange={(v: string) => updateTranslation("requirements", v)} placeholder="Welche Qualifikationen werden benötigt?" rows={5} /></div>
          </div>
        </div>

        {/* Sprachanforderungen */}
        <div className="card border-l-4 border-l-blue-500">
          <h2 className="text-xl font-semibold mb-2 flex items-center gap-2"><Languages className="h-5 w-5 text-blue-600" />Sprachanforderungen</h2>
          <p className="text-gray-600 mb-6 text-sm">Geben Sie an, welche Sprachkenntnisse für diese Stelle erforderlich sind.</p>
          <div className="grid md:grid-cols-2 gap-4 mb-6">
            <div><label className="label">🇩🇪 Deutschkenntnisse</label><select className="input-styled" {...register("german_required")}>{languageLevels.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}</select></div>
            <div><label className="label">🇬🇧 Englischkenntnisse</label><select className="input-styled" {...register("english_required")}>{languageLevels.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}</select></div>
          </div>
          <div className="border-t pt-4">
            <div className="flex items-center justify-between mb-4">
              <label className="label mb-0">Weitere Sprachanforderungen</label>
              <button type="button" onClick={addOtherLanguage} className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"><Plus className="h-4 w-4" />Sprache hinzufügen</button>
            </div>
            {otherLanguages.length === 0 ? (
              <p className="text-gray-500 text-sm italic">Keine weiteren Sprachanforderungen.</p>
            ) : (
              <div className="space-y-3">
                {otherLanguages.map((lang, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl">
                    <select className="input-styled flex-1" value={lang.language} onChange={e => updateOtherLanguage(i, "language", e.target.value)}>
                      <option value="">Sprache wählen...</option>
                      {allLanguagesList.map(l => <option key={l} value={l}>{l}</option>)}
                    </select>
                    <select className="input-styled flex-1" value={lang.level} onChange={e => updateOtherLanguage(i, "level", e.target.value)}>
                      {languageLevels.filter(l => l.value !== "not_required").map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
                    </select>
                    <select className={`input-styled w-auto ${lang.required ? "bg-red-50 border-red-300 text-red-700" : "bg-green-50 border-green-300 text-green-700"}`} value={lang.required ? "required" : "optional"} onChange={e => updateOtherLanguage(i, "required", e.target.value === "required")}>
                      <option value="optional">✨ Wünschenswert</option>
                      <option value="required">⚠️ Voraussetzung</option>
                    </select>
                    <button type="button" onClick={() => removeOtherLanguage(i)} className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg"><Minus className="h-5 w-5" /></button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Ort & Zeitraum */}
        <div className="card">
          <h2 className="text-xl font-semibold mb-6 flex items-center gap-2"><MapPin className="h-5 w-5 text-primary-600" />Ort & Zeitraum</h2>
          <div className="grid md:grid-cols-2 gap-4 mb-4">
            <div><label className="label">Ort / Stadt</label><input type="text" className="input-styled" placeholder="z.B. München" {...register("location")} /></div>
            <div><label className="label">PLZ</label><input type="text" className="input-styled" placeholder="z.B. 80331" {...register("postal_code")} /></div>
          </div>
          <div className="mb-4"><label className="label">Adresse</label><input type="text" className="input-styled" placeholder="z.B. Musterstraße 123" {...register("address")} /></div>
          <div className="flex flex-wrap gap-6 mb-6">
            <label className="flex items-center gap-3 cursor-pointer"><input type="checkbox" {...register("remote_possible")} className="w-5 h-5 rounded" /><span>Remote möglich</span></label>
            <label className="flex items-center gap-3 cursor-pointer"><input type="checkbox" {...register("accommodation_provided")} className="w-5 h-5 rounded" /><span>Unterkunft vorhanden</span></label>
          </div>
          <div className="border-t pt-4">
            <label className="flex items-center gap-3 cursor-pointer mb-4 p-3 bg-green-50 rounded-lg border border-green-200">
              <input type="checkbox" checked={startImmediate} onChange={e => handleStartImmediate(e.target.checked)} className="w-5 h-5 rounded text-green-600" />
              <div><span className="font-medium text-green-800">Ab sofort</span><p className="text-sm text-green-600">Stelle ist sofort verfügbar</p></div>
              {startImmediate && <Zap className="h-5 w-5 text-green-600 ml-auto" />}
            </label>
            <div className="grid md:grid-cols-2 gap-4">
              <div><label className="label">Startdatum</label><input type="date" className="input-styled" {...register("start_date")} /></div>
              <div><label className="label">Enddatum (optional)</label><input type="date" className="input-styled" {...register("end_date")} /></div>
            </div>
          </div>
        </div>

        {/* Kontaktperson */}
        <div className="card border-l-4 border-l-green-500">
          <h2 className="text-xl font-semibold mb-2 flex items-center gap-2"><User className="h-5 w-5 text-green-600" />Kontaktperson</h2>
          <p className="text-gray-600 mb-6 text-sm">Optional: Geben Sie eine Kontaktperson für Rückfragen an.</p>
          <div className="grid md:grid-cols-2 gap-4 mb-4">
            <div><label className="label">Ansprechpartner</label><input type="text" className="input-styled" placeholder="Max Mustermann" {...register("contact_person")} /></div>
            <div><label className="label">E-Mail</label><input type="email" className="input-styled" placeholder="kontakt@firma.de" {...register("contact_email")} /></div>
            <div><label className="label">Telefon</label><input type="tel" className="input-styled" placeholder="+49 123 456789" {...register("contact_phone")} /></div>
            <div><label className="label">WhatsApp</label><input type="tel" className="input-styled" placeholder="+49 123 456789" {...register("contact_whatsapp")} /></div>
          </div>
          <div>
            <label className="label">Bevorzugter Kontaktweg</label>
            <div className="flex flex-wrap gap-3">
              {contactMethods.map(m => {
                const Icon = m.icon;
                const isSelected = preferredContact === m.value;
                return (
                  <button key={m.value} type="button" onClick={() => setValue("preferred_contact_method", isSelected ? "" : m.value)} className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 cursor-pointer transition-all ${isSelected ? `border-${m.color}-500 bg-${m.color}-50 text-${m.color}-700` : "border-gray-200 hover:border-gray-300"}`}>
                    <Icon className={`h-4 w-4 ${isSelected ? `text-${m.color}-600` : "text-gray-400"}`} />
                    <span className="text-sm font-medium">{m.label}</span>
                    {isSelected && <span className="text-xs">✓</span>}
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-gray-500 mt-2">Wird Bewerbern als bevorzugte Kontaktmethode angezeigt. Klicken Sie erneut zum Abwählen.</p>
          </div>
        </div>

        {/* Gehalt & Benefits */}
        <div className="card border-l-4 border-l-yellow-500">
          <h2 className="text-xl font-semibold mb-2 flex items-center gap-2"><Euro className="h-5 w-5 text-yellow-600" />Gehalt & Benefits</h2>
          <p className="text-gray-600 mb-6 text-sm">Geben Sie die Vergütung und Zusatzleistungen an.</p>
          <div className="grid md:grid-cols-3 gap-4 mb-6">
            <div><label className="label">Minimum (€)</label><input type="text" inputMode="decimal" className="input-styled" placeholder="z.B. 13,90" {...register("salary_min")} /></div>
            <div><label className="label">Maximum (€)</label><input type="text" inputMode="decimal" className="input-styled" placeholder="z.B. 15,00" {...register("salary_max")} /></div>
            <div><label className="label">Zeitraum</label><select className="input-styled" {...register("salary_type")}><option value="">Wählen</option>{salaryTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}</select></div>
          </div>
          <div>
            {enabledLanguages.length > 1 && <div className="flex gap-1 mb-4 p-1 bg-gray-100 rounded-lg w-fit">{enabledLanguages.map(c => { const l = JOB_LANGUAGES.find(x => x.code === c); const missing = c !== "de" && !translations[c]?.title?.trim() && !translations[c]?.description?.trim(); return <button key={c} type="button" onClick={() => setActiveLanguage(c)} className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${activeLanguage === c ? "bg-white text-gray-900 shadow-sm" : "text-gray-600"}`}><span>{l?.flag}</span>{l?.name}{missing && <span className="text-amber-500 text-xs" title="Kein Inhalt übersetzt">⚠</span>}</button>; })}</div>}
            <label className="label">Benefits / Wir bieten{activeLanguage !== "de" && <span className="text-indigo-600 ml-2">({JOB_LANGUAGES.find(l => l.code === activeLanguage)?.name})</span>}</label>
            <RichTextEditor value={translations[activeLanguage].benefits} onChange={(v: string) => updateTranslation("benefits", v)} placeholder="Was bieten Sie den Bewerbern?" rows={4} helpText="Nutzen Sie Listen für eine übersichtliche Auflistung." />
          </div>
        </div>

        {/* Bewerbungsfrist */}
        <div className="card border-l-4 border-l-orange-500">
          <h2 className="text-xl font-semibold mb-2 flex items-center gap-2"><Clock className="h-5 w-5 text-orange-600" />Bewerbungsfrist</h2>
          <p className="text-gray-600 mb-4 text-sm">Legen Sie fest, wie lange Bewerbungen möglich sein sollen.</p>
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 mb-4">
            <p className="text-orange-800 text-sm flex items-start gap-2"><AlertTriangle className="h-5 w-5 flex-shrink-0" /><span><strong>Wichtig:</strong> Die Bewerbungsfrist darf maximal <strong>{jobSettings.max_job_deadline_days} Tage</strong> in der Zukunft liegen. Nach Ablauf wird die Stelle automatisch archiviert.</span></p>
          </div>
          <div className="max-w-md"><label className="label">Bewerbungsfrist *</label><input type="date" className="input-styled" min={new Date().toISOString().split("T")[0]} max={maxDeadline} {...register("deadline", { required: true })} /><p className="text-gray-500 text-sm mt-2">Standardmäßig auf {jobSettings.max_job_deadline_days} Tage gesetzt.</p></div>
        </div>

        {/* Buttons */}
        <div className="flex flex-wrap justify-between items-center gap-3 sticky bottom-4 bg-white/80 backdrop-blur-sm p-4 rounded-xl shadow-lg border">
          <Link href="/company/jobs" className="btn-secondary">Abbrechen</Link>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setShowPreview(true)} className="btn-secondary flex items-center gap-2"><Eye className="h-4 w-4" />Vorschau</button>
            <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}Änderungen speichern</button>
          </div>
        </div>
      </form>

      {/* Vorschau Modal */}
      {showPreview && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center overflow-y-auto p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full my-8">
            <div className="sticky top-0 bg-white border-b p-4 rounded-t-2xl flex items-center justify-between z-10">
              <h2 className="text-xl font-bold flex items-center gap-2"><Eye className="h-5 w-5 text-primary-600" />Vorschau Ihrer Stellenanzeige</h2>
              <button onClick={() => setShowPreview(false)} className="p-2 hover:bg-gray-100 rounded-full"><X className="h-5 w-5" /></button>
            </div>
            <div className="p-6">
              <div className="flex items-start justify-between gap-4 mb-4">
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{translations.de.title || "Stellentitel"}</h1>
                <div className="flex flex-wrap gap-2">{selectedPositionTypes.map(t => <span key={t} className={`px-3 py-1 rounded-full text-sm font-semibold border ${positionTypeColors[t]}`}>{positionTypes.find(p => p.value === t)?.label}</span>)}</div>
              </div>
              <div className="flex flex-wrap items-center gap-4 text-gray-600 mb-6">
                {watch("location") && <span className="flex items-center gap-1.5"><MapPin className="h-5 w-5 text-gray-400" />{watch("location")}</span>}
                {watch("employment_type") && <span className="flex items-center gap-1.5"><Briefcase className="h-5 w-5 text-gray-400" />{employmentTypes.find(e => e.value === watch("employment_type"))?.label}</span>}
                {(watch("salary_min") || watch("salary_max")) && <span className="flex items-center gap-1.5"><Euro className="h-5 w-5 text-gray-400" />{watch("salary_min") && watch("salary_max") ? `${watch("salary_min")} - ${watch("salary_max")}€` : watch("salary_min") ? `ab ${watch("salary_min")}€` : `bis ${watch("salary_max")}€`}</span>}
                {startImmediate && <span className="flex items-center gap-1.5 text-green-600"><Zap className="h-5 w-5" />Ab sofort</span>}
              </div>
              {translations.de.description && <div className="mb-6"><h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2"><FileText className="h-5 w-5 text-primary-600" />Stellenbeschreibung</h3><div className="prose prose-sm max-w-none text-gray-700" dangerouslySetInnerHTML={{ __html: translations.de.description }} /></div>}
              {translations.de.tasks && <div className="mb-6"><h3 className="text-lg font-semibold text-gray-900 mb-3">Ihre Aufgaben</h3><div className="prose prose-sm max-w-none text-gray-700" dangerouslySetInnerHTML={{ __html: translations.de.tasks }} /></div>}
              {translations.de.requirements && <div className="mb-6"><h3 className="text-lg font-semibold text-gray-900 mb-3">Anforderungen</h3><div className="prose prose-sm max-w-none text-gray-700" dangerouslySetInnerHTML={{ __html: translations.de.requirements }} /></div>}
              {translations.de.benefits && <div className="mb-6"><h3 className="text-lg font-semibold text-gray-900 mb-3">Wir bieten</h3><div className="prose prose-sm max-w-none text-gray-700" dangerouslySetInnerHTML={{ __html: translations.de.benefits }} /></div>}
              <div className="mb-6 bg-gray-50 rounded-xl p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2"><Languages className="h-5 w-5 text-primary-600" />Sprachanforderungen</h3>
                <div className="flex flex-wrap gap-3">
                  <span className="px-3 py-1.5 bg-white rounded-lg border text-sm">🇩🇪 Deutsch: {languageLevels.find(l => l.value === watch("german_required"))?.label || "Nicht erforderlich"}</span>
                  <span className="px-3 py-1.5 bg-white rounded-lg border text-sm">🇬🇧 Englisch: {languageLevels.find(l => l.value === watch("english_required"))?.label || "Nicht erforderlich"}</span>
                  {otherLanguages.filter(l => l.language).map((l, i) => <span key={i} className={`px-3 py-1.5 rounded-lg border text-sm ${l.required ? "bg-red-50 border-red-200 text-red-700" : "bg-green-50 border-green-200 text-green-700"}`}>{l.language}: {languageLevels.find(x => x.value === l.level)?.label} {l.required ? "(Voraussetzung)" : "(Wünschenswert)"}</span>)}
                </div>
              </div>
            </div>
            <div className="sticky bottom-0 bg-white border-t p-4 rounded-b-2xl flex justify-end gap-3">
              <button onClick={() => setShowPreview(false)} className="btn-secondary">Schließen</button>
              <button onClick={() => { setShowPreview(false); document.querySelector("form")?.requestSubmit(); }} className="btn-primary flex items-center gap-2"><Save className="h-5 w-5" />Änderungen speichern</button>
            </div>
          </div>
        </div>
      )}

    </>
  );
}
