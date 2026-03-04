import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { jobsAPI } from '../../lib/api';
import toast from 'react-hot-toast';
import { 
  Briefcase, ArrowLeft, Save, Loader2, MapPin, Calendar, Euro, ChevronDown,
  Languages, Plus, Minus, Clock, AlertTriangle, User, Phone, Mail, Building2,
  ListTodo, Award, Gift, FileText, Globe, Eye, X, Copy, MessageCircle
} from 'lucide-react';
import { Link } from 'react-router-dom';
import RichTextEditor from '../../components/RichTextEditor';

// Verfügbare Sprachen für Stellenausschreibungen
const JOB_LANGUAGES = [
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'ru', name: 'Русский', flag: '🇷🇺' },
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

// Custom Select mit Styling
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

function CreateJob() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isTemplateMode = searchParams.get('saveAsTemplate') === 'true';
  const { t } = useTranslation();
  const [saving, setSaving] = useState(false);
  const [otherLanguages, setOtherLanguages] = useState([]);
  const [jobSettings, setJobSettings] = useState({ max_job_deadline_days: 90, archive_deletion_days: 90 });
  const [showPreview, setShowPreview] = useState(false);
  const [selectedPositionTypes, setSelectedPositionTypes] = useState([]);
  
  // Mehrsprachige Inhalte
  const [activeLanguage, setActiveLanguage] = useState('de');
  const [enabledLanguages, setEnabledLanguages] = useState(['de']); // Deutsch ist immer aktiviert
  const [translations, setTranslations] = useState({
    de: { title: '', description: '', tasks: '', requirements: '', benefits: '' },
    en: { title: '', description: '', tasks: '', requirements: '', benefits: '' },
    es: { title: '', description: '', tasks: '', requirements: '', benefits: '' },
    ru: { title: '', description: '', tasks: '', requirements: '', benefits: '' },
  });
  
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm({
    defaultValues: {
      german_required: 'not_required',
      english_required: 'not_required'
    }
  });

  // Job-Settings laden
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const response = await jobsAPI.getPublicSettings();
        setJobSettings(response.data);
      } catch (error) {
        console.error('Fehler beim Laden der Job-Settings:', error);
      }
    };
    
    // Template aus sessionStorage laden (wenn von JobManager kommend)
    const loadTemplate = () => {
      const templateData = sessionStorage.getItem('jobTemplate');
      if (templateData) {
        try {
          const template = JSON.parse(templateData);
          // Formularfelder setzen
          if (template.title) setTranslations(prev => ({ ...prev, de: { ...prev.de, title: template.title } }));
          if (template.description) setTranslations(prev => ({ ...prev, de: { ...prev.de, description: template.description } }));
          if (template.tasks) setTranslations(prev => ({ ...prev, de: { ...prev.de, tasks: template.tasks } }));
          if (template.requirements) setTranslations(prev => ({ ...prev, de: { ...prev.de, requirements: template.requirements } }));
          if (template.benefits) setTranslations(prev => ({ ...prev, de: { ...prev.de, benefits: template.benefits } }));
          if (template.position_types) setSelectedPositionTypes(template.position_types);
          if (template.location) setValue('location', template.location);
          if (template.address) setValue('address', template.address);
          if (template.postal_code) setValue('postal_code', template.postal_code);
          if (template.employment_type) setValue('employment_type', template.employment_type);
          if (template.remote_possible) setValue('remote_possible', template.remote_possible);
          if (template.accommodation_provided) setValue('accommodation_provided', template.accommodation_provided);
          if (template.contact_person) setValue('contact_person', template.contact_person);
          if (template.contact_email) setValue('contact_email', template.contact_email);
          if (template.contact_phone) setValue('contact_phone', template.contact_phone);
          if (template.contact_whatsapp) setValue('contact_whatsapp', template.contact_whatsapp);
          if (template.preferred_contact_method) setValue('preferred_contact_method', template.preferred_contact_method);
          if (template.salary_min) setValue('salary_min', template.salary_min);
          if (template.salary_max) setValue('salary_max', template.salary_max);
          if (template.salary_type) setValue('salary_type', template.salary_type);
          if (template.german_required) setValue('german_required', template.german_required);
          if (template.english_required) setValue('english_required', template.english_required);
          if (template.translations) setTranslations(prev => ({ ...prev, ...template.translations }));
          if (template.available_languages) setEnabledLanguages(template.available_languages);
          
          toast.success(`Vorlage "${template.name}" geladen`);
          sessionStorage.removeItem('jobTemplate');
        } catch (e) {
          console.error('Fehler beim Laden der Vorlage:', e);
        }
      }
    };
    
    loadSettings();
    loadTemplate();
  }, [setValue]);

  // Position types with translations (Ausbildung and Work & Holiday stay German)
  const positionTypes = [
    { value: 'studentenferienjob', label: t('positionTypes.studentenferienjob') },
    { value: 'saisonjob', label: t('positionTypes.saisonjob') },
    { value: 'workandholiday', label: 'Work & Holiday' },
    { value: 'fachkraft', label: t('positionTypes.fachkraft') },
    { value: 'ausbildung', label: 'Ausbildung' }
  ];

  const employmentTypes = [
    { value: 'fulltime', label: 'Vollzeit' },
    { value: 'parttime', label: 'Teilzeit' },
    { value: 'both', label: 'Vollzeit oder Teilzeit' }
  ];

  const salaryTypes = [
    { value: 'hourly', label: t('createJob.hourly') },
    { value: 'monthly', label: t('createJob.monthly') },
    { value: 'yearly', label: t('createJob.yearly') }
  ];

  const languageLevels = [
    { value: 'not_required', label: t('languageLevelOptions.not_required') },
    { value: 'a1', label: t('languageLevelOptions.a1') },
    { value: 'a2', label: t('languageLevelOptions.a2') },
    { value: 'b1', label: t('languageLevelOptions.b1') },
    { value: 'b2', label: t('languageLevelOptions.b2') },
    { value: 'c1', label: t('languageLevelOptions.c1') },
    { value: 'c2', label: t('languageLevelOptions.c2') }
  ];

  const germanRequired = watch('german_required');
  const englishRequired = watch('english_required');

  // Weitere Sprachen verwalten
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

  // Übersetzungen verwalten
  const toggleLanguage = (langCode) => {
    if (langCode === 'de') return; // Deutsch ist immer aktiv
    if (enabledLanguages.includes(langCode)) {
      setEnabledLanguages(enabledLanguages.filter(l => l !== langCode));
      if (activeLanguage === langCode) setActiveLanguage('de');
    } else {
      setEnabledLanguages([...enabledLanguages, langCode]);
    }
  };

  const updateTranslation = (field, value) => {
    setTranslations({
      ...translations,
      [activeLanguage]: {
        ...translations[activeLanguage],
        [field]: value
      }
    });
  };

  // Konvertiert deutsche Zahlenformate (Komma) zu Float
  const parseGermanNumber = (value) => {
    if (!value) return null;
    // Ersetze Komma durch Punkt für Dezimalzahlen
    const normalized = String(value).replace(',', '.');
    const parsed = parseFloat(normalized);
    return isNaN(parsed) ? null : parsed;
  };

  const onSubmit = async (data, isDraft = false) => {
    // Validierung der deutschen Pflichtfelder (nur bei Veröffentlichung)
    if (!isDraft && !translations.de.title?.trim()) {
      toast.error('Bitte geben Sie einen Stellentitel (Deutsch) ein');
      setActiveLanguage('de');
      return;
    }
    if (!isDraft && !translations.de.description?.trim()) {
      toast.error('Bitte geben Sie eine Stellenbeschreibung (Deutsch) ein');
      setActiveLanguage('de');
      return;
    }
    
    setSaving(true);
    try {
      // Leere Strings zu null konvertieren
      const cleanData = Object.fromEntries(
        Object.entries(data).map(([key, value]) => [
          key,
          value === '' ? null : value
        ])
      );
      
      // Gehalt konvertieren (unterstützt Komma als Dezimaltrennzeichen)
      if (cleanData.salary_min) {
        cleanData.salary_min = parseGermanNumber(cleanData.salary_min);
        // Mindestlohn-Validierung
        if (cleanData.salary_min < MINIMUM_WAGE) {
          toast.error(`Der Mindestlohn darf nicht unter ${MINIMUM_WAGE.toFixed(2).replace('.', ',')}€ liegen`);
          setSaving(false);
          return;
        }
      }
      if (cleanData.salary_max) {
        cleanData.salary_max = parseGermanNumber(cleanData.salary_max);
        // Mindestlohn-Validierung auch für Maximum
        if (cleanData.salary_max < MINIMUM_WAGE) {
          toast.error(`Der Lohn darf nicht unter ${MINIMUM_WAGE.toFixed(2).replace('.', ',')}€ liegen`);
          setSaving(false);
          return;
        }
      }
      
      // Sprachanforderungen hinzufügen
      cleanData.other_languages_required = otherLanguages.filter(l => l.language);
      
      // Deutsche Werte aus translations für Hauptfelder
      cleanData.title = translations.de.title;
      cleanData.description = translations.de.description;
      cleanData.tasks = translations.de.tasks;
      cleanData.requirements = translations.de.requirements;
      cleanData.benefits = translations.de.benefits;
      
      // Mehrsprachige Inhalte - nur aktivierte Sprachen (außer Deutsch)
      const translationsToSend = {};
      enabledLanguages.filter(l => l !== 'de').forEach(lang => {
        // Nur hinzufügen wenn mindestens ein Feld ausgefüllt ist
        const trans = translations[lang];
        if (trans.title || trans.description || trans.tasks || trans.requirements || trans.benefits) {
          translationsToSend[lang] = trans;
        }
      });
      
      cleanData.translations = translationsToSend;
      cleanData.available_languages = enabledLanguages;
      
      // Stellenart aus selectedPositionTypes
      cleanData.position_type = selectedPositionTypes.length > 0 ? selectedPositionTypes[0] : null;
      cleanData.position_types = selectedPositionTypes;
      
      // Draft-Modus: Stelle als Entwurf speichern (nicht aktiv)
      if (isDraft) {
        cleanData.is_draft = true;
        cleanData.is_active = false;
      } else {
        // Veröffentlichen: Stelle ist aktiv und kein Entwurf
        cleanData.is_draft = false;
        cleanData.is_active = true;
      }
      
      await jobsAPI.create(cleanData);
      toast.success(isDraft ? 'Entwurf gespeichert!' : 'Stellenangebot erstellt!');
      navigate('/company/jobs');
    } catch (error) {
      console.error('Fehler beim Erstellen:', error);
      // Pydantic Validierungsfehler benutzerfreundlich anzeigen
      const errorData = error.response?.data?.detail;
      if (Array.isArray(errorData)) {
        // Pydantic Validierungsfehler
        const messages = errorData.map(e => {
          if (e.loc?.includes('title')) return 'Bitte geben Sie einen Stellentitel ein';
          if (e.loc?.includes('description')) return 'Bitte geben Sie eine Stellenbeschreibung ein';
          if (e.loc?.includes('position_type')) return 'Bitte wählen Sie eine Stellenart aus';
          if (e.msg?.includes('valid string')) return 'Bitte füllen Sie alle Pflichtfelder aus';
          return e.msg?.replace('Value error, ', '').replace('Input should be a valid string', 'Bitte füllen Sie alle Pflichtfelder aus') || 'Validierungsfehler';
        });
        toast.error(messages[0]);
        setActiveLanguage('de');
      } else {
        const errorMessage = errorData || error.message || 'Fehler beim Erstellen';
        toast.error(typeof errorMessage === 'string' ? errorMessage : 'Fehler beim Erstellen der Stelle');
      }
    } finally {
      setSaving(false);
    }
  };

  // Als Vorlage speichern
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [savingTemplate, setSavingTemplate] = useState(false);

  const saveAsTemplate = async () => {
    if (!templateName.trim()) {
      toast.error('Bitte geben Sie einen Namen für die Vorlage ein');
      return;
    }
    
    setSavingTemplate(true);
    try {
      const templateData = {
        name: templateName,
        title: translations.de.title,
        description: translations.de.description,
        tasks: translations.de.tasks,
        requirements: translations.de.requirements,
        benefits: translations.de.benefits,
        position_type: selectedPositionTypes.length > 0 ? selectedPositionTypes[0] : 'general',
        position_types: selectedPositionTypes,
        location: watch('location'),
        address: watch('address'),
        postal_code: watch('postal_code'),
        employment_type: watch('employment_type'),
        remote_possible: watch('remote_possible'),
        accommodation_provided: watch('accommodation_provided'),
        contact_person: watch('contact_person'),
        contact_email: watch('contact_email'),
        contact_phone: watch('contact_phone'),
        contact_whatsapp: watch('contact_whatsapp'),
        preferred_contact_method: watch('preferred_contact_method'),
        salary_min: watch('salary_min'),
        salary_max: watch('salary_max'),
        salary_type: watch('salary_type'),
        german_required: watch('german_required'),
        english_required: watch('english_required'),
        translations: translations,
        available_languages: enabledLanguages
      };
      
      await jobsAPI.createTemplate(templateData);
      toast.success('Vorlage gespeichert!');
      setShowTemplateModal(false);
      setTemplateName('');
    } catch (error) {
      console.error('Fehler beim Speichern der Vorlage:', error);
      toast.error('Fehler beim Speichern der Vorlage');
    } finally {
      setSavingTemplate(false);
    }
  };

  // Berechne max Deadline-Datum
  const maxDeadlineDate = new Date(Date.now() + jobSettings.max_job_deadline_days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  return (
    <div className="max-w-3xl mx-auto">
      <Link to="/company/jobs" className="inline-flex items-center text-gray-600 hover:text-primary-600 mb-6 group">
        <ArrowLeft className="h-4 w-4 mr-2 group-hover:-translate-x-1 transition-transform" />
        Zurück zu meinen Stellen
      </Link>

      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
        <div className="p-3 bg-primary-100 rounded-xl">
          <Briefcase className="h-8 w-8 text-primary-600" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Neue Stelle erstellen</h1>
          <p className="text-gray-600">Veröffentlichen Sie ein neues Stellenangebot</p>
        </div>
        </div>
        <button 
          onClick={() => setShowTemplateModal(true)}
          className="btn-secondary flex items-center gap-2"
        >
          <Copy className="h-5 w-5" />
          Als Vorlage speichern
        </button>
      </div>

      {isTemplateMode && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 mb-6">
          <p className="text-indigo-800 text-sm flex items-center gap-2">
            <FileText className="h-5 w-5 flex-shrink-0" />
            <span>
              <strong>Vorlagen-Modus:</strong> Füllen Sie die Felder aus und klicken Sie auf "Als Vorlage speichern". 
              Die Vorlage wird nicht als Stelle veröffentlicht, sondern kann später wiederverwendet werden.
            </span>
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit((data) => onSubmit(data, false))} className="space-y-8">
        {/* ========== 0. SPRACH-AUSWAHL ========== */}
        <div className="card border-l-4 border-l-indigo-500">
          <h2 className="text-xl font-semibold text-gray-900 mb-2 flex items-center gap-2">
            <Globe className="h-5 w-5 text-indigo-600" />
            Mehrsprachige Stellenausschreibung
          </h2>
          <p className="text-gray-600 mb-4 text-sm">
            Erstellen Sie Ihre Stellenausschreibung in mehreren Sprachen. Deutsch ist Pflicht, weitere Sprachen sind optional.
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
            <p className="text-indigo-700 text-sm bg-indigo-50 rounded-lg p-3">
              <Globe className="h-4 w-4 inline mr-1" />
              <strong>{enabledLanguages.length} Sprachen aktiviert.</strong> Bewerber können zwischen den Sprachen wechseln, um die Stelle in ihrer bevorzugten Sprache zu lesen.
            </p>
          )}
        </div>

        {/* ========== 1. GRUNDINFORMATIONEN MIT SPRACH-TABS ========== */}
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
                <label className="label">Stellenart (Mehrfachauswahl möglich)</label>
                <div className="flex flex-wrap gap-2">
                  {positionTypes.map((type) => {
                    const isSelected = selectedPositionTypes.includes(type.value);
                    const colorMap = {
                      studentenferienjob: { bg: 'bg-blue-100', border: 'border-blue-500', text: 'text-blue-800' },
                      saisonjob: { bg: 'bg-orange-100', border: 'border-orange-500', text: 'text-orange-800' },
                      workandholiday: { bg: 'bg-green-100', border: 'border-green-500', text: 'text-green-800' },
                      fachkraft: { bg: 'bg-purple-100', border: 'border-purple-500', text: 'text-purple-800' },
                      ausbildung: { bg: 'bg-pink-100', border: 'border-pink-500', text: 'text-pink-800' }
                    };
                    const colors = colorMap[type.value] || { bg: 'bg-gray-100', border: 'border-gray-500', text: 'text-gray-800' };
                    
                    return (
                      <button
                        key={type.value}
                        type="button"
                        onClick={() => {
                          if (isSelected) {
                            // Entfernen
                            let newTypes = selectedPositionTypes.filter(t => t !== type.value);
                            // Wenn Work & Holiday entfernt wird, auch Saisonjob entfernen (falls automatisch hinzugefügt)
                            if (type.value === 'workandholiday') {
                              newTypes = newTypes.filter(t => t !== 'saisonjob');
                            }
                            setSelectedPositionTypes(newTypes);
                          } else {
                            // Hinzufügen
                            let newTypes = [...selectedPositionTypes, type.value];
                            // Work & Holiday impliziert Saisonjob
                            if (type.value === 'workandholiday' && !newTypes.includes('saisonjob')) {
                              newTypes.push('saisonjob');
                            }
                            setSelectedPositionTypes(newTypes);
                          }
                        }}
                        className={`px-4 py-2 rounded-lg border-2 font-medium text-sm transition-all ${
                          isSelected 
                            ? `${colors.bg} ${colors.border} ${colors.text}` 
                            : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                        }`}
                      >
                        {type.label}
                        {isSelected && <span className="ml-2">✓</span>}
                      </button>
                    );
                  })}
                </div>
                {selectedPositionTypes.includes('workandholiday') && (
                  <p className="text-xs text-green-600 mt-2">
                    ℹ️ Work & Holiday wird automatisch auch als Saisonjob getaggt
                  </p>
                )}
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
            
            {/* Stellenbeschreibung - mehrsprachig */}
            <div>
              <label className="label">
                Stellenbeschreibung *
                {activeLanguage !== 'de' && <span className="text-indigo-600 ml-2">({JOB_LANGUAGES.find(l => l.code === activeLanguage)?.name})</span>}
              </label>
              <RichTextEditor
                rows={6}
                placeholder={activeLanguage === 'de' ? 'Beschreiben Sie die Stelle allgemein. Was erwartet die Bewerber?' : `Beschreibung auf ${JOB_LANGUAGES.find(l => l.code === activeLanguage)?.name}...`}
                value={translations[activeLanguage].description}
                onChange={(val) => updateTranslation('description', val)}
                helpText="Nutzen Sie die Formatierungsoptionen für Fett, Kursiv und Aufzählungen."
              />
              {activeLanguage === 'de' && !translations.de.description && <p className="text-red-500 text-sm mt-1">Beschreibung ist erforderlich</p>}
            </div>
          </div>
        </div>

        {/* ========== 2. AUFGABEN & ANFORDERUNGEN ========== */}
        <div className="card border-l-4 border-l-purple-500">
          <h2 className="text-xl font-semibold text-gray-900 mb-2 flex items-center gap-2">
            <ListTodo className="h-5 w-5 text-purple-600" />
            Aufgaben & Anforderungen
            {activeLanguage !== 'de' && <span className="text-sm font-normal text-indigo-600 ml-2">({JOB_LANGUAGES.find(l => l.code === activeLanguage)?.name})</span>}
          </h2>
          <p className="text-gray-600 mb-6 text-sm">
            Beschreiben Sie die Aufgaben und welche Qualifikationen benötigt werden.
          </p>
          
          {/* Sprach-Tabs (wenn mehrere Sprachen) */}
          {enabledLanguages.length > 1 && (
            <div className="flex gap-1 mb-4 p-1 bg-gray-100 rounded-lg w-fit">
              {enabledLanguages.map((langCode) => {
                const lang = JOB_LANGUAGES.find(l => l.code === langCode);
                return (
                  <button
                    key={langCode}
                    type="button"
                    onClick={() => setActiveLanguage(langCode)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
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
            {/* Aufgaben - mehrsprachig */}
            <div>
              <label className="label">Aufgaben</label>
              <RichTextEditor
                rows={5}
                placeholder={activeLanguage === 'de' 
                  ? "Was sind die Hauptaufgaben dieser Stelle?"
                  : `Aufgaben auf ${JOB_LANGUAGES.find(l => l.code === activeLanguage)?.name}...`}
                value={translations[activeLanguage].tasks}
                onChange={(val) => updateTranslation('tasks', val)}
                helpText="Nutzen Sie die Listen-Funktion für eine übersichtliche Auflistung."
              />
            </div>
            
            {/* Anforderungen - mehrsprachig */}
            <div>
              <label className="label">Anforderungen</label>
              <RichTextEditor
                rows={5}
                placeholder={activeLanguage === 'de' 
                  ? "Welche Qualifikationen und Fähigkeiten werden benötigt?"
                  : `Anforderungen auf ${JOB_LANGUAGES.find(l => l.code === activeLanguage)?.name}...`}
                value={translations[activeLanguage].requirements}
                onChange={(val) => updateTranslation('requirements', val)}
                helpText="Nutzen Sie die Listen-Funktion für eine übersichtliche Auflistung."
              />
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
          
          {/* Deutsch & Englisch */}
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
          
          {/* Weitere Sprachen */}
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
                Keine weiteren Sprachanforderungen. Klicken Sie auf "Sprache hinzufügen" falls benötigt.
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
                      title="Sprache entfernen"
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
          
          <div className="grid md:grid-cols-2 gap-4 mb-4">
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
          
          <div className="grid md:grid-cols-2 gap-4 mb-4">
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
              <label className="label">WhatsApp</label>
              <div className="relative">
                <MessageCircle className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-green-500" />
                <input
                  type="tel"
                  className="input-styled pl-12"
                  placeholder="+49 123 456789"
                  {...register('contact_whatsapp')}
                />
              </div>
            </div>
          </div>
          
          {/* Bevorzugter Kontaktweg */}
          <div>
            <label className="label">Bevorzugter Kontaktweg</label>
            <div className="flex flex-wrap gap-3">
              {[
                { value: 'email', label: 'E-Mail', icon: Mail, color: 'blue' },
                { value: 'phone', label: 'Telefon', icon: Phone, color: 'gray' },
                { value: 'whatsapp', label: 'WhatsApp', icon: MessageCircle, color: 'green' }
              ].map(option => {
                const Icon = option.icon;
                const isSelected = watch('preferred_contact_method') === option.value;
                return (
                  <label
                    key={option.value}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 cursor-pointer transition-all ${
                      isSelected 
                        ? `border-${option.color}-500 bg-${option.color}-50 text-${option.color}-700`
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      value={option.value}
                      {...register('preferred_contact_method')}
                      className="sr-only"
                    />
                    <Icon className={`h-4 w-4 ${isSelected ? `text-${option.color}-600` : 'text-gray-400'}`} />
                    <span className="text-sm font-medium">{option.label}</span>
                  </label>
                );
              })}
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Wird Bewerbern als bevorzugte Kontaktmethode angezeigt
            </p>
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

          {/* Benefits - mehrsprachig */}
          <div className="border-t pt-4">
            {/* Sprach-Tabs (wenn mehrere Sprachen) */}
            {enabledLanguages.length > 1 && (
              <div className="flex gap-1 mb-4 p-1 bg-gray-100 rounded-lg w-fit">
                {enabledLanguages.map((langCode) => {
                  const lang = JOB_LANGUAGES.find(l => l.code === langCode);
                  return (
                    <button
                      key={langCode}
                      type="button"
                      onClick={() => setActiveLanguage(langCode)}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
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
            
            <div>
              <label className="label">
                Benefits / Wir bieten
                {activeLanguage !== 'de' && <span className="text-indigo-600 ml-2">({JOB_LANGUAGES.find(l => l.code === activeLanguage)?.name})</span>}
              </label>
              <RichTextEditor
                rows={4}
                placeholder={activeLanguage === 'de' 
                  ? "Was bieten Sie den Bewerbern?"
                  : `Benefits auf ${JOB_LANGUAGES.find(l => l.code === activeLanguage)?.name}...`}
                value={translations[activeLanguage].benefits}
                onChange={(val) => updateTranslation('benefits', val)}
                helpText="Nutzen Sie die Listen-Funktion für eine übersichtliche Auflistung."
              />
            </div>
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
        <div className="flex flex-wrap justify-between items-center gap-3 sticky bottom-4 bg-white/80 backdrop-blur-sm p-3 sm:p-4 rounded-xl shadow-lg border">
          <Link to="/company/jobs" className="btn-secondary px-4 py-2 text-sm">
            Abbrechen
          </Link>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setShowPreview(true)}
              className="btn-secondary px-3 py-2 text-sm flex items-center gap-1.5"
            >
              <Eye className="h-4 w-4" />
              <span className="hidden sm:inline">Vorschau</span>
            </button>
            {isTemplateMode ? (
              <button
                type="button"
                onClick={() => setShowTemplateModal(true)}
                className="btn-primary px-4 py-2 text-sm flex items-center gap-1.5"
              >
                <Copy className="h-4 w-4" />
                <span className="hidden sm:inline">Als</span> Vorlage speichern
              </button>
            ) : (
              <>
            <button
              type="button"
              onClick={() => setShowTemplateModal(true)}
              className="btn-secondary px-3 py-2 text-sm flex items-center gap-1.5"
              title="Als Vorlage speichern"
            >
              <Copy className="h-4 w-4" />
              <span className="hidden sm:inline">Vorlage</span>
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={handleSubmit((data) => onSubmit(data, true))}
              className="btn-secondary px-3 py-2 text-sm flex items-center gap-1.5"
              title="Als Entwurf speichern"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FileText className="h-4 w-4" />
              )}
              <span className="hidden sm:inline">Entwurf</span>
            </button>
          <button
            type="submit"
            disabled={saving}
            className="btn-primary flex items-center gap-1.5 px-4 py-2 text-sm"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            <span className="hidden sm:inline">Stelle</span> veröffentlichen
          </button>
              </>
            )}
          </div>
        </div>
      </form>

      {/* Vorschau Modal */}
      {showPreview && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center overflow-y-auto p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full my-8 relative">
            <div className="sticky top-0 bg-white border-b p-4 rounded-t-2xl flex items-center justify-between z-10">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Eye className="h-5 w-5 text-primary-600" />
                Vorschau Ihrer Stellenanzeige
              </h2>
              <button
                onClick={() => setShowPreview(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-6">
              {/* Header */}
              <div className="mb-6">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                    {translations.de.title || 'Stellentitel'}
                  </h1>
                  <div className="flex flex-wrap gap-2">
                    {selectedPositionTypes.length > 0 ? (
                      selectedPositionTypes.map((type) => (
                        <span key={type} className={`px-3 py-1 rounded-full text-sm font-semibold border ${
                          type === 'studentenferienjob' ? 'bg-blue-100 text-blue-800 border-blue-200' :
                          type === 'saisonjob' ? 'bg-orange-100 text-orange-800 border-orange-200' :
                          type === 'fachkraft' ? 'bg-purple-100 text-purple-800 border-purple-200' :
                          type === 'ausbildung' ? 'bg-green-100 text-green-800 border-green-200' :
                          'bg-gray-100 text-gray-800 border-gray-200'
                        }`}>
                          {positionTypes.find(p => p.value === type)?.label || type}
                        </span>
                      ))
                    ) : (
                      <span className="px-3 py-1 rounded-full text-sm font-semibold bg-gray-100 text-gray-600 border border-gray-200">
                        Allgemein
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="flex flex-wrap items-center gap-4 text-gray-600">
                  {watch('location') && (
                    <span className="flex items-center gap-1.5">
                      <MapPin className="h-5 w-5 text-gray-400" />
                      {watch('location')}
                    </span>
                  )}
                  {watch('employment_type') && (
                    <span className="flex items-center gap-1.5">
                      <Briefcase className="h-5 w-5 text-gray-400" />
                      {employmentTypes.find(e => e.value === watch('employment_type'))?.label}
                    </span>
                  )}
                  {(watch('salary_min') || watch('salary_max')) && (
                    <span className="flex items-center gap-1.5">
                      <Euro className="h-5 w-5 text-gray-400" />
                      {watch('salary_min') && watch('salary_max') 
                        ? `${watch('salary_min')} - ${watch('salary_max')}€`
                        : watch('salary_min') ? `ab ${watch('salary_min')}€` : `bis ${watch('salary_max')}€`
                      }
                      {watch('salary_type') && ` / ${salaryTypes.find(s => s.value === watch('salary_type'))?.label}`}
                    </span>
                  )}
                </div>
              </div>

              {/* Beschreibung */}
              {translations.de.description && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary-600" />
                    Stellenbeschreibung
                  </h3>
                  <div 
                    className="prose prose-sm max-w-none text-gray-700"
                    dangerouslySetInnerHTML={{ __html: translations.de.description }}
                  />
                </div>
              )}

              {/* Aufgaben */}
              {translations.de.tasks && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <ListTodo className="h-5 w-5 text-primary-600" />
                    Ihre Aufgaben
                  </h3>
                  <div 
                    className="prose prose-sm max-w-none text-gray-700"
                    dangerouslySetInnerHTML={{ __html: translations.de.tasks }}
                  />
                </div>
              )}

              {/* Anforderungen */}
              {translations.de.requirements && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Award className="h-5 w-5 text-primary-600" />
                    Anforderungen
                  </h3>
                  <div 
                    className="prose prose-sm max-w-none text-gray-700"
                    dangerouslySetInnerHTML={{ __html: translations.de.requirements }}
                  />
                </div>
              )}

              {/* Benefits */}
              {translations.de.benefits && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Gift className="h-5 w-5 text-primary-600" />
                    Wir bieten
                  </h3>
                  <div 
                    className="prose prose-sm max-w-none text-gray-700"
                    dangerouslySetInnerHTML={{ __html: translations.de.benefits }}
                  />
                </div>
              )}

              {/* Sprachanforderungen */}
              <div className="mb-6 bg-gray-50 rounded-xl p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Languages className="h-5 w-5 text-primary-600" />
                  Sprachanforderungen
                </h3>
                <div className="flex flex-wrap gap-3">
                  <span className="px-3 py-1.5 bg-white rounded-lg border text-sm">
                    🇩🇪 Deutsch: {languageLevels.find(l => l.value === watch('german_required'))?.label || 'Nicht erforderlich'}
                  </span>
                  <span className="px-3 py-1.5 bg-white rounded-lg border text-sm">
                    🇬🇧 Englisch: {languageLevels.find(l => l.value === watch('english_required'))?.label || 'Nicht erforderlich'}
                  </span>
                </div>
              </div>

              {/* Kontakt */}
              {(watch('contact_person') || watch('contact_email') || watch('contact_phone') || watch('contact_whatsapp')) && (
                <div className="bg-primary-50 rounded-xl p-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <User className="h-5 w-5 text-primary-600" />
                    Kontakt
                    {watch('preferred_contact_method') && (
                      <span className="text-xs bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full">
                        Bevorzugt: {watch('preferred_contact_method') === 'email' ? 'E-Mail' : watch('preferred_contact_method') === 'phone' ? 'Telefon' : 'WhatsApp'}
                      </span>
                    )}
                  </h3>
                  <div className="flex flex-wrap gap-4 text-sm">
                    {watch('contact_person') && (
                      <span className="flex items-center gap-1.5">
                        <User className="h-4 w-4 text-gray-400" />
                        {watch('contact_person')}
                      </span>
                    )}
                    {watch('contact_email') && (
                      <span className="flex items-center gap-1.5">
                        <Mail className="h-4 w-4 text-gray-400" />
                        {watch('contact_email')}
                      </span>
                    )}
                    {watch('contact_phone') && (
                      <span className="flex items-center gap-1.5">
                        <Phone className="h-4 w-4 text-gray-400" />
                        {watch('contact_phone')}
                      </span>
                    )}
                    {watch('contact_whatsapp') && (
                      <span className="flex items-center gap-1.5">
                        <MessageCircle className="h-4 w-4 text-green-500" />
                        {watch('contact_whatsapp')}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="sticky bottom-0 bg-white border-t p-4 rounded-b-2xl flex justify-end gap-3">
              <button
                onClick={() => setShowPreview(false)}
                className="btn-secondary"
              >
                Schließen
              </button>
              <button
                onClick={() => {
                  setShowPreview(false);
                  // Trigger form submit
                  document.querySelector('form')?.requestSubmit();
                }}
                className="btn-primary flex items-center gap-2"
              >
                <Save className="h-5 w-5" />
                Stelle veröffentlichen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Template speichern Modal */}
      {showTemplateModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Copy className="h-5 w-5 text-primary-600" />
              Als Vorlage speichern
            </h2>
            <p className="text-gray-600 text-sm mb-4">
              Speichern Sie diese Stelle als Vorlage, um sie später für ähnliche Stellenanzeigen wiederzuverwenden.
            </p>
            <div className="mb-6">
              <label className="label">Vorlagenname *</label>
              <input
                type="text"
                className="input-styled"
                placeholder="z.B. Servicekraft Sommer, Fahrer Standard..."
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                autoFocus
              />
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowTemplateModal(false);
                  setTemplateName('');
                }}
                className="btn-secondary"
              >
                Abbrechen
              </button>
              <button
                onClick={saveAsTemplate}
                disabled={savingTemplate || !templateName.trim()}
                className="btn-primary flex items-center gap-2"
              >
                {savingTemplate ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Save className="h-5 w-5" />
                )}
                Vorlage speichern
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CreateJob;
