import { useState, useEffect } from 'react';
import { jobRequestsAPI } from '../../lib/api';
import toast from 'react-hot-toast';
import { 
  ClipboardList, User, Search, Download, ChevronDown, Eye, 
  Phone, Mail, MapPin, FileText, X, Loader2, Calendar,
  GraduationCap, Shield, CheckCircle, Filter
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

function AdminJobRequests() {
  const [requests, setRequests] = useState([]);
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
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [requestDetails, setRequestDetails] = useState(null);
  
  // Status ändern
  const [changingStatus, setChangingStatus] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [matchedCompanyName, setMatchedCompanyName] = useState('');
  const [matchedJobTitle, setMatchedJobTitle] = useState('');
  const [interviewDate, setInterviewDate] = useState('');
  const [contractDate, setContractDate] = useState('');

  useEffect(() => {
    loadStatusOptions();
  }, []);

  useEffect(() => {
    loadRequests();
  }, [statusFilter, positionTypeFilter, page]);

  const loadStatusOptions = async () => {
    try {
      const response = await jobRequestsAPI.getStatusOptions();
      setStatusOptions(response.data.statuses);
    } catch (error) {
      console.error('Fehler beim Laden der Status-Optionen');
    }
  };

  const loadRequests = async () => {
    setLoading(true);
    try {
      const params = {
        skip: page * limit,
        limit,
        ...(statusFilter && { status_filter: statusFilter }),
        ...(positionTypeFilter && { position_type: positionTypeFilter }),
        ...(search && { search })
      };
      const response = await jobRequestsAPI.listRequests(params);
      setRequests(response.data.requests);
      setTotal(response.data.total);
    } catch (error) {
      toast.error('Fehler beim Laden der Aufträge');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(0);
    loadRequests();
  };

  const loadRequestDetails = async (reqId) => {
    setDetailsLoading(true);
    setSelectedRequest(reqId);
    try {
      const response = await jobRequestsAPI.getRequestDetails(reqId);
      setRequestDetails(response.data);
      setNewStatus(response.data.request.status);
      setAdminNotes(response.data.request.admin_notes || '');
      setMatchedCompanyName(response.data.request.matched_company_name || '');
      setMatchedJobTitle(response.data.request.matched_job_title || '');
      setInterviewDate(response.data.request.interview_date ? response.data.request.interview_date.split('T')[0] : '');
      setContractDate(response.data.request.contract_date ? response.data.request.contract_date.split('T')[0] : '');
    } catch (error) {
      toast.error('Fehler beim Laden der Details');
      setSelectedRequest(null);
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleStatusChange = async () => {
    if (!newStatus) return;
    
    setChangingStatus(true);
    try {
      await jobRequestsAPI.updateStatus(selectedRequest, {
        status: newStatus,
        admin_notes: adminNotes,
        matched_company_name: matchedCompanyName || null,
        matched_job_title: matchedJobTitle || null,
        interview_date: interviewDate || null,
        contract_date: contractDate || null
      });
      toast.success('Status aktualisiert');
      loadRequests();
      loadRequestDetails(selectedRequest);
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
      const response = await jobRequestsAPI.exportCSV(params);
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `ijp_auftraege_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      toast.success('CSV exportiert');
    } catch (error) {
      toast.error('Fehler beim Export');
    }
  };

  const handleDownloadDocuments = async (requestId, applicantName) => {
    try {
      const response = await jobRequestsAPI.downloadDocuments(requestId);
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `dokumente_auftrag_${requestId}_${applicantName.replace(/\s/g, '_')}.zip`);
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
          <ClipboardList className="h-8 w-8 text-primary-600" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">IJP-Aufträge</h1>
            <p className="text-gray-600">Vermittlungsaufträge von Bewerbern</p>
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
                placeholder="Bewerber suchen..."
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
        
        {/* Aktive Filter */}
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
          <p className="text-sm text-gray-500">Aufträge gesamt</p>
        </div>
        <div className="card py-4">
          <p className="text-3xl font-bold text-yellow-600">
            {requests.filter(r => r.status === 'pending').length}
          </p>
          <p className="text-sm text-gray-500">Neu eingegangen</p>
        </div>
        <div className="card py-4">
          <p className="text-3xl font-bold text-indigo-600">
            {requests.filter(r => ['in_review', 'searching'].includes(r.status)).length}
          </p>
          <p className="text-sm text-gray-500">In Bearbeitung</p>
        </div>
        <div className="card py-4">
          <p className="text-3xl font-bold text-green-600">
            {requests.filter(r => ['placed', 'completed'].includes(r.status)).length}
          </p>
          <p className="text-sm text-gray-500">Erfolgreich vermittelt</p>
        </div>
      </div>

      {/* Tabelle */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-12 w-12 text-primary-600 animate-spin" />
          </div>
        ) : requests.length === 0 ? (
          <div className="text-center py-12">
            <ClipboardList className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Keine IJP-Aufträge gefunden</p>
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
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Status</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Datenschutz</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Datum</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Dok.</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900">Aktionen</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {requests.map((req) => (
                    <tr key={req.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">{req.applicant_name}</div>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <div className="flex flex-col gap-1">
                          {req.applicant_email && (
                            <a href={`mailto:${req.applicant_email}`} className="text-primary-600 hover:underline flex items-center gap-1">
                              <Mail className="h-3 w-3" />{req.applicant_email}
                            </a>
                          )}
                          {req.applicant_phone && (
                            <span className="text-gray-600 flex items-center gap-1">
                              <Phone className="h-3 w-3" />{req.applicant_phone}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {req.position_type && (
                          <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                            {positionTypeLabels[req.position_type] || req.position_type}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium border ${statusColors[req.status_color] || statusColors.gray}`}>
                          {req.status_label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {req.privacy_consent ? (
                          <span className="text-green-600 flex items-center gap-1">
                            <CheckCircle className="h-4 w-4" />
                            <span className="text-xs">{formatDate(req.privacy_consent_date)}</span>
                          </span>
                        ) : (
                          <span className="text-red-600">Nein</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-600 text-sm">
                        {formatDate(req.created_at)}
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-1 bg-gray-100 rounded text-sm">
                          {req.document_count}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => loadRequestDetails(req.id)}
                            className="p-2 text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded-lg"
                            title="Details"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          {req.document_count > 0 && (
                            <button
                              onClick={() => handleDownloadDocuments(req.id, req.applicant_name)}
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
      {selectedRequest && (
        <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl my-8">
            {detailsLoading ? (
              <div className="p-12 flex justify-center">
                <Loader2 className="h-12 w-12 text-primary-600 animate-spin" />
              </div>
            ) : requestDetails ? (
              <>
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">
                      IJP-Auftrag #{requestDetails.request.id}
                    </h2>
                    <p className="text-gray-500">
                      {requestDetails.applicant.first_name} {requestDetails.applicant.last_name}
                    </p>
                  </div>
                  <button 
                    onClick={() => { setSelectedRequest(null); setRequestDetails(null); }}
                    className="p-2 hover:bg-gray-100 rounded-lg"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>

                <div className="p-6 grid md:grid-cols-2 gap-6">
                  {/* Linke Spalte */}
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
                          <a href={`mailto:${requestDetails.applicant.email}`} className="text-primary-600 hover:underline">
                            {requestDetails.applicant.email}
                          </a>
                        </p>
                        <p className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-gray-400" />
                          {requestDetails.applicant.phone || '-'}
                        </p>
                        <p className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-gray-400" />
                          {requestDetails.applicant.address.city}, {requestDetails.applicant.address.country}
                        </p>
                        <p className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          Geboren: {formatDate(requestDetails.applicant.date_of_birth)}
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
                        <p><strong>Stellenart:</strong> {positionTypeLabels[requestDetails.applicant.position_type] || '-'}</p>
                        <p><strong>Deutsch:</strong> {requestDetails.applicant.german_level || '-'}</p>
                        <p><strong>Englisch:</strong> {requestDetails.applicant.english_level || '-'}</p>
                        <p><strong>Berufserfahrung:</strong> {requestDetails.applicant.work_experience_years || 0} Jahre</p>
                        {requestDetails.applicant.university_name && (
                          <p><strong>Universität:</strong> {requestDetails.applicant.university_name}</p>
                        )}
                      </div>
                    </div>

                    {/* Dokumente */}
                    <div className="bg-gray-50 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-bold text-gray-900 flex items-center gap-2">
                          <FileText className="h-5 w-5 text-primary-600" />
                          Dokumente ({requestDetails.documents.length})
                        </h3>
                        {requestDetails.documents.length > 0 && (
                          <button
                            onClick={() => handleDownloadDocuments(requestDetails.request.id, `${requestDetails.applicant.first_name}_${requestDetails.applicant.last_name}`)}
                            className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
                          >
                            <Download className="h-4 w-4" />
                            Alle herunterladen
                          </button>
                        )}
                      </div>
                      {requestDetails.documents.length === 0 ? (
                        <p className="text-gray-500 text-sm">Keine Dokumente</p>
                      ) : (
                        <div className="space-y-2">
                          {requestDetails.documents.map((doc) => (
                            <div key={doc.id} className="flex items-center justify-between p-2 bg-white rounded-lg">
                              <span className="text-sm">{doc.original_name}</span>
                              <span className="text-xs text-gray-500">{doc.document_type}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Rechte Spalte */}
                  <div className="space-y-6">
                    {/* Auftrag-Info */}
                    <div className="bg-gray-50 rounded-xl p-4">
                      <h3 className="font-bold text-gray-900 mb-3">Auftragsdetails</h3>
                      <div className="space-y-2 text-sm">
                        <p><strong>Erstellt:</strong> {formatDateTime(requestDetails.request.created_at)}</p>
                        <p><strong>Aktualisiert:</strong> {formatDateTime(requestDetails.request.updated_at)}</p>
                        {requestDetails.request.preferred_location && (
                          <p><strong>Bevorzugte Region:</strong> {requestDetails.request.preferred_location}</p>
                        )}
                        {requestDetails.request.notes && (
                          <div className="mt-2 p-2 bg-white rounded">
                            <p className="text-gray-500 text-xs mb-1">Notizen vom Bewerber:</p>
                            <p>{requestDetails.request.notes}</p>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Vermittlungs-Daten */}
                    <div className="bg-purple-50 rounded-xl p-4 border border-purple-200">
                      <h3 className="font-bold text-gray-900 mb-3">🏢 Vermittlung an Firma</h3>
                      <div className="space-y-3">
                        <div>
                          <label className="label text-sm">Firmenname</label>
                          <input
                            type="text"
                            className="input-styled"
                            placeholder="z.B. Musterfirma GmbH"
                            value={matchedCompanyName}
                            onChange={(e) => setMatchedCompanyName(e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="label text-sm">Stellentitel</label>
                          <input
                            type="text"
                            className="input-styled"
                            placeholder="z.B. Erntehelfer"
                            value={matchedJobTitle}
                            onChange={(e) => setMatchedJobTitle(e.target.value)}
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="label text-sm">Interviewtermin</label>
                            <input
                              type="date"
                              className="input-styled"
                              value={interviewDate}
                              onChange={(e) => setInterviewDate(e.target.value)}
                            />
                          </div>
                          <div>
                            <label className="label text-sm">Vertragsdatum</label>
                            <input
                              type="date"
                              className="input-styled"
                              value={contractDate}
                              onChange={(e) => setContractDate(e.target.value)}
                            />
                          </div>
                        </div>
                        {(requestDetails.request.matched_company_name || requestDetails.request.matched_job_title) && (
                          <div className="p-2 bg-white rounded text-sm">
                            <p className="text-gray-500 text-xs mb-1">Gespeicherte Daten:</p>
                            {requestDetails.request.matched_company_name && (
                              <p>📍 <strong>{requestDetails.request.matched_company_name}</strong></p>
                            )}
                            {requestDetails.request.matched_job_title && (
                              <p>💼 {requestDetails.request.matched_job_title}</p>
                            )}
                            {requestDetails.request.interview_date && (
                              <p>📅 Interview: {formatDate(requestDetails.request.interview_date)}</p>
                            )}
                            {requestDetails.request.contract_date && (
                              <p>📄 Vertrag: {formatDate(requestDetails.request.contract_date)}</p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Datenschutz */}
                    <div className="bg-green-50 rounded-xl p-4 border border-green-200">
                      <h3 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
                        <Shield className="h-5 w-5 text-green-600" />
                        Datenschutz-Zustimmung
                      </h3>
                      <p className="text-sm text-green-700">
                        ✓ Zustimmung erteilt am {formatDateTime(requestDetails.request.privacy_consent_date)}
                      </p>
                    </div>

                    {/* Status ändern */}
                    <div className="bg-primary-50 rounded-xl p-4 border-2 border-primary-200">
                      <h3 className="font-bold text-gray-900 mb-3">Status verwalten</h3>
                      
                      {/* Aktueller Status */}
                      <div className="mb-4 p-3 bg-white rounded-lg">
                        <p className="text-xs text-gray-500 mb-1">Aktueller Status:</p>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium border ${
                          statusColors[statusOptions.find(s => s.value === requestDetails.request.status)?.color] || statusColors.gray
                        }`}>
                          {statusOptions.find(s => s.value === requestDetails.request.status)?.label || requestDetails.request.status}
                        </span>
                      </div>
                      
                      {/* Status Workflow Info */}
                      <div className="mb-4 p-3 bg-white rounded-lg border-l-4 border-l-blue-500">
                        <p className="text-xs text-gray-500 mb-2">Workflow-Reihenfolge:</p>
                        <div className="flex flex-wrap gap-1 text-xs">
                          <span className="text-yellow-600">Eingereicht</span>
                          <span className="text-gray-400">→</span>
                          <span className="text-blue-600">IJP prüft</span>
                          <span className="text-gray-400">→</span>
                          <span className="text-indigo-600">Jobsuche</span>
                          <span className="text-gray-400">→</span>
                          <span className="text-purple-600">An Firma</span>
                          <span className="text-gray-400">→</span>
                          <span className="text-indigo-600">Interview</span>
                          <span className="text-gray-400">→</span>
                          <span className="text-orange-600">Vertrag</span>
                          <span className="text-gray-400">→</span>
                          <span className="text-green-600">Vermittelt</span>
                        </div>
                      </div>
                      
                      <div className="space-y-3">
                        <div>
                          <label className="label text-sm">Neuer Status</label>
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
                        </div>
                        
                        <div>
                          <label className="label text-sm">Admin-Notizen (intern)</label>
                          <textarea
                            className="input-styled"
                            rows={3}
                            placeholder="z.B. An Firma XY gesendet am..."
                            value={adminNotes}
                            onChange={(e) => setAdminNotes(e.target.value)}
                          />
                        </div>
                        
                        <button
                          onClick={handleStatusChange}
                          disabled={changingStatus || newStatus === requestDetails.request.status}
                          className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                          {changingStatus ? (
                            <Loader2 className="h-5 w-5 animate-spin" />
                          ) : (
                            <CheckCircle className="h-5 w-5" />
                          )}
                          Status aktualisieren
                        </button>
                        
                        {newStatus === requestDetails.request.status && (
                          <p className="text-xs text-gray-500 text-center">
                            Wählen Sie einen anderen Status aus
                          </p>
                        )}
                      </div>
                    </div>
                    
                    {/* Schnellaktionen */}
                    <div className="bg-gray-50 rounded-xl p-4">
                      <h3 className="font-bold text-gray-900 mb-3">Schnellaktionen</h3>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => { setNewStatus('ijp_review'); }}
                          className="p-2 text-xs bg-blue-100 hover:bg-blue-200 text-blue-800 rounded-lg transition-colors"
                        >
                          ✓ Prüfung starten
                        </button>
                        <button
                          onClick={() => { setNewStatus('ijp_approved'); }}
                          className="p-2 text-xs bg-green-100 hover:bg-green-200 text-green-800 rounded-lg transition-colors"
                        >
                          ✓ Freigeben
                        </button>
                        <button
                          onClick={() => { setNewStatus('searching'); }}
                          className="p-2 text-xs bg-indigo-100 hover:bg-indigo-200 text-indigo-800 rounded-lg transition-colors"
                        >
                          🔍 Jobsuche starten
                        </button>
                        <button
                          onClick={() => { setNewStatus('sent_to_company'); }}
                          className="p-2 text-xs bg-purple-100 hover:bg-purple-200 text-purple-800 rounded-lg transition-colors"
                        >
                          📧 An Firma senden
                        </button>
                        <button
                          onClick={() => { setNewStatus('interview_scheduled'); }}
                          className="p-2 text-xs bg-indigo-100 hover:bg-indigo-200 text-indigo-800 rounded-lg transition-colors"
                        >
                          📅 Interview planen
                        </button>
                        <button
                          onClick={() => { setNewStatus('contract_sent'); }}
                          className="p-2 text-xs bg-orange-100 hover:bg-orange-200 text-orange-800 rounded-lg transition-colors"
                        >
                          📄 Vertrag senden
                        </button>
                        <button
                          onClick={() => { setNewStatus('placed'); }}
                          className="p-2 text-xs bg-green-100 hover:bg-green-200 text-green-800 rounded-lg transition-colors"
                        >
                          🎉 Vermittelt
                        </button>
                        <button
                          onClick={() => { setNewStatus('on_hold'); }}
                          className="p-2 text-xs bg-orange-100 hover:bg-orange-200 text-orange-800 rounded-lg transition-colors"
                        >
                          ⏸️ Pausieren
                        </button>
                      </div>
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

export default AdminJobRequests;
