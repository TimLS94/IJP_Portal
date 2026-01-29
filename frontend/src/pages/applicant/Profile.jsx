import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { applicantAPI, documentsAPI, downloadBlob } from '../../lib/api';
import { getNationalities } from '../../data/nationalities';
import toast from 'react-hot-toast';
import { 
  User, Save, Loader2, GraduationCap, Building2, Languages, MapPin, Briefcase,
  Plus, Minus, Upload, Download, Trash2, File, Shield, FileText, FileImage,
  CheckCircle, Clock, ChevronDown, X, ClipboardList, ArrowRight, Sparkles, Wand2,
  AlertCircle
} from 'lucide-react';

// Diese werden in der Komponente mit t() übersetzt
const positionTypeKeys = [
  { value: 'studentenferienjob', labelKey: 'positionTypes.studentenferienjob', descKey: 'positionTypeDescriptions.studentenferienjob', color: 'blue', icon: '🎓' },
  { value: 'saisonjob', labelKey: 'positionTypes.saisonjob', descKey: 'positionTypeDescriptions.saisonjob', color: 'orange', icon: '🌾' },
  { value: 'workandholiday', labelKey: 'positionTypes.workandholiday', descKey: 'positionTypeDescriptions.workandholiday', color: 'teal', icon: '✈️' },
  { value: 'fachkraft', labelKey: 'positionTypes.fachkraft', descKey: 'positionTypeDescriptions.fachkraft', color: 'purple', icon: '👔' },
  { value: 'ausbildung', labelKey: 'positionTypes.ausbildung', descKey: 'positionTypeDescriptions.ausbildung', color: 'green', icon: '📚' }
];

