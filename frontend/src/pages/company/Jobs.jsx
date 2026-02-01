import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { jobsAPI } from '../../lib/api';
import toast from 'react-hot-toast';
import { Briefcase, Plus, MapPin, Calendar, Edit, Trash2, Eye, EyeOff, Clock, Archive, RotateCcw, AlertTriangle } from 'lucide-react';

const positionTypeLabels = {
  studentenferienjob: 'Studentenferienjob',
  saisonjob: 'Saisonjob',
  workandholiday: 'Work & Holiday',
  fachkraft: 'Fachkräfte',
  ausbildung: 'Ausbildung'
};

const positionTypeColors = {
  studentenferienjob: 'bg-blue-100 text-blue-800',
  saisonjob: 'bg-green-100 text-green-800',
  workandholiday: 'bg-teal-100 text-teal-800',
  fachkraft: 'bg-purple-100 text-purple-800',
  ausbildung: 'bg-orange-100 text-orange-800'
};

// Berechnet verbleibende Tage bis zur Deadline
const getDaysRemaining = (deadline) => {
  if (!deadline) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const deadlineDate = new Date(deadline);
  deadlineDate.setHours(0, 0, 0, 0);
  const diffTime = deadlineDate - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};

// Deadline-Badge Komponente
const DeadlineBadge = ({ deadline }) => {
  const daysRemaining = getDaysRemaining(deadline);
  
  if (daysRemaining === null) return null;
  
  if (daysRemaining < 0) {
    return (
      <span className="flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">
        <AlertTriangle className="h-3 w-3" />
        Abgelaufen
      </span>
    );
  }
  
  if (daysRemaining === 0) {
    return (
      <span className="flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium animate-pulse">
        <Clock className="h-3 w-3" />
        Läuft heute ab!
      </span>
    );
  }
  
  if (daysRemaining <= 3) {
    return (
      <span className="flex items-center gap-1 px-2 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-medium">
        <Clock className="h-3 w-3" />
        Noch {daysRemaining} {daysRemaining === 1 ? 'Tag' : 'Tage'}
      </span>
    );
  }
  
  if (daysRemaining <= 7) {
    return (
      <span className="flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">
        <Clock className="h-3 w-3" />
        Noch {daysRemaining} Tage
      </span>
    );
  }
  
  return (
    <span className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
      <Clock className="h-3 w-3" />
      Noch {daysRemaining} Tage
    </span>
  );
};

