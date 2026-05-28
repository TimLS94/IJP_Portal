import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { jobsAPI } from '../../lib/api';
import toast from 'react-hot-toast';
import { 
  Heart, MapPin, Calendar, Building2, Briefcase, Loader2, Trash2, Euro
} from 'lucide-react';

const positionTypeColors = {
  general: 'bg-gray-100 text-gray-800 border-gray-200',
  studentenferienjob: 'bg-blue-100 text-blue-800 border-blue-200',
  saisonjob: 'bg-orange-100 text-orange-800 border-orange-200',
  workandholiday: 'bg-pink-100 text-pink-800 border-pink-200',
  fachkraft: 'bg-purple-100 text-purple-800 border-purple-200',
  ausbildung: 'bg-green-100 text-green-800 border-green-200'
};

const positionTypeLabels = {
  general: 'Allgemein',
  studentenferienjob: 'Studentenferienjob',
  saisonjob: 'Saisonjob',
  workandholiday: 'Work & Holiday',
  fachkraft: 'Fachkraft',
  ausbildung: 'Ausbildung'
};

function LikedJobs() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [removingJob, setRemovingJob] = useState(null);

  useEffect(() => {
    loadLikedJobs();
  }, []);

  const loadLikedJobs = async () => {
    try {
      const response = await jobsAPI.getLikedJobs();
      // API gibt {jobs: [...], total: ...} zurück
      setJobs(response.data.jobs || []);
    } catch (error) {
      toast.error('Fehler beim Laden der gemerkten Stellen');
    } finally {
      setLoading(false);
    }
  };

  const handleUnlike = async (e, jobId) => {
    e.preventDefault();
    e.stopPropagation();
    
    setRemovingJob(jobId);
    try {
      await jobsAPI.likeJob(jobId); // Toggle - entfernt den Like
      setJobs(prev => prev.filter(j => j.id !== jobId));
      toast.success('Stelle entfernt');
    } catch (error) {
      toast.error('Fehler beim Entfernen');
    } finally {
      setRemovingJob(null);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return null;
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
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <Heart className="h-8 w-8 text-red-500 fill-red-500" />
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gemerkte Stellen</h1>
          <p className="text-gray-600">Ihre gespeicherten Stellenangebote</p>
        </div>
      </div>

      {jobs.length === 0 ? (
        <div className="card py-12 text-center">
          <Heart className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-700 mb-2">Keine gemerkten Stellen</h2>
          <p className="text-gray-500 mb-6">
            Sie haben noch keine Stellen gemerkt. Klicken Sie auf das Herz-Symbol bei einer Stelle, um sie zu speichern.
          </p>
          <Link to="/jobs" className="btn-primary">
            Stellen durchsuchen
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-gray-600 mb-4">
            <span className="font-semibold text-gray-900">{jobs.length}</span> gemerkte Stelle{jobs.length !== 1 ? 'n' : ''}
          </p>
          
          {jobs.map((job) => (
            <Link
              key={job.id}
              to={`/jobs/${job.slug ? `${job.slug}-${job.id}` : job.id}`}
              className="card block hover:shadow-xl hover:border-primary-200 border-2 border-transparent transition-all group"
            >
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2 flex-wrap">
                    <h2 className="text-xl font-bold text-gray-900 group-hover:text-primary-600 transition-colors">
                      {job.title}
                    </h2>
                    {job.position_type && (
                      <span className={`px-3 py-1 rounded-full text-sm font-semibold border ${positionTypeColors[job.position_type]}`}>
                        {positionTypeLabels[job.position_type]}
                      </span>
                    )}
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-4 text-gray-600 mb-3">
                    <span className="flex items-center gap-1.5">
                      <Building2 className="h-4 w-4 text-gray-400" />
                      <span className="font-medium">{job.company_name || 'Unbekannt'}</span>
                    </span>
                    {job.location && (
                      <span className="flex items-center gap-1.5">
                        <MapPin className="h-4 w-4 text-gray-400" />
                        {job.location}
                      </span>
                    )}
                    {job.start_date && (
                      <span className="flex items-center gap-1.5">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        Ab {formatDate(job.start_date)}
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  {(job.salary_min || job.salary_max) && (
                    <div className="text-right">
                      <p className="text-lg font-bold text-primary-600">
                        {job.salary_min && job.salary_max ? (
                          <>{job.salary_min.toLocaleString('de-DE')}€ - {job.salary_max.toLocaleString('de-DE')}€</>
                        ) : (
                          <>{(job.salary_min || job.salary_max).toLocaleString('de-DE')}€</>
                        )}
                      </p>
                      <p className="text-xs text-gray-500">
                        /{job.salary_type === 'hourly' ? 'Stunde' : job.salary_type === 'monthly' ? 'Monat' : 'Jahr'}
                      </p>
                    </div>
                  )}
                  
                  <button
                    onClick={(e) => handleUnlike(e, job.id)}
                    disabled={removingJob === job.id}
                    className="p-2 rounded-full bg-red-100 text-red-600 hover:bg-red-200 transition-all"
                    title="Aus Merkliste entfernen"
                  >
                    {removingJob === job.id ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <Trash2 className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default LikedJobs;
