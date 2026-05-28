import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { adminAPI } from '../../lib/api';
import toast from 'react-hot-toast';
import { 
  Briefcase, Search, Trash2, Eye, EyeOff, 
  MapPin, Building2, Users, Filter, Languages, Loader2, Check, X
} from 'lucide-react';

const positionTypeLabels = {
  studentenferienjob: 'Studentenferienjob',
  saisonjob: 'Saisonjob',
  fachkraft: 'Fachkräfte',
  ausbildung: 'Ausbildung'
};

const positionTypeColors = {
  studentenferienjob: 'bg-blue-100 text-blue-800',
  saisonjob: 'bg-green-100 text-green-800',
  fachkraft: 'bg-purple-100 text-purple-800',
  ausbildung: 'bg-orange-100 text-orange-800'
};

const AVAILABLE_LANGUAGES = [
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'ru', name: 'Русский', flag: '🇷🇺' },
];

function AdminJobs() {
  const [jobs, setJobs] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [page, setPage] = useState(0);
  const limit = 20;
  
  // Translation Modal State
  const [translateModal, setTranslateModal] = useState(null); // job object or null
  const [selectedLanguages, setSelectedLanguages] = useState([]);
  const [translating, setTranslating] = useState(false);

  useEffect(() => {
    loadJobs();
  }, [activeFilter, typeFilter, page]);

  const loadJobs = async () => {
    setLoading(true);
    try {
      const params = {
        skip: page * limit,
        limit,
        ...(activeFilter !== '' && { is_active: activeFilter === 'true' }),
        ...(typeFilter && { position_type: typeFilter })
      };
      const response = await adminAPI.listJobs(params);
      setJobs(response.data.jobs);
      setTotal(response.data.total);
    } catch (error) {
      toast.error('Fehler beim Laden der Stellen');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id, title) => {
    if (!confirm(`Möchten Sie die Stelle "${title}" wirklich löschen? Alle zugehörigen Bewerbungen werden ebenfalls gelöscht.`)) {
      return;
    }
    
    try {
      await adminAPI.deleteJob(id);
      toast.success('Stelle gelöscht');
      loadJobs();
    } catch (error) {
      toast.error('Fehler beim Löschen');
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const openTranslateModal = (job) => {
    // Vorauswahl: Sprachen die noch nicht übersetzt wurden
    const existingLangs = job.available_languages || ['de'];
    const missingLangs = AVAILABLE_LANGUAGES
      .filter(l => !existingLangs.includes(l.code))
      .map(l => l.code);
    setSelectedLanguages(missingLangs);
    setTranslateModal(job);
  };

  const handleTranslate = async () => {
    if (!translateModal || selectedLanguages.length === 0) return;
    
    setTranslating(true);
    try {
      const response = await adminAPI.translateJob(translateModal.id, selectedLanguages);
      if (response.data.success) {
        toast.success(response.data.message);
        loadJobs(); // Refresh
      } else {
        toast.error('Übersetzung fehlgeschlagen');
      }
      if (response.data.errors?.length > 0) {
        response.data.errors.forEach(err => toast.error(err));
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Fehler bei der Übersetzung');
    } finally {
      setTranslating(false);
      setTranslateModal(null);
    }
  };

  const toggleLanguage = (code) => {
    setSelectedLanguages(prev => 
      prev.includes(code) 
        ? prev.filter(l => l !== code)
        : [...prev, code]
    );
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-8">
        <Briefcase className="h-8 w-8 text-primary-600" />
        <h1 className="text-3xl font-bold text-gray-900">Stellen verwalten</h1>
      </div>

      {/* Filter */}
      <div className="card mb-6">
        <div className="flex flex-wrap gap-4">
          <div>
            <select
              className="input"
              value={activeFilter}
              onChange={(e) => {
                setActiveFilter(e.target.value);
                setPage(0);
              }}
            >
              <option value="">Alle Status</option>
              <option value="true">Aktiv</option>
              <option value="false">Inaktiv</option>
            </select>
          </div>
          <div>
            <select
              className="input"
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setPage(0);
              }}
            >
              <option value="">Alle Stellenarten</option>
              {Object.entries(positionTypeLabels).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Stellen-Liste */}
      <div className="card">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          </div>
        ) : jobs.length === 0 ? (
          <div className="text-center py-12">
            <Briefcase className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Keine Stellen gefunden</p>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              {jobs.map((job) => (
                <div 
                  key={job.id} 
                  className={`p-4 border rounded-lg ${!job.is_active ? 'bg-gray-50 opacity-60' : ''}`}
                >
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <Link 
                          to={`/jobs/${job.slug ? `${job.slug}-${job.id}` : job.id}`}
                          className="text-lg font-semibold text-gray-900 hover:text-primary-600"
                        >
                          {job.title}
                        </Link>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${positionTypeColors[job.position_type]}`}>
                          {positionTypeLabels[job.position_type]}
                        </span>
                        {!job.is_active && (
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-200 text-gray-600">
                            Inaktiv
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                        <span className="flex items-center gap-1">
                          <Building2 className="h-4 w-4" />
                          {job.company_name}
                        </span>
                        {job.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-4 w-4" />
                            {job.location}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Eye className="h-4 w-4" />
                          {job.view_count || 0} Aufrufe
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="h-4 w-4" />
                          {job.application_count} Bewerbungen
                        </span>
                        <span>Erstellt: {formatDate(job.created_at)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {/* Übersetzungs-Button */}
                      <button
                        onClick={() => openTranslateModal(job)}
                        className="btn-secondary text-sm flex items-center gap-1"
                        title="Übersetzen"
                      >
                        <Languages className="h-4 w-4" />
                        {(job.available_languages?.length > 1) && (
                          <span className="bg-green-100 text-green-700 text-xs px-1.5 py-0.5 rounded-full">
                            {job.available_languages.length - 1}
                          </span>
                        )}
                      </button>
                      <Link 
                        to={`/jobs/${job.slug ? `${job.slug}-${job.id}` : job.id}`}
                        className="btn-secondary text-sm"
                      >
                        <Eye className="h-4 w-4 inline mr-1" />
                        Ansehen
                      </Link>
                      <button
                        onClick={() => handleDelete(job.id, job.title)}
                        className="btn-danger text-sm"
                      >
                        <Trash2 className="h-4 w-4 inline mr-1" />
                        Löschen
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between mt-6 pt-4 border-t">
              <p className="text-sm text-gray-600">
                Zeige {page * limit + 1}-{Math.min((page + 1) * limit, total)} von {total}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(p => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="btn-secondary text-sm disabled:opacity-50"
                >
                  Zurück
                </button>
                <button
                  onClick={() => setPage(p => p + 1)}
                  disabled={(page + 1) * limit >= total}
                  className="btn-secondary text-sm disabled:opacity-50"
                >
                  Weiter
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Translation Modal */}
      {translateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Languages className="h-5 w-5 text-primary-600" />
                Stelle übersetzen
              </h3>
              <button 
                onClick={() => setTranslateModal(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <p className="text-sm text-gray-600 mb-4">
              <strong>{translateModal.title}</strong>
              <br />
              <span className="text-gray-500">{translateModal.company_name}</span>
            </p>

            <div className="mb-4">
              <p className="text-sm font-medium text-gray-700 mb-2">Sprachen auswählen:</p>
              <div className="space-y-2">
                {AVAILABLE_LANGUAGES.map(lang => {
                  const isExisting = translateModal.available_languages?.includes(lang.code);
                  const isAdminTranslated = translateModal.admin_translated_languages?.includes(lang.code);
                  
                  return (
                    <label 
                      key={lang.code}
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors
                        ${selectedLanguages.includes(lang.code) ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:bg-gray-50'}
                        ${isExisting ? 'opacity-60' : ''}`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedLanguages.includes(lang.code)}
                        onChange={() => toggleLanguage(lang.code)}
                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                      <span className="text-xl">{lang.flag}</span>
                      <span className="flex-1">{lang.name}</span>
                      {isExisting && (
                        <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700 flex items-center gap-1">
                          <Check className="h-3 w-3" />
                          {isAdminTranslated ? 'Admin übersetzt' : 'Vorhanden'}
                        </span>
                      )}
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
              <p className="text-sm text-amber-800">
                <strong>Hinweis:</strong> Die Übersetzung erfolgt automatisch mit DeepL. 
                Der Arbeitgeber sieht einen Hinweis "Automatisch übersetzt".
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setTranslateModal(null)}
                className="btn-secondary flex-1"
                disabled={translating}
              >
                Abbrechen
              </button>
              <button
                onClick={handleTranslate}
                disabled={translating || selectedLanguages.length === 0}
                className="btn-primary flex-1 flex items-center justify-center gap-2"
              >
                {translating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Übersetze...
                  </>
                ) : (
                  <>
                    <Languages className="h-4 w-4" />
                    Übersetzen ({selectedLanguages.length})
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminJobs;
