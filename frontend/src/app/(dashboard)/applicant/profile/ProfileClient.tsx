"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { applicantAPI, documentsAPI } from "@/lib/api";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import { 
  User, Save, Loader2, GraduationCap, Building2, Languages, MapPin, Briefcase,
  Plus, Minus, Upload, Download, Trash2, File, Shield, FileText, FileImage,
  CheckCircle, Clock, ChevronDown, X, ClipboardList, ArrowRight, Sparkles, Wand2,
  AlertCircle
} from "lucide-react";
import { getNationalityOptions } from "@/data/nationalities";
import { trackCVParse } from "@/lib/analytics";



const allLanguages = [
  'Afrikaans', 'Albanisch', 'Arabisch', 'Armenisch', 'Bengalisch', 'Bosnisch', 'Bulgarisch',
  'Chinesisch (Mandarin)', 'Dänisch', 'Estnisch', 'Finnisch', 'Französisch', 'Georgisch',
  'Griechisch', 'Hindi', 'Indonesisch', 'Italienisch', 'Japanisch', 'Koreanisch', 'Kroatisch',
  'Lettisch', 'Litauisch', 'Mazedonisch', 'Niederländisch', 'Norwegisch', 'Persisch/Farsi',
  'Polnisch', 'Portugiesisch', 'Rumänisch', 'Russisch', 'Schwedisch', 'Serbisch', 'Slowakisch',
  'Slowenisch', 'Spanisch', 'Thai', 'Tschechisch', 'Türkisch', 'Ukrainisch', 'Ungarisch',
  'Urdu', 'Vietnamesisch'
];

function CustomSelect({ value, onChange, options, placeholder, className = '' }: {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={onChange}
        className={`appearance-none w-full px-4 py-3 pr-10 bg-white border-2 border-gray-200 rounded-xl 
                   focus:border-primary-500 focus:ring-2 focus:ring-primary-200 focus:outline-none
                   transition-all cursor-pointer text-gray-700 font-medium ${className}`}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
    </div>
  );
}

