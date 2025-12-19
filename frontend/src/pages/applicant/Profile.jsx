import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { applicantAPI, documentsAPI, downloadBlob } from '../../lib/api';
import toast from 'react-hot-toast';
import { 
  User, Save, Loader2, GraduationCap, Building2, Languages, MapPin, Briefcase,
  Plus, Minus, Upload, Download, Trash2, File, Shield, FileText, FileImage,
  CheckCircle, Clock, ChevronDown, X, ClipboardList, ArrowRight
} from 'lucide-react';

const positionTypes = [
  { value: 'studentenferienjob', label: 'Studentenferienjob', color: 'blue' },
  { value: 'saisonjob', label: 'Saisonjob (8 Monate)', color: 'orange' },
  { value: 'fachkraft', label: 'Fachkraft', color: 'purple' },
  { value: 'ausbildung', label: 'Ausbildung', color: 'green' }
];

const languageLevels = [
  { value: 'keine', label: 'Keine Kenntnisse' },
  { value: 'A1', label: 'A1 - Anfänger' },
  { value: 'A2', label: 'A2 - Grundlegend' },
  { value: 'B1', label: 'B1 - Fortgeschritten' },
  { value: 'B2', label: 'B2 - Selbständig' },
  { value: 'C1', label: 'C1 - Fachkundig' },
  { value: 'C2', label: 'C2 - Muttersprachlich' }
];

