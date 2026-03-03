import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { jobsAPI } from '../../lib/api';
import toast from 'react-hot-toast';
import { Briefcase, Plus, MapPin, Calendar, Edit, Trash2, Eye, EyeOff, Clock, Archive, RotateCcw, AlertTriangle, FileText, Search, X, LayoutGrid, List, Languages, ArrowDown, ArrowUp, ArrowUpDown, Lock, Unlock } from 'lucide-react';

const positionTypeLabels = {
  studentenferienjob: 'Studentenferienjob',
  saisonjob: 'Saisonjob',
  workandholiday: 'Saisonjob',  // Legacy: wird als Saisonjob angezeigt
  fachkraft: 'Fachkräfte',
  ausbildung: 'Ausbildung'
};

const positionTypeColors = {
  studentenferienjob: 'bg-blue-100 text-blue-800 border-blue-200',
  saisonjob: 'bg-orange-100 text-orange-800 border-orange-200',
  workandholiday: 'bg-orange-100 text-orange-800 border-orange-200',  // Legacy: gleiche Farbe wie Saisonjob
  fachkraft: 'bg-purple-100 text-purple-800 border-purple-200',
  ausbildung: 'bg-green-100 text-green-800 border-green-200'
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
  const [searchParams, setSearchParams] = useSearchParams();
  const [jobs, setJobs] = useState([]);
  const [archivedJobs, setArchivedJobs] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'active'); // 'active', 'archived', 'templates'
  const [viewMode, setViewMode] = useState('cards'); // 'cards' oder 'table'
  const [filterStatus, setFilterStatus] = useState('all'); // 'all', 'active', 'inactive', 'draft'
  const [sortBy, setSortBy] = useState('created_desc'); // 'created_desc', 'created_asc', 'deadline', 'views'
  const [searchQuery, setSearchQuery] = useState('');
  const [deletingTemplate, setDeletingTemplate] = useState(null);
  const [archiveDeletionDays, setArchiveDeletionDays] = useState(90);

  useEffect(() => {
    loadJobs();
    loadArchivedJobs();
    loadTemplates();
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const response = await jobsAPI.getJobSettings();
      if (response.data?.archive_deletion_days) {
        setArchiveDeletionDays(response.data.archive_deletion_days);
      }
    } catch (error) {
      // Fallback auf 90 Tage
    }
  };

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
      console.log('Keine archivierten Stellen oder Feature nicht verfügbar');
    }
  };

  const loadTemplates = async () => {
    try {
      const response = await jobsAPI.getTemplates();
      setTemplates(response.data || []);
    } catch (error) {
      console.log('Templates nicht verfügbar');
    }
  };

  const deleteTemplate = async (id) => {
    if (!confirm('Möchten Sie diese Vorlage wirklich löschen?')) return;
    setDeletingTemplate(id);
    try {
      await jobsAPI.deleteTemplate(id);
      toast.success('Vorlage gelöscht');
      loadTemplates();
    } catch (error) {
      toast.error('Fehler beim Löschen');
    } finally {
      setDeletingTemplate(null);
    }
  };

  const useTemplate = (template) => {
    sessionStorage.setItem('jobTemplate', JSON.stringify(template));
    window.location.href = '/company/jobs/new?fromTemplate=true';
  };

  // Gefilterte und sortierte Jobs
  const getFilteredJobs = () => {
    let filtered = [...jobs];
    
    // Suchfilter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(j => 
        j.title?.toLowerCase().includes(query) ||
        j.location?.toLowerCase().includes(query)
      );
    }
    
    // Statusfilter
    if (filterStatus === 'active') filtered = filtered.filter(j => j.is_active && !j.is_draft);
    else if (filterStatus === 'inactive') filtered = filtered.filter(j => !j.is_active && !j.is_draft);
    else if (filterStatus === 'draft') filtered = filtered.filter(j => j.is_draft);
    
    // Sortierung
    if (sortBy === 'created_desc') filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    else if (sortBy === 'created_asc') filtered.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    else if (sortBy === 'deadline') filtered.sort((a, b) => {
      if (!a.deadline) return 1;
      if (!b.deadline) return -1;
      return new Date(a.deadline) - new Date(b.deadline);
    });
    else if (sortBy === 'views') filtered.sort((a, b) => (b.view_count || 0) - (a.view_count || 0));
    
    return filtered;
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
    if (!confirm(`Möchten Sie diese Stelle archivieren? Sie können sie innerhalb von ${archiveDeletionDays} Tagen reaktivieren.`)) return;
    
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

  const toggleKeepArchived = async (job) => {
    try {
      await jobsAPI.setKeepArchived(job.id, !job.keep_archived);
      toast.success(job.keep_archived ? 'Automatisches Löschen aktiviert' : 'Stelle wird dauerhaft aufbewahrt');
      loadArchivedJobs();
    } catch (error) {
      toast.error('Fehler beim Aktualisieren');
    }
  };

  const handleReactivate = async (id) => {
    try {
      await jobsAPI.reactivate(id);
      toast.success(`Stelle reaktiviert! Die neue Deadline ist in ${archiveDeletionDays} Tagen.`);
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
    const deleteDate = new Date(archived.getTime() + archiveDeletionDays * 24 * 60 * 60 * 1000);
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
            Stellen ({jobs.length})
          </span>
        </button>
        <button
          onClick={() => setActiveTab('templates')}
          className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
            activeTab === 'templates'
              ? 'border-primary-600 text-primary-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <span className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Vorlagen ({templates.length})
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

      {/* Filter & Ansicht (nur für Stellen-Tab) */}
      {activeTab === 'active' && jobs.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          {/* Suche */}
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Suchen..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-styled pl-9 py-2 text-sm"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                <X className="h-4 w-4 text-gray-400 hover:text-gray-600" />
              </button>
            )}
          </div>
          
          {/* Status-Filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="input-styled py-2 text-sm w-auto"
          >
            <option value="all">Alle Status</option>
            <option value="active">Aktiv</option>
            <option value="inactive">Inaktiv</option>
            <option value="draft">Entwürfe</option>
          </select>
          
          {/* Sortierung */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="input-styled py-2 text-sm w-auto"
          >
            <option value="created_desc">Neueste zuerst</option>
            <option value="created_asc">Älteste zuerst</option>
            <option value="deadline">Nach Deadline</option>
            <option value="views">Nach Aufrufen</option>
          </select>
          
          {/* Ansicht umschalten */}
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('cards')}
              className={`p-2 rounded ${viewMode === 'cards' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'}`}
              title="Kachelansicht"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-2 rounded ${viewMode === 'table' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'}`}
              title="Tabellenansicht"
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

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
            <>
              {/* Tabellenansicht */}
              {viewMode === 'table' && (
                <div className="card overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left">
                        <th className="pb-3 font-semibold">Titel</th>
                        <th className="pb-3 font-semibold">Status</th>
                        <th className="pb-3 font-semibold">Ort</th>
                        <th 
                          className="pb-3 font-semibold cursor-pointer hover:text-primary-600 select-none"
                          onClick={() => setSortBy(sortBy === 'created_desc' ? 'created_asc' : 'created_desc')}
                        >
                          <span className="flex items-center gap-1">
                            Erstellt
                            {sortBy === 'created_desc' ? <ArrowDown className="h-3 w-3" /> : sortBy === 'created_asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowUpDown className="h-3 w-3 text-gray-400" />}
                          </span>
                        </th>
                        <th 
                          className="pb-3 font-semibold cursor-pointer hover:text-primary-600 select-none"
                          onClick={() => setSortBy(sortBy === 'deadline' ? 'created_desc' : 'deadline')}
                        >
                          <span className="flex items-center gap-1">
                            Deadline
                            {sortBy === 'deadline' ? <ArrowUp className="h-3 w-3" /> : <ArrowUpDown className="h-3 w-3 text-gray-400" />}
                          </span>
                        </th>
                        <th 
                          className="pb-3 font-semibold text-right cursor-pointer hover:text-primary-600 select-none"
                          onClick={() => setSortBy(sortBy === 'views' ? 'created_desc' : 'views')}
                        >
                          <span className="flex items-center justify-end gap-1">
                            Aufrufe
                            {sortBy === 'views' ? <ArrowDown className="h-3 w-3" /> : <ArrowUpDown className="h-3 w-3 text-gray-400" />}
                          </span>
                        </th>
                        <th className="pb-3 font-semibold text-right">Aktionen</th>
                      </tr>
                    </thead>
                    <tbody>
                      {getFilteredJobs().map((job) => (
                        <tr key={job.id} className={`border-b last:border-0 hover:bg-gray-50 ${!job.is_active && !job.is_draft ? 'opacity-60' : ''}`}>
                          <td className="py-3 pr-4">
                            <Link to={`/jobs/${job.slug ? `${job.slug}-${job.id}` : job.id}`} className="font-medium text-gray-900 hover:text-primary-600">
                              {job.title}
                            </Link>
                            {job.is_draft && <span className="ml-2 text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded">Entwurf</span>}
                          </td>
                          <td className="py-3">
                            {job.is_draft ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">Entwurf</span>
                            ) : job.is_active ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">Aktiv</span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">Inaktiv</span>
                            )}
                          </td>
                          <td className="py-3 text-gray-600">{job.location || '-'}</td>
                          <td className="py-3 text-gray-600">{formatDate(job.created_at)}</td>
                          <td className="py-3">
                            {job.deadline ? (
                              <DeadlineBadge deadline={job.deadline} />
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="py-3 text-right font-medium text-indigo-600">{job.view_count || 0}</td>
                          <td className="py-3 text-right">
                            <div className="flex justify-end gap-0.5">
                              <Link 
                                to={`/company/jobs/${job.id}/edit`} 
                                className="p-2 text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors" 
                                title="Bearbeiten"
                              >
                                <Edit className="h-4 w-4" />
                              </Link>
                              <button 
                                onClick={() => toggleActive(job)} 
                                className={`p-2 rounded-lg transition-colors ${job.is_active ? 'text-gray-500 hover:text-orange-600 hover:bg-orange-50' : 'text-gray-500 hover:text-green-600 hover:bg-green-50'}`}
                                title={job.is_active ? 'Deaktivieren' : 'Aktivieren'}
                              >
                                {job.is_active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              </button>
                              <button 
                                onClick={() => handleArchive(job.id)} 
                                className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" 
                                title="Archivieren"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {getFilteredJobs().length === 0 && (
                    <p className="text-center text-gray-500 py-8">Keine Stellen gefunden</p>
                  )}
                </div>
              )}

              {/* Kachelansicht */}
              {viewMode === 'cards' && (
            <div className="space-y-4">
              {getFilteredJobs().map((job) => (
                <div key={job.id} className={`card ${!job.is_active ? 'opacity-60' : ''}`}>
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2 flex-wrap">
                        <Link 
                          to={`/jobs/${job.slug ? `${job.slug}-${job.id}` : job.id}`}
                          className="text-xl font-semibold text-gray-900 hover:text-primary-600"
                        >
                          {job.title}
                        </Link>
                        {/* Mehrere Jobarten-Badges */}
                        {(job.position_types && job.position_types.length > 0) ? (
                          job.position_types.map((type) => (
                            <span key={type} className={`px-3 py-1 rounded-full text-sm font-medium ${positionTypeColors[type] || 'bg-gray-100 text-gray-800'}`}>
                              {positionTypeLabels[type] || type}
                            </span>
                          ))
                        ) : (
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${positionTypeColors[job.position_type]}`}>
                          {positionTypeLabels[job.position_type]}
                        </span>
                        )}
                        {job.is_draft && (
                          <span className="px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-700 border border-yellow-200">
                            Entwurf
                          </span>
                        )}
                        {!job.is_active && !job.is_draft && (
                          <span className="px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-600">
                            Inaktiv
                          </span>
                        )}
                        {/* Admin-Übersetzung Badge */}
                        {job.admin_translated && (
                          <span className="flex items-center gap-1 px-2 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs font-medium" title={`Übersetzt in: ${job.admin_translated_languages?.join(', ')}`}>
                            <Languages className="h-3 w-3" />
                            Automatisch übersetzt
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
                        <span className="flex items-center gap-1 text-indigo-600 font-medium">
                          <Eye className="h-4 w-4" />
                          {job.view_count || 0} Aufrufe
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
              {getFilteredJobs().length === 0 && viewMode === 'cards' && (
                <p className="text-center text-gray-500 py-8">Keine Stellen gefunden</p>
              )}
            </>
          )}
        </>
      )}

      {/* Vorlagen Tab */}
      {activeTab === 'templates' && (
        <>
          {templates.length === 0 ? (
            <div className="card text-center py-12">
              <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Keine Vorlagen</h2>
              <p className="text-gray-600 mb-4">
                Erstellen Sie eine Stelle und speichern Sie diese als Vorlage, um sie später wiederzuverwenden.
              </p>
              <Link to="/company/jobs/new?saveAsTemplate=true" className="btn-primary inline-flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Vorlage erstellen
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
                <p className="text-blue-800 text-sm flex items-center gap-2">
                  <FileText className="h-5 w-5 flex-shrink-0" />
                  Vorlagen sind wiederverwendbare Stellenbeschreibungen. Klicken Sie auf "Verwenden", um eine neue Stelle basierend auf einer Vorlage zu erstellen.
                </p>
              </div>
              
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
                            {positionTypeLabels[template.position_type] || template.position_type}
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
                        disabled={deletingTemplate === template.id}
                        className="btn-danger text-sm flex items-center gap-1"
                      >
                        <Trash2 className="h-4 w-4" />
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
                Archivierte oder abgelaufene Stellen werden hier für {archiveDeletionDays} Tage aufbewahrt.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-4">
                <p className="text-yellow-800 text-sm flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 flex-shrink-0" />
                  Archivierte Stellen werden nach {archiveDeletionDays} Tagen automatisch endgültig gelöscht. 
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
                          {job.keep_archived ? (
                            <span className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                              <Lock className="h-3 w-3" />
                              Dauerhaft aufbewahrt
                            </span>
                          ) : daysUntilDeletion !== null && (
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
                          onClick={() => toggleKeepArchived(job)}
                          className={`text-sm flex items-center gap-1 px-3 py-1.5 rounded-lg border ${job.keep_archived ? 'bg-green-50 border-green-300 text-green-700 hover:bg-green-100' : 'bg-gray-50 border-gray-300 text-gray-700 hover:bg-gray-100'}`}
                          title={job.keep_archived ? 'Automatisches Löschen aktivieren' : 'Dauerhaft aufbewahren'}
                        >
                          {job.keep_archived ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                          <span className="hidden sm:inline">{job.keep_archived ? 'Freigeben' : 'Behalten'}</span>
                        </button>
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
