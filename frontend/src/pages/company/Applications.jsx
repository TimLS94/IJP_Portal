import { useState, useEffect, useMemo } from 'react';
import { applicationsAPI } from '../../lib/api';
import toast from 'react-hot-toast';
import { 
  Users, User, Briefcase, Calendar, MessageSquare, Check, X, 
  Eye, Mail, Phone, MapPin, FileText, Download, GraduationCap,
  Globe, Loader2, ChevronDown, ChevronUp, Search, Filter, 
  ArrowUpDown, SlidersHorizontal, LayoutGrid, List
} from 'lucide-react';

const statusOptions = [
  { value: 'pending', label: 'Eingereicht', color: 'bg-yellow-100 text-yellow-800', dotColor: 'bg-yellow-500' },
  { value: 'company_review', label: 'In Prüfung', color: 'bg-blue-100 text-blue-800', dotColor: 'bg-blue-500' },
  { value: 'interview_scheduled', label: 'Vorstellungsgespräch', color: 'bg-purple-100 text-purple-800', dotColor: 'bg-purple-500' },
  { value: 'accepted', label: 'Angenommen', color: 'bg-green-100 text-green-800', dotColor: 'bg-green-500' },
  { value: 'rejected', label: 'Abgelehnt', color: 'bg-red-100 text-red-800', dotColor: 'bg-red-500' }
];

const positionTypeLabels = {
  studentenferienjob: 'Studentenferienjob',
  saisonjob: 'Saisonjob (8 Monate)',
  fachkraft: 'Fachkraft',
  ausbildung: 'Ausbildung'
};