const commonLanguages = [
  'Russisch', 'Ukrainisch', 'Polnisch', 'Türkisch', 'Arabisch', 
  'Spanisch', 'Französisch', 'Italienisch', 'Portugiesisch', 'Chinesisch',
  'Vietnamesisch', 'Rumänisch', 'Bulgarisch', 'Serbisch', 'Kroatisch'
];

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
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [requirements, setRequirements] = useState(null);
  const [otherLanguages, setOtherLanguages] = useState([]);
  const [showIJPModal, setShowIJPModal] = useState(false);
  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm();
  const fileInputRefs = useRef({});
  
  const selectedPositionType = watch('position_type');
  const beenToGermany = watch('been_to_germany');

  useEffect(() => {
    loadProfile();
  }, []);

  useEffect(() => {
    if (selectedPositionType) {
      loadRequirements(selectedPositionType);
    }
  }, [selectedPositionType]);

  const loadProfile = async () => {
    try {
      const [profileRes, docsRes] = await Promise.all([
        applicantAPI.getProfile(),
        documentsAPI.list()
      ]);
      reset(profileRes.data);
      setDocuments(docsRes.data);
      
      // Andere Sprachen laden
      if (profileRes.data.other_languages && Array.isArray(profileRes.data.other_languages)) {
        setOtherLanguages(profileRes.data.other_languages);
      }
      
      // Anforderungen laden wenn Positionstyp vorhanden
      if (profileRes.data.position_type) {
        loadRequirements(profileRes.data.position_type);
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
      // Andere Sprachen hinzufügen
      data.other_languages = otherLanguages;
      await applicantAPI.updateProfile(data);
      toast.success('Profil erfolgreich gespeichert!');
      // Modal anzeigen nach erfolgreichem Speichern
      setShowIJPModal(true);
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
      toast.success('Dokument hochgeladen!');
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
    if (!requirements || !selectedPositionType) return null;

    return (
      <div className="card border-l-4 border-l-primary-500 bg-gradient-to-r from-primary-50 to-white">
        <h2 className="text-xl font-semibold text-gray-900 mb-2 flex items-center gap-2">
          <File className="h-5 w-5 text-primary-600" />
          Benötigte Dokumente
        </h2>
        <p className="text-gray-600 mb-6">
          Laden Sie die folgenden Dokumente für Ihre Bewerbung als <strong>{requirements.position_label}</strong> hoch.
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
                      <span className="font-semibold text-gray-900">{req.type_label}</span>
                      {req.is_required ? (
                        <span className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded-full font-medium">
                          Pflicht
                        </span>
                      ) : (
                        <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-full">
                          Optional
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{req.description}</p>
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
                      {isCurrentlyUploading ? 'Lädt...' : 'Hochladen'}
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
                    Alle Pflichtdokumente wurden hochgeladen!
                  </span>
                </>
              ) : (
                <>
                  <Clock className="h-6 w-6 text-yellow-600" />
                  <span className="font-medium text-yellow-800">
                    {uploadedRequired.length} von {requiredDocs.length} Pflichtdokumenten hochgeladen
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

      <div className="flex items-center gap-3 mb-8">
        <User className="h-8 w-8 text-primary-600" />
        <h1 className="text-3xl font-bold text-gray-900">Mein Bewerberprofil</h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        
        {/* ========== STELLENART WÄHLEN ========== */}
        <div className="card border-2 border-primary-200 bg-gradient-to-r from-primary-50 to-white">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-primary-600" />
            Gewünschte Stellenart
          </h2>
          <p className="text-gray-600 mb-4">
            Wählen Sie die Stellenart, für die Sie sich bewerben möchten.
          </p>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-3">
            {positionTypes.map((type) => (
              <label
                key={type.value}
                className={`relative flex items-center justify-center p-4 border-2 rounded-xl cursor-pointer transition-all ${
                  selectedPositionType === type.value
                    ? `border-${type.color}-500 bg-${type.color}-50 shadow-lg ring-2 ring-${type.color}-200`
                    : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-md'
                }`}
              >
                <input
                  type="radio"
                  value={type.value}
                  className="sr-only"
                  {...register('position_type', { required: 'Bitte wählen Sie eine Stellenart' })}
                />
                <span className={`font-semibold text-center ${
                  selectedPositionType === type.value ? 'text-primary-700' : 'text-gray-700'
                }`}>
                  {type.label}
                </span>
                {selectedPositionType === type.value && (
                  <CheckCircle className="absolute top-2 right-2 h-5 w-5 text-primary-600" />
                )}
              </label>
            ))}
          </div>
          {errors.position_type && <p className="text-red-500 text-sm mt-2">{errors.position_type.message}</p>}
        </div>

        {/* ========== PERSÖNLICHE DATEN ========== */}
        <div className="card">
          <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
            <User className="h-5 w-5 text-primary-600" />
            Persönliche Daten
          </h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="label">Vorname *</label>
              <input
                type="text"
                className="input-styled"
                placeholder="Max"
                {...register('first_name', { required: 'Vorname ist erforderlich' })}
              />
              {errors.first_name && <p className="text-red-500 text-sm mt-1">{errors.first_name.message}</p>}
            </div>
            <div>
              <label className="label">Nachname *</label>
              <input
                type="text"
                className="input-styled"
                placeholder="Mustermann"
                {...register('last_name', { required: 'Nachname ist erforderlich' })}
              />
              {errors.last_name && <p className="text-red-500 text-sm mt-1">{errors.last_name.message}</p>}
            </div>
            <div>
              <label className="label">Geburtsdatum *</label>
              <input
                type="date"
                className="input-styled"
                {...register('date_of_birth', { required: 'Geburtsdatum ist erforderlich' })}
              />
              {errors.date_of_birth && <p className="text-red-500 text-sm mt-1">{errors.date_of_birth.message}</p>}
            </div>
            <div>
              <label className="label">Geburtsort *</label>
              <input
                type="text"
                className="input-styled"
                placeholder="z.B. Moskau, Russland"
                {...register('place_of_birth', { required: 'Geburtsort ist erforderlich' })}
              />
              {errors.place_of_birth && <p className="text-red-500 text-sm mt-1">{errors.place_of_birth.message}</p>}
            </div>
            <div>
              <label className="label">Nationalität *</label>
              <input
                type="text"
                className="input-styled"
                placeholder="z.B. Russisch"
                {...register('nationality', { required: 'Nationalität ist erforderlich' })}
              />
              {errors.nationality && <p className="text-red-500 text-sm mt-1">{errors.nationality.message}</p>}
            </div>
            <div>
              <label className="label">Telefon *</label>
              <input
                type="tel"
                className="input-styled"
                placeholder="+7 123 456789"
                {...register('phone', { required: 'Telefonnummer ist erforderlich' })}
              />
              {errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone.message}</p>}
            </div>
          </div>
        </div>

        {/* ========== ADRESSE ========== */}
        <div className="card">
          <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary-600" />
            Heimatadresse
          </h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="md:col-span-2 grid grid-cols-4 gap-4">
              <div className="col-span-3">
                <label className="label">Straße</label>
                <input type="text" className="input-styled" placeholder="Musterstraße" {...register('street')} />
              </div>
              <div>
                <label className="label">Hausnr.</label>
                <input type="text" className="input-styled" placeholder="123" {...register('house_number')} />
              </div>
            </div>
            <div>
              <label className="label">PLZ</label>
              <input type="text" className="input-styled" placeholder="12345" {...register('postal_code')} />
            </div>
            <div>
              <label className="label">Stadt</label>
              <input type="text" className="input-styled" placeholder="Moskau" {...register('city')} />
            </div>
            <div className="md:col-span-2">
              <label className="label">Land</label>
              <input type="text" className="input-styled" placeholder="Russland" {...register('country')} />
            </div>
          </div>
        </div>

        {/* ========== SPRACHKENNTNISSE ========== */}
        <div className="card">
          <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
            <Languages className="h-5 w-5 text-primary-600" />
            Sprachkenntnisse
          </h2>
          
          {/* Deutsch & Englisch */}
          <div className="grid md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="label">Deutschkenntnisse *</label>
              <CustomSelect
                value={watch('german_level') || 'keine'}
                onChange={(e) => setValue('german_level', e.target.value)}
                options={languageLevels}
              />
            </div>
            <div>
              <label className="label">Englischkenntnisse</label>
              <CustomSelect
                value={watch('english_level') || 'keine'}
                onChange={(e) => setValue('english_level', e.target.value)}
                options={languageLevels}
              />
            </div>
          </div>
          
          {/* Weitere Sprachen */}
          <div className="border-t pt-6">
            <div className="flex items-center justify-between mb-4">
              <label className="label mb-0">Weitere Sprachkenntnisse</label>
              <button
                type="button"
                onClick={addLanguage}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-primary-600 
                         bg-primary-50 hover:bg-primary-100 rounded-lg transition-colors"
              >
                <Plus className="h-4 w-4" />
                Sprache hinzufügen
              </button>
            </div>
            
            {otherLanguages.length === 0 ? (
              <p className="text-gray-500 text-sm italic">
                Keine weiteren Sprachen angegeben. Klicken Sie auf "Sprache hinzufügen".
              </p>
            ) : (
              <div className="space-y-3">
                {otherLanguages.map((lang, index) => (
                  <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                    <div className="flex-1">
                      <CustomSelect
                        value={lang.language}
                        onChange={(e) => updateLanguage(index, 'language', e.target.value)}
                        options={commonLanguages.map(l => ({ value: l, label: l }))}
                        placeholder="Sprache wählen..."
                      />
                    </div>
                    <div className="flex-1">
                      <CustomSelect
                        value={lang.level}
                        onChange={(e) => updateLanguage(index, 'level', e.target.value)}
                        options={languageLevels}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeLanguage(index)}
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

        {/* ========== BERUFSERFAHRUNG & DEUTSCHLAND ========== */}
        <div className="card">
          <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-primary-600" />
            Berufserfahrung & Deutschland
          </h2>
          <div className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="label">Jahre Berufserfahrung</label>
                <input
                  type="number"
                  min="0"
                  className="input-styled"
                  placeholder="0"
                  {...register('work_experience_years')}
                />
              </div>
              <div className="flex items-center gap-3 pt-6">
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
                    Ich war schon einmal in Deutschland
                  </span>
                </label>
              </div>
            </div>
            
            <div>
              <label className="label">Berufserfahrung (Beschreibung)</label>
              <textarea
                className="input-styled"
                rows={3}
                placeholder="Beschreiben Sie Ihre bisherige Berufserfahrung..."
                {...register('work_experience')}
              />
            </div>
            
            {beenToGermany && (
              <div className="bg-blue-50 p-4 rounded-xl border border-blue-200">
                <label className="label text-blue-800">Details zu Ihrem Deutschland-Aufenthalt</label>
                <textarea
                  className="input-styled"
                  rows={2}
                  placeholder="Wann waren Sie in Deutschland? Wie lange? Aus welchem Grund?"
                  {...register('germany_details')}
                />
              </div>
            )}
          </div>
        </div>

        {/* ========== STUDENTENFERIENJOB-SPEZIFISCH ========== */}
        {selectedPositionType === 'studentenferienjob' && (
          <div className="card border-l-4 border-l-blue-500">
            <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-blue-600" />
              Studieninformationen
            </h2>
            
            {/* Universität */}
            <div className="mb-6">
              <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Universität
              </h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="label">Name der Universität *</label>
                  <input type="text" className="input-styled" placeholder="z.B. Staatliche Universität Moskau" {...register('university_name')} />
                </div>
                <div className="md:col-span-2 grid grid-cols-4 gap-4">
                  <div className="col-span-3">
                    <label className="label">Straße</label>
                    <input type="text" className="input-styled" {...register('university_street')} />
                  </div>
                  <div>
                    <label className="label">Hausnr.</label>
                    <input type="text" className="input-styled" {...register('university_house_number')} />
                  </div>
                </div>
                <div>
                  <label className="label">PLZ</label>
                  <input type="text" className="input-styled" {...register('university_postal_code')} />
                </div>
                <div>
                  <label className="label">Stadt</label>
                  <input type="text" className="input-styled" {...register('university_city')} />
                </div>
                <div className="md:col-span-2">
                  <label className="label">Land</label>
                  <input type="text" className="input-styled" {...register('university_country')} />
                </div>
              </div>
            </div>
            
            {/* Studium */}
            <div className="mb-6">
              <h3 className="font-semibold text-gray-700 mb-3">Studium</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="label">Studienfach *</label>
                  <input type="text" className="input-styled" placeholder="z.B. Informatik, BWL" {...register('field_of_study')} />
                </div>
                <div>
                  <label className="label">Aktuelles Fachsemester *</label>
                  <input type="number" min="1" className="input-styled" placeholder="z.B. 4" {...register('current_semester')} />
                </div>
              </div>
            </div>
            
            {/* Semesterferien */}
            <div>
              <h3 className="font-semibold text-gray-700 mb-3">Semesterferien</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="label">Semesterferien von *</label>
                  <input type="date" className="input-styled" {...register('semester_break_start')} />
                </div>
                <div>
                  <label className="label">Semesterferien bis *</label>
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
                      Ich werde nach den Semesterferien weiterhin studieren
                    </span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========== AUSBILDUNG-SPEZIFISCH ========== */}
        {selectedPositionType === 'ausbildung' && (
          <div className="card border-l-4 border-l-green-500">
            <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-green-600" />
              Ausbildungswunsch
            </h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="label">Gewünschter Ausbildungsberuf *</label>
                <input type="text" className="input-styled" placeholder="z.B. Mechatroniker" {...register('desired_profession')} />
              </div>
              <div>
                <label className="label">Schulabschluss *</label>
                <input type="text" className="input-styled" placeholder="z.B. Mittlere Reife" {...register('school_degree')} />
              </div>
            </div>
          </div>
        )}

        {/* ========== FACHKRAFT-SPEZIFISCH ========== */}
        {selectedPositionType === 'fachkraft' && (
          <div className="card border-l-4 border-l-purple-500">
            <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
              <Building2 className="h-5 w-5 text-purple-600" />
              Qualifikation als Fachkraft
            </h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="label">Beruf / Fachrichtung *</label>
                <input type="text" className="input-styled" placeholder="z.B. Software-Entwickler" {...register('profession')} />
              </div>
              <div>
                <label className="label">Abschluss *</label>
                <input type="text" className="input-styled" placeholder="z.B. Bachelor, Master" {...register('degree')} />
              </div>
              <div>
                <label className="label">Abschlussjahr</label>
                <input type="number" min="1950" max="2030" className="input-styled" placeholder="z.B. 2020" {...register('degree_year')} />
              </div>
            </div>
          </div>
        )}

        {/* ========== SAISONJOB-SPEZIFISCH ========== */}
        {selectedPositionType === 'saisonjob' && (
          <div className="card border-l-4 border-l-orange-500">
            <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-orange-600" />
              Verfügbarkeit für Saisonjob
            </h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="label">Verfügbar ab *</label>
                <input type="date" className="input-styled" {...register('available_from')} />
              </div>
              <div>
                <label className="label">Verfügbar bis *</label>
                <input type="date" className="input-styled" {...register('available_until')} />
              </div>
              <div className="md:col-span-2">
                <label className="label">Bevorzugter Arbeitsbereich</label>
                <input type="text" className="input-styled" placeholder="z.B. Landwirtschaft, Gastronomie" {...register('preferred_work_area')} />
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
            Profil speichern
          </button>
        </div>
      </form>
    </div>
  );
}

export default ApplicantProfile;
