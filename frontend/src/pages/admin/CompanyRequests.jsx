import { useState, useEffect } from 'react';
import { companyRequestsAPI } from '../../lib/api';
import toast from 'react-hot-toast';
import { 
  Building2, User, Search, ChevronDown, Eye, 
  Phone, Mail, Calendar, X, Loader2, 
  Users, FileText, Briefcase, CheckCircle, Clock, Filter
} from 'lucide-react';

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

const typeIcons = {
  recruiting: Users,
  support: FileText,
  documents: FileText,
  full_service: Building2,
};

function AdminCompanyRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  // Status-Optionen vom Backend
  const [statusOptions, setStatusOptions] = useState([]);
  const [typeOptions, setTypeOptions] = useState([]);
  
  // Detail Modal
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [requestDetails, setRequestDetails] = useState(null);
  
  // Status ändern
  const [changingStatus, setChangingStatus] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [candidatesProposed, setCandidatesProposed] = useState(0);
  const [candidatesHired, setCandidatesHired] = useState(0);
  const [positionsFilled, setPositionsFilled] = useState(0);

  useEffect(() => {
    loadOptions();
    loadRequests();
  }, []);

  useEffect(() => {
    loadRequests();
  }, [statusFilter, typeFilter]);

  const loadOptions = async () => {
    try {
      const [statusRes, typeRes] = await Promise.all([
        companyRequestsAPI.getStatuses(),
        companyRequestsAPI.getTypes()
      ]);
      setStatusOptions(statusRes.data);
      setTypeOptions(typeRes.data);
    } catch (error) {
      console.error('Fehler beim Laden der Optionen');
    }
  };

  const loadRequests = async () => {
    setLoading(true);
    try {
      const params = {};
      if (statusFilter) params.status = statusFilter;
      if (typeFilter) params.request_type = typeFilter;
      
      const response = await companyRequestsAPI.adminGetAll(params);
      setRequests(response.data);
    } catch (error) {
      toast.error('Fehler beim Laden der Aufträge');
    } finally {
      setLoading(false);
    }
  };

  const loadRequestDetails = async (reqId) => {
    setSelectedRequest(reqId);
    setDetailsLoading(true);
    try {
      const response = await companyRequestsAPI.adminGet(reqId);
      setRequestDetails(response.data);
      setNewStatus(response.data.status);
      setAdminNotes(response.data.admin_notes || '');
      setCandidatesProposed(response.data.candidates_proposed || 0);
      setCandidatesHired(response.data.candidates_hired || 0);
      setPositionsFilled(response.data.positions_filled || 0);
    } catch (error) {
      toast.error('Fehler beim Laden der Details');
      setSelectedRequest(null);
    } finally {
      setDetailsLoading(false);
    }
  };

  const updateStatus = async () => {
    if (!newStatus) return;
    
    setChangingStatus(true);
    try {
      await companyRequestsAPI.adminUpdateStatus(selectedRequest, {
        status: newStatus,
        admin_notes: adminNotes,
        candidates_proposed: candidatesProposed,
        candidates_hired: candidatesHired,
        positions_filled: positionsFilled
      });
      toast.success('Status aktualisiert');
      loadRequests();
      // Details neu laden
      loadRequestDetails(selectedRequest);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Fehler beim Aktualisieren');
    } finally {
      setChangingStatus(false);
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

  const closeModal = () => {
    setSelectedRequest(null);
    setRequestDetails(null);
  };

  // Statistiken
  const stats = {
    total: requests.length,
    pending: requests.filter(r => r.status === 'pending').length,
    in_progress: requests.filter(r => ['ijp_review', 'in_progress', 'candidates_found', 'candidates_sent'].includes(r.status)).length,
    completed: requests.filter(r => r.status === 'completed').length,
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-12 w-12 text-primary-600 animate-spin" />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <Building2 className="h-8 w-8 text-primary-600" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Firmen-Aufträge</h1>
            <p className="text-gray-600">{stats.total} Aufträge insgesamt</p>
          </div>
        </div>
        
        {/* Mini-Stats */}
        <div className="flex flex-wrap gap-2">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-1.5 text-sm">
            <span className="font-bold text-yellow-700">{stats.pending}</span>
            <span className="text-yellow-600 ml-1">Neu</span>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-1.5 text-sm">
            <span className="font-bold text-blue-700">{stats.in_progress}</span>
            <span className="text-blue-600 ml-1">In Bearbeitung</span>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-1.5 text-sm">
            <span className="font-bold text-green-700">{stats.completed}</span>
            <span className="text-green-600 ml-1">Abgeschlossen</span>
          </div>
        </div>
      </div>

      {/* Filter */}
      <div className="card mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input-styled pr-10 appearance-none w-full"
            >
              <option value="">Alle Status</option>
              {statusOptions.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
            <Filter className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          </div>
          
          <div className="relative flex-1">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="input-styled pr-10 appearance-none w-full"
            >
              <option value="">Alle Typen</option>
              {typeOptions.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
            <Briefcase className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          </div>

          {(statusFilter || typeFilter) && (
            <button
              onClick={() => { setStatusFilter(''); setTypeFilter(''); }}
              className="btn-secondary text-sm whitespace-nowrap"
            >
              Filter zurücksetzen
            </button>
          )}
        </div>
      </div>

      {/* Liste */}
      {requests.length === 0 ? (
        <div className="card text-center py-12">
          <Building2 className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Keine Aufträge gefunden</h2>
          <p className="text-gray-600">
            {statusFilter || typeFilter 
              ? 'Keine Aufträge entsprechen Ihren Filterkriterien.'
              : 'Es wurden noch keine Firmen-Aufträge erstellt.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map((request) => {
            const TypeIcon = typeIcons[request.request_type] || Briefcase;
            return (
              <div key={request.id} className="card hover:shadow-md transition-shadow">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <TypeIcon className="h-5 w-5 text-primary-600" />
                      <span className="text-lg font-semibold text-gray-900">{request.title}</span>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium border ${statusColors[request.status_color]}`}>
                        {request.status_label}
                      </span>
                      <span className="px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-700">
                        {request.request_type_label}
                      </span>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                      <span className="flex items-center gap-1">
                        <Building2 className="h-4 w-4" />
                        Firma #{request.company_id}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        {request.positions_filled}/{request.positions_needed} besetzt
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {formatDate(request.created_at)}
                      </span>
                      {request.candidates_proposed > 0 && (
                        <span className="flex items-center gap-1 text-purple-600">
                          <CheckCircle className="h-4 w-4" />
                          {request.candidates_proposed} Kandidaten
                        </span>
                      )}
                    </div>
                    
                    {request.description && (
                      <p className="text-sm text-gray-500 mt-2 line-clamp-2">{request.description}</p>
                    )}
                  </div>

                  <button
                    onClick={() => loadRequestDetails(request.id)}
                    className="btn-primary flex items-center gap-2"
                  >
                    <Eye className="h-4 w-4" />
                    Details
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Detail Modal */}
      {selectedRequest && (
        <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl my-8 relative">
            {/* Schließen-Button */}
            <button 
              onClick={closeModal}
              className="absolute top-4 right-4 p-2 hover:bg-gray-200 rounded-lg z-10 bg-gray-100"
            >
              <X className="h-6 w-6 text-gray-700" />
            </button>
            
            {detailsLoading ? (
              <div className="p-12 flex justify-center">
                <Loader2 className="h-12 w-12 text-primary-600 animate-spin" />
              </div>
            ) : requestDetails ? (
              <>
                {/* Header */}
                <div className="p-6 border-b bg-primary-50 pr-16">
                  <div className="flex items-center gap-3 mb-2">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium border ${statusColors[requestDetails.status_color]}`}>
                      {requestDetails.status_label}
                    </span>
                    <span className="px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-700">
                      {requestDetails.request_type_label}
                    </span>
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900">{requestDetails.title}</h2>
                  <p className="text-gray-600">Firma #{requestDetails.company_id} • Erstellt: {formatDate(requestDetails.created_at)}</p>
                </div>

                <div className="p-6 space-y-6">
                  {/* Beschreibung */}
                  {requestDetails.description && (
                    <div className="bg-gray-50 rounded-xl p-4">
                      <h3 className="font-semibold text-gray-900 mb-2">Beschreibung</h3>
                      <p className="text-gray-700 whitespace-pre-line">{requestDetails.description}</p>
                    </div>
                  )}

                  {/* Info Grid */}
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="bg-blue-50 rounded-xl p-4">
                      <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <Users className="h-5 w-5 text-blue-600" />
                        Positionen
                      </h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Benötigt</span>
                          <span className="font-medium">{requestDetails.positions_needed}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Besetzt</span>
                          <span className="font-medium">{requestDetails.positions_filled}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Kandidaten vorgeschlagen</span>
                          <span className="font-medium">{requestDetails.candidates_proposed}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Kandidaten eingestellt</span>
                          <span className="font-medium">{requestDetails.candidates_hired}</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-green-50 rounded-xl p-4">
                      <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <User className="h-5 w-5 text-green-600" />
                        Kontakt
                      </h3>
                      <div className="space-y-2 text-sm">
                        {requestDetails.contact_name && (
                          <p className="flex items-center gap-2">
                            <User className="h-4 w-4 text-gray-500" />
                            {requestDetails.contact_name}
                          </p>
                        )}
                        {requestDetails.contact_email && (
                          <a href={`mailto:${requestDetails.contact_email}`} className="flex items-center gap-2 text-primary-600 hover:underline">
                            <Mail className="h-4 w-4" />
                            {requestDetails.contact_email}
                          </a>
                        )}
                        {requestDetails.contact_phone && (
                          <a href={`tel:${requestDetails.contact_phone}`} className="flex items-center gap-2 text-primary-600 hover:underline">
                            <Phone className="h-4 w-4" />
                            {requestDetails.contact_phone}
                          </a>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Zeitraum & Budget */}
                  <div className="grid md:grid-cols-3 gap-4">
                    {requestDetails.start_date && (
                      <div className="bg-gray-50 rounded-lg p-3">
                        <span className="text-xs text-gray-500">Gewünschter Start</span>
                        <p className="font-medium">{formatDate(requestDetails.start_date)}</p>
                      </div>
                    )}
                    {requestDetails.deadline && (
                      <div className="bg-gray-50 rounded-lg p-3">
                        <span className="text-xs text-gray-500">Deadline</span>
                        <p className="font-medium">{formatDate(requestDetails.deadline)}</p>
                      </div>
                    )}
                    {requestDetails.salary_range && (
                      <div className="bg-gray-50 rounded-lg p-3">
                        <span className="text-xs text-gray-500">Gehaltsrahmen</span>
                        <p className="font-medium">{requestDetails.salary_range}</p>
                      </div>
                    )}
                  </div>

                  {/* Admin-Bereich */}
                  <div className="border-t pt-6">
                    <h3 className="font-bold text-gray-900 mb-4">Admin-Aktionen</h3>
                    
                    <div className="grid md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="label">Status ändern</label>
                        <select
                          value={newStatus}
                          onChange={(e) => setNewStatus(e.target.value)}
                          className="input-styled"
                        >
                          {statusOptions.map((status) => (
                            <option key={status.value} value={status.value}>
                              {status.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="label text-xs">Kandidaten vorgeschl.</label>
                          <input
                            type="number"
                            min="0"
                            value={candidatesProposed}
                            onChange={(e) => setCandidatesProposed(parseInt(e.target.value) || 0)}
                            className="input-styled"
                          />
                        </div>
                        <div>
                          <label className="label text-xs">Eingestellt</label>
                          <input
                            type="number"
                            min="0"
                            value={candidatesHired}
                            onChange={(e) => setCandidatesHired(parseInt(e.target.value) || 0)}
                            className="input-styled"
                          />
                        </div>
                        <div>
                          <label className="label text-xs">Besetzt</label>
                          <input
                            type="number"
                            min="0"
                            value={positionsFilled}
                            onChange={(e) => setPositionsFilled(parseInt(e.target.value) || 0)}
                            className="input-styled"
                          />
                        </div>
                      </div>
                    </div>
                    
                    <div className="mb-4">
                      <label className="label">Admin-Notizen</label>
                      <textarea
                        value={adminNotes}
                        onChange={(e) => setAdminNotes(e.target.value)}
                        className="input-styled"
                        rows={3}
                        placeholder="Interne Notizen zum Auftrag..."
                      />
                    </div>
                    
                    <button
                      onClick={updateStatus}
                      disabled={changingStatus}
                      className="btn-primary flex items-center gap-2"
                    >
                      {changingStatus ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <CheckCircle className="h-4 w-4" />
                      )}
                      Speichern
                    </button>
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

export default AdminCompanyRequests;

