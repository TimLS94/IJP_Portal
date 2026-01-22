import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { companyRequestsAPI, jobsAPI } from '../../lib/api';
import toast from 'react-hot-toast';
import { 
  LifeBuoy, Plus, Clock, CheckCircle, XCircle, Loader2, 
  Users, FileText, Briefcase, ChevronDown, Calendar, Euro,
  ArrowRight, AlertTriangle, Building2
} from 'lucide-react';

const requestTypeOptions = [
  { value: 'recruiting', label: 'Personal finden', icon: Users, description: 'IJP sucht passende Kandidaten für Sie' },
  { value: 'support', label: 'Prozess-Unterstützung', icon: LifeBuoy, description: 'Hilfe bei laufenden Bewerbungen' },
  { value: 'documents', label: 'Dokumenten-Hilfe', icon: FileText, description: 'Unterstützung bei Visa, Verträgen etc.' },
  { value: 'full_service', label: 'Full-Service', icon: Building2, description: 'Komplettes Recruiting von A-Z' },
];

const statusColors = {
  pending: 'bg-yellow-100 text-yellow-800',
  ijp_review: 'bg-blue-100 text-blue-800',
  ijp_accepted: 'bg-green-100 text-green-800',
  ijp_rejected: 'bg-red-100 text-red-800',
  in_progress: 'bg-indigo-100 text-indigo-800',
  candidates_found: 'bg-purple-100 text-purple-800',
  candidates_sent: 'bg-purple-100 text-purple-800',
  company_review: 'bg-blue-100 text-blue-800',
  interviews: 'bg-indigo-100 text-indigo-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
  on_hold: 'bg-orange-100 text-orange-800',
};

