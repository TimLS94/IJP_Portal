import { useState, useEffect } from 'react';
import { adminAPI, applicationsAPI } from '../../lib/api';
import toast from 'react-hot-toast';
import { 
  FileText, User, Briefcase, Building2, Calendar, Search, Download,
  ChevronDown, Eye, Phone, Mail, MapPin, FileCheck, X, Loader2,
  GraduationCap, Globe, Clock, CheckCircle, AlertCircle, Filter
} from 'lucide-react';

const positionTypeLabels = {
  studentenferienjob: 'Studentenferienjob',
  saisonjob: 'Saisonjob (8 Monate)',
  fachkraft: 'Fachkraft',
  ausbildung: 'Ausbildung'
};

const statusColors = {
  yellow: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  blue: 'bg-blue-100 text-blue-800 border-blue-200',
  green: 'bg-green-100 text-green-800 border-green-200',
  red: 'bg-red-100 text-red-800 border-red-200',
  purple: 'bg-purple-100 text-purple-800 border-purple-200',
  indigo: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  orange: 'bg-orange-100 text-orange-800 border-orange-200',
  gray: 'bg-gray-100 text-gray-800 border-gray-200',
};

function AdminApplications() {
  const [applications, setApplications] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [positionTypeFilter, setPositionTypeFilter] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const limit = 50;

  // Status-Optionen vom Backend
  const [statusOptions, setStatusOptions] = useState([]);
  
  // Detail Modal
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [applicationDetails, setApplicationDetails] = useState(null);
  
  // Status ändern
  const [changingStatus, setChangingStatus] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [adminNotes, setAdminNotes] = useState('');

  useEffect(() => {
    loadStatusOptions();
  }, []);

  useEffect(() => {
    loadApplications();
  }, [statusFilter, positionTypeFilter, page]);

  const loadStatusOptions = async () => {
    try {
      const response = await applicationsAPI.getStatusOptions();
      setStatusOptions(response.data.statuses);
    } catch (error) {
      console.error('Fehler beim Laden der Status-Optionen');
    }
  };

  const loadApplications = async () => {
    setLoading(true);
    try {
      const params = {
        skip: page * limit,
        limit,
        ...(statusFilter && { status_filter: statusFilter }),
        ...(positionTypeFilter && { position_type: positionTypeFilter }),
        ...(search && { search })
      };
      const response = await adminAPI.listApplications(params);
      setApplications(response.data.applications);
      setTotal(response.data.total);
    } catch (error) {
      toast.error('Fehler beim Laden der Bewerbungen');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(0);
    loadApplications();
  };

  const loadApplicationDetails = async (appId) => {
    setDetailsLoading(true);
    setSelectedApplication(appId);
    try {
      const response = await adminAPI.getApplicationDetails(appId);
      setApplicationDetails(response.data);
      setNewStatus(response.data.application.status);
      setAdminNotes(response.data.application.admin_notes || '');
    } catch (error) {
      toast.error('Fehler beim Laden der Details');
      setSelectedApplication(null);
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleStatusChange = async () => {
    if (!newStatus) return;
    
    setChangingStatus(true);
    try {
      await adminAPI.updateApplicationStatus(selectedApplication, {
        status: newStatus,
        admin_notes: adminNotes
      });
      toast.success('Status aktualisiert');
      loadApplications();
      loadApplicationDetails(selectedApplication);
    } catch (error) {
      toast.error('Fehler beim Aktualisieren');
    } finally {
      setChangingStatus(false);
    }
  };

  const handleExportCSV = async () => {
    try {
      const params = {
        ...(statusFilter && { status_filter: statusFilter }),
        ...(positionTypeFilter && { position_type: positionTypeFilter })
      };
      const response = await adminAPI.exportApplicationsCSV(params);
      
      // Download auslösen
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `bewerbungen_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      toast.success('CSV exportiert');
    } catch (error) {
      toast.error('Fehler beim Export');
    }
  };

  const handleDownloadDocuments = async (applicantId, applicantName) => {
    try {
      const response = await adminAPI.downloadAllDocuments(applicantId);
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `dokumente_${applicantName.replace(/\s/g, '_')}.zip`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      toast.success('Dokumente heruntergeladen');
    } catch (error) {
      toast.error('Fehler beim Download');
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

  const formatDateTime = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <FileText className="h-8 w-8 text-primary-600" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Bewerbungsverwaltung</h1>
            <p className="text-gray-600">IJP Vermittler-Dashboard</p>
          </div>
        </div>
        <button onClick={handleExportCSV} className="btn-primary flex items-center gap-2">
          <Download className="h-5 w-5" />
          CSV Export
        </button>
      </div>

      {/* Filter */}
      <div className="card mb-6">
        <div className="grid md:grid-cols-4 gap-4">
          {/* Suche */}
          <form onSubmit={handleSearch} className="md:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                className="input-styled pl-10 pr-20"
                placeholder="Bewerber oder Stelle suchen..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 btn-primary py-1 px-3 text-sm">
                Suchen
              </button>
            </div>
          </form>
          
          {/* Stellenart Filter */}
          <div className="relative">
            <select
              className="input-styled appearance-none pr-10"
              value={positionTypeFilter}
              onChange={(e) => { setPositionTypeFilter(e.target.value); setPage(0); }}
            >
              <option value="">Alle Stellenarten</option>
              {Object.entries(positionTypeLabels).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
          </div>
          
          {/* Status Filter */}
          <div className="relative">
            <select
              className="input-styled appearance-none pr-10"
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}
            >
              <option value="">Alle Status</option>
              {statusOptions.map((status) => (
                <option key={status.value} value={status.value}>{status.label}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
          </div>
        </div>
        
        {/* Aktive Filter anzeigen */}
        {(statusFilter || positionTypeFilter) && (
          <div className="flex items-center gap-2 mt-4 pt-4 border-t">
            <Filter className="h-4 w-4 text-gray-500" />
            <span className="text-sm text-gray-500">Aktive Filter:</span>
            {positionTypeFilter && (
              <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                {positionTypeLabels[positionTypeFilter]}
                <button onClick={() => setPositionTypeFilter('')} className="ml-1 hover:text-blue-600">×</button>
              </span>
            )}
            {statusFilter && (
              <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-sm">
                {statusOptions.find(s => s.value === statusFilter)?.label}
                <button onClick={() => setStatusFilter('')} className="ml-1 hover:text-purple-600">×</button>
              </span>
            )}
            <button 
              onClick={() => { setStatusFilter(''); setPositionTypeFilter(''); }}
              className="text-sm text-gray-500 hover:text-gray-700 ml-2"
            >
              Alle zurücksetzen
            </button>
          </div>
        )}
      </div>

      {/* Statistik */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="card py-4">
          <p className="text-3xl font-bold text-gray-900">{total}</p>
          <p className="text-sm text-gray-500">Bewerbungen gesamt</p>
        </div>
        <div className="card py-4">
          <p className="text-3xl font-bold text-yellow-600">
            {applications.filter(a => a.status === 'pending').length}
          </p>
          <p className="text-sm text-gray-500">Neu eingegangen</p>
        </div>
        <div className="card py-4">
          <p className="text-3xl font-bold text-blue-600">
            {applications.filter(a => ['ijp_review', 'ijp_approved'].includes(a.status)).length}
          </p>
          <p className="text-sm text-gray-500">In Bearbeitung</p>
        </div>
        <div className="card py-4">
          <p className="text-3xl font-bold text-green-600">
            {applications.filter(a => ['accepted', 'contract_signed', 'completed'].includes(a.status)).length}
          </p>
          <p className="text-sm text-gray-500">Erfolgreich</p>
        </div>
      </div>

      {/* Bewerbungen-Tabelle */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          </div>
        ) : applications.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Keine Bewerbungen gefunden</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Bewerber</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Kontakt</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Stellenart</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Stelle</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Status</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Datum</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Dok.</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900">Aktionen</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {applications.map((app) => (
                    <tr key={app.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">{app.applicant_name}</div>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <div className="flex flex-col gap-1">
                          {app.applicant_email && (
                            <a href={`mailto:${app.applicant_email}`} className="text-primary-600 hover:underline flex items-center gap-1">
                              <Mail className="h-3 w-3" />{app.applicant_email}
                            </a>
                          )}
                          {app.applicant_phone && (
                            <span className="text-gray-600 flex items-center gap-1">
                              <Phone className="h-3 w-3" />{app.applicant_phone}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {app.position_type && (
                          <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                            {positionTypeLabels[app.position_type] || app.position_type}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm">{app.job_title}</div>
                        <div className="text-xs text-gray-500">{app.company_name}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium border ${statusColors[app.status_color] || statusColors.gray}`}>
                          {app.status_label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600 text-sm">
                        {formatDate(app.applied_at)}
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-1 bg-gray-100 rounded text-sm">
                          {app.document_count}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => loadApplicationDetails(app.id)}
                            className="p-2 text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded-lg"
                            title="Details"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          {app.document_count > 0 && (
                            <button
                              onClick={() => handleDownloadDocuments(app.applicant_id, app.applicant_name)}
                              className="p-2 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg"
                              title="Dokumente herunterladen"
                            >
                              <Download className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between px-4 py-3 border-t">
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

      {/* Detail Modal */}
      {selectedApplication && (
        <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl my-8">
            {detailsLoading ? (
              <div className="p-12 flex justify-center">
                <Loader2 className="h-12 w-12 text-primary-600 animate-spin" />
              </div>
            ) : applicationDetails ? (
              <>
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">
                      {applicationDetails.applicant.first_name} {applicationDetails.applicant.last_name}
                    </h2>
                    <p className="text-gray-500">{applicationDetails.job.title} - {applicationDetails.job.company_name}</p>
                  </div>
                  <button 
                    onClick={() => { setSelectedApplication(null); setApplicationDetails(null); }}
                    className="p-2 hover:bg-gray-100 rounded-lg"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>

                <div className="p-6 grid md:grid-cols-2 gap-6">
                  {/* Linke Spalte: Bewerber-Info */}
                  <div className="space-y-6">
                    {/* Kontaktdaten */}
                    <div className="bg-gray-50 rounded-xl p-4">
                      <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                        <User className="h-5 w-5 text-primary-600" />
                        Kontaktdaten
                      </h3>
                      <div className="space-y-2 text-sm">
                        <p className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-gray-400" />
                          <a href={`mailto:${applicationDetails.applicant.email}`} className="text-primary-600 hover:underline">
                            {applicationDetails.applicant.email}
                          </a>
                        </p>
                        <p className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-gray-400" />
                          {applicationDetails.applicant.phone || '-'}
                        </p>
                        <p className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-gray-400" />
                          {applicationDetails.applicant.address.city}, {applicationDetails.applicant.address.country}
                        </p>
                        <p className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          Geboren: {formatDate(applicationDetails.applicant.date_of_birth)}
                        </p>
                        <p className="flex items-center gap-2">
                          <Globe className="h-4 w-4 text-gray-400" />
                          {applicationDetails.applicant.nationality}
                        </p>
                      </div>
                    </div>

                    {/* Qualifikationen */}
                    <div className="bg-gray-50 rounded-xl p-4">
                      <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                        <GraduationCap className="h-5 w-5 text-primary-600" />
                        Qualifikationen
                      </h3>
                      <div className="space-y-2 text-sm">
                        <p><strong>Stellenart:</strong> {positionTypeLabels[applicationDetails.applicant.position_type] || '-'}</p>
                        <p><strong>Deutsch:</strong> {applicationDetails.applicant.german_level || '-'}</p>
                        <p><strong>Englisch:</strong> {applicationDetails.applicant.english_level || '-'}</p>
                        <p><strong>Berufserfahrung:</strong> {applicationDetails.applicant.work_experience_years || 0} Jahre</p>
                        {applicationDetails.applicant.university_name && (
                          <p><strong>Universität:</strong> {applicationDetails.applicant.university_name}</p>
                        )}
                        {applicationDetails.applicant.field_of_study && (
                          <p><strong>Studiengang:</strong> {applicationDetails.applicant.field_of_study}</p>
                        )}
                      </div>
                    </div>

                    {/* Dokumente */}
                    <div className="bg-gray-50 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-bold text-gray-900 flex items-center gap-2">
                          <FileCheck className="h-5 w-5 text-primary-600" />
                          Dokumente ({applicationDetails.documents.length})
                        </h3>
                        {applicationDetails.documents.length > 0 && (
                          <button
                            onClick={() => handleDownloadDocuments(applicationDetails.applicant.id, `${applicationDetails.applicant.first_name}_${applicationDetails.applicant.last_name}`)}
                            className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
                          >
                            <Download className="h-4 w-4" />
                            Alle herunterladen
                          </button>
                        )}
                      </div>
                      {applicationDetails.documents.length === 0 ? (
                        <p className="text-gray-500 text-sm">Keine Dokumente hochgeladen</p>
                      ) : (
                        <div className="space-y-2">
                          {applicationDetails.documents.map((doc) => (
                            <a
                              key={doc.id}
                              href={`/uploads/${doc.file_path.split('/').pop()}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center justify-between p-2 bg-white rounded-lg hover:bg-gray-100"
                            >
                              <div className="flex items-center gap-2">
                                <FileText className="h-4 w-4 text-gray-400" />
                                <span className="text-sm">{doc.original_name}</span>
                              </div>
                              <span className="text-xs text-gray-500">{doc.document_type}</span>
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Rechte Spalte: Status & Notizen */}
                  <div className="space-y-6">
                    {/* Aktueller Status */}
                    <div className="bg-gray-50 rounded-xl p-4">
                      <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                        <Clock className="h-5 w-5 text-primary-600" />
                        Bewerbungsstatus
                      </h3>
                      <div className="space-y-2 text-sm mb-4">
                        <p><strong>Eingereicht:</strong> {formatDateTime(applicationDetails.application.applied_at)}</p>
                        <p><strong>Aktualisiert:</strong> {formatDateTime(applicationDetails.application.updated_at)}</p>
                        <p><strong>Aktueller Status:</strong></p>
                        <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${statusColors[statusOptions.find(s => s.value === applicationDetails.application.status)?.color] || statusColors.gray}`}>
                          {applicationDetails.application.status_label}
                        </span>
                      </div>
                    </div>

                    {/* Status ändern */}
                    <div className="bg-primary-50 rounded-xl p-4 border-2 border-primary-200">
                      <h3 className="font-bold text-gray-900 mb-3">Status ändern</h3>
                      <div className="space-y-3">
                        <div className="relative">
                          <select
                            className="input-styled appearance-none pr-10"
                            value={newStatus}
                            onChange={(e) => setNewStatus(e.target.value)}
                          >
                            {statusOptions.map((status) => (
                              <option key={status.value} value={status.value}>{status.label}</option>
                            ))}
                          </select>
                          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
                        </div>
                        
                        <div>
                          <label className="label">Admin-Notizen (intern)</label>
                          <textarea
                            className="input-styled"
                            rows={3}
                            placeholder="Interne Notizen zur Bewerbung..."
                            value={adminNotes}
                            onChange={(e) => setAdminNotes(e.target.value)}
                          />
                        </div>
                        
                        <button
                          onClick={handleStatusChange}
                          disabled={changingStatus || newStatus === applicationDetails.application.status}
                          className="btn-primary w-full flex items-center justify-center gap-2"
                        >
                          {changingStatus ? (
                            <Loader2 className="h-5 w-5 animate-spin" />
                          ) : (
                            <CheckCircle className="h-5 w-5" />
                          )}
                          Status aktualisieren
                        </button>
                      </div>
                    </div>

                    {/* Bewerber-Nachricht */}
                    {applicationDetails.application.applicant_message && (
                      <div className="bg-gray-50 rounded-xl p-4">
                        <h3 className="font-bold text-gray-900 mb-2">Nachricht des Bewerbers</h3>
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">
                          {applicationDetails.application.applicant_message}
                        </p>
                      </div>
                    )}
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

export default AdminApplications;