export default function ProfileClient() {
  const { user } = useAuth();
  const router = useRouter();
  const { t } = useTranslation();
  
  const positionTypes = [
    { value: "studentenferienjob", label: t("positionTypes.studentenferienjob"), icon: "🎓" },
    { value: "saisonjob", label: t("positionTypes.saisonjob"), icon: "🌾" },
    { value: "workandholiday", label: t("positionTypes.workandholiday"), icon: "✈️" },
    { value: "fachkraft", label: t("positionTypes.fachkraft"), icon: "👔" },
    { value: "ausbildung", label: t("positionTypes.ausbildung"), icon: "📚" }
  ];

  const languageLevels = [
    { value: "none", label: t("languageLevels.none") },
    { value: "a1", label: t("languageLevels.a1") },
    { value: "a2", label: t("languageLevels.a2") },
    { value: "b1", label: t("languageLevels.b1") },
    { value: "b2", label: t("languageLevels.b2") },
    { value: "c1", label: t("languageLevels.c1") },
    { value: "c2", label: t("languageLevels.c2") }
  ];

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const [documents, setDocuments] = useState<any[]>([]);
  const [requirements, setRequirements] = useState<any>(null);
  const [otherLanguages, setOtherLanguages] = useState<{language: string; level: string}[]>([]);
  const [workExperiences, setWorkExperiences] = useState<any[]>([]);
  const [cvParsing, setCvParsing] = useState(false);
  const [fabOpen, setFabOpen] = useState(false);
  const [isAtBottom, setIsAtBottom] = useState(false);
  const cvFileInputRef = useRef<HTMLInputElement>(null);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm();
  const selectedPositionTypes = watch("position_types") || [];
  const beenToGermany = watch("been_to_germany");

  // Detect wenn User ganz unten ist
  useEffect(() => {
    const handleScroll = () => {
      const scrolledToBottom = window.innerHeight + window.scrollY >= document.body.offsetHeight - 100;
      setIsAtBottom(scrolledToBottom);
      if (scrolledToBottom) setFabOpen(false);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => { loadProfile(); }, []);

  useEffect(() => {
    const firstType = selectedPositionTypes?.[0];
    if (firstType) loadRequirements(firstType);
  }, [selectedPositionTypes]);

  const loadProfile = async () => {
    try {
      const [profileRes, docsRes] = await Promise.all([applicantAPI.getProfile(), documentsAPI.list()]);
      const data = profileRes.data;
      if (!data.position_types) data.position_types = data.position_type ? [data.position_type] : [];
      reset(data);
      setDocuments(docsRes.data || []);
      if (data.other_languages) setOtherLanguages(data.other_languages);
      if (data.work_experiences) setWorkExperiences(data.work_experiences);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const loadRequirements = async (type: string) => {
    try { const res = await documentsAPI.getRequirements(type); setRequirements(res.data); } catch {}
  };

  const onSubmit = async (data: any) => {
    // Bei Studentenferienjob sind die Semesterferien Pflicht
    if ((data.position_types || []).includes("studentenferienjob")) {
      if (!data.semester_break_start || !data.semester_break_end) {
        toast.error(t("applicant.semesterBreakRequired", "Bitte gib deine Semesterferien an (Start und Ende) – das ist für Studentenferienjobs erforderlich."));
        return;
      }
    }
    setSaving(true);
    try {
      data.other_languages = otherLanguages;
      data.work_experiences = workExperiences;
      await applicantAPI.updateProfile(data);
      toast.success(t("applicant.profileSaved"));
    } catch (e: any) { toast.error(e.response?.data?.detail || t("common.error")); }
    finally { setSaving(false); }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>, docType: string) => {
    const file = e.target.files?.[0];
    if (!file || !file.name.endsWith(".pdf")) { toast.error(t("applicant.onlyPdf")); return; }
    setUploading(docType);
    try {
      await documentsAPI.upload(file, docType, "");
      toast.success(t("applicant.uploaded"));
      const res = await documentsAPI.list();
      setDocuments(res.data || []);
    } catch { toast.error(t("common.error")); }
    finally { setUploading(null); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm(t("common.confirmDelete"))) return;
    try { await documentsAPI.delete(id); const res = await documentsAPI.list(); setDocuments(res.data || []); toast.success(t("applicant.deleted")); } catch {}
  };

  const handleCVParse = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCvParsing(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await applicantAPI.parseCV(formData);
      const d = res.data;

      // Alle Felder überschreiben (auch wenn bereits ausgefüllt)
      const textFields = [
        "first_name", "last_name", "phone", "street", "house_number",
        "postal_code", "city", "country", "nationality", "place_of_birth",
        "field_of_study", "university_name", "university_city",
        "school_degree", "professional_title",
      ] as const;
      let filled = 0;
      for (const field of textFields) {
        if (d[field]) { setValue(field, d[field]); filled++; }
      }

      // Geburtsdatum
      if (d.date_of_birth) { setValue("date_of_birth", d.date_of_birth); filled++; }

      // Semester
      if (d.current_semester) { setValue("current_semester", d.current_semester); filled++; }

      // Sprachniveaus
      if (d.german_level) { setValue("german_level", d.german_level); filled++; }
      if (d.english_level) { setValue("english_level", d.english_level); filled++; }

      // Weitere Sprachen & Berufserfahrung — immer überschreiben
      if (d.other_languages?.length) { setOtherLanguages(d.other_languages); filled++; }
      if (d.work_experiences?.length) { setWorkExperiences(d.work_experiences); filled++; }
      if (d.work_experience_years) { setValue("work_experience_years", d.work_experience_years); filled++; }

      try { trackCVParse(filled); } catch {}
      if (filled > 0) {
        toast.success(t("applicant.fieldsAutofilled", { count: filled }));
      } else {
        toast.success(t("applicant.cvParsed"));
      }
      const docsRes = await documentsAPI.list();
      setDocuments(docsRes.data || []);
    } catch { toast.error(t("applicant.cvParseFailed")); }
    finally { setCvParsing(false); if (cvFileInputRef.current) cvFileInputRef.current.value = ""; }
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-12 w-12 animate-spin text-primary-600" /></div>;

  const hasDoc = (t: string) => documents.some(d => d.document_type === t);
  const getDoc = (t: string) => documents.find(d => d.document_type === t);

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <User className="h-8 w-8 text-primary-600" />
        <h1 className="text-3xl font-bold text-gray-900">{t("applicant.myProfile")}</h1>
      </div>

      {/* CV Auto-Fill Banner - exakt wie Original */}
      <div className="mb-8 bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-32 translate-x-32"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-24 -translate-x-24"></div>
        <div className="relative z-10">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-white/20 rounded-xl"><Wand2 className="h-6 w-6" /></div>
                <h2 className="text-xl font-bold">{t("applicant.autoFillProfile")}</h2>
                <span className="px-2 py-1 bg-yellow-400 text-yellow-900 text-xs font-bold rounded-full">{t("common.new")}</span>
              </div>
              <p className="text-white/90 text-sm md:text-base">
                {t("applicant.autoFillDesc")}
              </p>
            </div>
            <div className="flex flex-col items-stretch md:items-end gap-2">
              <label className={`inline-flex items-center justify-center gap-2 px-6 py-3 bg-white text-purple-700 
                              font-semibold rounded-xl hover:bg-purple-50 transition-all cursor-pointer
                              shadow-lg hover:shadow-xl transform hover:-translate-y-0.5
                              ${cvParsing ? 'opacity-75 cursor-wait' : ''}`}>
                {cvParsing ? (
                  <><Loader2 className="h-5 w-5 animate-spin" />{t("applicant.analyzing")}...</>
                ) : (
                  <><Sparkles className="h-5 w-5" />{t("applicant.uploadCV")}</>
                )}
                <input ref={cvFileInputRef} type="file" accept=".pdf" onChange={handleCVParse} disabled={cvParsing} className="hidden" />
              </label>
              <span className="text-white/70 text-xs text-center md:text-right">
                {t("applicant.cvHint")}
              </span>
            </div>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        {/* Stellenart - exakt wie Original */}
        <div className="card border-2 border-primary-200 bg-gradient-to-r from-primary-50 to-white">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-primary-600" />
            {t("applicant.desiredJobType")}
          </h2>
          <p className="text-gray-600 mb-4">
            {t("applicant.selectJobTypes")}
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {positionTypes.map(pt => {
              const sel = selectedPositionTypes.includes(pt.value);
              return (
                <label
                  key={pt.value}
                  className={`relative flex flex-col items-center p-4 border-2 rounded-xl cursor-pointer transition-all ${
                    sel
                      ? 'border-primary-500 bg-primary-50 shadow-lg ring-2 ring-primary-200'
                      : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-md'
                  }`}
                >
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={sel}
                    onChange={e => {
                      const cur = selectedPositionTypes || [];
                      if (e.target.checked) {
                        setValue("position_types", [...cur, pt.value]);
                        if (cur.length === 0) setValue("position_type", pt.value);
                      } else {
                        const newTypes = cur.filter((x: string) => x !== pt.value);
                        setValue("position_types", newTypes);
                        setValue("position_type", newTypes[0] || null);
                      }
                    }}
                  />
                  <span className="text-3xl mb-2">{pt.icon}</span>
                  <span className={`font-semibold text-center text-sm leading-tight ${sel ? 'text-primary-700' : 'text-gray-700'}`}>
                    {pt.label}
                  </span>
                  {sel && <CheckCircle className="absolute top-2 right-2 h-5 w-5 text-primary-600" />}
                </label>
              );
            })}
          </div>
          {selectedPositionTypes.length === 0 && (
            <p className="text-amber-600 text-sm mt-3 flex items-center gap-1">
              <Clock className="h-4 w-4" />
              {t("applicant.selectAtLeastOne")}
            </p>
          )}
        </div>

        {/* Persönliche Daten */}
        <div className="card">
          <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
            <User className="h-5 w-5 text-primary-600" />
            {t("applicant.personalData")}
          </h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="label">{t("applicant.firstName")} *</label>
              <input
                type="text"
                className="input-styled"
                placeholder={t("applicant.firstNamePlaceholder")}
                {...register("first_name", { required: t("applicant.firstNameRequired") })}
              />
              {errors.first_name && <p className="text-red-500 text-sm mt-1">{String(errors.first_name.message)}</p>}
            </div>
            <div>
              <label className="label">{t("applicant.lastName")} *</label>
              <input
                type="text"
                className="input-styled"
                placeholder={t("applicant.lastNamePlaceholder")}
                {...register("last_name", { required: t("applicant.lastNameRequired") })}
              />
              {errors.last_name && <p className="text-red-500 text-sm mt-1">{String(errors.last_name.message)}</p>}
            </div>
            <div>
              <label className="label">{t("applicant.dateOfBirth")} *</label>
              <input
                type="date"
                className="input-styled"
                {...register("date_of_birth", { required: t("applicant.dateOfBirthRequired") })}
              />
            </div>
            <div>
              <label className="label">{t("applicant.placeOfBirth")}</label>
              <input
                type="text"
                className="input-styled"
                placeholder={t("applicant.placeOfBirthPlaceholder")}
                {...register("place_of_birth")}
              />
            </div>
            <div>
              <label className="label">{t("applicant.gender")} *</label>
              <CustomSelect
                value={watch("gender") || ""}
                onChange={(e) => setValue("gender", e.target.value)}
                options={[
                  { value: "male", label: t("applicant.male") },
                  { value: "female", label: t("applicant.female") },
                  { value: "diverse", label: t("applicant.diverse") }
                ]}
                placeholder={t("common.pleaseSelect")}
              />
            </div>
            <div>
              <label className="label">{t("applicant.nationality")} *</label>
              <CustomSelect
                value={watch("nationality") || ""}
                onChange={(e) => setValue("nationality", e.target.value)}
                options={getNationalityOptions("de")}
                placeholder={t("common.pleaseSelect")}
              />
            </div>
            <div>
              <label className="label">{t("applicant.phone")} *</label>
              <input
                type="tel"
                className="input-styled"
                placeholder="+49 123 456789"
                {...register("phone", { required: t("applicant.phoneRequired") })}
              />
            </div>
          </div>
        </div>

        {/* Adresse */}
        <div className="card">
          <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary-600" />
            {t("applicant.address")}
          </h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="md:col-span-2 grid grid-cols-4 gap-4">
              <div className="col-span-3">
                <label className="label">{t("applicant.street")}</label>
                <input type="text" className="input-styled" placeholder={t("applicant.streetPlaceholder")} {...register("street")} />
              </div>
              <div>
                <label className="label">{t("applicant.houseNumber")}</label>
                <input type="text" className="input-styled" placeholder="123" {...register("house_number")} />
              </div>
            </div>
            <div>
              <label className="label">{t("applicant.postalCode")}</label>
              <input type="text" className="input-styled" placeholder="12345" {...register("postal_code")} />
            </div>
            <div>
              <label className="label">{t("applicant.city")}</label>
              <input type="text" className="input-styled" placeholder={t("applicant.cityPlaceholder")} {...register("city")} />
            </div>
            <div className="md:col-span-2">
              <label className="label">{t("applicant.country")}</label>
              <input type="text" className="input-styled" placeholder={t("applicant.countryPlaceholder")} {...register("country")} />
            </div>
          </div>
        </div>

        {/* Sprachen */}
        <div className="card">
          <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
            <Languages className="h-5 w-5 text-primary-600" />
            {t("applicant.languageSkills")}
          </h2>
          <div className="grid md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="label">{t("applicant.german")} *</label>
              <CustomSelect
                value={watch("german_level") || "none"}
                onChange={(e) => setValue("german_level", e.target.value)}
                options={languageLevels}
              />
            </div>
            <div>
              <label className="label">{t("applicant.english")}</label>
              <CustomSelect
                value={watch("english_level") || "none"}
                onChange={(e) => setValue("english_level", e.target.value)}
                options={languageLevels}
              />
            </div>
          </div>
          <div className="border-t pt-6">
            <div className="flex items-center justify-between mb-4">
              <label className="label mb-0">{t("applicant.otherLanguages")}</label>
              <button
                type="button"
                onClick={() => setOtherLanguages([...otherLanguages, { language: "", level: "a1" }])}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-primary-600 bg-primary-50 hover:bg-primary-100 rounded-lg transition-colors"
              >
                <Plus className="h-4 w-4" />
                {t("applicant.addLanguage")}
              </button>
            </div>
            {otherLanguages.length === 0 ? (
              <p className="text-gray-500 text-sm italic">{t("applicant.noOtherLanguages")}</p>
            ) : (
              <div className="space-y-3">
                {otherLanguages.map((l, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                    <div className="flex-1">
                      <CustomSelect
                        value={l.language}
                        onChange={e => { const u = [...otherLanguages]; u[i].language = e.target.value; setOtherLanguages(u); }}
                        options={allLanguages.map(lang => ({ value: lang, label: lang }))}
                        placeholder={t("applicant.selectLanguage")}
                      />
                    </div>
                    <div className="flex-1">
                      <CustomSelect
                        value={l.level}
                        onChange={e => { const u = [...otherLanguages]; u[i].level = e.target.value; setOtherLanguages(u); }}
                        options={languageLevels}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setOtherLanguages(otherLanguages.filter((_, idx) => idx !== i))}
                      className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Minus className="h-5 w-5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Berufserfahrung */}
        <div className="card">
          <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-primary-600" />
            {t("applicant.workExperienceGermany")}
          </h2>
          <div className="space-y-6">
            <div>
              <div className="flex items-center justify-between mb-4">
                <label className="label mb-0">{t("applicant.workExperienceTabular")}</label>
                <button
                  type="button"
                  onClick={() => setWorkExperiences([...workExperiences, { company: "", position: "", location: "", start_date: "", end_date: "", description: "" }])}
                  className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-primary-600 bg-primary-50 hover:bg-primary-100 rounded-lg transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  {t("applicant.addPosition")}
                </button>
              </div>
              {workExperiences.length === 0 ? (
                <p className="text-gray-500 text-sm italic p-4 bg-gray-50 rounded-xl">
                  {t("applicant.noWorkExperience")}
                </p>
              ) : (
                <div className="space-y-4">
                  {workExperiences.map((exp, i) => (
                    <div key={i} className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                      <div className="flex justify-between items-start mb-3">
                        <span className="text-sm font-medium text-gray-500">{t("applicant.position")} {i + 1}</span>
                        <button
                          type="button"
                          onClick={() => setWorkExperiences(workExperiences.filter((_, idx) => idx !== i))}
                          className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="grid md:grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs text-gray-600 mb-1 block">{t("applicant.companyLabel")} *</label>
                          <input type="text" className="input-styled text-sm" placeholder="z.B. Musterfirma GmbH" value={exp.company} onChange={e => { const u = [...workExperiences]; u[i].company = e.target.value; setWorkExperiences(u); }} />
                        </div>
                        <div>
                          <label className="text-xs text-gray-600 mb-1 block">{t("applicant.positionLabel")} *</label>
                          <input type="text" className="input-styled text-sm" placeholder="z.B. Softwareentwickler" value={exp.position} onChange={e => { const u = [...workExperiences]; u[i].position = e.target.value; setWorkExperiences(u); }} />
                        </div>
                        <div>
                          <label className="text-xs text-gray-600 mb-1 block">{t("applicant.location")}</label>
                          <input type="text" className="input-styled text-sm" placeholder="z.B. Berlin, Deutschland" value={exp.location || ''} onChange={e => { const u = [...workExperiences]; u[i].location = e.target.value; setWorkExperiences(u); }} />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-xs text-gray-600 mb-1 block">{t("applicant.from")}</label>
                            <input type="text" className="input-styled text-sm" placeholder="MM/JJJJ" value={exp.start_date || ''} onChange={e => { const u = [...workExperiences]; u[i].start_date = e.target.value; setWorkExperiences(u); }} />
                          </div>
                          <div>
                            <label className="text-xs text-gray-600 mb-1 block">{t("applicant.to")}</label>
                            <input type="text" className="input-styled text-sm" placeholder="MM/JJJJ oder heute" value={exp.end_date || ''} onChange={e => { const u = [...workExperiences]; u[i].end_date = e.target.value; setWorkExperiences(u); }} />
                          </div>
                        </div>
                        <div className="md:col-span-2">
                          <label className="text-xs text-gray-600 mb-1 block">{t("applicant.jobDescription")}</label>
                          <textarea className="input-styled text-sm" rows={2} placeholder={t("applicant.describeYourTasks")} value={exp.description || ''} onChange={e => { const u = [...workExperiences]; u[i].description = e.target.value; setWorkExperiences(u); }} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-4 border-t">
              <label className="label">{t("applicant.workExperienceYears")}</label>
              <input type="number" min="0" className="input-styled max-w-xs" placeholder="0" {...register("work_experience_years")} />
            </div>

            <div className="pt-4 border-t">
              <div className="flex items-center gap-3 mb-4">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" {...register("been_to_germany")} />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-100 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                  <span className="ml-3 text-gray-700 font-medium">{t("applicant.beenToGermany")}</span>
                </label>
              </div>
              {beenToGermany && (
                <div className="bg-blue-50 p-4 rounded-xl border border-blue-200">
                  <label className="label text-blue-800">{t("applicant.germanyDetails")}</label>
                  <textarea className="input-styled" rows={2} placeholder="Wann, wie lange, zu welchem Zweck?" {...register("germany_details")} />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Studentenferienjob */}
        {selectedPositionTypes.includes("studentenferienjob") && (
          <div className="card border-l-4 border-l-blue-500 bg-gradient-to-r from-blue-50 to-white">
            <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-blue-600" />
              {t("applicant.university")}
            </h2>
            <div className="grid md:grid-cols-2 gap-4">
              {/* Universität Name */}
              <div className="md:col-span-2">
                <label className="label">{t("applicant.universityName")} *</label>
                <input type="text" className="input-styled" placeholder="z.B. Staatliche Universität Moskau" {...register("university_name")} />
              </div>
              {/* Universität Adresse */}
              <div>
                <label className="label">{t("applicant.universityStreet")}</label>
                <input type="text" className="input-styled" placeholder={t("applicant.universityStreetPlaceholder")} {...register("university_street")} />
              </div>
              <div>
                <label className="label">{t("applicant.universityHouseNumber")}</label>
                <input type="text" className="input-styled" placeholder="z.B. 12a" {...register("university_house_number")} />
              </div>
              <div>
                <label className="label">{t("applicant.universityPostalCode")}</label>
                <input type="text" className="input-styled" placeholder="z.B. 119991" {...register("university_postal_code")} />
              </div>
              <div>
                <label className="label">{t("applicant.universityCity")}</label>
                <input type="text" className="input-styled" placeholder="z.B. Moskau" {...register("university_city")} />
              </div>
              <div className="md:col-span-2">
                <label className="label">{t("applicant.universityCountry")}</label>
                <input type="text" className="input-styled" placeholder="z.B. Russland" {...register("university_country")} />
              </div>
            </div>

            {/* Studium */}
            <h3 className="text-lg font-semibold text-gray-900 mt-6 mb-4">{t("applicant.studyInfo")}</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="label">{t("applicant.fieldOfStudy")} *</label>
                <input type="text" className="input-styled" placeholder="z.B. Informatik" {...register("field_of_study")} />
              </div>
              <div>
                <label className="label">{t("applicant.currentSemester")} *</label>
                <input type="number" min="1" max="20" className="input-styled" placeholder="z.B. 4" {...register("current_semester")} />
              </div>
            </div>

            {/* Semesterferien */}
            <h3 className="text-lg font-semibold text-gray-900 mt-6 mb-4">{t("applicant.semesterBreak")}</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="label">{t("applicant.semesterBreakStart")} *</label>
                <input type="date" className="input-styled" {...register("semester_break_start")} />
              </div>
              <div>
                <label className="label">{t("applicant.semesterBreakEnd")} *</label>
                <input type="date" className="input-styled" {...register("semester_break_end")} />
              </div>
              <div className="md:col-span-2">
                <label className="flex items-center gap-3 cursor-pointer p-3 bg-white rounded-lg border hover:bg-gray-50">
                  <input type="checkbox" className="w-5 h-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500" {...register("continue_studying")} />
                  <span className="text-gray-700">{t("applicant.continueStudying")}</span>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Fachkraft */}
        {selectedPositionTypes.includes("fachkraft") && (
          <div className="card border-l-4 border-l-purple-500 bg-gradient-to-r from-purple-50 to-white">
            <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
              <Building2 className="h-5 w-5 text-purple-600" />
              {t("applicant.qualificationForSkilled")}
            </h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="label">{t("applicant.profession")} *</label>
                <input type="text" className="input-styled" placeholder="z.B. Elektriker, Krankenpfleger" {...register("profession")} />
              </div>
              <div>
                <label className="label">{t("applicant.degree")} *</label>
                <input type="text" className="input-styled" placeholder="z.B. Bachelor, Meister" {...register("degree")} />
              </div>
            </div>
          </div>
        )}

        {/* Ausbildung */}
        {selectedPositionTypes.includes("ausbildung") && (
          <div className="card border-l-4 border-l-green-500 bg-gradient-to-r from-green-50 to-white">
            <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-green-600" />
              {t("applicant.apprenticeshipWish")}
            </h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="label">{t("applicant.desiredApprenticeship")} *</label>
                <input type="text" className="input-styled" placeholder="z.B. Mechatroniker, Koch" {...register("desired_apprenticeship")} />
              </div>
              <div>
                <label className="label">{t("applicant.schoolDegree")} *</label>
                <input type="text" className="input-styled" placeholder="z.B. Abitur, Realschulabschluss" {...register("school_degree")} />
              </div>
            </div>
          </div>
        )}

        {/* Dokumente - Lebenslauf immer anzeigen */}
        <div className="card border-l-4 border-l-primary-500">
          <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary-600" />
            {t("applicant.documentsSection")}
          </h2>
          
          {/* Lebenslauf - immer anzeigen */}
          <div className="mb-4">
            {(() => {
              const uploaded = hasDoc("cv");
              const doc = getDoc("cv");
              return (
                <div className={`flex items-center justify-between p-4 rounded-xl border-2 ${uploaded ? "border-green-300 bg-green-50" : "border-primary-200 bg-primary-50"}`}>
                  <div className="flex items-center gap-3">
                    {uploaded ? <CheckCircle className="h-6 w-6 text-green-600" /> : <FileText className="h-6 w-6 text-primary-600" />}
                    <div>
                      <p className="font-medium">{t("applicant.cv")} <span className="text-primary-600 text-xs ml-1">{t("applicant.recommended")}</span></p>
                      {uploaded && doc && <p className="text-sm text-green-700">{doc.file_name}</p>}
                      {!uploaded && <p className="text-sm text-gray-500">{t("applicant.pdfFormat")}</p>}
                    </div>
                  </div>
                  {uploaded && doc ? (
                    <button type="button" onClick={() => handleDelete(doc.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                      <Trash2 className="h-5 w-5" />
                    </button>
                  ) : (
                    <label className={`inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 cursor-pointer transition-colors ${uploading === "cv" ? "opacity-50 cursor-wait" : ""}`}>
                      {uploading === "cv" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                      <span>{t("common.upload")}</span>
                      <input ref={(el) => { fileInputRefs.current["cv"] = el; }} type="file" accept=".pdf" onChange={e => handleUpload(e, "cv")} className="hidden" />
                    </label>
                  )}
                </div>
              );
            })()}
          </div>

          {/* Weitere Dokumente je nach Stellenart */}
          {requirements && requirements.documents?.filter((req: any) => req.document_type !== "cv").length > 0 && (
            <div className="space-y-3 pt-4 border-t">
              <p className="text-sm text-gray-600 mb-3">{t('applicant.additionalDocumentsFor')} {t(`positionTypes.${requirements.position_type}`, { defaultValue: requirements.position_label })}:</p>
              {requirements.documents?.filter((req: any) => req.document_type !== "cv").map((req: any) => {
                const uploaded = hasDoc(req.document_type);
                const doc = getDoc(req.document_type);
                return (
                  <div key={req.document_type} className={`flex items-center justify-between p-4 rounded-xl border-2 ${uploaded ? "border-green-300 bg-green-50" : req.is_required ? "border-red-200 bg-red-50" : "border-gray-200"}`}>
                    <div className="flex items-center gap-3">
                      {uploaded ? <CheckCircle className="h-6 w-6 text-green-600" /> : <File className={`h-6 w-6 ${req.is_required ? "text-red-500" : "text-gray-400"}`} />}
                      <div>
                        <p className="font-medium">{t(`applicant.documentTypes.${req.document_type}`, { defaultValue: req.type_label })} {req.is_required && <span className="text-red-500 text-xs ml-1">{t('profile.documents.required')}</span>}</p>
                        {uploaded && doc && <p className="text-sm text-green-700">{doc.file_name}</p>}
                      </div>
                    </div>
                    {uploaded && doc ? (
                      <button type="button" onClick={() => handleDelete(doc.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                        <Trash2 className="h-5 w-5" />
                      </button>
                    ) : (
                      <label className={`inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 cursor-pointer transition-colors ${uploading === req.document_type ? "opacity-50 cursor-wait" : ""}`}>
                        {uploading === req.document_type ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                        <span>{t("common.upload")}</span>
                        <input ref={(el) => { fileInputRefs.current[req.document_type] = el; }} type="file" accept=".pdf" onChange={e => handleUpload(e, req.document_type)} className="hidden" />
                      </label>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Hinweis wenn keine Stellenart gewählt */}
          {!requirements && (
            <p className="text-sm text-gray-500 mt-4 p-3 bg-gray-50 rounded-lg">
              💡 {t('applicant.selectPositionTypeHint')}
            </p>
          )}
        </div>

        {/* Desktop: Sticky Bar */}
        <div className="hidden sm:flex sticky bottom-4 bg-white/90 backdrop-blur p-4 rounded-xl shadow-lg border flex-wrap justify-end gap-3">
          <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2 px-6 py-3">
            {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}{t("applicant.saveProfile")}
          </button>
          <button 
            type="button" 
            onClick={() => router.push("/jobs")} 
            className="btn-secondary flex items-center gap-2 px-6 py-3"
          >
            <Briefcase className="h-5 w-5" />{t("profile.browseJobs")}
          </button>
          <button 
            type="button" 
            onClick={() => router.push("/applicant/ijp-auftrag")}
            className="btn-secondary flex items-center gap-2 px-6 py-3 border-primary-300 text-primary-700 hover:bg-primary-50"
          >
            <Sparkles className="h-5 w-5" />{t("profile.hireIJP")}
          </button>
        </div>

        {/* Mobile: FABs */}
        <div className="sm:hidden fixed bottom-6 right-6 z-50">
          {/* Backdrop wenn Menü offen */}
          {fabOpen && !isAtBottom && (
            <div 
              className="fixed inset-0 bg-black/20 -z-10" 
              onClick={() => setFabOpen(false)} 
            />
          )}
          
          {/* Menü-Items (nur wenn NICHT am Ende) */}
          {!isAtBottom && (
            <div className={`absolute bottom-16 right-0 flex flex-col gap-3 transition-all duration-200 ${fabOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
              <button
                type="button"
                onClick={() => { setFabOpen(false); router.push("/applicant/ijp-auftrag"); }}
                className="flex items-center gap-3 bg-white pl-4 pr-5 py-3 rounded-full shadow-lg border whitespace-nowrap"
              >
                <span className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                  <Sparkles className="h-5 w-5 text-primary-600" />
                </span>
                <span className="font-medium text-gray-800">{t("profile.hireIJP")}</span>
              </button>
              <button
                type="button"
                onClick={() => { setFabOpen(false); router.push("/jobs"); }}
                className="flex items-center gap-3 bg-white pl-4 pr-5 py-3 rounded-full shadow-lg border whitespace-nowrap"
              >
                <span className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <Briefcase className="h-5 w-5 text-blue-600" />
                </span>
                <span className="font-medium text-gray-800">{t("profile.browseJobs")}</span>
              </button>
            </div>
          )}

          {/* Buttons-Bereich */}
          <div className="flex items-center gap-3">
            {/* + Button für Menü (nur wenn NICHT am Ende) */}
            {!isAtBottom && (
              <button 
                type="button"
                onClick={() => setFabOpen(!fabOpen)}
                className={`w-12 h-12 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-full shadow-lg flex items-center justify-center transition-all active:scale-95 ${fabOpen ? 'rotate-45' : ''}`}
              >
                <Plus className="h-6 w-6" />
              </button>
            )}

            {/* Am Ende: Alle Buttons nebeneinander */}
            {isAtBottom && (
              <>
                <button
                  type="button"
                  onClick={() => router.push("/applicant/ijp-auftrag")}
                  className="w-12 h-12 bg-primary-100 hover:bg-primary-200 text-primary-600 rounded-full shadow-lg flex items-center justify-center transition-all active:scale-95"
                >
                  <Sparkles className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={() => router.push("/jobs")}
                  className="w-12 h-12 bg-blue-100 hover:bg-blue-200 text-blue-600 rounded-full shadow-lg flex items-center justify-center transition-all active:scale-95"
                >
                  <Briefcase className="h-5 w-5" />
                </button>
              </>
            )}

            {/* Speichern-Button - IMMER sichtbar */}
            <button 
              type="submit"
              disabled={saving}
              className="w-14 h-14 bg-primary-600 hover:bg-primary-700 text-white rounded-full shadow-xl flex items-center justify-center transition-all active:scale-95"
            >
              {saving ? <Loader2 className="h-6 w-6 animate-spin" /> : <Save className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
