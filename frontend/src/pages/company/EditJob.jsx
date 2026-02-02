import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { jobsAPI } from '../../lib/api';
import toast from 'react-hot-toast';
import { 
  Briefcase, ArrowLeft, Save, Loader2, MapPin, Calendar, Euro, ChevronDown,
  Languages, Plus, Minus, Clock, AlertTriangle, User, Phone, Mail, Building2,
  ListTodo, FileText, Globe
} from 'lucide-react';

// Verfügbare Sprachen für Stellenanzeigen
const JOB_LANGUAGES = [
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'ru', name: 'Русский', flag: '🇷🇺' },
];

const positionTypes = [
  { value: 'studentenferienjob', label: 'Studentenferienjob', description: 'Für Studenten aus dem Ausland' },
  { value: 'saisonjob', label: 'Saisonjob (8 Monate)', description: 'Saisonarbeit (max. 90 Tage)' },
  { value: 'workandholiday', label: 'Work & Holiday', description: 'Working Holiday Visum' },
  { value: 'fachkraft', label: 'Fachkraft', description: 'Qualifizierte Fachkräfte' },
  { value: 'ausbildung', label: 'Ausbildung', description: 'Berufsausbildung' }
];

const employmentTypes = [
  { value: 'fulltime', label: 'Vollzeit' },
  { value: 'parttime', label: 'Teilzeit' },
  { value: 'both', label: 'Vollzeit oder Teilzeit' }
];

const salaryTypes = [
  { value: 'hourly', label: 'Pro Stunde' },
  { value: 'monthly', label: 'Pro Monat' },
  { value: 'yearly', label: 'Pro Jahr' }
];

const languageLevels = [
  { value: 'not_required', label: 'Nicht erforderlich' },
  { value: 'a1', label: 'A1 - Grundkenntnisse' },
  { value: 'a2', label: 'A2 - Grundkenntnisse' },
  { value: 'b1', label: 'B1 - Gute Kenntnisse' },
  { value: 'b2', label: 'B2 - Sehr gute Kenntnisse' },
  { value: 'c1', label: 'C1 - Fließend' },
  { value: 'c2', label: 'C2 - Fließend' }
];

// Vollständige Liste aller Sprachen der Welt
const allLanguages = [
  'Afrikaans', 'Albanisch', 'Amharisch', 'Arabisch', 'Armenisch', 'Aserbaidschanisch',
  'Baskisch', 'Belarussisch', 'Bengali', 'Bosnisch', 'Bulgarisch', 'Birmanisch',
  'Chinesisch (Mandarin)', 'Chinesisch (Kantonesisch)', 'Dänisch', 'Dari',
  'Estnisch', 'Filipino/Tagalog', 'Finnisch', 'Französisch',
  'Georgisch', 'Griechisch', 'Gujarati',
  'Hausa', 'Hebräisch', 'Hindi', 'Indonesisch', 'Irisch', 'Isländisch', 'Italienisch',
  'Japanisch', 'Javanisch', 'Jiddisch',
  'Kannada', 'Kasachisch', 'Katalanisch', 'Khmer', 'Kirgisisch', 'Koreanisch', 'Kroatisch', 'Kurdisch',
  'Laotisch', 'Lettisch', 'Litauisch', 'Luxemburgisch',
  'Madagassisch', 'Malaiisch', 'Malayalam', 'Maltesisch', 'Maori', 'Marathi', 'Mazedonisch', 'Mongolisch',
  'Nepali', 'Niederländisch', 'Norwegisch',
  'Odia', 'Paschtu', 'Persisch/Farsi', 'Polnisch', 'Portugiesisch', 'Punjabi',
  'Rumänisch', 'Russisch',
  'Schwedisch', 'Serbisch', 'Singhalesisch', 'Slowakisch', 'Slowenisch', 'Somali', 'Spanisch', 'Suaheli', 'Sundanesisch',
  'Tadschikisch', 'Tamil', 'Telugu', 'Thai', 'Tibetisch', 'Tschechisch', 'Türkisch', 'Turkmenisch',
  'Uigurisch', 'Ukrainisch', 'Ungarisch', 'Urdu', 'Usbekisch',
  'Vietnamesisch', 'Walisisch', 'Xhosa', 'Yoruba', 'Zulu'
];

