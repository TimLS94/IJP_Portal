import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { jobsAPI } from '../../lib/api';
import toast from 'react-hot-toast';
import { Briefcase, Plus, MapPin, Calendar, Edit, Trash2, Eye, EyeOff } from 'lucide-react';

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

function CompanyJobs() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadJobs();
  }, []);

  const loadJobs = async () => {
    try {
      const response = await jobsAPI.getMyJobs();
      setJobs(response.data);
    } catch (error) {
      toast.error('Fehler beim Laden der Stellen');
    } finally {
      setLoading(false);
    }
  };

  const toggleActive = async (job) => {
    try {
      await jobsAPI.update(job.id, { is_active: !job.is_active });
      toast.success(job.is_active ? 'Stelle deaktiviert' : 'Stelle aktiviert');
      loadJobs();
    } catch (error) {
      toast.error('Fehler beim Aktualisieren');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Möchten Sie diese Stelle wirklich löschen?')) return;
    
    try {
      await jobsAPI.delete(id);
      toast.success('Stelle gelöscht');
      loadJobs();
    } catch (error) {
      toast.error('Fehler beim Löschen');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return null;
    return new Date(dateString).toLocaleDateString('de-DE');
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <Briefcase className="h-8 w-8 text-primary-600" />
          <h1 className="text-3xl font-bold text-gray-900">Meine Stellenangebote</h1>
        </div>
        <Link to="/company/jobs/new" className="btn-primary flex items-center gap-2">
          <Plus className="h-5 w-5" />
          Neue Stelle
        </Link>
      </div>

      {jobs.length === 0 ? (
        <div className="card text-center py-12">
          <Briefcase className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Noch keine Stellenangebote</h2>
          <p className="text-gray-600 mb-4">
            Erstellen Sie Ihr erstes Stellenangebot und finden Sie qualifizierte Bewerber!
          </p>
          <Link to="/company/jobs/new" className="btn-primary inline-block">
            Erste Stelle erstellen
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {jobs.map((job) => (
            <div key={job.id} className={`card ${!job.is_active ? 'opacity-60' : ''}`}>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <Link 
                      to={`/jobs/${job.id}`}
                      className="text-xl font-semibold text-gray-900 hover:text-primary-600"
                    >
                      {job.title}
                    </Link>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${positionTypeColors[job.position_type]}`}>
                      {positionTypeLabels[job.position_type]}
                    </span>
                    {!job.is_active && (
                      <span className="px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-600">
                        Inaktiv
                      </span>
                    )}
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-4 text-gray-600">
                    {job.location && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        {job.location}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      Erstellt: {formatDate(job.created_at)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleActive(job)}
                    className="btn-secondary text-sm flex items-center gap-1"
                    title={job.is_active ? 'Deaktivieren' : 'Aktivieren'}
                  >
                    {job.is_active ? (
                      <>
                        <EyeOff className="h-4 w-4" />
                        Deaktivieren
                      </>
                    ) : (
                      <>
                        <Eye className="h-4 w-4" />
                        Aktivieren
                      </>
                    )}
                  </button>
                  <Link 
                    to={`/company/jobs/${job.id}/edit`}
                    className="btn-primary text-sm flex items-center gap-1"
                  >
                    <Edit className="h-4 w-4" />
                    Bearbeiten
                  </Link>
                  <Link 
                    to={`/jobs/${job.id}`}
                    className="btn-secondary text-sm flex items-center gap-1"
                  >
                    <Eye className="h-4 w-4" />
                    Ansehen
                  </Link>
                  <button
                    onClick={() => handleDelete(job.id)}
                    className="btn-danger text-sm flex items-center gap-1"
                  >
                    <Trash2 className="h-4 w-4" />
                    Löschen
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default CompanyJobs;