function CompanyJobs() {
  const [jobs, setJobs] = useState([]);
  const [archivedJobs, setArchivedJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('active'); // 'active' oder 'archived'

  useEffect(() => {
    loadJobs();
    loadArchivedJobs();
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

  const loadArchivedJobs = async () => {
    try {
      const response = await jobsAPI.getArchivedJobs();
      setArchivedJobs(response.data);
    } catch (error) {
      // Stille Fehler - Archiv ist optional
      console.log('Keine archivierten Stellen oder Feature nicht verfügbar');
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

  const handleArchive = async (id) => {
    if (!confirm('Möchten Sie diese Stelle archivieren? Sie können sie innerhalb von 30 Tagen reaktivieren.')) return;
    
    try {
      await jobsAPI.delete(id); // Backend archiviert standardmäßig
      toast.success('Stelle archiviert');
      loadJobs();
      loadArchivedJobs();
    } catch (error) {
      toast.error('Fehler beim Archivieren');
    }
  };

  const handlePermanentDelete = async (id) => {
    if (!confirm('Möchten Sie diese Stelle ENDGÜLTIG löschen? Diese Aktion kann nicht rückgängig gemacht werden!')) return;
    
    try {
      await jobsAPI.deletePermanent(id);
      toast.success('Stelle endgültig gelöscht');
      loadArchivedJobs();
    } catch (error) {
      toast.error('Fehler beim Löschen');
    }
  };

  const handleReactivate = async (id) => {
    try {
      await jobsAPI.reactivate(id);
      toast.success('Stelle reaktiviert! Die neue Deadline ist in 30 Tagen.');
      loadJobs();
      loadArchivedJobs();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Fehler beim Reaktivieren');
    }
  };

  // Berechnet verbleibende Tage bis zur endgültigen Löschung
  const getDaysUntilDeletion = (archivedAt) => {
    if (!archivedAt) return null;
    const archived = new Date(archivedAt);
    const deleteDate = new Date(archived.getTime() + 30 * 24 * 60 * 60 * 1000);
    const today = new Date();
    const diffDays = Math.ceil((deleteDate - today) / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  };

  const formatDate = (dateString) => {
    if (!dateString) return null;
    return new Date(dateString).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
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
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Briefcase className="h-8 w-8 text-primary-600" />
          <h1 className="text-3xl font-bold text-gray-900">Meine Stellenangebote</h1>
        </div>
        <Link to="/company/jobs/new" className="btn-primary flex items-center gap-2">
          <Plus className="h-5 w-5" />
          Neue Stelle
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('active')}
          className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
            activeTab === 'active'
              ? 'border-primary-600 text-primary-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <span className="flex items-center gap-2">
            <Briefcase className="h-4 w-4" />
            Aktive Stellen ({jobs.length})
          </span>
        </button>
        <button
          onClick={() => setActiveTab('archived')}
          className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
            activeTab === 'archived'
              ? 'border-primary-600 text-primary-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <span className="flex items-center gap-2">
            <Archive className="h-4 w-4" />
            Archiv ({archivedJobs.length})
          </span>
        </button>
      </div>

      {/* Aktive Stellen Tab */}
      {activeTab === 'active' && (
        <>
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
                      <div className="flex items-center gap-3 mb-2 flex-wrap">
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
                        {/* Deadline-Badge */}
                        {job.deadline && <DeadlineBadge deadline={job.deadline} />}
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-4 text-gray-600 text-sm">
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
                        {job.deadline && (
                          <span className="flex items-center gap-1 text-gray-500">
                            <Clock className="h-4 w-4" />
                            Deadline: {formatDate(job.deadline)}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        onClick={() => toggleActive(job)}
                        className="btn-secondary text-sm flex items-center gap-1"
                        title={job.is_active ? 'Deaktivieren' : 'Aktivieren'}
                      >
                        {job.is_active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        <span className="hidden sm:inline">{job.is_active ? 'Deaktivieren' : 'Aktivieren'}</span>
                      </button>
                      <Link 
                        to={`/company/jobs/${job.id}/edit`}
                        className="btn-primary text-sm flex items-center gap-1"
                      >
                        <Edit className="h-4 w-4" />
                        <span className="hidden sm:inline">Bearbeiten</span>
                      </Link>
                      <button
                        onClick={() => handleArchive(job.id)}
                        className="btn-danger text-sm flex items-center gap-1"
                        title="Archivieren"
                      >
                        <Archive className="h-4 w-4" />
                        <span className="hidden sm:inline">Archivieren</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Archivierte Stellen Tab */}
      {activeTab === 'archived' && (
        <>
          {archivedJobs.length === 0 ? (
            <div className="card text-center py-12">
              <Archive className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Kein Archiv</h2>
              <p className="text-gray-600">
                Archivierte oder abgelaufene Stellen werden hier für 30 Tage aufbewahrt.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-4">
                <p className="text-yellow-800 text-sm flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 flex-shrink-0" />
                  Archivierte Stellen werden nach 30 Tagen automatisch endgültig gelöscht. 
                  Bearbeiten und reaktivieren Sie Stellen rechtzeitig!
                </p>
              </div>
              
              {archivedJobs.map((job) => {
                const daysUntilDeletion = getDaysUntilDeletion(job.archived_at);
                
                return (
                  <div key={job.id} className="card border-l-4 border-l-gray-400 bg-gray-50">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2 flex-wrap">
                          <span className="text-xl font-semibold text-gray-700">
                            {job.title}
                          </span>
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${positionTypeColors[job.position_type]} opacity-60`}>
                            {positionTypeLabels[job.position_type]}
                          </span>
                          <span className="px-3 py-1 rounded-full text-sm font-medium bg-gray-200 text-gray-600">
                            Archiviert
                          </span>
                          {daysUntilDeletion !== null && (
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              daysUntilDeletion <= 7 ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'
                            }`}>
                              Wird in {daysUntilDeletion} {daysUntilDeletion === 1 ? 'Tag' : 'Tagen'} gelöscht
                            </span>
                          )}
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-4 text-gray-500 text-sm">
                          {job.location && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-4 w-4" />
                              {job.location}
                            </span>
                          )}
                          {job.archived_at && (
                            <span className="flex items-center gap-1">
                              <Archive className="h-4 w-4" />
                              Archiviert: {formatDate(job.archived_at)}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        <Link 
                          to={`/company/jobs/${job.id}/edit`}
                          className="btn-secondary text-sm flex items-center gap-1"
                        >
                          <Edit className="h-4 w-4" />
                          Bearbeiten
                        </Link>
                        <button
                          onClick={() => handleReactivate(job.id)}
                          className="btn-primary text-sm flex items-center gap-1"
                        >
                          <RotateCcw className="h-4 w-4" />
                          Reaktivieren
                        </button>
                        <button
                          onClick={() => handlePermanentDelete(job.id)}
                          className="btn-danger text-sm flex items-center gap-1"
                          title="Endgültig löschen"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default CompanyJobs;
