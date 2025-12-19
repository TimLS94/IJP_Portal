import { useState, useEffect, useRef } from 'react';
import { documentsAPI, applicantAPI, generatorAPI, downloadBlob } from '../../lib/api';
import toast from 'react-hot-toast';
import { 
  FileText, Upload, Download, Trash2, File, 
  FileImage, FilePlus, Loader2, AlertCircle,
  CheckCircle, Clock, Shield, ChevronDown, Eye, FolderOpen
} from 'lucide-react';

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

// Alle verfügbaren Dokumenttypen
const allDocumentTypes = [
  { value: 'passport', label: 'Reisepass' },
  { value: 'cv', label: 'Lebenslauf' },
  { value: 'photo', label: 'Bewerbungsfoto' },
  { value: 'enrollment_cert', label: 'Immatrikulationsbescheinigung' },
  { value: 'enrollment_trans', label: 'Immatrikulation (Übersetzung)' },
  { value: 'ba_declaration', label: 'BA-Erklärung' },
  { value: 'language_cert', label: 'Sprachzertifikat' },
  { value: 'diploma', label: 'Studienzeugnis/Abschluss' },
  { value: 'school_cert', label: 'Schulzeugnis' },
  { value: 'work_reference', label: 'Arbeitszeugnis' },
  { value: 'other', label: 'Sonstiges' },
];