function CompanyApplications() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filter & Sortierung
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [jobFilter, setJobFilter] = useState('all');
  const [sortBy, setSortBy] = useState('applied_at');
  const [sortOrder, setSortOrder] = useState('desc');
  const [viewMode, setViewMode] = useState('table'); // 'table' oder 'cards'
  
  // Detail Modal
  const [selectedApp, setSelectedApp] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [applicantDetails, setApplicantDetails] = useState(null);

  useEffect(() => {
    loadApplications();
  }, []);

  const loadApplications = async () => {
    try {
      const response = await applicationsAPI.getCompanyApplications();
      setApplications(response.data);
    } catch (error) {
      toast.error('Fehler beim Laden der Bewerbungen');
    } finally {
      setLoading(false);
    }
  };

  // Alle einzigartigen Jobs für Filter
  const uniqueJobs = useMemo(() => {
    const jobs = [...new Map(applications.map(a => [a.job_id, { id: a.job_id, title: a.job_title }])).values()];
    return jobs;
  }, [applications]);

  // Gefilterte und sortierte Bewerbungen
  const filteredApplications = useMemo(() => {
    let filtered = [...applications];

    // Suchfilter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(a => 
        a.applicant_name?.toLowerCase().includes(term) ||
        a.job_title?.toLowerCase().includes(term)
      );
    }

    // Statusfilter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(a => a.status === statusFilter);
    }

    // Jobfilter
    if (jobFilter !== 'all') {
      filtered = filtered.filter(a => a.job_id === parseInt(jobFilter));
    }

    // Sortierung
    filtered.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'applicant_name':
          comparison = (a.applicant_name || '').localeCompare(b.applicant_name || '');
          break;
        case 'job_title':
          comparison = (a.job_title || '').localeCompare(b.job_title || '');
          break;
        case 'status':
          const statusOrder = statusOptions.map(s => s.value);
          comparison = statusOrder.indexOf(a.status) - statusOrder.indexOf(b.status);
          break;
        case 'applied_at':
        default:
          comparison = new Date(a.applied_at) - new Date(b.applied_at);
          break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [applications, searchTerm, statusFilter, jobFilter, sortBy, sortOrder]);

  const loadApplicantDetails = async (appId) => {
    setSelectedApp(appId);
    setDetailsLoading(true);
    try {
      const response = await applicationsAPI.getApplicantDetails(appId);
      setApplicantDetails(response.data);
    } catch (error) {
      toast.error('Fehler beim Laden der Details');
      setSelectedApp(null);
    } finally {
      setDetailsLoading(false);
    }
  };

  const updateStatus = async (id, status) => {
    try {
      await applicationsAPI.update(id, { status });
      toast.success('Status aktualisiert');
      loadApplications();
      if (applicantDetails) {
        loadApplicantDetails(id);
      }
    } catch (error) {
      toast.error('Fehler beim Aktualisieren');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const handleSort = (column) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('desc');
    }
  };

  const SortIcon = ({ column }) => {
    if (sortBy !== column) return <ArrowUpDown className="h-4 w-4 text-gray-400" />;
    return sortOrder === 'asc' 
      ? <ChevronUp className="h-4 w-4 text-primary-600" />
      : <ChevronDown className="h-4 w-4 text-primary-600" />;
  };

  // Status Badge Komponente
  const StatusBadge = ({ status }) => {
    const statusInfo = statusOptions.find(s => s.value === status);
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${statusInfo?.color || 'bg-gray-100 text-gray-800'}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${statusInfo?.dotColor || 'bg-gray-500'}`}></span>
        {statusInfo?.label || status}
      </span>
    );
  };

  // Status Dropdown inline
  const StatusDropdown = ({ app }) => {
    return (
      <select
        value={app.status}
        onChange={(e) => updateStatus(app.id, e.target.value)}
        className="text-xs border rounded-lg px-2 py-1 bg-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
        onClick={(e) => e.stopPropagation()}
      >
        {statusOptions.map((status) => (
          <option key={status.value} value={status.value}>
            {status.label}
          </option>
        ))}
      </select>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-12 w-12 text-primary-600 animate-spin" />
      </div>
    );
  }

  // Statistiken
  const stats = {
    total: applications.length,
    pending: applications.filter(a => a.status === 'pending').length,
    inReview: applications.filter(a => a.status === 'company_review').length,
    interview: applications.filter(a => a.status === 'interview_scheduled').length,
    accepted: applications.filter(a => a.status === 'accepted').length,
    rejected: applications.filter(a => a.status === 'rejected').length,
  };

  return (
    <div className="space-y-6">
      {/* Header mit Statistiken */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Users className="h-8 w-8 text-primary-600" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Bewerbungen</h1>
            <p className="text-gray-600">{stats.total} Bewerbungen insgesamt</p>
          </div>
        </div>
        
        {/* Mini-Stats */}
        <div className="flex flex-wrap gap-2">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-1.5 text-sm">
            <span className="font-bold text-yellow-700">{stats.pending}</span>
            <span className="text-yellow-600 ml-1">Neu</span>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-1.5 text-sm">
            <span className="font-bold text-blue-700">{stats.inReview}</span>
            <span className="text-blue-600 ml-1">In Prüfung</span>
          </div>
          <div className="bg-purple-50 border border-purple-200 rounded-lg px-3 py-1.5 text-sm">
            <span className="font-bold text-purple-700">{stats.interview}</span>
            <span className="text-purple-600 ml-1">Interview</span>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-1.5 text-sm">
            <span className="font-bold text-green-700">{stats.accepted}</span>
            <span className="text-green-600 ml-1">Angenommen</span>
          </div>
        </div>
      </div>

      {/* Filter-Bereich */}
      <div className="card">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Suche */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Bewerber oder Stelle suchen..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-styled pl-10 w-full"
            />
          </div>

          {/* Status Filter */}
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input-styled pr-10 appearance-none min-w-[160px]"
            >
              <option value="all">Alle Status</option>
              {statusOptions.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
            <Filter className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          </div>

          {/* Job Filter */}
          <div className="relative">
            <select
              value={jobFilter}
              onChange={(e) => setJobFilter(e.target.value)}
              className="input-styled pr-10 appearance-none min-w-[180px]"
            >
              <option value="all">Alle Stellen</option>
              {uniqueJobs.map((job) => (
                <option key={job.id} value={job.id}>
                  {job.title}
                </option>
              ))}
            </select>
            <Briefcase className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          </div>

          {/* Ansicht umschalten */}
          <div className="flex border rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-2 ${viewMode === 'table' ? 'bg-primary-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
            >
              <List className="h-5 w-5" />
            </button>
            <button
              onClick={() => setViewMode('cards')}
              className={`px-3 py-2 ${viewMode === 'cards' ? 'bg-primary-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
            >
              <LayoutGrid className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Aktive Filter anzeigen */}
        {(searchTerm || statusFilter !== 'all' || jobFilter !== 'all') && (
          <div className="flex flex-wrap items-center gap-2 mt-4 pt-4 border-t">
            <span className="text-sm text-gray-500">Filter:</span>
            {searchTerm && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 rounded-lg text-sm">
                Suche: "{searchTerm}"
                <button onClick={() => setSearchTerm('')} className="hover:text-red-600">
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            {statusFilter !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 rounded-lg text-sm">
                Status: {statusOptions.find(s => s.value === statusFilter)?.label}
                <button onClick={() => setStatusFilter('all')} className="hover:text-red-600">
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            {jobFilter !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 rounded-lg text-sm">
                Stelle: {uniqueJobs.find(j => j.id === parseInt(jobFilter))?.title}
                <button onClick={() => setJobFilter('all')} className="hover:text-red-600">
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            <button
              onClick={() => { setSearchTerm(''); setStatusFilter('all'); setJobFilter('all'); }}
              className="text-sm text-primary-600 hover:text-primary-700 font-medium"
            >
              Alle zurücksetzen
            </button>
          </div>
        )}
      </div>

      {/* Ergebnisse */}
      {filteredApplications.length === 0 ? (
        <div className="card text-center py-12">
          <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Keine Bewerbungen gefunden</h2>
          <p className="text-gray-600">
            {applications.length === 0 
              ? 'Sie haben noch keine Bewerbungen erhalten.'
              : 'Keine Bewerbungen entsprechen Ihren Filterkriterien.'}
          </p>
        </div>
      ) : viewMode === 'table' ? (
        /* Tabellarische Ansicht */
        <div className="card overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3">
                    <button 
                      onClick={() => handleSort('applicant_name')}
                      className="flex items-center gap-1 font-semibold text-gray-700 hover:text-primary-600"
                    >
                      Bewerber <SortIcon column="applicant_name" />
                    </button>
                  </th>
                  <th className="text-left px-4 py-3">
                    <button 
                      onClick={() => handleSort('job_title')}
                      className="flex items-center gap-1 font-semibold text-gray-700 hover:text-primary-600"
                    >
                      Stelle <SortIcon column="job_title" />
                    </button>
                  </th>
                  <th className="text-left px-4 py-3">
                    <button 
                      onClick={() => handleSort('applied_at')}
                      className="flex items-center gap-1 font-semibold text-gray-700 hover:text-primary-600"
                    >
                      Datum <SortIcon column="applied_at" />
                    </button>
                  </th>
                  <th className="text-left px-4 py-3">
                    <button 
                      onClick={() => handleSort('status')}
                      className="flex items-center gap-1 font-semibold text-gray-700 hover:text-primary-600"
                    >
                      Status <SortIcon column="status" />
                    </button>
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">
                    Status ändern
                  </th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-700">
                    Aktionen
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredApplications.map((app) => (
                  <tr key={app.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="bg-primary-100 p-2 rounded-full">
                          <User className="h-4 w-4 text-primary-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{app.applicant_name || 'Unbekannt'}</p>
                          {app.applicant_message && (
                            <p className="text-xs text-gray-500 truncate max-w-[200px]" title={app.applicant_message}>
                              <MessageSquare className="h-3 w-3 inline mr-1" />
                              {app.applicant_message}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-gray-900">{app.job_title}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-sm">
                      {formatDate(app.applied_at)}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={app.status} />
                    </td>
                    <td className="px-4 py-3">
                      <StatusDropdown app={app} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => loadApplicantDetails(app.id)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors"
                      >
                        <Eye className="h-4 w-4" />
                        Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Tabellen-Footer */}
          <div className="bg-gray-50 px-4 py-3 border-t text-sm text-gray-600">
            Zeige {filteredApplications.length} von {applications.length} Bewerbungen
          </div>
        </div>
      ) : (
        /* Karten-Ansicht */
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredApplications.map((app) => (
            <div key={app.id} className="card hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="bg-primary-100 p-2 rounded-full">
                    <User className="h-5 w-5 text-primary-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{app.applicant_name || 'Unbekannt'}</h3>
                    <p className="text-sm text-gray-500">{app.job_title}</p>
                  </div>
                </div>
                <StatusBadge status={app.status} />
              </div>

              <div className="text-sm text-gray-600 mb-3">
                <Calendar className="h-4 w-4 inline mr-1" />
                Beworben am {formatDate(app.applied_at)}
              </div>

              {app.applicant_message && (
                <div className="bg-gray-50 rounded-lg p-2 mb-3 text-sm text-gray-600">
                  <MessageSquare className="h-3 w-3 inline mr-1" />
                  <span className="line-clamp-2">{app.applicant_message}</span>
                </div>
              )}

              <div className="flex items-center gap-2 pt-3 border-t">
                <StatusDropdown app={app} />
                <button
                  onClick={() => loadApplicantDetails(app.id)}
                  className="flex-1 btn-primary text-sm py-2 flex items-center justify-center gap-1"
                >
                  <Eye className="h-4 w-4" />
                  Details
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail Modal */}
      {selectedApp && (
        <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl my-8 relative">
            {/* Schließen-Button immer sichtbar */}
            <button 
              onClick={() => { setSelectedApp(null); setApplicantDetails(null); }}
              className="absolute top-4 right-4 p-2 hover:bg-gray-200 rounded-lg z-10 bg-gray-100 shadow-sm"
            >
              <X className="h-6 w-6 text-gray-700" />
            </button>
            
            {detailsLoading ? (
              <div className="p-12 flex justify-center">
                <Loader2 className="h-12 w-12 text-primary-600 animate-spin" />
              </div>
            ) : applicantDetails ? (
              <>
                {/* Header */}
                <div className="p-6 border-b bg-primary-50 pr-16">
                  <h2 className="text-2xl font-bold text-gray-900">
                    {applicantDetails.applicant.first_name} {applicantDetails.applicant.last_name}
                  </h2>
                  <p className="text-gray-600">{applicantDetails.job.title}</p>
                </div>

                <div className="p-6 grid md:grid-cols-2 gap-6">
                  {/* Kontaktdaten */}
                  <div className="bg-gray-50 rounded-xl p-5">
                    <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <User className="h-5 w-5 text-primary-600" />
                      Kontaktdaten
                    </h3>
                    <div className="space-y-3">
                      <a 
                        href={`mailto:${applicantDetails.applicant.email}`}
                        className="flex items-center gap-3 p-3 bg-white rounded-lg hover:bg-primary-50 transition-colors"
                      >
                        <Mail className="h-5 w-5 text-primary-600" />
                        <div>
                          <p className="text-xs text-gray-500">E-Mail</p>
                          <p className="font-medium text-primary-600">{applicantDetails.applicant.email}</p>
                        </div>
                      </a>
                      <a 
                        href={`tel:${applicantDetails.applicant.phone}`}
                        className="flex items-center gap-3 p-3 bg-white rounded-lg hover:bg-primary-50 transition-colors"
                      >
                        <Phone className="h-5 w-5 text-primary-600" />
                        <div>
                          <p className="text-xs text-gray-500">Telefon</p>
                          <p className="font-medium text-primary-600">{applicantDetails.applicant.phone || '-'}</p>
                        </div>
                      </a>
                      <div className="flex items-center gap-3 p-3 bg-white rounded-lg">
                        <MapPin className="h-5 w-5 text-gray-500" />
                        <div>
                          <p className="text-xs text-gray-500">Adresse</p>
                          <p className="font-medium">
                            {applicantDetails.applicant.address.street} {applicantDetails.applicant.address.house_number}<br />
                            {applicantDetails.applicant.address.postal_code} {applicantDetails.applicant.address.city}<br />
                            {applicantDetails.applicant.address.country}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Persönliche Daten */}
                  <div className="bg-gray-50 rounded-xl p-5">
                    <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <GraduationCap className="h-5 w-5 text-primary-600" />
                      Profil
                    </h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between p-2 bg-white rounded">
                        <span className="text-gray-500">Geburtsdatum</span>
                        <span className="font-medium">{formatDate(applicantDetails.applicant.date_of_birth)}</span>
                      </div>
                      <div className="flex justify-between p-2 bg-white rounded">
                        <span className="text-gray-500">Nationalität</span>
                        <span className="font-medium">{applicantDetails.applicant.nationality || '-'}</span>
                      </div>
                      <div className="flex justify-between p-2 bg-white rounded">
                        <span className="text-gray-500">Stellenart</span>
                        <span className="font-medium">{positionTypeLabels[applicantDetails.applicant.position_type] || '-'}</span>
                      </div>
                      <div className="flex justify-between p-2 bg-white rounded">
                        <span className="text-gray-500">Deutsch</span>
                        <span className="font-medium">{applicantDetails.applicant.german_level || '-'}</span>
                      </div>
                      <div className="flex justify-between p-2 bg-white rounded">
                        <span className="text-gray-500">Englisch</span>
                        <span className="font-medium">{applicantDetails.applicant.english_level || '-'}</span>
                      </div>
                      <div className="flex justify-between p-2 bg-white rounded">
                        <span className="text-gray-500">Berufserfahrung</span>
                        <span className="font-medium">{applicantDetails.applicant.work_experience_years || 0} Jahre</span>
                      </div>
                      {applicantDetails.applicant.university_name && (
                        <div className="flex justify-between p-2 bg-white rounded">
                          <span className="text-gray-500">Universität</span>
                          <span className="font-medium">{applicantDetails.applicant.university_name}</span>
                        </div>
                      )}
                      {applicantDetails.applicant.field_of_study && (
                        <div className="flex justify-between p-2 bg-white rounded">
                          <span className="text-gray-500">Studiengang</span>
                          <span className="font-medium">{applicantDetails.applicant.field_of_study}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Dokumente */}
                  <div className="md:col-span-2 bg-gray-50 rounded-xl p-5">
                    <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <FileText className="h-5 w-5 text-primary-600" />
                      Dokumente ({applicantDetails.documents.length})
                    </h3>
                    {applicantDetails.documents.length === 0 ? (
                      <p className="text-gray-500">Keine Dokumente hochgeladen</p>
                    ) : (
                      <div className="grid md:grid-cols-2 gap-3">
                        {applicantDetails.documents.map((doc) => (
                          <a
                            key={doc.id}
                            href={`/uploads/${doc.file_path.split('/').pop()}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-between p-3 bg-white rounded-lg hover:bg-primary-50 transition-colors group"
                          >
                            <div className="flex items-center gap-3">
                              <FileText className="h-5 w-5 text-gray-400 group-hover:text-primary-600" />
                              <div>
                                <p className="font-medium text-gray-900 group-hover:text-primary-600">{doc.original_name}</p>
                                <p className="text-xs text-gray-500">{doc.document_type}</p>
                              </div>
                            </div>
                            <Download className="h-4 w-4 text-gray-400 group-hover:text-primary-600" />
                          </a>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Status ändern */}
                  <div className="md:col-span-2 bg-primary-50 rounded-xl p-5 border-2 border-primary-200">
                    <h3 className="font-bold text-gray-900 mb-4">Bewerbungsstatus ändern</h3>
                    <div className="flex flex-wrap gap-3">
                      {statusOptions.map((status) => (
                        <button
                          key={status.value}
                          onClick={() => updateStatus(selectedApp, status.value)}
                          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                            applicantDetails.application.status === status.value
                              ? 'ring-2 ring-primary-500 ' + status.color
                              : 'bg-white hover:bg-gray-50 text-gray-700'
                          }`}
                        >
                          {status.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}

export default CompanyApplications;
