"use client";

import { useState, useEffect } from "react";
import { LifeBuoy, Plus, Clock, CheckCircle, XCircle, Loader2, Users, FileText, Building2, Eye, X, Calendar, Euro, Briefcase, ChevronDown, Trash2, Phone, Mail, ArrowRight } from "lucide-react";
import { companyRequestsAPI, jobsAPI } from "@/lib/api";
import toast from "react-hot-toast";

interface Request {
  id: number;
  request_type: string;
  request_type_label?: string;
  title: string;
  description?: string;
  status: string;
  status_label?: string;
  positions_needed: number;
  positions_filled?: number;
  candidates_proposed?: number;
  start_date?: string;
  deadline?: string;
  salary_range?: string;
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  admin_notes?: string;
  requirements?: { position_type?: string; semester_break_start?: string; semester_break_end?: string };
  created_at: string;
}

interface Job {
  id: number;
  title: string;
}

const requestTypeOptions = [
  { value: "recruiting", label: "Personal finden", icon: Users, description: "IJP sucht passende Kandidaten für Sie" },
  { value: "support", label: "Prozess-Unterstützung", icon: LifeBuoy, description: "Hilfe bei laufenden Bewerbungen" },
  { value: "documents", label: "Dokumenten-Hilfe", icon: FileText, description: "Unterstützung bei Visa, Verträgen etc." },
  { value: "full_service", label: "Full-Service", icon: Building2, description: "Komplettes Recruiting von A-Z" },
];

const positionTypeOptions = [
  { value: "", label: "Bitte wählen..." },
  { value: "studentenferienjob", label: "Studentenferienjob" },
  { value: "saisonjob", label: "Saisonjob" },
  { value: "fachkraft", label: "Fachkraft" },
  { value: "ausbildung", label: "Ausbildung" },
];

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  ijp_review: "bg-blue-100 text-blue-800",
  ijp_accepted: "bg-green-100 text-green-800",
  ijp_rejected: "bg-red-100 text-red-800",
  in_progress: "bg-indigo-100 text-indigo-800",
  candidates_found: "bg-purple-100 text-purple-800",
  candidates_sent: "bg-purple-100 text-purple-800",
  company_review: "bg-blue-100 text-blue-800",
  interviews: "bg-indigo-100 text-indigo-800",
  completed: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
  on_hold: "bg-orange-100 text-orange-800",
};

