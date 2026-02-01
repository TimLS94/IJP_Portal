import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { adminAPI } from '../../lib/api';
import toast from 'react-hot-toast';
import { 
  Briefcase, Search, Trash2, Eye, EyeOff, 
  MapPin, Building2, Users, Filter 
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

function AdminJobs() {
  const [jobs, setJobs] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [page, setPage] = useState(0);
  const limit = 20;

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
                          <Users className="h-4 w-4" />
                          {job.application_count} Bewerbungen
                        </span>
                        <span>Erstellt: {formatDate(job.created_at)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
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
    </div>
  );
}

export default AdminJobs;