const languageLevelKeys = [
  { value: 'none', labelKey: 'languageLevels.none' },
  { value: 'a1', labelKey: 'languageLevels.a1' },
  { value: 'a2', labelKey: 'languageLevels.a2' },
  { value: 'b1', labelKey: 'languageLevels.b1' },
  { value: 'b2', labelKey: 'languageLevels.b2' },
  { value: 'c1', labelKey: 'languageLevels.c1' },
  { value: 'c2', labelKey: 'languageLevels.c2' }
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

// Nationalitäten werden aus der separaten Datei geladen und basierend auf der UI-Sprache angezeigt

// Dokumenttypen mit Icons
const documentTypeIcons = {
  passport: Shield,
  cv: FileText,
  photo: FileImage,
  enrollment_cert: File,
  enrollment_trans: File,
  ba_declaration: File,
  language_cert: File,
  diploma: File,
  school_cert: File,
  work_reference: File,
  other: File
};

// Custom Select Komponente
function CustomSelect({ value, onChange, options, placeholder, className = '' }) {
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

function ApplicantProfile() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [requirements, setRequirements] = useState(null);
  const [otherLanguages, setOtherLanguages] = useState([]);
  const [workExperiences, setWorkExperiences] = useState([]);
  const [showIJPModal, setShowIJPModal] = useState(false);
  const [cvParsing, setCvParsing] = useState(false);
  const [cvParseResult, setCvParseResult] = useState(null);
  const cvFileInputRef = useRef(null);
  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm();
  const fileInputRefs = useRef({});
  
  // Tracking für IJP Modal und CV Banner
  const [isNewProfile, setIsNewProfile] = useState(true);
  const [initialPositionTypes, setInitialPositionTypes] = useState([]);
  const [hasShownIJPModal, setHasShownIJPModal] = useState(false);
  
  const selectedPositionType = watch('position_type');
  const selectedPositionTypes = watch('position_types') || [];
  const beenToGermany = watch('been_to_germany');
  
  // Prüfen ob ein Positionstyp ausgewählt ist (neu: über position_types Array)
  const hasPositionType = (type) => {
    return selectedPositionTypes.includes(type) || selectedPositionType === type;
  };

  useEffect(() => {
    loadProfile();
  }, []);

  useEffect(() => {
    // Dokument-Anforderungen für ersten ausgewählten Typ laden
    const firstType = selectedPositionTypes?.[0] || selectedPositionType;
    if (firstType) {
      loadRequirements(firstType);
    }
  }, [selectedPositionTypes, selectedPositionType]);

  const loadProfile = async () => {
    try {
      const [profileRes, docsRes] = await Promise.all([
        applicantAPI.getProfile(),
        documentsAPI.list()
      ]);
      
      const profileData = profileRes.data;
      
      // position_types initialisieren falls nicht vorhanden (Rückwärtskompatibilität)
      if (!profileData.position_types || profileData.position_types.length === 0) {
        if (profileData.position_type) {
          profileData.position_types = [profileData.position_type];
        } else {
          profileData.position_types = [];
        }
      }
      
      reset(profileData);
      setDocuments(docsRes.data);
      
      // Prüfen ob Profil bereits ausgefüllt ist (für CV Banner)
      const hasData = profileData.first_name && profileData.last_name;
      setIsNewProfile(!hasData);
      
      // Initiale position_types speichern (für IJP Modal)
      setInitialPositionTypes(profileData.position_types || []);
      
      // Andere Sprachen laden
      if (profileData.other_languages && Array.isArray(profileData.other_languages)) {
        setOtherLanguages(profileData.other_languages);
      }
      
      // Berufserfahrungen laden
      if (profileData.work_experiences && Array.isArray(profileData.work_experiences)) {
        setWorkExperiences(profileData.work_experiences);
      }
      
      // Anforderungen laden für ersten Positionstyp
      const firstType = profileData.position_types?.[0] || profileData.position_type;
      if (firstType) {
        loadRequirements(firstType);
      }
    } catch (error) {
      if (error.response?.status !== 404) {
        toast.error('Fehler beim Laden des Profils');
      }
    } finally {
      setLoading(false);
    }
  };

  const loadRequirements = async (positionType) => {
    try {
      const res = await documentsAPI.getRequirements(positionType);
      setRequirements(res.data);
    } catch (error) {
      console.error('Fehler beim Laden der Anforderungen');
    }
  };

  const onSubmit = async (data) => {
    setSaving(true);
    try {
      // Andere Sprachen und Berufserfahrungen hinzufügen
      data.other_languages = otherLanguages;
      data.work_experiences = workExperiences;
      await applicantAPI.updateProfile(data);
      toast.success('Profil erfolgreich gespeichert!');
      
      // Prüfen ob neue position_types hinzugefügt wurden
      const currentTypes = data.position_types || [];
      const newTypes = currentTypes.filter(t => !initialPositionTypes.includes(t));
      
      // IJP Modal nur anzeigen wenn:
      // 1. Noch nie gezeigt ODER
      // 2. Neue Stellenarten hinzugefügt wurden
      if (!hasShownIJPModal || newTypes.length > 0) {
        setShowIJPModal(true);
        setHasShownIJPModal(true);
        // Initiale Types aktualisieren für nächsten Vergleich
        setInitialPositionTypes(currentTypes);
      }
      
      // Nach erstem Speichern ist Profil nicht mehr neu
      setIsNewProfile(false);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Fehler beim Speichern');
    } finally {
      setSaving(false);
    }
  };

  // Sprachen-Management
  const addLanguage = () => {
    setOtherLanguages([...otherLanguages, { language: '', level: 'A1' }]);
  };

  const removeLanguage = (index) => {
    setOtherLanguages(otherLanguages.filter((_, i) => i !== index));
  };

  const updateLanguage = (index, field, value) => {
    const updated = [...otherLanguages];
    updated[index][field] = value;
    setOtherLanguages(updated);
  };

  // Berufserfahrung-Management
  const addWorkExperience = () => {
    setWorkExperiences([...workExperiences, { 
      company: '', 
      position: '', 
      location: '',
      start_date: '', 
      end_date: '', 
      description: '' 
    }]);
  };

  const removeWorkExperience = (index) => {
    setWorkExperiences(workExperiences.filter((_, i) => i !== index));
  };

  const updateWorkExperience = (index, field, value) => {
    const updated = [...workExperiences];
    updated[index][field] = value;
    setWorkExperiences(updated);
  };

  // Dokument-Management
  const handleUpload = async (e, docType) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // PDF-Validierung
    const fileName = file.name.toLowerCase();
    if (!fileName.endsWith('.pdf')) {
      toast.error('Nur PDF-Dateien sind erlaubt!');
      if (fileInputRefs.current[docType]) fileInputRefs.current[docType].value = '';
      return;
    }

    // MIME-Type prüfen
    if (file.type && file.type !== 'application/pdf' && file.type !== 'application/x-pdf') {
      toast.error('Die Datei ist keine gültige PDF-Datei!');
      if (fileInputRefs.current[docType]) fileInputRefs.current[docType].value = '';
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('Datei ist zu groß (max. 10 MB)');
      if (fileInputRefs.current[docType]) fileInputRefs.current[docType].value = '';
      return;
    }

    setUploading(docType);
    try {
      await documentsAPI.upload(file, docType, '');
      toast.success(t('profile.documents.uploaded'));
      const docsRes = await documentsAPI.list();
      setDocuments(docsRes.data);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Upload fehlgeschlagen');
    } finally {
      setUploading(null);
      if (fileInputRefs.current[docType]) {
        fileInputRefs.current[docType].value = '';
      }
    }
  };

  const handleDownload = async (doc) => {
    try {
      const response = await documentsAPI.download(doc.id);
      downloadBlob(response.data, doc.file_name);
    } catch (error) {
      toast.error('Download fehlgeschlagen');
    }
  };

  const handleDelete = async (id, docType) => {
    if (!confirm('Möchten Sie dieses Dokument wirklich löschen?')) return;

    try {
      await documentsAPI.delete(id);
      toast.success('Dokument gelöscht');
      const docsRes = await documentsAPI.list();
      setDocuments(docsRes.data);
    } catch (error) {
      toast.error('Löschen fehlgeschlagen');
    }
  };

  const isDocumentUploaded = (docType) => {
    return documents.some(d => d.document_type === docType);
  };

  const getDocumentForType = (docType) => {
    return documents.find(d => d.document_type === docType);
  };

  // ========== CV PARSING FUNKTION ==========
  const handleCVParse = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // PDF-Validierung
    const fileName = file.name.toLowerCase();
    if (!fileName.endsWith('.pdf')) {
      toast.error('Bitte laden Sie Ihren Lebenslauf als PDF hoch');
      if (cvFileInputRef.current) cvFileInputRef.current.value = '';
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('Datei ist zu groß (max. 10 MB)');
      if (cvFileInputRef.current) cvFileInputRef.current.value = '';
      return;
    }

    setCvParsing(true);
    setCvParseResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await applicantAPI.parseCV(formData);
      const parsedData = response.data;
      
      // Prüfen ob es ein Parse-Error gab (z.B. gescanntes PDF)
      if (parsedData.parse_error) {
        setCvParseResult({
          success: false,
          cvSaved: parsedData.cv_saved,
          message: parsedData.parse_error
        });
        if (parsedData.cv_saved) {
          toast.success('Lebenslauf wurde gespeichert!');
          // Dokumente neu laden
          const docsRes = await documentsAPI.list();
          setDocuments(docsRes.data);
        }
        return;
      }
      
      // Extrahierte Daten in Formularfelder übernehmen
      if (parsedData.first_name) setValue('first_name', parsedData.first_name);
      if (parsedData.last_name) setValue('last_name', parsedData.last_name);
      if (parsedData.date_of_birth) setValue('date_of_birth', parsedData.date_of_birth);
      if (parsedData.place_of_birth) setValue('place_of_birth', parsedData.place_of_birth);
      if (parsedData.nationality) setValue('nationality', parsedData.nationality);
      if (parsedData.phone) setValue('phone', parsedData.phone);
      
      // Adresse
      if (parsedData.street) setValue('street', parsedData.street);
      if (parsedData.house_number) setValue('house_number', parsedData.house_number);
      if (parsedData.postal_code) setValue('postal_code', parsedData.postal_code);
      if (parsedData.city) setValue('city', parsedData.city);
      if (parsedData.country) setValue('country', parsedData.country);
      
      // Sprachkenntnisse
      if (parsedData.german_level) setValue('german_level', parsedData.german_level);
      if (parsedData.english_level) setValue('english_level', parsedData.english_level);
      if (parsedData.other_languages?.length > 0) {
        setOtherLanguages(parsedData.other_languages);
      }
      
      // Berufserfahrung
      if (parsedData.work_experiences?.length > 0) {
        setWorkExperiences(parsedData.work_experiences);
      }
      
      // Ausbildung/Studium
      if (parsedData.university_name) setValue('university_name', parsedData.university_name);
      if (parsedData.field_of_study) setValue('field_of_study', parsedData.field_of_study);
      if (parsedData.profession) setValue('profession', parsedData.profession);
      if (parsedData.school_degree) setValue('school_degree', parsedData.school_degree);
      
      setCvParseResult({
        success: true,
        cvSaved: parsedData.cv_saved,
        fieldsExtracted: Object.keys(parsedData).filter(k => parsedData[k] && !['message', 'cv_saved'].includes(k)).length,
        message: parsedData.message || 'Daten erfolgreich extrahiert!'
      });
      
      // Dokumente neu laden (CV wurde gespeichert)
      if (parsedData.cv_saved) {
        const docsRes = await documentsAPI.list();
        setDocuments(docsRes.data);
      }
      
      toast.success('Lebenslauf analysiert und gespeichert! Bitte überprüfen Sie die Daten.');
      
    } catch (error) {
      console.error('CV Parse Error:', error);
      const errorMessage = error.response?.data?.detail || 'Fehler beim Analysieren des Lebenslaufs';
      const isQuotaError = error.response?.status === 503;
      
      setCvParseResult({
        success: false,
        isQuotaError,
        message: errorMessage
      });
      
      if (isQuotaError) {
        toast.error('Funktion heute nicht verfügbar - bitte morgen erneut versuchen', { duration: 5000 });
      } else {
        toast.error('Fehler beim Analysieren des Lebenslaufs');
      }
    } finally {
      setCvParsing(false);
      if (cvFileInputRef.current) {
        cvFileInputRef.current.value = '';
      }
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  // Dokumente für aktuellen Positionstyp rendern
  const renderDocuments = () => {
    const hasAnyPosition = selectedPositionTypes?.length > 0 || selectedPositionType;
    if (!requirements || !hasAnyPosition) return null;

    return (
      <div className="card border-l-4 border-l-primary-500 bg-gradient-to-r from-primary-50 to-white">
        <h2 className="text-xl font-semibold text-gray-900 mb-2 flex items-center gap-2">
          <File className="h-5 w-5 text-primary-600" />
          {t('profile.documents.title')}
        </h2>
        <p className="text-gray-600 mb-6" dangerouslySetInnerHTML={{ __html: t('profile.documents.subtitle', { position: requirements.position_label }) }}>
        
        </p>
        
        <div className="space-y-4">
          {requirements.documents.map((req) => {
            const uploaded = isDocumentUploaded(req.document_type);
            const doc = getDocumentForType(req.document_type);
            const Icon = documentTypeIcons[req.document_type] || File;
            const isCurrentlyUploading = uploading === req.document_type;
            
            return (
              <div
                key={req.document_type}
                className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all ${
                  uploaded 
                    ? 'border-green-300 bg-green-50' 
                    : req.is_required 
                      ? 'border-red-200 bg-red-50 hover:border-red-300' 
                      : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-4 flex-1">
                  <div className={`p-3 rounded-xl ${
                    uploaded ? 'bg-green-100' : req.is_required ? 'bg-red-100' : 'bg-gray-100'
                  }`}>
                    {uploaded ? (
                      <CheckCircle className="h-6 w-6 text-green-600" />
                    ) : (
                      <Icon className={`h-6 w-6 ${req.is_required ? 'text-red-600' : 'text-gray-500'}`} />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-gray-900">
                        {t(`profile.documentTypes.${req.document_type}`, req.type_label)}
                      </span>
                      {req.is_required ? (
                        <span className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded-full font-medium">
                          {t('profile.documents.required')}
                        </span>
                      ) : (
                        <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-full">
                          {t('profile.documents.optional')}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      {t(`profile.documentDescriptions.${req.document_type}`, req.description)}
                    </p>
                    {uploaded && doc && (
                      <p className="text-sm text-green-700 mt-1 font-medium">
                        ✓ {doc.file_name} ({formatFileSize(doc.file_size)})
                      </p>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-2 ml-4">
                  {uploaded && doc ? (
                    <>
                      <button
                        type="button"
                        onClick={() => handleDownload(doc)}
                        className="p-2 text-gray-600 hover:text-primary-600 hover:bg-white rounded-lg transition-colors"
                        title="Herunterladen"
                      >
                        <Download className="h-5 w-5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(doc.id, req.document_type)}
                        className="p-2 text-gray-600 hover:text-red-600 hover:bg-white rounded-lg transition-colors"
                        title="Löschen"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </>
                  ) : (
                    <label className={`btn-primary flex items-center gap-2 text-sm cursor-pointer ${
                      isCurrentlyUploading ? 'opacity-50 cursor-wait' : ''
                    }`}>
                      {isCurrentlyUploading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Upload className="h-4 w-4" />
                      )}
                      {isCurrentlyUploading ? t('profile.documents.uploading') : t('profile.documents.upload')}
                      <input
                        type="file"
                        ref={(el) => fileInputRefs.current[req.document_type] = el}
                        accept=".pdf,application/pdf"
                        onChange={(e) => handleUpload(e, req.document_type)}
                        disabled={isCurrentlyUploading}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        
        {/* Status-Anzeige */}
        {(() => {
          const requiredDocs = requirements.documents.filter(d => d.is_required);
          const uploadedRequired = requiredDocs.filter(d => isDocumentUploaded(d.document_type));
          const allComplete = uploadedRequired.length === requiredDocs.length;
          
          return (
            <div className={`mt-6 p-4 rounded-xl flex items-center gap-3 ${
              allComplete ? 'bg-green-100' : 'bg-yellow-100'
            }`}>
              {allComplete ? (
                <>
                  <CheckCircle className="h-6 w-6 text-green-600" />
                  <span className="font-medium text-green-800">
                    {t('profile.documents.allUploaded')}
                  </span>
                </>
              ) : (
                <>
                  <Clock className="h-6 w-6 text-yellow-600" />
                  <span className="font-medium text-yellow-800">
                    {t('profile.documents.progress', { uploaded: uploadedRequired.length, total: requiredDocs.length })}
                  </span>
                </>
              )}
            </div>
          );
        })()}
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* ========== IJP BEAUFTRAGEN MODAL ========== */}
      {showIJPModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in duration-200">
            {/* Header */}
            <div className="bg-gradient-to-r from-primary-600 to-primary-700 p-6 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-xl">
                    <ClipboardList className="h-6 w-6" />
                  </div>
                  <h3 className="text-xl font-bold">Profil gespeichert!</h3>
                </div>
                <button
                  onClick={() => setShowIJPModal(false)}
                  className="p-1 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            
            {/* Content */}
            <div className="p-6">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
                <h4 className="text-lg font-semibold text-gray-900 mb-2">
                  Möchten Sie, dass IJP einen Job für Sie findet?
                </h4>
                <p className="text-gray-600 text-sm">
                  Wir vermitteln Sie an unsere Partnerunternehmen in Deutschland. 
                  Lassen Sie uns die Jobsuche für Sie übernehmen!
                </p>
              </div>
              
              {/* Benefits */}
              <div className="bg-primary-50 rounded-xl p-4 mb-6">
                <ul className="space-y-2 text-sm text-gray-700">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-primary-600 flex-shrink-0" />
                    <span>Persönliche Vermittlung an Partnerunternehmen</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-primary-600 flex-shrink-0" />
                    <span>Unterstützung bei Formalitäten</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-primary-600 flex-shrink-0" />
                    <span>Kostenloser Service für Bewerber</span>
                  </li>
                </ul>
              </div>
              
              {/* Buttons */}
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => {
                    setShowIJPModal(false);
                    navigate('/applicant/ijp-auftrag');
                  }}
                  className="btn-primary w-full flex items-center justify-center gap-2 py-3"
                >
                  <ClipboardList className="h-5 w-5" />
                  Ja, IJP beauftragen
                  <ArrowRight className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setShowIJPModal(false)}
                  className="btn-secondary w-full py-3"
                >
                  Später entscheiden
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center gap-3 mb-6">
        <User className="h-8 w-8 text-primary-600" />
        <h1 className="text-3xl font-bold text-gray-900">{t('applicant.profileTitle')}</h1>
      </div>

      {/* ========== CV IMPORT BANNER (nur bei neuem Profil) ========== */}
      {isNewProfile && (
      <div className="mb-8 bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
        {/* Dekoration */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-32 translate-x-32"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-24 -translate-x-24"></div>
        
        <div className="relative z-10">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-white/20 rounded-xl">
                  <Wand2 className="h-6 w-6" />
                </div>
                <h2 className="text-xl font-bold">{t('profile.cvAutoFill.title')}</h2>
                <span className="px-2 py-1 bg-yellow-400 text-yellow-900 text-xs font-bold rounded-full animate-pulse">
                  {t('profile.cvAutoFill.new')}
                </span>
              </div>
              <p className="text-white/90 text-sm md:text-base">
                {t('profile.cvAutoFill.description')}
              </p>
            </div>
            
            <div className="flex flex-col items-stretch md:items-end gap-2">
              <label className={`inline-flex items-center justify-center gap-2 px-6 py-3 bg-white text-purple-700 
                              font-semibold rounded-xl hover:bg-purple-50 transition-all cursor-pointer
                              shadow-lg hover:shadow-xl transform hover:-translate-y-0.5
                              ${cvParsing ? 'opacity-75 cursor-wait' : ''}`}>
                {cvParsing ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    {t('profile.cvAutoFill.analyzing')}
                  </>
                ) : (
                  <>
                    <Sparkles className="h-5 w-5" />
                    {t('profile.cvAutoFill.uploadButton')}
                  </>
                )}
                <input
                  ref={cvFileInputRef}
                  type="file"
                  accept=".pdf,application/pdf"
                  onChange={handleCVParse}
                  disabled={cvParsing}
                  className="hidden"
                />
              </label>
              <span className="text-white/70 text-xs text-center md:text-right">
                {t('profile.cvAutoFill.pdfFormat')}
              </span>
            </div>
          </div>
          
          {/* Ergebnis-Anzeige */}
          {cvParseResult && (
            <div className={`mt-4 p-4 rounded-xl flex items-start gap-3 ${
              cvParseResult.success 
                ? 'bg-green-500/20 border border-green-400/30' 
                : 'bg-red-500/20 border border-red-400/30'
            }`}>
              {cvParseResult.success ? (
                <>
                  <CheckCircle className="h-5 w-5 text-green-300 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-green-100">
                      {cvParseResult.message}
                    </p>
                    <p className="text-sm text-green-200/80 mt-1">
                      {cvParseResult.fieldsExtracted} Felder wurden erkannt. 
                      {cvParseResult.cvSaved && ' ✓ Lebenslauf wurde in Ihren Dokumenten gespeichert.'}
                      {' '}Bitte überprüfen Sie die Daten unten.
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <AlertCircle className={`h-5 w-5 flex-shrink-0 mt-0.5 ${cvParseResult.cvSaved ? 'text-yellow-300' : 'text-red-300'}`} />
                  <div>
                    <p className={`font-medium ${cvParseResult.cvSaved ? 'text-yellow-100' : 'text-red-100'}`}>
                      {cvParseResult.cvSaved ? '✓ Lebenslauf gespeichert' : cvParseResult.message}
                    </p>
                    <p className={`text-sm mt-1 ${cvParseResult.cvSaved ? 'text-yellow-200/80' : 'text-red-200/80'}`}>
                      {cvParseResult.cvSaved && cvParseResult.message && (
                        <span>{cvParseResult.message} </span>
                      )}
                      {cvParseResult.isQuotaError 
                        ? 'Die Funktion ist morgen wieder verfügbar. Sie können Ihr Profil auch manuell ausfüllen.'
                        : !cvParseResult.cvSaved && 'Bitte füllen Sie die Felder manuell aus oder versuchen Sie es mit einem anderen PDF.'}
                    </p>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        
        {/* ========== STELLENART WÄHLEN (Mehrfachauswahl) ========== */}
        <div className="card border-2 border-primary-200 bg-gradient-to-r from-primary-50 to-white">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-primary-600" />
            {t('applicant.desiredPosition')}
          </h2>
          <p className="text-gray-600 mb-4">
            Wählen Sie alle Stellenarten, für die Sie sich interessieren (Mehrfachauswahl möglich).
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
            {positionTypeKeys.map((type) => {
              const isSelected = selectedPositionTypes.includes(type.value);
              return (
                <label
                  key={type.value}
                  className={`relative flex flex-col items-center p-4 border-2 rounded-xl cursor-pointer transition-all ${
                    isSelected
                      ? 'border-primary-500 bg-primary-50 shadow-lg ring-2 ring-primary-200'
                      : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-md'
                  }`}
                  title={t(type.descKey)}
                >
                  <input
                    type="checkbox"
                    value={type.value}
                    className="sr-only"
                    checked={isSelected}
                    onChange={(e) => {
                      const current = selectedPositionTypes || [];
                      if (e.target.checked) {
                        setValue('position_types', [...current, type.value]);
                        // Auch position_type setzen (erstes ausgewähltes für Rückwärtskompatibilität)
                        if (current.length === 0) {
                          setValue('position_type', type.value);
                        }
                      } else {
                        const newTypes = current.filter(t => t !== type.value);
                        setValue('position_types', newTypes);
                        // position_type auf erstes verbleibendes setzen oder null
                        setValue('position_type', newTypes[0] || null);
                      }
                    }}
                  />
                  <span className="text-2xl mb-2">{type.icon}</span>
                  <span className={`font-semibold text-center text-sm leading-tight ${
                    isSelected ? 'text-primary-700' : 'text-gray-700'
                  }`}>
                    {t(type.labelKey)}
                  </span>
                  {isSelected && (
                    <CheckCircle className="absolute top-1 right-1 md:top-2 md:right-2 h-4 w-4 md:h-5 md:w-5 text-primary-600" />
                  )}
                </label>
              );
            })}
          </div>
          {selectedPositionTypes.length === 0 && (
            <p className="text-amber-600 text-sm mt-2 flex items-center gap-1">
              <Clock className="h-4 w-4" />
              Bitte wählen Sie mindestens eine Stellenart
            </p>
          )}
        </div>

        {/* ========== PERSÖNLICHE DATEN ========== */}
        <div className="card">
          <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
            <User className="h-5 w-5 text-primary-600" />
            {t('applicant.personalData')}
          </h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="label">{t('profile.firstName')} *</label>
              <input
                type="text"
                className="input-styled"
                placeholder="Max"
                {...register('first_name', { required: t('profile.errors.firstNameRequired') })}
              />
              {errors.first_name && <p className="text-red-500 text-sm mt-1">{errors.first_name.message}</p>}
            </div>
            <div>
              <label className="label">{t('profile.lastName')} *</label>
              <input
                type="text"
                className="input-styled"
                placeholder="Mustermann"
                {...register('last_name', { required: t('profile.errors.lastNameRequired') })}
              />
              {errors.last_name && <p className="text-red-500 text-sm mt-1">{errors.last_name.message}</p>}
            </div>
            <div>
              <label className="label">{t('applicant.dateOfBirth')} *</label>
              <input
                type="date"
                className="input-styled"
                {...register('date_of_birth', { required: t('profile.errors.dateOfBirthRequired') })}
              />
              {errors.date_of_birth && <p className="text-red-500 text-sm mt-1">{errors.date_of_birth.message}</p>}
            </div>
            <div>
              <label className="label">{t('applicant.placeOfBirth')}</label>
              <input
                type="text"
                className="input-styled"
                placeholder={t('profile.placeholders.placeOfBirth')}
                {...register('place_of_birth')}
              />
            </div>
            <div>
              <label className="label">{t('gender.label')} *</label>
              <CustomSelect
                value={watch('gender') || ''}
                onChange={(e) => setValue('gender', e.target.value)}
                options={[
                  { value: 'male', label: t('gender.male') },
                  { value: 'female', label: t('gender.female') },
                  { value: 'diverse', label: t('gender.diverse') }
                ]}
                placeholder={t('gender.placeholder')}
              />
              {errors.gender && <p className="text-red-500 text-sm mt-1">{errors.gender.message}</p>}
            </div>
            <div>
              <label className="label">{t('applicant.nationality')} *</label>
              <CustomSelect
                value={watch('nationality') || ''}
                onChange={(e) => setValue('nationality', e.target.value)}
                options={getNationalities(i18n.language).map(n => ({ value: n, label: n }))}
                placeholder={t('profile.placeholders.nationality')}
              />
              {errors.nationality && <p className="text-red-500 text-sm mt-1">{errors.nationality.message}</p>}
            </div>
            <div>
              <label className="label">{t('applicant.phone')} *</label>
              <input
                type="tel"
                className="input-styled"
                placeholder="+7 123 456789"
                {...register('phone', { required: t('profile.errors.phoneRequired') })}
              />
              {errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone.message}</p>}
            </div>
          </div>
        </div>

        {/* ========== ADRESSE ========== */}
        <div className="card">
          <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary-600" />
            {t('profile.homeAddress')}
          </h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="md:col-span-2 grid grid-cols-4 gap-4">
              <div className="col-span-3">
                <label className="label">{t('applicant.street')}</label>
                <input type="text" className="input-styled" placeholder={t('profile.placeholders.street')} {...register('street')} />
              </div>
              <div>
                <label className="label">{t('applicant.houseNumber')}</label>
                <input type="text" className="input-styled" placeholder="123" {...register('house_number')} />
              </div>
            </div>
            <div>
              <label className="label">{t('applicant.postalCode')}</label>
              <input type="text" className="input-styled" placeholder="12345" {...register('postal_code')} />
            </div>
            <div>
              <label className="label">{t('applicant.city')}</label>
              <input type="text" className="input-styled" placeholder={t('profile.placeholders.city')} {...register('city')} />
            </div>
            <div className="md:col-span-2">
              <label className="label">{t('applicant.country')}</label>
              <input type="text" className="input-styled" placeholder={t('profile.placeholders.country')} {...register('country')} />
            </div>
          </div>
        </div>

        {/* ========== SPRACHKENNTNISSE ========== */}
        <div className="card">
          <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
            <Languages className="h-5 w-5 text-primary-600" />
            {t('applicant.languages')}
          </h2>
          
          {/* Deutsch & Englisch */}
          <div className="grid md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="label">{t('applicant.germanLevel')} *</label>
              <CustomSelect
                value={watch('german_level') || 'keine'}
                onChange={(e) => setValue('german_level', e.target.value)}
                options={languageLevelKeys.map(l => ({ value: l.value, label: t(l.labelKey) }))}
              />
            </div>
            <div>
              <label className="label">{t('applicant.englishLevel')}</label>
              <CustomSelect
                value={watch('english_level') || 'keine'}
                onChange={(e) => setValue('english_level', e.target.value)}
                options={languageLevelKeys.map(l => ({ value: l.value, label: t(l.labelKey) }))}
              />
            </div>
          </div>
          
          {/* Weitere Sprachen */}
          <div className="border-t pt-6">
            <div className="flex items-center justify-between mb-4">
              <label className="label mb-0">{t('applicant.otherLanguages')}</label>
              <button
                type="button"
                onClick={addLanguage}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-primary-600 
                         bg-primary-50 hover:bg-primary-100 rounded-lg transition-colors"
              >
                <Plus className="h-4 w-4" />
                {t('applicant.addLanguage')}
              </button>
            </div>
            
            {otherLanguages.length === 0 ? (
              <p className="text-gray-500 text-sm italic">
                {t('profile.noOtherLanguages')}
              </p>
            ) : (
              <div className="space-y-3">
                {otherLanguages.map((lang, index) => (
                  <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                    <div className="flex-1">
                      <CustomSelect
                        value={lang.language}
                        onChange={(e) => updateLanguage(index, 'language', e.target.value)}
                        options={allLanguages.map(l => ({ value: l, label: l }))}
                        placeholder={t('profile.selectLanguage')}
                      />
                    </div>
                    <div className="flex-1">
                      <CustomSelect
                        value={lang.level}
                        onChange={(e) => updateLanguage(index, 'level', e.target.value)}
                        options={languageLevelKeys.map(l => ({ value: l.value, label: t(l.labelKey) }))}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeLanguage(index)}
                      className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                      title={t('applicant.removeLanguage')}
                    >
                      <Minus className="h-5 w-5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ========== BERUFSERFAHRUNG & DEUTSCHLAND ========== */}
        <div className="card">
          <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-primary-600" />
            {t('profile.workAndGermany')}
          </h2>
          <div className="space-y-6">
            {/* Strukturierte Berufserfahrung */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <label className="label mb-0">Berufserfahrung (tabellarisch)</label>
                <button
                  type="button"
                  onClick={addWorkExperience}
                  className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-primary-600 
                           bg-primary-50 hover:bg-primary-100 rounded-lg transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  Position hinzufügen
                </button>
              </div>
              
              {workExperiences.length === 0 ? (
                <p className="text-gray-500 text-sm italic p-4 bg-gray-50 rounded-xl">
                  Noch keine Berufserfahrung eingetragen. Klicken Sie auf "Position hinzufügen".
                </p>
              ) : (
                <div className="space-y-4">
                  {workExperiences.map((exp, index) => (
                    <div key={index} className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                      <div className="flex justify-between items-start mb-3">
                        <span className="text-sm font-medium text-gray-500">Position {index + 1}</span>
                        <button
                          type="button"
                          onClick={() => removeWorkExperience(index)}
                          className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                          title="Entfernen"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="grid md:grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs text-gray-600 mb-1 block">Unternehmen/Firma *</label>
                          <input
                            type="text"
                            className="input-styled text-sm"
                            placeholder="z.B. Musterfirma GmbH"
                            value={exp.company}
                            onChange={(e) => updateWorkExperience(index, 'company', e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-600 mb-1 block">Position/Tätigkeit *</label>
                          <input
                            type="text"
                            className="input-styled text-sm"
                            placeholder="z.B. Softwareentwickler"
                            value={exp.position}
                            onChange={(e) => updateWorkExperience(index, 'position', e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-600 mb-1 block">Ort</label>
                          <input
                            type="text"
                            className="input-styled text-sm"
                            placeholder="z.B. Berlin, Deutschland"
                            value={exp.location || ''}
                            onChange={(e) => updateWorkExperience(index, 'location', e.target.value)}
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-xs text-gray-600 mb-1 block">Von</label>
                            <input
                              type="text"
                              className="input-styled text-sm"
                              placeholder="MM/JJJJ"
                              value={exp.start_date || ''}
                              onChange={(e) => updateWorkExperience(index, 'start_date', e.target.value)}
                            />
                          </div>
                          <div>
                            <label className="text-xs text-gray-600 mb-1 block">Bis</label>
                            <input
                              type="text"
                              className="input-styled text-sm"
                              placeholder="MM/JJJJ oder heute"
                              value={exp.end_date || ''}
                              onChange={(e) => updateWorkExperience(index, 'end_date', e.target.value)}
                            />
                          </div>
                        </div>
                        <div className="md:col-span-2">
                          <label className="text-xs text-gray-600 mb-1 block">Tätigkeitsbeschreibung</label>
                          <textarea
                            className="input-styled text-sm"
                            rows={2}
                            placeholder="Beschreiben Sie Ihre Aufgaben und Verantwortlichkeiten..."
                            value={exp.description || ''}
                            onChange={(e) => updateWorkExperience(index, 'description', e.target.value)}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Berufserfahrung Jahre */}
            <div className="pt-4 border-t">
              <div>
                <label className="label">{t('applicant.workExperienceYears')}</label>
                <input
                  type="number"
                  min="0"
                  className="input-styled max-w-xs"
                  placeholder="0"
                  {...register('work_experience_years')}
                />
              </div>
            </div>
            
            {/* Zusätzliche Notizen (Legacy-Feld) */}
            <div>
              <label className="label">Zusätzliche Anmerkungen zur Berufserfahrung</label>
              <textarea
                className="input-styled"
                rows={2}
                placeholder="Weitere Informationen zu Ihrer Berufserfahrung..."
                {...register('work_experience')}
              />
            </div>
            
            {/* Deutschland-Erfahrung */}
            <div className="pt-4 border-t">
              <div className="flex items-center gap-3 mb-4">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    {...register('been_to_germany')}
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 
                                peer-focus:ring-primary-100 rounded-full peer 
                                peer-checked:after:translate-x-full peer-checked:after:border-white 
                                after:content-[''] after:absolute after:top-[2px] after:left-[2px] 
                                after:bg-white after:border-gray-300 after:border after:rounded-full 
                                after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                  <span className="ml-3 text-gray-700 font-medium">
                    {t('applicant.beenToGermany')}
                  </span>
                </label>
              </div>
              
              {beenToGermany && (
                <div className="bg-blue-50 p-4 rounded-xl border border-blue-200">
                  <label className="label text-blue-800">{t('applicant.germanyDetails')}</label>
                  <textarea
                    className="input-styled"
                    rows={2}
                    placeholder={t('profile.placeholders.germanyDetails')}
                    {...register('germany_details')}
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ========== STUDENTENFERIENJOB-SPEZIFISCH ========== */}
        {hasPositionType('studentenferienjob') && (
          <div className="card border-l-4 border-l-blue-500">
            <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-blue-600" />
              {t('profile.studyInfo')}
            </h2>
            
            {/* Universität */}
            <div className="mb-6">
              <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                {t('applicant.university')}
              </h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="label">{t('applicant.universityName')} *</label>
                  <input type="text" className="input-styled" placeholder={t('profile.placeholders.universityName')} {...register('university_name')} />
                </div>
                <div className="md:col-span-2 grid grid-cols-4 gap-4">
                  <div className="col-span-3">
                    <label className="label">{t('applicant.street')}</label>
                    <input type="text" className="input-styled" {...register('university_street')} />
                  </div>
                  <div>
                    <label className="label">{t('applicant.houseNumber')}</label>
                    <input type="text" className="input-styled" {...register('university_house_number')} />
                  </div>
                </div>
                <div>
                  <label className="label">{t('applicant.postalCode')}</label>
                  <input type="text" className="input-styled" {...register('university_postal_code')} />
                </div>
                <div>
                  <label className="label">{t('applicant.city')}</label>
                  <input type="text" className="input-styled" {...register('university_city')} />
                </div>
                <div className="md:col-span-2">
                  <label className="label">{t('applicant.country')}</label>
                  <input type="text" className="input-styled" {...register('university_country')} />
                </div>
              </div>
            </div>
            
            {/* Studium */}
            <div className="mb-6">
              <h3 className="font-semibold text-gray-700 mb-3">{t('profile.studies')}</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="label">{t('applicant.fieldOfStudy')} *</label>
                  <input type="text" className="input-styled" placeholder={t('profile.placeholders.fieldOfStudy')} {...register('field_of_study')} />
                </div>
                <div>
                  <label className="label">{t('applicant.currentSemester')} *</label>
                  <input type="number" min="1" className="input-styled" placeholder="4" {...register('current_semester')} />
                </div>
              </div>
            </div>
            
            {/* Semesterferien */}
            <div>
              <h3 className="font-semibold text-gray-700 mb-3">{t('applicant.semesterBreak')}</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="label">{t('applicant.semesterBreakStart')} *</label>
                  <input type="date" className="input-styled" {...register('semester_break_start')} />
                </div>
                <div>
                  <label className="label">{t('applicant.semesterBreakEnd')} *</label>
                  <input type="date" className="input-styled" {...register('semester_break_end')} />
                </div>
                <div className="md:col-span-2">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" {...register('continue_studying')} />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:ring-4 peer-focus:ring-blue-100 
                                  rounded-full peer peer-checked:after:translate-x-full 
                                  after:content-[''] after:absolute after:top-[2px] after:left-[2px] 
                                  after:bg-white after:border after:rounded-full after:h-5 after:w-5 
                                  after:transition-all peer-checked:bg-blue-600"></div>
                    <span className="ml-3 text-gray-700 font-medium">
                      {t('applicant.continueStudying')}
                    </span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========== AUSBILDUNG-SPEZIFISCH ========== */}
        {hasPositionType('ausbildung') && (
          <div className="card border-l-4 border-l-green-500">
            <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-green-600" />
              {t('profile.apprenticeshipInfo')}
            </h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="label">{t('profile.desiredProfession')} *</label>
                <input type="text" className="input-styled" placeholder={t('profile.placeholders.desiredProfession')} {...register('desired_profession')} />
              </div>
              <div>
                <label className="label">{t('profile.schoolDegree')} *</label>
                <input type="text" className="input-styled" placeholder={t('profile.placeholders.schoolDegree')} {...register('school_degree')} />
              </div>
            </div>
          </div>
        )}

        {/* ========== FACHKRAFT-SPEZIFISCH ========== */}
        {hasPositionType('fachkraft') && (
          <div className="card border-l-4 border-l-purple-500">
            <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
              <Building2 className="h-5 w-5 text-purple-600" />
              {t('profile.skilledWorkerInfo')}
            </h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="label">{t('profile.professionField')} *</label>
                <input type="text" className="input-styled" placeholder={t('profile.placeholders.profession')} {...register('profession')} />
              </div>
              <div>
                <label className="label">{t('profile.degree')} *</label>
                <input type="text" className="input-styled" placeholder={t('profile.placeholders.degree')} {...register('degree')} />
              </div>
              <div>
                <label className="label">{t('profile.degreeYear')}</label>
                <input type="number" min="1950" max="2030" className="input-styled" placeholder="2020" {...register('degree_year')} />
              </div>
            </div>
          </div>
        )}

        {/* ========== SAISONJOB-SPEZIFISCH ========== */}
        {hasPositionType('saisonjob') && (
          <div className="card border-l-4 border-l-orange-500">
            <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-orange-600" />
              {t('profile.seasonalJobInfo')}
            </h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="label">{t('profile.availableFrom')} *</label>
                <input type="date" className="input-styled" {...register('available_from')} />
              </div>
              <div>
                <label className="label">{t('profile.availableUntil')} *</label>
                <input type="date" className="input-styled" {...register('available_until')} />
              </div>
              <div className="md:col-span-2">
                <label className="label">{t('profile.preferredWorkArea')}</label>
                <input type="text" className="input-styled" placeholder={t('profile.placeholders.preferredWorkArea')} {...register('preferred_work_area')} />
              </div>
            </div>
          </div>
        )}

        {/* ========== DOKUMENTE (je nach Positionstyp) ========== */}
        {renderDocuments()}

        {/* ========== SPEICHERN ========== */}
        <div className="flex justify-end gap-4 sticky bottom-4 bg-white/80 backdrop-blur-sm p-4 rounded-xl shadow-lg border">
          <button
            type="submit"
            disabled={saving}
            className="btn-primary flex items-center gap-2 px-8 py-3 text-lg"
          >
            {saving ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Save className="h-5 w-5" />
            )}
            {t('profile.saveProfile')}
          </button>
        </div>
      </form>
    </div>
  );
}

export default ApplicantProfile;
