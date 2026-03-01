import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { jobsAPI } from '../../lib/api';
import toast from 'react-hot-toast';
import { 
  Plus, FileText, Copy, Trash2, Edit, Briefcase, MapPin, Calendar,
  Loader2, FolderOpen, ArrowRight
} from 'lucide-react';

function JobManager() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'templates');
  const [templates, setTemplates] = useState([]);
  const [drafts, setDrafts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    setSearchParams({ tab: activeTab });
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [templatesRes, jobsRes] = await Promise.all([
        jobsAPI.getTemplates().catch(() => ({ data: [] })),
        jobsAPI.getMyJobs().catch(() => ({ data: [] }))
      ]);
      
      setTemplates(templatesRes.data || []);
      // Entwürfe sind Jobs mit is_draft=true
      setDrafts((jobsRes.data || []).filter(j => j.is_draft));
    } catch (error) {
      console.error('Fehler beim Laden:', error);
    } finally {
      setLoading(false);
    }
  };

  const deleteTemplate = async (id) => {
    if (!confirm('Möchten Sie diese Vorlage wirklich löschen?')) return;
    
    setDeleting(id);
    try {
      await jobsAPI.deleteTemplate(id);
      toast.success('Vorlage gelöscht');
      loadData();
    } catch (error) {
      toast.error('Fehler beim Löschen');
    } finally {
      setDeleting(null);
    }
  };

  const deleteDraft = async (id) => {
    if (!confirm('Möchten Sie diesen Entwurf wirklich löschen?')) return;
    
    setDeleting(id);
    try {
      await jobsAPI.deletePermanent(id);
      toast.success('Entwurf gelöscht');
      loadData();
    } catch (error) {
      toast.error('Fehler beim Löschen');
    } finally {
      setDeleting(null);
    }
  };

  const useTemplate = (template) => {
    // Template-Daten in sessionStorage speichern und zu CreateJob navigieren
    sessionStorage.setItem('jobTemplate', JSON.stringify(template));
    navigate('/company/jobs/new?fromTemplate=true');
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FolderOpen className="h-7 w-7 text-primary-600" />
            Vorlagen & Entwürfe
          </h1>
          <p className="text-gray-600 mt-1">
            Verwalten Sie Ihre Stellenvorlagen und unvollständige Entwürfe
          </p>
        </div>
        <Link to="/company/jobs/new" className="btn-primary flex items-center gap-2">
          <Plus className="h-5 w-5" />
          Neue Stelle erstellen
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 p-1 bg-gray-100 rounded-xl w-fit">
        <button
          onClick={() => setActiveTab('templates')}
          className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
            activeTab === 'templates'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <FileText className="h-4 w-4" />
          Vorlagen ({templates.length})
        </button>
        <button
          onClick={() => setActiveTab('drafts')}
          className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
            activeTab === 'drafts'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Edit className="h-4 w-4" />
          Entwürfe ({drafts.length})
        </button>
      </div>

      {/* Vorlagen Tab */}
      {activeTab === 'templates' && (
        <div>
          {templates.length === 0 ? (
            <div className="card text-center py-12">
              <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Keine Vorlagen</h2>
              <p className="text-gray-600 mb-4">
                Erstellen Sie Vorlagen, um ähnliche Stellen schneller zu erstellen.
              </p>
              <Link to="/company/jobs/new?saveAsTemplate=true" className="btn-primary inline-flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Erste Vorlage erstellen
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {templates.map((template) => (
                <div key={template.id} className="card hover:shadow-lg transition-shadow">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-lg font-semibold text-gray-900">
                          {template.name}
                        </span>
                        {template.title && (
                          <span className="text-gray-500">
                            → {template.title}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-4 text-gray-600 text-sm">
                        {template.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-4 w-4" />
                            {template.location}
                          </span>
                        )}
                        {template.position_type && (
                          <span className="flex items-center gap-1">
                            <Briefcase className="h-4 w-4" />
                            {template.position_type}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          Erstellt: {formatDate(template.created_at)}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => useTemplate(template)}
                        className="btn-primary text-sm flex items-center gap-1"
                      >
                        <Copy className="h-4 w-4" />
                        Verwenden
                      </button>
                      <button
                        onClick={() => deleteTemplate(template.id)}
                        disabled={deleting === template.id}
                        className="btn-danger text-sm flex items-center gap-1"
                      >
                        {deleting === template.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Entwürfe Tab */}
      {activeTab === 'drafts' && (
        <div>
          {drafts.length === 0 ? (
            <div className="card text-center py-12">
              <Edit className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Keine Entwürfe</h2>
              <p className="text-gray-600 mb-4">
                Wenn Sie eine Stelle als Entwurf speichern, erscheint sie hier.
              </p>
              <Link to="/company/jobs/new" className="btn-primary inline-flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Neue Stelle erstellen
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-4">
                <p className="text-yellow-800 text-sm">
                  Entwürfe sind unvollständige Stellen, die noch nicht veröffentlicht wurden. 
                  Sie können sie jederzeit bearbeiten und veröffentlichen.
                </p>
              </div>
              
              {drafts.map((draft) => (
                <div key={draft.id} className="card border-l-4 border-l-yellow-400 hover:shadow-lg transition-shadow">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-lg font-semibold text-gray-900">
                          {draft.title || 'Unbenannter Entwurf'}
                        </span>
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
                          Entwurf
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-4 text-gray-600 text-sm">
                        {draft.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-4 w-4" />
                            {draft.location}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          Zuletzt bearbeitet: {formatDate(draft.updated_at)}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Link
                        to={`/company/jobs/${draft.id}/edit`}
                        className="btn-primary text-sm flex items-center gap-1"
                      >
                        <Edit className="h-4 w-4" />
                        Bearbeiten
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                      <button
                        onClick={() => deleteDraft(draft.id)}
                        disabled={deleting === draft.id}
                        className="btn-danger text-sm flex items-center gap-1"
                      >
                        {deleting === draft.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default JobManager;