function ApplicantDocuments() {
  const [documents, setDocuments] = useState([]);
  const [documentStatus, setDocumentStatus] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [generating, setGenerating] = useState(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedType, setSelectedType] = useState('other');
  const [description, setDescription] = useState('');
  const fileInputRef = useRef(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [profileRes, docsRes] = await Promise.all([
        applicantAPI.getProfile().catch(() => ({ data: null })),
        documentsAPI.list()
      ]);
      
      setProfile(profileRes.data);
      setDocuments(docsRes.data);
      
      if (profileRes.data?.position_type) {
        const statusRes = await documentsAPI.getStatus();
        setDocumentStatus(statusRes.data);
      }
    } catch (error) {
      if (error.response?.status !== 404) {
        toast.error('Fehler beim Laden der Daten');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // PDF-Validierung
    const fileName = file.name.toLowerCase();
    if (!fileName.endsWith('.pdf')) {
      toast.error('Nur PDF-Dateien sind erlaubt!');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    // MIME-Type prüfen
    if (file.type && file.type !== 'application/pdf' && file.type !== 'application/x-pdf') {
      toast.error('Die Datei ist keine gültige PDF-Datei!');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('Datei ist zu groß (max. 10 MB)');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setUploading(true);
    try {
      await documentsAPI.upload(file, selectedType, description);
      toast.success('Dokument hochgeladen!');
      setShowUploadModal(false);
      setDescription('');
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Upload fehlgeschlagen');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
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

  const handleDelete = async (id) => {
    if (!confirm('Möchten Sie dieses Dokument wirklich löschen?')) return;

    try {
      await documentsAPI.delete(id);
      toast.success('Dokument gelöscht');
      loadData();
    } catch (error) {
      toast.error('Löschen fehlgeschlagen');
    }
  };

  const generateArbeitserlaubnis = async () => {
    setGenerating('arbeitserlaubnis');
    try {
      const response = await generatorAPI.arbeitserlaubnis();
      downloadBlob(response.data, 'Arbeitserlaubnis_Antrag.pdf');
      toast.success('PDF wurde generiert!');
    } catch (error) {
      toast.error('Generierung fehlgeschlagen - Bitte Profil vollständig ausfüllen');
    } finally {
      setGenerating(null);
    }
  };

  const generateLebenslauf = async () => {
    setGenerating('lebenslauf');
    try {
      const response = await generatorAPI.lebenslauf();
      downloadBlob(response.data, 'Lebenslauf.pdf');
      toast.success('PDF wurde generiert!');
    } catch (error) {
      toast.error('Generierung fehlgeschlagen - Bitte Profil vollständig ausfüllen');
    } finally {
      setGenerating(null);
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Dokumente nach Typ gruppieren
  const groupedDocuments = documents.reduce((acc, doc) => {
    const type = doc.document_type;
    if (!acc[type]) acc[type] = [];
    acc[type].push(doc);
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <FolderOpen className="h-8 w-8 text-primary-600" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Meine Dokumente</h1>
            <p className="text-gray-600">Übersicht aller hochgeladenen Dokumente</p>
          </div>
        </div>
        <button
          onClick={() => setShowUploadModal(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Upload className="h-5 w-5" />
          Dokument hochladen
        </button>
      </div>

      {/* Status-Übersicht */}
      {documentStatus && (
        <div className={`card mb-6 border-l-4 ${
          documentStatus.complete ? 'border-l-green-500 bg-green-50' : 'border-l-yellow-500 bg-yellow-50'
        }`}>
          <div className="flex items-center gap-4">
            {documentStatus.complete ? (
              <CheckCircle className="h-10 w-10 text-green-600 flex-shrink-0" />
            ) : (
              <Clock className="h-10 w-10 text-yellow-600 flex-shrink-0" />
            )}
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 text-lg">
                {documentStatus.complete 
                  ? '✓ Alle Pflichtdokumente hochgeladen!' 
                  : `${documentStatus.uploaded_required} von ${documentStatus.total_required} Pflichtdokumenten`
                }
              </h3>
              <p className="text-gray-600">
                Für: {documentStatus.position_label}
              </p>
              {!documentStatus.complete && documentStatus.missing_required?.length > 0 && (
                <div className="mt-2">
                  <span className="text-sm text-yellow-800">Fehlend: </span>
                  <span className="text-sm font-medium text-yellow-900">
                    {documentStatus.missing_required.map(d => d.type_label).join(', ')}
                  </span>
                </div>
              )}
            </div>
            <a 
              href="/applicant/profile" 
              className="btn-primary text-sm flex items-center gap-2"
            >
              Zum Profil
            </a>
          </div>
        </div>
      )}

      {/* Hinweis wenn kein Positionstyp */}
      {!profile?.position_type && (
        <div className="card mb-6 border-l-4 border-l-blue-500 bg-blue-50">
          <div className="flex items-center gap-4">
            <AlertCircle className="h-8 w-8 text-blue-600 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900">
                Stellenart noch nicht gewählt
              </h3>
              <p className="text-gray-600 text-sm">
                Wählen Sie in Ihrem Profil eine Stellenart, um die benötigten Dokumente zu sehen.
              </p>
            </div>
            <a href="/applicant/profile" className="btn-primary text-sm">
              Profil bearbeiten
            </a>
          </div>
        </div>
      )}

      {/* PDF-Generierung */}
      <div className="card mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-2 flex items-center gap-2">
          <FilePlus className="h-5 w-5 text-primary-600" />
          Dokumente generieren
        </h2>
        <p className="text-gray-600 mb-4 text-sm">
          Erstellen Sie automatisch Dokumente basierend auf Ihren Profildaten.
        </p>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={generateArbeitserlaubnis}
            disabled={generating === 'arbeitserlaubnis'}
            className="btn-primary flex items-center gap-2"
          >
            {generating === 'arbeitserlaubnis' ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <FilePlus className="h-5 w-5" />
            )}
            Antrag auf Arbeitserlaubnis
          </button>
          <button
            onClick={generateLebenslauf}
            disabled={generating === 'lebenslauf'}
            className="btn-secondary flex items-center gap-2"
          >
            {generating === 'lebenslauf' ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <FileText className="h-5 w-5" />
            )}
            Lebenslauf (PDF)
          </button>
        </div>
      </div>

      {/* Dokumentenliste */}
      <div className="card">
        <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary-600" />
          Hochgeladene Dokumente ({documents.length})
        </h2>
        
        {documents.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-xl">
            <FolderOpen className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg mb-2">
              Noch keine Dokumente hochgeladen
            </p>
            <p className="text-gray-400 text-sm mb-4">
              Laden Sie Ihre Dokumente über das Profil oder hier hoch
            </p>
            <button
              onClick={() => setShowUploadModal(true)}
              className="btn-primary inline-flex items-center gap-2"
            >
              <Upload className="h-5 w-5" />
              Erstes Dokument hochladen
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {documents.map((doc) => {
              const Icon = documentTypeIcons[doc.document_type] || File;
              return (
                <div
                  key={doc.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors group"
                >
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="bg-white p-3 rounded-xl shadow-sm group-hover:shadow-md transition-shadow">
                      <Icon className="h-6 w-6 text-primary-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 truncate">{doc.file_name}</p>
                      <div className="flex items-center gap-3 text-sm text-gray-500 flex-wrap">
                        <span className="bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full text-xs font-medium">
                          {doc.type_label}
                        </span>
                        <span>{formatFileSize(doc.file_size)}</span>
                        <span>{formatDate(doc.uploaded_at)}</span>
                        {doc.is_verified && (
                          <span className="text-green-600 flex items-center gap-1">
                            <CheckCircle className="h-4 w-4" />
                            Geprüft
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 ml-4">
                    <button
                      onClick={() => handleDownload(doc)}
                      className="p-2 text-gray-500 hover:text-primary-600 hover:bg-white rounded-lg transition-all"
                      title="Herunterladen"
                    >
                      <Download className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => handleDelete(doc.id)}
                      className="p-2 text-gray-500 hover:text-red-600 hover:bg-white rounded-lg transition-all"
                      title="Löschen"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Upload className="h-5 w-5 text-primary-600" />
              Dokument hochladen
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="label">Dokumenttyp</label>
                <div className="relative">
                  <select
                    className="appearance-none w-full px-4 py-3 pr-10 bg-white border-2 border-gray-200 rounded-xl 
                              focus:border-primary-500 focus:ring-2 focus:ring-primary-200 focus:outline-none
                              transition-all cursor-pointer text-gray-700 font-medium"
                    value={selectedType}
                    onChange={(e) => setSelectedType(e.target.value)}
                  >
                    {allDocumentTypes.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
                </div>
              </div>
              
              <div>
                <label className="label">Beschreibung (optional)</label>
                <input
                  type="text"
                  className="input-styled"
                  placeholder="z.B. Seite 1-5 des Reisepasses"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
              
              <div>
                <label className="label">Datei auswählen</label>
                <div className="relative">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,application/pdf"
                    onChange={handleUpload}
                    disabled={uploading}
                    className="w-full px-4 py-3 bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl
                             file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 
                             file:bg-primary-100 file:text-primary-700 file:font-medium
                             hover:file:bg-primary-200 hover:border-primary-300 
                             transition-all cursor-pointer"
                  />
                </div>
                <p className="text-sm text-gray-500 mt-2">
                  Nur PDF-Dateien • Max. 10 MB
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
              <button
                onClick={() => {
                  setShowUploadModal(false);
                  setDescription('');
                }}
                className="btn-secondary"
                disabled={uploading}
              >
                Abbrechen
              </button>
              {uploading && (
                <div className="flex items-center gap-2 text-primary-600">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Wird hochgeladen...</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ApplicantDocuments;