// Gesetzlicher Mindestlohn in Deutschland
const MINIMUM_WAGE = 13.90;

function StyledSelect({ options, placeholder, value, onChange, className = '' }) {
  return (
    <div className="relative">
      <select
        className={`appearance-none w-full px-4 py-3 pr-10 bg-white border-2 border-gray-200 rounded-xl 
                 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 focus:outline-none
                 transition-all cursor-pointer text-gray-700 font-medium ${className}`}
        value={value}
        onChange={onChange}
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

// Formatierte Textarea mit Hilfetext
function FormattedTextarea({ label, placeholder, register, name, rows = 4, helpText }) {
  return (
    <div>
      <label className="label">{label}</label>
      <textarea
        className="input-styled"
        rows={rows}
        placeholder={placeholder}
        {...register(name)}
      />
      {helpText && (
        <p className="text-gray-500 text-xs mt-1 flex items-center gap-1">
          <FileText className="h-3 w-3" />
          {helpText}
        </p>
      )}
    </div>
  );
}

function EditJob() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [otherLanguages, setOtherLanguages] = useState([]);
  const [jobSettings, setJobSettings] = useState({ max_job_deadline_days: 90, archive_deletion_days: 90 });
  const [selectedPositionTypes, setSelectedPositionTypes] = useState([]);
  const [translating, setTranslating] = useState(false);
  const [translationAvailable, setTranslationAvailable] = useState(false);
  
  // Mehrsprachige Inhalte
  const [activeLanguage, setActiveLanguage] = useState('de');
  const [enabledLanguages, setEnabledLanguages] = useState(['de']);
  const [translations, setTranslations] = useState({
    de: { title: '', description: '', tasks: '', requirements: '', benefits: '' },
    en: { title: '', description: '', tasks: '', requirements: '', benefits: '' },
    es: { title: '', description: '', tasks: '', requirements: '', benefits: '' },
    ru: { title: '', description: '', tasks: '', requirements: '', benefits: '' },
  });
  
  const { register, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm();

  const germanRequired = watch('german_required') || 'not_required';
  const englishRequired = watch('english_required') || 'not_required';

  useEffect(() => {
    loadJob();
    loadSettings();
    checkTranslation();
  }, [id]);

  const loadSettings = async () => {
    try {
      const response = await jobsAPI.getPublicSettings();
      setJobSettings(response.data);
    } catch (error) {
      console.error('Fehler beim Laden der Job-Settings:', error);
    }
  };
  
  const checkTranslation = async () => {
    try {
      const response = await jobsAPI.getTranslationStatus();
      setTranslationAvailable(response.data.configured);
    } catch (error) {
      setTranslationAvailable(true); // Fallback
    }
  };
  
  // Sprache aktivieren/deaktivieren
  const toggleLanguage = (langCode) => {
    if (langCode === 'de') return; // Deutsch ist immer aktiviert
    if (enabledLanguages.includes(langCode)) {
      setEnabledLanguages(enabledLanguages.filter(l => l !== langCode));
      if (activeLanguage === langCode) setActiveLanguage('de');
    } else {
      setEnabledLanguages([...enabledLanguages, langCode]);
    }
  };
  
  // Übersetzung für aktive Sprache aktualisieren
  const updateTranslation = (field, value) => {
    setTranslations(prev => ({
      ...prev,
      [activeLanguage]: { ...prev[activeLanguage], [field]: value }
    }));
  };
  
  // Automatische Übersetzung
  const handleAutoTranslate = async (targetLang) => {
    if (!translations.de.title && !translations.de.description) {
      toast.error('Bitte füllen Sie zuerst die deutschen Inhalte aus');
      return;
    }
    
    setTranslating(true);
    try {
      const response = await jobsAPI.translate({
        title: translations.de.title,
        description: translations.de.description,
        tasks: translations.de.tasks,
        requirements: translations.de.requirements,
        benefits: translations.de.benefits,
        target_lang: targetLang,
        source_lang: 'de'
      });
      
      if (response.data.success) {
        setTranslations(prev => ({
          ...prev,
          [targetLang]: response.data.translations
        }));
        toast.success(`Übersetzung nach ${targetLang.toUpperCase()} erfolgreich!`);
        setActiveLanguage(targetLang);
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Übersetzung fehlgeschlagen');
    } finally {
      setTranslating(false);
    }
  };

  const loadJob = async () => {
    try {
      const response = await jobsAPI.get(id);
      const job = response.data;
      
      // Position Types laden (Mehrfachauswahl)
      setSelectedPositionTypes(job.position_types || []);
      
      // Mehrsprachige Inhalte laden
      const jobTranslations = job.translations || {};
      const availableLangs = job.available_languages || ['de'];
      setEnabledLanguages(availableLangs);
      
      // Übersetzungen setzen
      setTranslations({
        de: {
          title: job.title || '',
          description: job.description || '',
          tasks: job.tasks || '',
          requirements: job.requirements || '',
          benefits: job.benefits || ''
        },
        en: jobTranslations.en || { title: '', description: '', tasks: '', requirements: '', benefits: '' },
        es: jobTranslations.es || { title: '', description: '', tasks: '', requirements: '', benefits: '' },
        ru: jobTranslations.ru || { title: '', description: '', tasks: '', requirements: '', benefits: '' },
      });
      
      // Formular mit bestehenden Daten füllen (inkl. neuer Felder)
      reset({
        position_type: job.position_type || 'general',
        employment_type: job.employment_type || '',
        location: job.location || '',
        address: job.address || '',
        postal_code: job.postal_code || '',
        remote_possible: job.remote_possible || false,
        accommodation_provided: job.accommodation_provided || false,
        start_date: job.start_date || '',
        end_date: job.end_date || '',
        deadline: job.deadline || '',
        contact_person: job.contact_person || '',
        contact_phone: job.contact_phone || '',
        contact_email: job.contact_email || '',
        salary_min: job.salary_min ? String(job.salary_min).replace('.', ',') : '',
        salary_max: job.salary_max ? String(job.salary_max).replace('.', ',') : '',
        salary_type: job.salary_type || '',
        german_required: job.german_required || 'not_required',
        english_required: job.english_required || 'not_required',
        is_active: job.is_active
      });
      
      // Weitere Sprachen setzen
      if (job.other_languages_required && job.other_languages_required.length > 0) {
        setOtherLanguages(job.other_languages_required);
      }
    } catch (error) {
      toast.error('Stellenangebot nicht gefunden');
      navigate('/company/jobs');
    } finally {
      setLoading(false);
    }
  };

  const addOtherLanguage = () => {
    setOtherLanguages([...otherLanguages, { language: '', level: 'basic' }]);
  };

  const removeOtherLanguage = (index) => {
    setOtherLanguages(otherLanguages.filter((_, i) => i !== index));
  };

  const updateOtherLanguage = (index, field, value) => {
    const updated = [...otherLanguages];
    updated[index][field] = value;
    setOtherLanguages(updated);
  };

  // Konvertiert deutsche Zahlenformate (Komma) zu Float
  const parseGermanNumber = (value) => {
    if (!value) return null;
    const normalized = String(value).replace(',', '.');
    const parsed = parseFloat(normalized);
    return isNaN(parsed) ? null : parsed;
  };

  const onSubmit = async (data) => {
    setSaving(true);
    try {
      // Leere Strings zu null konvertieren
      const cleanData = Object.fromEntries(
        Object.entries(data).map(([key, value]) => [
          key,
          value === '' ? null : value
        ])
      );
      
      // Gehalt konvertieren mit Mindestlohn-Validierung
      if (cleanData.salary_min) {
        cleanData.salary_min = parseGermanNumber(cleanData.salary_min);
        if (cleanData.salary_min < MINIMUM_WAGE) {
          toast.error(`Der Mindestlohn darf nicht unter ${MINIMUM_WAGE.toFixed(2).replace('.', ',')}€ liegen`);
          setSaving(false);
          return;
        }
      }
      if (cleanData.salary_max) {
        cleanData.salary_max = parseGermanNumber(cleanData.salary_max);
        if (cleanData.salary_max < MINIMUM_WAGE) {
          toast.error(`Der Lohn darf nicht unter ${MINIMUM_WAGE.toFixed(2).replace('.', ',')}€ liegen`);
          setSaving(false);
          return;
        }
      }
      
      // Sprachanforderungen hinzufügen
      cleanData.other_languages_required = otherLanguages.filter(l => l.language);
      
      // Stellenarten: Mehrfachauswahl oder Default "general"
      cleanData.position_types = selectedPositionTypes;
      cleanData.position_type = selectedPositionTypes.length > 0 ? selectedPositionTypes[0] : 'general';
      
      // Mehrsprachige Inhalte hinzufügen
      cleanData.title = translations.de.title;
      cleanData.description = translations.de.description;
      cleanData.tasks = translations.de.tasks;
      cleanData.requirements = translations.de.requirements;
      cleanData.benefits = translations.de.benefits;
      cleanData.available_languages = enabledLanguages;
      
      // Übersetzungen (ohne Deutsch)
      const translationsToSave = {};
      enabledLanguages.filter(l => l !== 'de').forEach(lang => {
        if (translations[lang] && translations[lang].title) {
          translationsToSave[lang] = translations[lang];
        }
      });
      cleanData.translations = translationsToSave;
      
      await jobsAPI.update(id, cleanData);
      toast.success('Stellenangebot aktualisiert!');
      navigate('/company/jobs');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Fehler beim Speichern');
    } finally {
      setSaving(false);
    }
  };

  // Berechne max Deadline-Datum
  const maxDeadlineDate = new Date(Date.now() + jobSettings.max_job_deadline_days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <Link to="/company/jobs" className="inline-flex items-center text-gray-600 hover:text-primary-600 mb-6 group">
        <ArrowLeft className="h-4 w-4 mr-2 group-hover:-translate-x-1 transition-transform" />
        Zurück zu meinen Stellen
      </Link>

      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 bg-primary-100 rounded-xl">
          <Briefcase className="h-8 w-8 text-primary-600" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Stelle bearbeiten</h1>
          <p className="text-gray-600">Ändern Sie die Details Ihres Stellenangebots</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        {/* Status */}
        <div className="card bg-gradient-to-r from-gray-50 to-white border-l-4 border-l-primary-500">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-gray-900">Sichtbarkeit</h3>
              <p className="text-sm text-gray-600">Ist die Stelle öffentlich sichtbar?</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                {...register('is_active')}
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:ring-4 peer-focus:ring-primary-100 
                            rounded-full peer peer-checked:after:translate-x-full 
                            after:content-[''] after:absolute after:top-[2px] after:left-[2px] 
                            after:bg-white after:border after:rounded-full after:h-5 after:w-5 
                            after:transition-all peer-checked:bg-green-500"></div>
              <span className="ml-3 text-gray-700 font-medium">
                {watch('is_active') ? 'Aktiv' : 'Inaktiv'}
              </span>
            </label>
          </div>
        </div>

        {/* ========== 0. SPRACH-AUSWAHL ========== */}
        <div className="card border-l-4 border-l-indigo-500">
          <h2 className="text-xl font-semibold text-gray-900 mb-2 flex items-center gap-2">
            <Globe className="h-5 w-5 text-indigo-600" />
            Mehrsprachige Stellenausschreibung
          </h2>
          <p className="text-gray-600 mb-4 text-sm">
            Bearbeiten Sie Ihre Stellenausschreibung in mehreren Sprachen.
          </p>
          
          {/* Sprachen aktivieren/deaktivieren */}
          <div className="flex flex-wrap gap-2 mb-4">
            {JOB_LANGUAGES.map((lang) => (
              <button
                key={lang.code}
                type="button"
                onClick={() => toggleLanguage(lang.code)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                  enabledLanguages.includes(lang.code)
                    ? 'bg-indigo-100 text-indigo-700 border-2 border-indigo-300'
                    : 'bg-gray-100 text-gray-500 border-2 border-transparent hover:bg-gray-200'
                } ${lang.code === 'de' ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                disabled={lang.code === 'de'}
              >
                <span className="text-xl">{lang.flag}</span>
                <span>{lang.name}</span>
                {enabledLanguages.includes(lang.code) && lang.code !== 'de' && (
                  <span className="text-xs bg-indigo-200 px-1.5 py-0.5 rounded">✓</span>
                )}
              </button>
            ))}
          </div>
          
          {enabledLanguages.length > 1 && (
            <div className="space-y-3">
              <p className="text-indigo-700 text-sm bg-indigo-50 rounded-lg p-3">
                <Globe className="h-4 w-4 inline mr-1" />
                <strong>{enabledLanguages.length} Sprachen aktiviert.</strong>
              </p>
              
              {/* Automatische Übersetzung */}
              {translationAvailable && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <p className="text-green-800 text-sm font-medium mb-2 flex items-center gap-2">
                    <Languages className="h-4 w-4" />
                    Automatische Übersetzung (DeepL)
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {enabledLanguages.filter(l => l !== 'de').map(lang => (
                      <button
                        key={lang}
                        type="button"
                        onClick={() => handleAutoTranslate(lang)}
                        disabled={translating}
                        className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {translating ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Languages className="h-4 w-4" />
                        )}
                        DE → {lang.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ========== 1. GRUNDINFORMATIONEN ========== */}
        <div className="card">
          <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-primary-600" />
            Grundinformationen
          </h2>
          
          {/* Sprach-Tabs für Bearbeitung */}
          {enabledLanguages.length > 1 && (
            <div className="flex gap-1 mb-6 p-1 bg-gray-100 rounded-lg w-fit">
              {enabledLanguages.map((langCode) => {
                const lang = JOB_LANGUAGES.find(l => l.code === langCode);
                return (
                  <button
                    key={langCode}
                    type="button"
                    onClick={() => setActiveLanguage(langCode)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                      activeLanguage === langCode
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <span>{lang?.flag}</span>
                    <span>{lang?.name}</span>
                  </button>
                );
              })}
            </div>
          )}
          
          <div className="space-y-4">
            {/* Stellentitel - mehrsprachig */}
            <div>
              <label className="label">
                Stellentitel * 
                {activeLanguage !== 'de' && <span className="text-indigo-600 ml-2">({JOB_LANGUAGES.find(l => l.code === activeLanguage)?.name})</span>}
              </label>
              <input
                type="text"
                className="input-styled"
                placeholder={activeLanguage === 'de' ? 'z.B. Erntehelfer für Obstbau' : `Titel auf ${JOB_LANGUAGES.find(l => l.code === activeLanguage)?.name}...`}
                value={translations[activeLanguage].title}
                onChange={(e) => updateTranslation('title', e.target.value)}
              />
              {activeLanguage === 'de' && !translations.de.title && <p className="text-red-500 text-sm mt-1">Titel ist erforderlich</p>}
            </div>
            
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="label">Zielgruppe (optional)</label>
                <p className="text-xs text-gray-500 mb-2">
                  Für spezielle Visa-Programme. Ohne Auswahl: Allgemeine Stelle für EU-Bürger.
                </p>
                <div className="flex flex-wrap gap-2">
                  {positionTypes.map((type) => (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => {
                        if (selectedPositionTypes.includes(type.value)) {
                          setSelectedPositionTypes(selectedPositionTypes.filter(t => t !== type.value));
                        } else {
                          setSelectedPositionTypes([...selectedPositionTypes, type.value]);
                        }
                      }}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                        selectedPositionTypes.includes(type.value)
                          ? 'bg-primary-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                      title={type.description}
                    >
                      {type.label}
                      {selectedPositionTypes.includes(type.value) && (
                        <span className="ml-1">✓</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="label">Einstellungsart</label>
                <div className="relative">
                  <select
                    className="appearance-none w-full px-4 py-3 pr-10 bg-white border-2 border-gray-200 rounded-xl 
                             focus:border-primary-500 focus:ring-2 focus:ring-primary-200 focus:outline-none
                             transition-all cursor-pointer text-gray-700 font-medium"
                    {...register('employment_type')}
                  >
                    <option value="">Einstellungsart wählen (optional)</option>
                    {employmentTypes.map((type) => (
                      <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
                </div>
              </div>
            </div>
            
            <div>
              <label className="label">
                Stellenbeschreibung *
                {activeLanguage !== 'de' && <span className="text-indigo-600 ml-2">({JOB_LANGUAGES.find(l => l.code === activeLanguage)?.name})</span>}
              </label>
              <textarea
                className="input-styled"
                rows={6}
                placeholder="Beschreiben Sie die Stelle allgemein. Was erwartet die Bewerber?"
                value={translations[activeLanguage].description}
                onChange={(e) => updateTranslation('description', e.target.value)}
              />
              <p className="text-gray-500 text-xs mt-1">Absätze und Zeilenumbrüche werden übernommen.</p>
              {activeLanguage === 'de' && !translations.de.description && <p className="text-red-500 text-sm mt-1">Beschreibung ist erforderlich</p>}
            </div>
          </div>
        </div>

        {/* ========== 2. AUFGABEN & ANFORDERUNGEN ========== */}
        <div className="card border-l-4 border-l-purple-500">
          <h2 className="text-xl font-semibold text-gray-900 mb-2 flex items-center gap-2">
            <ListTodo className="h-5 w-5 text-purple-600" />
            Aufgaben & Anforderungen
            {activeLanguage !== 'de' && <span className="text-indigo-600 text-sm ml-2">({JOB_LANGUAGES.find(l => l.code === activeLanguage)?.name})</span>}
          </h2>
          <p className="text-gray-600 mb-6 text-sm">
            Beschreiben Sie die Aufgaben und welche Qualifikationen benötigt werden.
          </p>
          
          <div className="space-y-4">
            <div>
              <label className="label">Aufgaben</label>
              <textarea
                className="input-styled"
                rows={5}
                placeholder="Was sind die Hauptaufgaben dieser Stelle?"
                value={translations[activeLanguage].tasks}
                onChange={(e) => updateTranslation('tasks', e.target.value)}
              />
              <p className="text-gray-500 text-xs mt-1 flex items-center gap-1">
                <FileText className="h-3 w-3" />
                Nutzen Sie Zeilenumbrüche für eine übersichtliche Auflistung
              </p>
            </div>
            
            <div>
              <label className="label">Anforderungen</label>
              <textarea
                className="input-styled"
                rows={5}
                placeholder="Welche Qualifikationen und Fähigkeiten werden benötigt?"
                value={translations[activeLanguage].requirements}
                onChange={(e) => updateTranslation('requirements', e.target.value)}
              />
              <p className="text-gray-500 text-xs mt-1 flex items-center gap-1">
                <FileText className="h-3 w-3" />
                Nutzen Sie Zeilenumbrüche für eine übersichtliche Auflistung
              </p>
            </div>
          </div>
        </div>

        {/* ========== 3. SPRACHANFORDERUNGEN ========== */}
        <div className="card border-l-4 border-l-blue-500">
          <h2 className="text-xl font-semibold text-gray-900 mb-2 flex items-center gap-2">
            <Languages className="h-5 w-5 text-blue-600" />
            Sprachanforderungen
          </h2>
          <p className="text-gray-600 mb-6 text-sm">
            Geben Sie an, welche Sprachkenntnisse für diese Stelle erforderlich sind.
          </p>
          
          <div className="grid md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="label">Deutschkenntnisse</label>
              <StyledSelect
                options={languageLevels}
                value={germanRequired}
                onChange={(e) => setValue('german_required', e.target.value)}
              />
            </div>
            <div>
              <label className="label">Englischkenntnisse</label>
              <StyledSelect
                options={languageLevels}
                value={englishRequired}
                onChange={(e) => setValue('english_required', e.target.value)}
              />
            </div>
          </div>
          
          <div className="border-t pt-4">
            <div className="flex items-center justify-between mb-4">
              <label className="label mb-0">Weitere Sprachanforderungen</label>
              <button
                type="button"
                onClick={addOtherLanguage}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-blue-600 
                         bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
              >
                <Plus className="h-4 w-4" />
                Sprache hinzufügen
              </button>
            </div>
            
            {otherLanguages.length === 0 ? (
              <p className="text-gray-500 text-sm italic">
                Keine weiteren Sprachanforderungen.
              </p>
            ) : (
              <div className="space-y-3">
                {otherLanguages.map((lang, index) => (
                  <div key={index} className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl">
                    <div className="flex-1">
                      <StyledSelect
                        options={allLanguages.map(l => ({ value: l, label: l }))}
                        placeholder="Sprache wählen..."
                        value={lang.language}
                        onChange={(e) => updateOtherLanguage(index, 'language', e.target.value)}
                        className="bg-white"
                      />
                    </div>
                    <div className="flex-1">
                      <StyledSelect
                        options={languageLevels.filter(l => l.value !== 'not_required')}
                        value={lang.level}
                        onChange={(e) => updateOtherLanguage(index, 'level', e.target.value)}
                        className="bg-white"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeOtherLanguage(index)}
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

        {/* ========== 4. ORT & ZEITRAUM ========== */}
        <div className="card">
          <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary-600" />
            Ort & Zeitraum
          </h2>
          
          {/* Standort */}
          <div className="grid md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="label">Ort / Stadt</label>
              <div className="relative">
                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  className="input-styled pl-12"
                  placeholder="z.B. München, Bayern"
                  {...register('location')}
                />
              </div>
            </div>
            
            <div>
              <label className="label">Postleitzahl</label>
              <input
                type="text"
                className="input-styled"
                placeholder="z.B. 80331"
                maxLength={10}
                {...register('postal_code')}
              />
            </div>
          </div>

          <div className="mb-4">
            <label className="label">Adresse / Straße</label>
            <div className="relative">
              <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                className="input-styled pl-12"
                placeholder="z.B. Musterstraße 123"
                {...register('address')}
              />
            </div>
          </div>

          <div className="mb-6 flex flex-wrap gap-6">
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                {...register('remote_possible')}
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:ring-4 peer-focus:ring-primary-100 
                            rounded-full peer peer-checked:after:translate-x-full 
                            after:content-[''] after:absolute after:top-[2px] after:left-[2px] 
                            after:bg-white after:border after:rounded-full after:h-5 after:w-5 
                            after:transition-all peer-checked:bg-primary-600"></div>
              <span className="ml-3 text-gray-700 font-medium">Remote-Arbeit möglich</span>
            </label>
            
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                {...register('accommodation_provided')}
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:ring-4 peer-focus:ring-primary-100 
                            rounded-full peer peer-checked:after:translate-x-full 
                            after:content-[''] after:absolute after:top-[2px] after:left-[2px] 
                            after:bg-white after:border after:rounded-full after:h-5 after:w-5 
                            after:transition-all peer-checked:bg-primary-600"></div>
              <span className="ml-3 text-gray-700 font-medium">Unterkunft vorhanden</span>
            </label>
          </div>

          {/* Zeitraum */}
          <div className="grid md:grid-cols-2 gap-4 border-t pt-4">
            <div>
              <label className="label">Startdatum</label>
              <div className="relative">
                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="date"
                  className="input-styled pl-12"
                  {...register('start_date')}
                />
              </div>
            </div>
            
            <div>
              <label className="label">Enddatum (optional)</label>
              <div className="relative">
                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="date"
                  className="input-styled pl-12"
                  {...register('end_date')}
                />
              </div>
            </div>
          </div>
        </div>

        {/* ========== 5. KONTAKTPERSON ========== */}
        <div className="card border-l-4 border-l-green-500">
          <h2 className="text-xl font-semibold text-gray-900 mb-2 flex items-center gap-2">
            <User className="h-5 w-5 text-green-600" />
            Kontaktperson
          </h2>
          <p className="text-gray-600 mb-6 text-sm">
            Optional: Geben Sie eine Kontaktperson für Rückfragen an.
          </p>
          
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="label">Ansprechpartner</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  className="input-styled pl-12"
                  placeholder="Max Mustermann"
                  {...register('contact_person')}
                />
              </div>
            </div>
            
            <div>
              <label className="label">Telefon</label>
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="tel"
                  className="input-styled pl-12"
                  placeholder="+49 123 456789"
                  {...register('contact_phone')}
                />
              </div>
            </div>
            
            <div>
              <label className="label">E-Mail</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="email"
                  className="input-styled pl-12"
                  placeholder="kontakt@firma.de"
                  {...register('contact_email')}
                />
              </div>
            </div>
          </div>
        </div>

        {/* ========== 6. GEHALT & BENEFITS ========== */}
        <div className="card border-l-4 border-l-yellow-500">
          <h2 className="text-xl font-semibold text-gray-900 mb-2 flex items-center gap-2">
            <Euro className="h-5 w-5 text-yellow-600" />
            Gehalt & Benefits
          </h2>
          <p className="text-gray-600 mb-6 text-sm">
            Geben Sie die Vergütung und Zusatzleistungen an.
          </p>
          
          {/* Gehalt */}
          <div className="grid md:grid-cols-3 gap-4 mb-6">
            <div>
              <label className="label">Minimum (€)</label>
              <div className="relative">
                <Euro className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  inputMode="decimal"
                  className="input-styled pl-12"
                  placeholder="z.B. 13,90"
                  {...register('salary_min')}
                />
              </div>
            </div>
            
            <div>
              <label className="label">Maximum (€)</label>
              <div className="relative">
                <Euro className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  inputMode="decimal"
                  className="input-styled pl-12"
                  placeholder="z.B. 15,00"
                  {...register('salary_max')}
                />
              </div>
            </div>
            
            <div>
              <label className="label">Zeitraum</label>
              <div className="relative">
                <select
                  className="appearance-none w-full px-4 py-3 pr-10 bg-white border-2 border-gray-200 rounded-xl 
                           focus:border-primary-500 focus:ring-2 focus:ring-primary-200 focus:outline-none
                           transition-all cursor-pointer text-gray-700 font-medium"
                  {...register('salary_type')}
                >
                  <option value="">Zeitraum wählen</option>
                  {salaryTypes.map((type) => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Benefits */}
          <div className="border-t pt-4">
            <label className="label">
              Benefits / Wir bieten
              {activeLanguage !== 'de' && <span className="text-indigo-600 ml-2">({JOB_LANGUAGES.find(l => l.code === activeLanguage)?.name})</span>}
            </label>
            <textarea
              className="input-styled"
              rows={4}
              placeholder="Was bieten Sie den Bewerbern? (Unterkunft, Verpflegung, etc.)"
              value={translations[activeLanguage].benefits}
              onChange={(e) => updateTranslation('benefits', e.target.value)}
            />
            <p className="text-gray-500 text-xs mt-1 flex items-center gap-1">
              <FileText className="h-3 w-3" />
              Nutzen Sie Zeilenumbrüche für eine übersichtliche Auflistung
            </p>
          </div>
        </div>

        {/* ========== 7. BEWERBUNGSFRIST ========== */}
        <div className="card border-l-4 border-l-orange-500">
          <h2 className="text-xl font-semibold text-gray-900 mb-2 flex items-center gap-2">
            <Clock className="h-5 w-5 text-orange-600" />
            Bewerbungsfrist
          </h2>
          <p className="text-gray-600 mb-4 text-sm">
            Legen Sie fest, wie lange Bewerbungen möglich sein sollen.
          </p>
          
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 mb-4">
            <p className="text-orange-800 text-sm flex items-start gap-2">
              <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5" />
              <span>
                <strong>Wichtig:</strong> Die Bewerbungsfrist darf maximal <strong>{jobSettings.max_job_deadline_days} Tage</strong> in der Zukunft liegen. 
                Nach Ablauf wird die Stelle automatisch archiviert. Sie können archivierte Stellen 
                innerhalb von {jobSettings.archive_deletion_days} Tagen reaktivieren.
              </span>
            </p>
          </div>
          
          <div className="max-w-md">
            <label className="label">Bewerbungsfrist (optional)</label>
            <div className="relative">
              <Clock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="date"
                className="input-styled pl-12"
                min={new Date().toISOString().split('T')[0]}
                max={maxDeadlineDate}
                {...register('deadline')}
              />
            </div>
            <p className="text-gray-500 text-sm mt-2">
              Wenn keine Frist gesetzt wird, bleibt die Stelle unbegrenzt aktiv.
            </p>
          </div>
        </div>

        {/* Speichern Button */}
        <div className="flex justify-end gap-4 sticky bottom-4 bg-white/80 backdrop-blur-sm p-4 rounded-xl shadow-lg border">
          <Link to="/company/jobs" className="btn-secondary">
            Abbrechen
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="btn-primary flex items-center gap-2 px-8"
          >
            {saving ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Save className="h-5 w-5" />
            )}
            Änderungen speichern
          </button>
        </div>
      </form>
    </div>
  );
}

export default EditJob;