function CompanyIJPRequest() {
  const [requests, setRequests] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    request_type: '',
    title: '',
    description: '',
    positions_needed: 1,
    start_date: '',
    deadline: '',
    salary_range: '',
    job_posting_id: '',
    contact_name: '',
    contact_email: '',
    contact_phone: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [requestsRes, jobsRes] = await Promise.all([
        companyRequestsAPI.getMyRequests(),
        jobsAPI.getMyJobs()
      ]);
      setRequests(requestsRes.data);
      setJobs(jobsRes.data);
    } catch (error) {
      console.error('Fehler beim Laden:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.request_type) {
      toast.error('Bitte wählen Sie eine Auftragsart');
      return;
    }
    if (!formData.title) {
      toast.error('Bitte geben Sie einen Titel ein');
      return;
    }
    
    setSubmitting(true);
    try {
      const data = {
        ...formData,
        positions_needed: parseInt(formData.positions_needed) || 1,
        job_posting_id: formData.job_posting_id ? parseInt(formData.job_posting_id) : null,
        start_date: formData.start_date || null,
        deadline: formData.deadline || null,
      };
      
      await companyRequestsAPI.create(data);
      toast.success('Auftrag erfolgreich erstellt!');
      setShowForm(false);
      setFormData({
        request_type: '',
        title: '',
        description: '',
        positions_needed: 1,
        start_date: '',
        deadline: '',
        salary_range: '',
        job_posting_id: '',
        contact_name: '',
        contact_email: '',
        contact_phone: '',
      });
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Fehler beim Erstellen');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async (requestId) => {
    if (!confirm('Möchten Sie diesen Auftrag wirklich stornieren?')) return;
    
    try {
      await companyRequestsAPI.cancel(requestId);
      toast.success('Auftrag storniert');
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Fehler beim Stornieren');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
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
          <Handshake className="h-8 w-8 text-primary-600" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">IJP beauftragen</h1>
            <p className="text-gray-600">Lassen Sie uns Personal für Sie finden</p>
          </div>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="h-5 w-5" />
          Neuer Auftrag
        </button>
      </div>

      {/* Info-Box */}
      <div className="card bg-gradient-to-r from-primary-50 to-blue-50 border-primary-200 mb-8">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-primary-100 rounded-xl">
            <Building2 className="h-8 w-8 text-primary-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 mb-1">Wie funktioniert es?</h3>
            <ul className="text-gray-600 text-sm space-y-1">
              <li>1. Erstellen Sie einen Auftrag mit Ihren Anforderungen</li>
              <li>2. IJP prüft Ihre Anfrage und sucht passende Kandidaten</li>
              <li>3. Sie erhalten vorselektierte Bewerber zur Auswahl</li>
              <li>4. Wir unterstützen bei Interviews und Dokumenten</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Formular */}
      {showForm && (
        <div className="card mb-8 border-2 border-primary-200">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Neuen Auftrag erstellen</h2>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Auftragsart */}
            <div>
              <label className="label">Auftragsart *</label>
              <div className="grid md:grid-cols-2 gap-3">
                {requestTypeOptions.map((type) => {
                  const Icon = type.icon;
                  const isSelected = formData.request_type === type.value;
                  return (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => setFormData({ ...formData, request_type: type.value })}
                      className={`p-4 rounded-xl border-2 text-left transition-all ${
                        isSelected 
                          ? 'border-primary-500 bg-primary-50' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className={`h-6 w-6 ${isSelected ? 'text-primary-600' : 'text-gray-500'}`} />
                        <div>
                          <p className="font-medium text-gray-900">{type.label}</p>
                          <p className="text-sm text-gray-600">{type.description}</p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Titel */}
            <div>
              <label className="label">Titel / Kurzbeschreibung *</label>
              <input
                type="text"
                className="input-styled"
                placeholder="z.B. 5 Erntehelfer für Sommer 2026"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>

            {/* Beschreibung */}
            <div>
              <label className="label">Ausführliche Beschreibung</label>
              <textarea
                className="input-styled"
                rows={4}
                placeholder="Beschreiben Sie Ihre Anforderungen, gewünschte Qualifikationen, Sprachkenntnisse etc."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            {/* Anzahl & Zeitraum */}
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <label className="label">Anzahl Personen</label>
                <input
                  type="number"
                  min="1"
                  className="input-styled"
                  value={formData.positions_needed}
                  onChange={(e) => setFormData({ ...formData, positions_needed: e.target.value })}
                />
              </div>
              <div>
                <label className="label">Gewünschter Start</label>
                <input
                  type="date"
                  className="input-styled"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                />
              </div>
              <div>
                <label className="label">Deadline für Vermittlung</label>
                <input
                  type="date"
                  className="input-styled"
                  value={formData.deadline}
                  onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                />
              </div>
            </div>

            {/* Gehalt & Stelle */}
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="label">Gehaltsrahmen</label>
                <input
                  type="text"
                  className="input-styled"
                  placeholder="z.B. 14-16€/Stunde"
                  value={formData.salary_range}
                  onChange={(e) => setFormData({ ...formData, salary_range: e.target.value })}
                />
              </div>
              <div>
                <label className="label">Bezug zu Stellenangebot (optional)</label>
                <div className="relative">
                  <select
                    className="input-styled pr-10 appearance-none"
                    value={formData.job_posting_id}
                    onChange={(e) => setFormData({ ...formData, job_posting_id: e.target.value })}
                  >
                    <option value="">Keine Stelle zuordnen</option>
                    {jobs.map((job) => (
                      <option key={job.id} value={job.id}>{job.title}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Kontakt */}
            <div className="border-t pt-6">
              <h3 className="font-medium text-gray-900 mb-4">Kontaktperson für diesen Auftrag</h3>
              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <label className="label">Name</label>
                  <input
                    type="text"
                    className="input-styled"
                    placeholder="Max Mustermann"
                    value={formData.contact_name}
                    onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label">E-Mail</label>
                  <input
                    type="email"
                    className="input-styled"
                    placeholder="kontakt@firma.de"
                    value={formData.contact_email}
                    onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label">Telefon</label>
                  <input
                    type="tel"
                    className="input-styled"
                    placeholder="+49 123 456789"
                    value={formData.contact_phone}
                    onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex justify-end gap-4">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="btn-secondary"
              >
                Abbrechen
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="btn-primary flex items-center gap-2"
              >
                {submitting ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <ArrowRight className="h-5 w-5" />
                )}
                Auftrag absenden
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Liste der Aufträge */}
      {requests.length === 0 ? (
        <div className="card text-center py-12">
          <Handshake className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Noch keine Aufträge</h2>
          <p className="text-gray-600 mb-4">
            Erstellen Sie Ihren ersten Auftrag und lassen Sie IJP für Sie arbeiten!
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="btn-primary inline-flex items-center gap-2"
          >
            <Plus className="h-5 w-5" />
            Ersten Auftrag erstellen
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900">Ihre Aufträge ({requests.length})</h2>
          
          {requests.map((request) => (
            <div key={request.id} className="card">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2 flex-wrap">
                    <span className="text-lg font-semibold text-gray-900">{request.title}</span>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[request.status]}`}>
                      {request.status_label}
                    </span>
                    <span className="px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-700">
                      {request.request_type_label}
                    </span>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                    <span className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      {request.positions_filled}/{request.positions_needed} Stellen besetzt
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      Erstellt: {formatDate(request.created_at)}
                    </span>
                    {request.deadline && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        Deadline: {formatDate(request.deadline)}
                      </span>
                    )}
                    {request.candidates_proposed > 0 && (
                      <span className="flex items-center gap-1 text-purple-600">
                        <CheckCircle className="h-4 w-4" />
                        {request.candidates_proposed} Kandidaten vorgeschlagen
                      </span>
                    )}
                  </div>
                  
                  {request.description && (
                    <p className="text-sm text-gray-500 mt-2 line-clamp-2">{request.description}</p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {request.status === 'pending' && (
                    <button
                      onClick={() => handleCancel(request.id)}
                      className="btn-secondary text-sm flex items-center gap-1 text-red-600 hover:text-red-700"
                    >
                      <XCircle className="h-4 w-4" />
                      Stornieren
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default CompanyIJPRequest;