export default function CompanyIJPRequestPage() {
  const [requests, setRequests] = useState<Request[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<Request | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [formData, setFormData] = useState({
    request_type: "",
    title: "",
    description: "",
    positions_needed: 1,
    start_date: "",
    deadline: "",
    salary_range: "",
    job_posting_id: "",
    contact_name: "",
    contact_email: "",
    contact_phone: "",
    position_type: "",
    semester_break_start: "",
    semester_break_end: "",
  });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [requestsRes, jobsRes] = await Promise.all([
        companyRequestsAPI.getMyRequests(),
        jobsAPI.getMyJobs(),
      ]);
      setRequests(requestsRes.data || []);
      setJobs(jobsRes.data || []);
    } catch {
      toast.error("Fehler beim Laden der Daten");
    } finally {
      setLoading(false);
    }
  };

  const loadRequestDetails = async (id: number) => {
    setDetailLoading(true);
    try {
      const response = await companyRequestsAPI.get(id);
      setSelectedRequest(response.data);
    } catch {
      toast.error("Fehler beim Laden der Details");
    } finally {
      setDetailLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.request_type) { toast.error("Bitte wählen Sie eine Auftragsart"); return; }
    if (!formData.title) { toast.error("Bitte geben Sie einen Titel ein"); return; }

    setSubmitting(true);
    try {
      const data: Record<string, unknown> = {
        request_type: formData.request_type,
        title: formData.title,
        positions_needed: formData.positions_needed || 1,
      };
      if (formData.description?.trim()) data.description = formData.description.trim();
      if (formData.start_date) data.start_date = formData.start_date;
      if (formData.deadline) data.deadline = formData.deadline;
      if (formData.salary_range?.trim()) data.salary_range = formData.salary_range.trim();
      if (formData.job_posting_id) data.job_posting_id = parseInt(formData.job_posting_id);
      if (formData.contact_name?.trim()) data.contact_name = formData.contact_name.trim();
      if (formData.contact_email?.trim()) data.contact_email = formData.contact_email.trim();
      if (formData.contact_phone?.trim()) data.contact_phone = formData.contact_phone.trim();
      
      const requirements: Record<string, string> = {};
      if (formData.position_type) requirements.position_type = formData.position_type;
      if (formData.semester_break_start) requirements.semester_break_start = formData.semester_break_start;
      if (formData.semester_break_end) requirements.semester_break_end = formData.semester_break_end;
      if (Object.keys(requirements).length > 0) data.requirements = requirements;

      await companyRequestsAPI.create(data);
      toast.success("Auftrag erfolgreich erstellt!");
      setShowForm(false);
      setFormData({ request_type: "", title: "", description: "", positions_needed: 1, start_date: "", deadline: "", salary_range: "", job_posting_id: "", contact_name: "", contact_email: "", contact_phone: "", position_type: "", semester_break_start: "", semester_break_end: "" });
      loadData();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { detail?: string } } };
      toast.error(err.response?.data?.detail || "Fehler beim Erstellen");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async (id: number) => {
    if (!confirm("Auftrag wirklich stornieren?")) return;
    try {
      await companyRequestsAPI.cancel(id);
      toast.success("Auftrag storniert");
      loadData();
      setSelectedRequest(null);
    } catch {
      toast.error("Fehler beim Stornieren");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Auftrag endgültig löschen? Dies kann nicht rückgängig gemacht werden.")) return;
    try {
      await companyRequestsAPI.deletePermanent(id);
      toast.success("Auftrag gelöscht");
      loadData();
      setSelectedRequest(null);
    } catch {
      toast.error("Fehler beim Löschen");
    }
  };

  const formatDate = (d?: string) => d ? new Date(d).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" }) : "-";

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-12 w-12 text-primary-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-primary-100 rounded-xl">
            <LifeBuoy className="h-8 w-8 text-primary-600" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">IJP beauftragen</h1>
            <p className="text-gray-600">Lassen Sie uns passende Kandidaten für Sie finden</p>
          </div>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2">
          <Plus className="h-5 w-5" />
          Neuer Auftrag
        </button>
      </div>

      {/* Info-Box */}
      <div className="card bg-gradient-to-r from-primary-50 to-blue-50 border-primary-200 mb-8">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-primary-100 rounded-xl"><Building2 className="h-8 w-8 text-primary-600" /></div>
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

      {requests.length === 0 && !showForm ? (
        <div className="card text-center py-12">
          <Briefcase className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Noch keine Aufträge</h2>
          <p className="text-gray-600 mb-6">Erstellen Sie Ihren ersten Auftrag und lassen Sie IJP für Sie arbeiten!</p>
          <button onClick={() => setShowForm(true)} className="btn-primary inline-flex items-center gap-2"><Plus className="h-5 w-5" />Ersten Auftrag erstellen</button>
        </div>
      ) : (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900">Ihre Aufträge ({requests.length})</h2>
          {requests.map((request) => (
            <div key={request.id} className="card hover:shadow-md transition-shadow">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2 flex-wrap">
                    <span className="text-lg font-semibold text-gray-900">{request.title}</span>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[request.status] || "bg-gray-100"}`}>{request.status_label || request.status}</span>
                    {request.request_type_label && <span className="px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-700">{request.request_type_label}</span>}
                  </div>
                  <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                    <span className="flex items-center gap-1"><Users className="h-4 w-4" />{request.positions_filled || 0}/{request.positions_needed} Stellen besetzt</span>
                    <span className="flex items-center gap-1"><Calendar className="h-4 w-4" />Erstellt: {formatDate(request.created_at)}</span>
                    {request.deadline && <span className="flex items-center gap-1"><Clock className="h-4 w-4" />Deadline: {formatDate(request.deadline)}</span>}
                    {(request.candidates_proposed || 0) > 0 && <span className="flex items-center gap-1 text-purple-600"><CheckCircle className="h-4 w-4" />{request.candidates_proposed} Kandidaten vorgeschlagen</span>}
                  </div>
                  {request.description && <p className="text-sm text-gray-500 mt-2 line-clamp-2">{request.description}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => loadRequestDetails(request.id)} className="btn-secondary text-sm flex items-center gap-1"><Eye className="h-4 w-4" />Details</button>
                  {["pending", "ijp_review", "ijp_accepted", "in_progress"].includes(request.status) && (
                    <button onClick={() => handleCancel(request.id)} className="btn-secondary text-sm flex items-center gap-1 text-orange-600 hover:text-orange-700"><XCircle className="h-4 w-4" />Stornieren</button>
                  )}
                  {["cancelled", "completed"].includes(request.status) && (
                    <button onClick={() => handleDelete(request.id)} className="btn-secondary text-sm flex items-center gap-1 text-red-600 hover:text-red-700"><Trash2 className="h-4 w-4" />Löschen</button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl my-8">
            <div className="p-6 border-b flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Neuen Auftrag erstellen</h2>
              <button onClick={() => setShowForm(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
              <div>
                <label className="label">Auftragsart *</label>
                <div className="grid md:grid-cols-2 gap-3">
                  {requestTypeOptions.map((type) => {
                    const Icon = type.icon;
                    return (
                      <label key={type.value} className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-colors ${formData.request_type === type.value ? "border-primary-500 bg-primary-50" : "border-gray-200 hover:border-gray-300"}`}>
                        <input type="radio" name="request_type" value={type.value} checked={formData.request_type === type.value} onChange={(e) => setFormData({ ...formData, request_type: e.target.value })} className="sr-only" />
                        <Icon className={`h-6 w-6 mt-0.5 ${formData.request_type === type.value ? "text-primary-600" : "text-gray-400"}`} />
                        <div>
                          <p className="font-medium text-gray-900">{type.label}</p>
                          <p className="text-sm text-gray-500">{type.description}</p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="label">Titel *</label>
                <input type="text" className="input" placeholder="z.B. 5 Erntehelfer für Sommer 2024" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} required />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="label">Anzahl Positionen</label>
                  <input type="number" min="1" className="input" value={formData.positions_needed} onChange={(e) => setFormData({ ...formData, positions_needed: parseInt(e.target.value) || 1 })} />
                </div>
                <div>
                  <label className="label">Gehaltsrahmen</label>
                  <input type="text" className="input" placeholder="z.B. 12-14€/Stunde" value={formData.salary_range} onChange={(e) => setFormData({ ...formData, salary_range: e.target.value })} />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="label">Startdatum</label>
                  <input type="date" className="input" value={formData.start_date} onChange={(e) => setFormData({ ...formData, start_date: e.target.value })} />
                </div>
                <div>
                  <label className="label">Deadline</label>
                  <input type="date" className="input" value={formData.deadline} onChange={(e) => setFormData({ ...formData, deadline: e.target.value })} />
                </div>
              </div>

              {/* Stellenart */}
              <div>
                <label className="label">Welche Art von Personal suchen Sie?</label>
                <div className="relative">
                  <select className="input pr-10 appearance-none" value={formData.position_type} onChange={(e) => setFormData({ ...formData, position_type: e.target.value })}>
                    {positionTypeOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
                </div>
              </div>

              {/* Semesterferien (nur bei Studentenjobs) */}
              {formData.position_type === "studentenferienjob" && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                  <h3 className="font-medium text-blue-900 mb-3 flex items-center gap-2"><Calendar className="h-5 w-5 text-blue-600" />Gewünschte Semesterferien</h3>
                  <p className="text-sm text-blue-700 mb-3">Wann sollen die Studenten bei Ihnen arbeiten? (max. 90 Tage)</p>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div><label className="label text-blue-800">Semesterferien Beginn</label><input type="date" className="input" value={formData.semester_break_start} onChange={(e) => setFormData({ ...formData, semester_break_start: e.target.value })} /></div>
                    <div><label className="label text-blue-800">Semesterferien Ende</label><input type="date" className="input" value={formData.semester_break_end} onChange={(e) => setFormData({ ...formData, semester_break_end: e.target.value })} /></div>
                  </div>
                </div>
              )}

              {jobs.length > 0 && (
                <div>
                  <label className="label">Verknüpfte Stellenanzeige (optional)</label>
                  <div className="relative">
                    <select className="input pr-10 appearance-none" value={formData.job_posting_id} onChange={(e) => setFormData({ ...formData, job_posting_id: e.target.value })}>
                      <option value="">Keine Verknüpfung</option>
                      {jobs.map((job) => <option key={job.id} value={job.id}>{job.title}</option>)}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
                  </div>
                </div>
              )}

              <div>
                <label className="label">Beschreibung</label>
                <textarea className="input" rows={4} placeholder="Beschreiben Sie Ihre Anforderungen, gewünschte Qualifikationen, Sprachkenntnisse etc." value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
              </div>

              {/* Kontaktperson */}
              <div className="border-t pt-6">
                <h3 className="font-medium text-gray-900 mb-2">Kontaktperson für diesen Auftrag (optional)</h3>
                <p className="text-sm text-gray-500 mb-4">Falls leer, werden Ihre Firmenkontaktdaten verwendet.</p>
                <div className="grid md:grid-cols-3 gap-4">
                  <div><label className="label">Name</label><input type="text" className="input" placeholder="Max Mustermann" value={formData.contact_name} onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })} /></div>
                  <div><label className="label">E-Mail</label><input type="email" className="input" placeholder="kontakt@firma.de" value={formData.contact_email} onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })} /></div>
                  <div><label className="label">Telefon</label><input type="tel" className="input" placeholder="+49 123 456789" value={formData.contact_phone} onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })} /></div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Abbrechen</button>
                <button type="submit" disabled={submitting} className="btn-primary flex items-center gap-2">
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                  Auftrag absenden
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selectedRequest && (
        <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl my-8 relative">
            <button onClick={() => setSelectedRequest(null)} className="absolute top-4 right-4 p-2 hover:bg-gray-200 rounded-lg z-10 bg-gray-100"><X className="h-6 w-6 text-gray-700" /></button>
            {detailLoading ? (
              <div className="p-12 flex justify-center"><Loader2 className="h-12 w-12 text-primary-600 animate-spin" /></div>
            ) : (
              <>
                <div className="p-6 border-b bg-primary-50 pr-16">
                  <div className="flex items-center gap-3 mb-2 flex-wrap">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[selectedRequest.status] || "bg-gray-100"}`}>{selectedRequest.status_label || selectedRequest.status}</span>
                    {selectedRequest.request_type_label && <span className="px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-700">{selectedRequest.request_type_label}</span>}
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900">{selectedRequest.title}</h2>
                  <p className="text-gray-600">Erstellt: {formatDate(selectedRequest.created_at)}</p>
                </div>
                <div className="p-6 space-y-6">
                  {selectedRequest.description && <div className="bg-gray-50 rounded-xl p-4"><h3 className="font-semibold text-gray-900 mb-2">Beschreibung</h3><p className="text-gray-700 whitespace-pre-line">{selectedRequest.description}</p></div>}
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="bg-blue-50 rounded-xl p-4">
                      <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2"><Users className="h-5 w-5 text-blue-600" />Positionen</h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between"><span className="text-gray-600">Benötigt</span><span className="font-medium">{selectedRequest.positions_needed}</span></div>
                        <div className="flex justify-between"><span className="text-gray-600">Besetzt</span><span className="font-medium">{selectedRequest.positions_filled || 0}</span></div>
                        {(selectedRequest.candidates_proposed || 0) > 0 && <div className="flex justify-between"><span className="text-gray-600">Kandidaten vorgeschlagen</span><span className="font-medium text-purple-600">{selectedRequest.candidates_proposed}</span></div>}
                      </div>
                    </div>
                    <div className="bg-green-50 rounded-xl p-4">
                      <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2"><Calendar className="h-5 w-5 text-green-600" />Zeitraum</h3>
                      <div className="space-y-2 text-sm">
                        {selectedRequest.start_date && <div className="flex justify-between"><span className="text-gray-600">Gewünschter Start</span><span className="font-medium">{formatDate(selectedRequest.start_date)}</span></div>}
                        {selectedRequest.deadline && <div className="flex justify-between"><span className="text-gray-600">Deadline</span><span className="font-medium">{formatDate(selectedRequest.deadline)}</span></div>}
                        {selectedRequest.salary_range && <div className="flex justify-between"><span className="text-gray-600">Gehalt</span><span className="font-medium">{selectedRequest.salary_range}</span></div>}
                        {selectedRequest.requirements?.position_type && <div className="flex justify-between"><span className="text-gray-600">Stellenart</span><span className="font-medium capitalize">{selectedRequest.requirements.position_type}</span></div>}
                      </div>
                    </div>
                  </div>
                  {(selectedRequest.contact_name || selectedRequest.contact_email || selectedRequest.contact_phone) && (
                    <div className="bg-gray-50 rounded-xl p-4">
                      <h3 className="font-semibold text-gray-900 mb-3">Kontaktperson</h3>
                      <div className="space-y-2 text-sm">
                        {selectedRequest.contact_name && <p className="text-gray-700">{selectedRequest.contact_name}</p>}
                        {selectedRequest.contact_email && <a href={`mailto:${selectedRequest.contact_email}`} className="flex items-center gap-2 text-primary-600 hover:underline"><Mail className="h-4 w-4" />{selectedRequest.contact_email}</a>}
                        {selectedRequest.contact_phone && <a href={`tel:${selectedRequest.contact_phone}`} className="flex items-center gap-2 text-primary-600 hover:underline"><Phone className="h-4 w-4" />{selectedRequest.contact_phone}</a>}
                      </div>
                    </div>
                  )}
                  {selectedRequest.admin_notes && (
                    <div className="bg-yellow-50 rounded-xl p-4 border border-yellow-200">
                      <h3 className="font-semibold text-yellow-800 mb-2">Nachricht von IJP</h3>
                      <p className="text-yellow-700 whitespace-pre-line">{selectedRequest.admin_notes}</p>
                    </div>
                  )}
                </div>
                <div className="p-6 border-t bg-gray-50 flex justify-between gap-4">
                  <button onClick={() => setSelectedRequest(null)} className="btn-secondary">Schließen</button>
                  <div className="flex gap-2">
                    {["pending", "ijp_review", "ijp_accepted", "in_progress"].includes(selectedRequest.status) && (
                      <button onClick={() => handleCancel(selectedRequest.id)} className="btn-secondary flex items-center gap-1 text-orange-600 hover:text-orange-700"><XCircle className="h-4 w-4" />Stornieren</button>
                    )}
                    {["cancelled", "completed"].includes(selectedRequest.status) && (
                      <button onClick={() => handleDelete(selectedRequest.id)} className="btn-secondary flex items-center gap-1 text-red-600 hover:text-red-700"><Trash2 className="h-4 w-4" />Löschen</button>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
