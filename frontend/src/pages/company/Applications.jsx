import { useState, useEffect, useMemo } from 'react';
import { applicationsAPI, documentsAPI, interviewAPI, downloadBlob } from '../../lib/api';
import toast from 'react-hot-toast';
import { 
  Users, User, Briefcase, Calendar, MessageSquare, Check, X, 
  Eye, Mail, Phone, MapPin, FileText, Download, GraduationCap,
  Globe, Loader2, ChevronDown, ChevronUp, Search, Filter, 
  ArrowUpDown, SlidersHorizontal, LayoutGrid, List, CalendarPlus,
  Clock, Video, MapPinned, CheckCircle, XCircle, AlertTriangle,
  Sparkles, TrendingUp, TrendingDown, Minus, FilePlus, Send
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
  workandholiday: 'Work & Holiday',
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
  const [pendingStatus, setPendingStatus] = useState(null); // Lokaler Status vor dem Speichern
  const [pendingInterview, setPendingInterview] = useState(null); // Lokale Interview-Daten vor dem Speichern
  const [savingStatus, setSavingStatus] = useState(false);
  
  // Interview Modal
  const [showInterviewModal, setShowInterviewModal] = useState(false);
  const [interviewData, setInterviewData] = useState({
    proposed_date_1: '',
    proposed_time_1: '',
    proposed_date_2: '',
    proposed_time_2: '',
    location: '',
    meeting_link: '',
    notes: '',
  });
  const [submittingInterview, setSubmittingInterview] = useState(false);
  const [interviews, setInterviews] = useState([]);
  const [cancellingInterview, setCancellingInterview] = useState(null);
  const [showCancelModal, setShowCancelModal] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  
  // Matching Score
  const [matchScore, setMatchScore] = useState(null);
  const [matchLoading, setMatchLoading] = useState(false);
  
  // Dokumente anfordern
  const [showDocRequestModal, setShowDocRequestModal] = useState(false);
  const [selectedDocTypes, setSelectedDocTypes] = useState([]);
  const [docRequestMessage, setDocRequestMessage] = useState('');
  const [submittingDocRequest, setSubmittingDocRequest] = useState(false);

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
    setPendingStatus(null); // Reset pending status
    setPendingInterview(null); // Reset pending interview
    setMatchScore(null); // Reset match score
    try {
      const response = await applicationsAPI.getApplicantDetails(appId);
      setApplicantDetails(response.data);
      setPendingStatus(response.data.application.status); // Setze initialen Status
      // Lade auch Interview-Daten
      loadInterviews(appId);
      // Lade Matching-Score
      loadMatchScore(appId);
    } catch (error) {
      toast.error('Fehler beim Laden der Details');
      setSelectedApp(null);
    } finally {
      setDetailsLoading(false);
    }
  };
  
  const loadMatchScore = async (appId) => {
    setMatchLoading(true);
    try {
      const response = await applicationsAPI.getMatchScore(appId);
      setMatchScore(response.data);
    } catch (error) {
      console.error('Fehler beim Laden des Matching-Scores');
    } finally {
      setMatchLoading(false);
    }
  };

  const loadInterviews = async (appId) => {
    try {
      const response = await interviewAPI.getForApplication(appId);
      setInterviews(response.data);
    } catch (error) {
      console.error('Interview-Fehler:', error);
    }
  };

  const cancelInterview = async (interviewId) => {
    setCancellingInterview(interviewId);
    try {
      await interviewAPI.cancel(interviewId, cancelReason);
      toast.success('Termin abgesagt - Bewerber wurde benachrichtigt');
      setShowCancelModal(null);
      setCancelReason('');
      loadApplications();
      if (selectedApp) {
        loadInterviews(selectedApp);
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Fehler beim Absagen');
    } finally {
      setCancellingInterview(null);
    }
  };

  const openInterviewModal = () => {
    setInterviewData({
      proposed_date_1: '',
      proposed_time_1: '10:00',
      proposed_date_2: '',
      proposed_time_2: '14:00',
      location: '',
      meeting_link: '',
      notes: '',
    });
    setShowInterviewModal(true);
  };

  const submitInterviewProposal = () => {
    if (!interviewData.proposed_date_1 || !interviewData.proposed_time_1) {
      toast.error('Bitte mindestens einen Termin angeben');
      return;
    }

    // Kombiniere Datum und Uhrzeit
    const date1 = new Date(`${interviewData.proposed_date_1}T${interviewData.proposed_time_1}`);
    let date2 = null;
    if (interviewData.proposed_date_2 && interviewData.proposed_time_2) {
      date2 = new Date(`${interviewData.proposed_date_2}T${interviewData.proposed_time_2}`);
    }

    // Speichere nur lokal - wird erst beim "Speichern" gesendet
    setPendingInterview({
      application_id: selectedApp,
      proposed_date_1: date1.toISOString(),
      proposed_date_2: date2 ? date2.toISOString() : null,
      location: interviewData.location || null,
      meeting_link: interviewData.meeting_link || null,
      notes: interviewData.notes || null,
      // Für Anzeige
      display_date_1: date1,
      display_date_2: date2,
    });

    // Status auf "Vorstellungsgespräch" setzen
    setPendingStatus('interview_scheduled');

    toast.success('Termine vorgemerkt - bitte unten "Speichern" klicken!');
    setShowInterviewModal(false);
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Für Inline-Dropdown in der Tabelle (sofort speichern)
  const updateStatusInline = async (id, status) => {
    try {
      await applicationsAPI.update(id, { status });
      toast.success('Status aktualisiert');
      loadApplications();
    } catch (error) {
      toast.error('Fehler beim Aktualisieren');
    }
  };

  // Im Modal: Status nur lokal ändern
  const setLocalStatus = (status) => {
    setPendingStatus(status);
  };

  // Im Modal: Alles speichern (Status + Interview) + 1 kombinierte Email
  const saveStatus = async () => {
    if (!selectedApp) return;
    
    const statusChanged = pendingStatus && applicantDetails && pendingStatus !== applicantDetails.application.status;
    const hasNewInterview = pendingInterview !== null;
    
    if (!statusChanged && !hasNewInterview) {
      toast.success('Keine Änderungen zum Speichern');
      return;
    }
    
    setSavingStatus(true);
    try {
      // 1. Interview-Vorschlag speichern OHNE Email (send_email=false)
      if (hasNewInterview) {
        await interviewAPI.propose(pendingInterview, false); // Keine separate Email!
      }
      
      // 2. Status aktualisieren (falls geändert)
      if (statusChanged) {
        await applicationsAPI.update(selectedApp, { status: pendingStatus });
      }
      
      // 3. EINE kombinierte Email senden
      const emailData = {
        application_id: selectedApp,
      };
      
      if (statusChanged) {
        emailData.new_status = pendingStatus;
      }
      
      if (hasNewInterview) {
        const dates = [
          new Date(pendingInterview.proposed_date_1).toLocaleString('de-DE', {
            weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
          })
        ];
        if (pendingInterview.proposed_date_2) {
          dates.push(new Date(pendingInterview.proposed_date_2).toLocaleString('de-DE', {
            weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
          }));
        }
        emailData.interview_dates = dates;
        emailData.interview_location = pendingInterview.location;
        emailData.interview_link = pendingInterview.meeting_link;
        emailData.interview_notes = pendingInterview.notes;
      }
      
      await interviewAPI.sendUpdateEmail(emailData);
      
      toast.success('Gespeichert! Bewerber wurde per E-Mail informiert.');
      
      // Aktualisiere alles
      loadApplications();
      loadInterviews(selectedApp);
      setPendingInterview(null);
      
      // Aktualisiere die lokalen Details
      setApplicantDetails(prev => ({
        ...prev,
        application: { ...prev.application, status: pendingStatus }
      }));
    } catch (error) {
      console.error('Fehler:', error);
      toast.error(error.response?.data?.detail || 'Fehler beim Speichern');
    } finally {
      setSavingStatus(false);
    }
  };

  // Prüfen ob es ungespeicherte Änderungen gibt
  const hasUnsavedChanges = () => {
    const statusChanged = pendingStatus && applicantDetails && pendingStatus !== applicantDetails.application.status;
    const hasNewInterview = pendingInterview !== null;
    return statusChanged || hasNewInterview;
  };

  // Modal schließen (mit Warnung bei ungespeicherten Änderungen)
  const closeDetailModal = () => {
    if (hasUnsavedChanges()) {
      if (!confirm('Sie haben ungespeicherte Änderungen. Wirklich schließen?')) {
        return;
      }
    }
    setSelectedApp(null);
    setApplicantDetails(null);
    setPendingStatus(null);
    setPendingInterview(null);
  };

  const handleDocumentDownload = async (documentId, filename) => {
    try {
      const response = await documentsAPI.download(documentId);
      downloadBlob(response.data, filename);
      toast.success('Download gestartet');
    } catch (error) {
      console.error('Download-Fehler:', error);
      toast.error('Fehler beim Herunterladen des Dokuments');
    }
  };

  // Dokumente anfordern
  const documentTypeOptions = [
    { value: 'cv', label: 'Lebenslauf' },
    { value: 'passport', label: 'Reisepass' },
    { value: 'photo', label: 'Bewerbungsfoto' },
    { value: 'enrollment_cert', label: 'Immatrikulationsbescheinigung' },
    { value: 'enrollment_trans', label: 'Immatrikulation (Übersetzung)' },
    { value: 'ba_declaration', label: 'BA-Erklärung' },
    { value: 'language_cert', label: 'Sprachzertifikat' },
    { value: 'diploma', label: 'Studienzeugnis/Abschluss' },
    { value: 'school_cert', label: 'Schulzeugnis' },
    { value: 'work_reference', label: 'Arbeitszeugnis' },
    { value: 'visa', label: 'Visum' },
    { value: 'other', label: 'Sonstiges' },
  ];

  const openDocRequestModal = () => {
    setSelectedDocTypes([]);
    setDocRequestMessage('');
    setShowDocRequestModal(true);
  };

  const toggleDocType = (docType) => {
    setSelectedDocTypes(prev => 
      prev.includes(docType) 
        ? prev.filter(t => t !== docType)
        : [...prev, docType]
    );
  };

  const submitDocumentRequest = async () => {
    if (selectedDocTypes.length === 0) {
      toast.error('Bitte wählen Sie mindestens ein Dokument aus');
      return;
    }

    setSubmittingDocRequest(true);
    try {
      await applicationsAPI.requestDocuments(selectedApp, {
        document_types: selectedDocTypes,
        message: docRequestMessage || null
      });
      toast.success('Dokumentenanforderung gesendet! Der Bewerber wurde per E-Mail benachrichtigt.');
      setShowDocRequestModal(false);
      // Details neu laden um angeforderte Dokumente anzuzeigen
      loadApplicantDetails(selectedApp);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Fehler beim Senden der Anforderung');
    } finally {
      setSubmittingDocRequest(false);
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

  // Status Dropdown inline (in Tabelle - speichert sofort)
  const StatusDropdown = ({ app }) => {
    return (
      <select
        value={app.status}
        onChange={(e) => updateStatusInline(app.id, e.target.value)}
        onClick={(e) => e.stopPropagation()}
        className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 bg-white hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 cursor-pointer"
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
              onClick={closeDetailModal}
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
                  {/* Matching Score Box */}
                  {matchScore?.enabled && (
                    <div className={`md:col-span-2 rounded-xl p-5 border-2 ${
                      matchScore.total_score >= 70 
                        ? 'border-green-300 bg-gradient-to-r from-green-50 to-emerald-50' 
                        : matchScore.total_score >= 40 
                          ? 'border-yellow-300 bg-gradient-to-r from-yellow-50 to-amber-50'
                          : 'border-red-300 bg-gradient-to-r from-red-50 to-orange-50'
                    }`}>
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <Sparkles className={`h-6 w-6 ${
                            matchScore.total_score >= 70 
                              ? 'text-green-600' 
                              : matchScore.total_score >= 40 
                                ? 'text-yellow-600'
                                : 'text-red-600'
                          }`} />
                          <h3 className="text-lg font-bold text-gray-900">Matching-Score</h3>
                        </div>
                        {matchScore.total_score >= 70 ? (
                          <TrendingUp className="h-5 w-5 text-green-600" />
                        ) : matchScore.total_score >= 40 ? (
                          <Minus className="h-5 w-5 text-yellow-600" />
                        ) : (
                          <TrendingDown className="h-5 w-5 text-red-600" />
                        )}
                      </div>
                      
                      <div className="flex items-center gap-8">
                        {/* Score Circle */}
                        <div className={`w-24 h-24 rounded-full flex items-center justify-center flex-shrink-0 ${
                          matchScore.total_score >= 70 
                            ? 'bg-green-100' 
                            : matchScore.total_score >= 40 
                              ? 'bg-yellow-100'
                              : 'bg-red-100'
                        }`}>
                          <span className={`text-3xl font-bold ${
                            matchScore.total_score >= 70 
                              ? 'text-green-700' 
                              : matchScore.total_score >= 40 
                                ? 'text-yellow-700'
                                : 'text-red-700'
                          }`}>
                            {matchScore.total_score}%
                          </span>
                        </div>
                        
                        <div className="flex-1">
                          <p className={`font-semibold mb-3 ${
                            matchScore.total_score >= 70 
                              ? 'text-green-700' 
                              : matchScore.total_score >= 40 
                                ? 'text-yellow-700'
                                : 'text-red-700'
                          }`}>
                            {matchScore.recommendation}
                          </p>
                          
                          {/* Score Breakdown */}
                          {matchScore.breakdown && (
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
                              <div className="bg-white/60 rounded-lg p-2">
                                <span className="text-gray-600 block text-xs">Position</span>
                                <span className="font-semibold">{matchScore.breakdown.position_type}/30</span>
                              </div>
                              <div className="bg-white/60 rounded-lg p-2">
                                <span className="text-gray-600 block text-xs">Deutsch</span>
                                <span className="font-semibold">{matchScore.breakdown.german_level}/25</span>
                              </div>
                              <div className="bg-white/60 rounded-lg p-2">
                                <span className="text-gray-600 block text-xs">Englisch</span>
                                <span className="font-semibold">{matchScore.breakdown.english_level}/15</span>
                              </div>
                              <div className="bg-white/60 rounded-lg p-2">
                                <span className="text-gray-600 block text-xs">Erfahrung</span>
                                <span className="font-semibold">{matchScore.breakdown.experience}/20</span>
                              </div>
                              <div className="bg-white/60 rounded-lg p-2">
                                <span className="text-gray-600 block text-xs">Verfügbarkeit</span>
                                <span className="font-semibold">{matchScore.breakdown.availability}/10</span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* Details */}
                      {matchScore.details?.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-gray-200/50">
                          <ul className="text-sm text-gray-700 grid md:grid-cols-2 gap-1">
                            {matchScore.details.map((detail, i) => (
                              <li key={i}>{detail}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Matching Loading */}
                  {matchLoading && (
                    <div className="md:col-span-2 flex items-center justify-center gap-2 py-4 bg-gray-50 rounded-xl">
                      <Loader2 className="h-5 w-5 animate-spin text-primary-600" />
                      <span className="text-gray-600">Berechne Matching...</span>
                    </div>
                  )}
                  
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
                      {applicantDetails.applicant.current_semester && (
                        <div className="flex justify-between p-2 bg-white rounded">
                          <span className="text-gray-500">Semester</span>
                          <span className="font-medium">{applicantDetails.applicant.current_semester}. Semester</span>
                        </div>
                      )}
                      {/* Semesterferien - immer für Studentenferienjobs anzeigen */}
                      {applicantDetails.applicant.position_type === 'studentenferienjob' && (
                        applicantDetails.applicant.semester_break_start || applicantDetails.applicant.semester_break_end ? (
                          <div className="flex justify-between p-2 bg-green-50 rounded border border-green-200">
                            <span className="text-green-700 font-medium">📅 Semesterferien</span>
                            <span className="font-medium text-green-800">
                              {formatDate(applicantDetails.applicant.semester_break_start)} - {formatDate(applicantDetails.applicant.semester_break_end)}
                            </span>
                          </div>
                        ) : (
                          <div className="flex justify-between p-2 bg-yellow-50 rounded border border-yellow-200">
                            <span className="text-yellow-700 font-medium">📅 Semesterferien</span>
                            <span className="font-medium text-yellow-600 italic">
                              Nicht angegeben
                            </span>
                          </div>
                        )
                      )}
                    </div>
                  </div>

                  {/* Nachricht des Bewerbers */}
                  {applicantDetails.application.applicant_message && (
                    <div className="md:col-span-2 bg-blue-50 rounded-xl p-5 border border-blue-200">
                      <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                        <MessageSquare className="h-5 w-5 text-blue-600" />
                        Nachricht des Bewerbers
                      </h3>
                      <p className="text-gray-700 whitespace-pre-line">
                        {applicantDetails.application.applicant_message}
                      </p>
                    </div>
                  )}

                  {/* Dokumente */}
                  <div className="md:col-span-2 bg-gray-50 rounded-xl p-5">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-bold text-gray-900 flex items-center gap-2">
                        <FileText className="h-5 w-5 text-primary-600" />
                        Dokumente ({applicantDetails.documents.length})
                      </h3>
                      <button
                        onClick={openDocRequestModal}
                        className="px-4 py-2 bg-orange-500 text-white rounded-lg font-medium hover:bg-orange-600 transition-colors flex items-center gap-2"
                      >
                        <FilePlus className="h-4 w-4" />
                        Dokumente anfordern
                      </button>
                    </div>
                    {applicantDetails.documents.length === 0 ? (
                      <p className="text-gray-500">Keine Dokumente hochgeladen</p>
                    ) : (
                      <div className="grid md:grid-cols-2 gap-3">
                        {applicantDetails.documents.map((doc) => (
                          <button
                            key={doc.id}
                            onClick={() => handleDocumentDownload(doc.id, doc.original_name)}
                            className="flex items-center justify-between p-3 bg-white rounded-lg hover:bg-primary-50 transition-colors group text-left w-full"
                          >
                            <div className="flex items-center gap-3">
                              <FileText className="h-5 w-5 text-gray-400 group-hover:text-primary-600" />
                              <div>
                                <p className="font-medium text-gray-900 group-hover:text-primary-600">{doc.original_name}</p>
                                <p className="text-xs text-gray-500">{doc.document_type}</p>
                              </div>
                            </div>
                            <Download className="h-4 w-4 text-gray-400 group-hover:text-primary-600" />
                          </button>
                        ))}
                      </div>
                    )}
                    
                    {/* Angeforderte Dokumente anzeigen */}
                    {applicantDetails.application.requested_documents?.length > 0 && (
                      <div className="mt-4 p-4 bg-orange-50 rounded-lg border border-orange-200">
                        <h4 className="font-medium text-orange-800 mb-2 flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4" />
                          Angeforderte Dokumente
                        </h4>
                        <ul className="space-y-1">
                          {applicantDetails.application.requested_documents.map((req, idx) => (
                            <li key={idx} className="text-sm text-orange-700 flex items-center gap-2">
                              <span>• {documentTypeOptions.find(d => d.value === req.type)?.label || req.type}</span>
                              <span className="text-xs text-orange-500">
                                (angefordert am {new Date(req.requested_at).toLocaleDateString('de-DE')})
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* Interview-Termine */}
                  <div className="md:col-span-2 bg-purple-50 rounded-xl p-5 border border-purple-200">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-bold text-gray-900 flex items-center gap-2">
                        <CalendarPlus className="h-5 w-5 text-purple-600" />
                        Vorstellungsgespräch
                      </h3>
                      <button
                        onClick={openInterviewModal}
                        className="px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors flex items-center gap-2"
                      >
                        <CalendarPlus className="h-4 w-4" />
                        Termine vorschlagen
                      </button>
                    </div>
                    
                    {/* Bestehende Interviews anzeigen */}
                    {interviews.length > 0 ? (
                      <div className="space-y-3">
                        {interviews.map((interview) => (
                          <div key={interview.id} className={`p-4 rounded-lg border ${
                            interview.status === 'confirmed' ? 'bg-green-50 border-green-200' :
                            interview.status === 'declined' ? 'bg-red-50 border-red-200' :
                            'bg-white border-gray-200'
                          }`}>
                            <div className="flex items-start justify-between">
                              <div>
                                <div className="flex items-center gap-2 mb-2">
                                  {interview.status === 'confirmed' && <CheckCircle className="h-5 w-5 text-green-600" />}
                                  {interview.status === 'declined' && <XCircle className="h-5 w-5 text-red-600" />}
                                  {interview.status === 'proposed' && <Clock className="h-5 w-5 text-yellow-600" />}
                                  <span className={`font-medium ${
                                    interview.status === 'confirmed' ? 'text-green-700' :
                                    interview.status === 'declined' ? 'text-red-700' :
                                    'text-yellow-700'
                                  }`}>
                                    {interview.status_label}
                                  </span>
                                </div>
                                
                                {interview.confirmed_date ? (
                                  <p className="text-sm">
                                    <strong>Bestätigter Termin:</strong> {formatDateTime(interview.confirmed_date)}
                                  </p>
                                ) : (
                                  <div className="text-sm space-y-1">
                                    <p><strong>Vorschlag 1:</strong> {formatDateTime(interview.proposed_date_1)}</p>
                                    {interview.proposed_date_2 && (
                                      <p><strong>Vorschlag 2:</strong> {formatDateTime(interview.proposed_date_2)}</p>
                                    )}
                                  </div>
                                )}
                                
                                {interview.location && (
                                  <p className="text-sm text-gray-600 mt-2 flex items-center gap-1">
                                    <MapPinned className="h-4 w-4" />
                                    {interview.location}
                                  </p>
                                )}
                                {interview.meeting_link && (
                                  <p className="text-sm text-gray-600 flex items-center gap-1">
                                    <Video className="h-4 w-4" />
                                    <a href={interview.meeting_link} target="_blank" rel="noopener noreferrer" 
                                       className="text-primary-600 hover:underline">
                                      Meeting-Link
                                    </a>
                                  </p>
                                )}
                                
                                {interview.notes_applicant && interview.status === 'declined' && (
                                  <div className="mt-2 p-2 bg-red-100 rounded text-sm text-red-700">
                                    <strong>Absagegrund:</strong> {interview.notes_applicant}
                                  </div>
                                )}
                                
                                {/* Absagen-Button für bestätigte oder vorgeschlagene Termine */}
                                {(interview.status === 'confirmed' || interview.status === 'proposed') && (
                                  <button
                                    onClick={() => setShowCancelModal(interview.id)}
                                    className="mt-3 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 px-3 py-1.5 rounded-lg flex items-center gap-1"
                                  >
                                    <XCircle className="h-4 w-4" />
                                    Termin absagen
                                  </button>
                                )}
                                
                                {interview.status === 'cancelled' && (
                                  <div className="mt-2 p-3 bg-gray-100 rounded-lg text-sm border border-gray-200">
                                    <p className="font-medium text-gray-700 flex items-center gap-1">
                                      <XCircle className="h-4 w-4" />
                                      Termin wurde abgesagt
                                    </p>
                                    {interview.notes_company && (
                                      <p className="mt-2 text-gray-600">
                                        <strong>Ihr Grund:</strong> {interview.notes_company}
                                      </p>
                                    )}
                                    {interview.notes_applicant && (
                                      <p className="mt-2 p-2 bg-amber-50 rounded border border-amber-200 text-amber-800">
                                        <strong>Grund vom Bewerber:</strong> {interview.notes_applicant}
                                      </p>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : pendingInterview ? (
                      /* Vorgemerkte Termine (noch nicht gespeichert) */
                      <div className="p-4 rounded-lg border-2 border-dashed border-amber-400 bg-amber-50">
                        <div className="flex items-start gap-3">
                          <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
                          <div>
                            <p className="font-medium text-amber-800">Termine vorgemerkt (noch nicht gespeichert)</p>
                            <div className="text-sm text-amber-700 mt-2 space-y-1">
                              <p><strong>Vorschlag 1:</strong> {formatDateTime(pendingInterview.display_date_1)}</p>
                              {pendingInterview.display_date_2 && (
                                <p><strong>Vorschlag 2:</strong> {formatDateTime(pendingInterview.display_date_2)}</p>
                              )}
                              {pendingInterview.location && <p><strong>Ort:</strong> {pendingInterview.location}</p>}
                            </div>
                            <p className="text-xs text-amber-600 mt-2">
                              Klicken Sie unten auf "Speichern", um die Termine zu senden.
                            </p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <p className="text-gray-500 text-sm">
                        Noch keine Termine vorgeschlagen. Klicken Sie auf "Termine vorschlagen", um dem Bewerber 
                        Terminoptionen zu senden.
                      </p>
                    )}
                  </div>

                  {/* Status ändern */}
                  <div className="md:col-span-2 bg-primary-50 rounded-xl p-5 border-2 border-primary-200">
                    <h3 className="font-bold text-gray-900 mb-4">Bewerbungsstatus ändern</h3>
                    <div className="flex flex-wrap gap-3">
                      {statusOptions.map((status) => (
                        <button
                          key={status.value}
                          onClick={() => setLocalStatus(status.value)}
                          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                            pendingStatus === status.value
                              ? 'ring-2 ring-primary-500 ' + status.color
                              : 'bg-white hover:bg-gray-50 text-gray-700'
                          }`}
                        >
                          {status.label}
                        </button>
                      ))}
                    </div>
                    {hasUnsavedChanges() && (
                      <p className="text-sm text-amber-600 mt-3 flex items-center gap-1">
                        <AlertTriangle className="h-4 w-4" />
                        Ungespeicherte Änderungen - bitte speichern!
                      </p>
                    )}
                  </div>
                </div>

                {/* Footer mit Speichern und Schließen */}
                <div className="p-4 border-t bg-gray-50 flex justify-between items-center sticky bottom-0">
                  <div>
                    {hasUnsavedChanges() && (
                      <span className="text-sm text-amber-600 flex items-center gap-1">
                        <AlertTriangle className="h-4 w-4" />
                        Änderungen nicht gespeichert
                      </span>
                    )}
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={closeDetailModal}
                      className="btn-secondary flex items-center gap-2"
                    >
                      <X className="h-4 w-4" />
                      Schließen
                    </button>
                    <button
                      onClick={saveStatus}
                      disabled={savingStatus || !hasUnsavedChanges()}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                        hasUnsavedChanges()
                          ? 'bg-green-600 text-white hover:bg-green-700'
                          : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      }`}
                    >
                      {savingStatus ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Check className="h-4 w-4" />
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

      {/* Interview-Vorschlag Modal */}
      {showInterviewModal && (
        <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-[60] p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg my-8 relative">
            {/* Schließen-Button */}
            <button
              onClick={() => setShowInterviewModal(false)}
              className="absolute top-3 right-3 p-2 hover:bg-gray-100 rounded-full z-10"
            >
              <X className="h-5 w-5 text-gray-500" />
            </button>
            
            <div className="p-6 border-b pr-12">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <CalendarPlus className="h-6 w-6 text-purple-600" />
                Interviewtermine vorschlagen
              </h2>
              <p className="text-gray-600 text-sm mt-1">
                Schlagen Sie dem Bewerber 2 Terminoptionen vor. Die E-Mail wird erst nach dem Speichern gesendet.
              </p>
            </div>

            <div className="p-6 space-y-5">
              {/* Termin 1 (Pflicht) */}
              <div className="bg-purple-50 rounded-lg p-3 border border-purple-200">
                <h3 className="font-semibold text-purple-900 mb-2 flex items-center gap-2 text-sm">
                  <span className="bg-purple-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">1</span>
                  Terminvorschlag 1 *
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-gray-600">Datum</label>
                    <input
                      type="date"
                      className="input-styled w-full text-sm py-1.5"
                      value={interviewData.proposed_date_1}
                      onChange={(e) => setInterviewData({...interviewData, proposed_date_1: e.target.value})}
                      min={new Date().toISOString().split('T')[0]}
                      required
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-600">Uhrzeit</label>
                    <input
                      type="time"
                      className="input-styled w-full text-sm py-1.5"
                      value={interviewData.proposed_time_1}
                      onChange={(e) => setInterviewData({...interviewData, proposed_time_1: e.target.value})}
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Termin 2 (Optional) */}
              <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                <h3 className="font-semibold text-gray-700 mb-2 flex items-center gap-2 text-sm">
                  <span className="bg-gray-400 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">2</span>
                  Terminvorschlag 2 (optional)
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-gray-600">Datum</label>
                    <input
                      type="date"
                      className="input-styled w-full text-sm py-1.5"
                      value={interviewData.proposed_date_2}
                      onChange={(e) => setInterviewData({...interviewData, proposed_date_2: e.target.value})}
                      min={new Date().toISOString().split('T')[0]}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-600">Uhrzeit</label>
                    <input
                      type="time"
                      className="input-styled w-full text-sm py-1.5"
                      value={interviewData.proposed_time_2}
                      onChange={(e) => setInterviewData({...interviewData, proposed_time_2: e.target.value})}
                    />
                  </div>
                </div>
              </div>

              {/* Ort & Link */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-600 flex items-center gap-1">
                    <MapPinned className="h-3 w-3" />
                    Ort / Adresse
                  </label>
                  <input
                    type="text"
                    className="input-styled text-sm py-1.5"
                    placeholder="z.B. Online oder Adresse"
                    value={interviewData.location}
                    onChange={(e) => setInterviewData({...interviewData, location: e.target.value})}
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-600 flex items-center gap-1">
                    <Video className="h-3 w-3" />
                    Meeting-Link
                  </label>
                  <input
                    type="url"
                    className="input-styled text-sm py-1.5"
                    placeholder="https://..."
                    value={interviewData.meeting_link}
                    onChange={(e) => setInterviewData({...interviewData, meeting_link: e.target.value})}
                  />
                </div>
              </div>

              {/* Notizen */}
              <div>
                <label className="text-xs text-gray-600">Zusätzliche Informationen</label>
                <textarea
                  className="input-styled text-sm"
                  rows={2}
                  placeholder="z.B. Bitte bringen Sie Ihre Unterlagen mit..."
                  value={interviewData.notes}
                  onChange={(e) => setInterviewData({...interviewData, notes: e.target.value})}
                />
              </div>
            </div>

            <div className="p-3 border-t bg-gray-50 flex justify-end gap-2 rounded-b-2xl">
              <button
                onClick={() => setShowInterviewModal(false)}
                className="btn-secondary text-sm py-2 px-4"
              >
                Abbrechen
              </button>
              <button
                onClick={submitInterviewProposal}
                disabled={submittingInterview}
                className="btn-primary text-sm py-2 px-4 flex items-center gap-2"
              >
                {submittingInterview ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CalendarPlus className="h-4 w-4" />
                )}
                Termine vormerken
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Absage-Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[70] p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="p-6 border-b">
              <h2 className="text-xl font-bold flex items-center gap-2 text-red-700">
                <XCircle className="h-6 w-6" />
                Termin absagen
              </h2>
            </div>

            <div className="p-6">
              <p className="text-gray-600 mb-4">
                Möchten Sie diesen Termin wirklich absagen? Der Bewerber wird per E-Mail benachrichtigt.
              </p>
              
              <div>
                <label className="label">Grund (optional)</label>
                <textarea
                  className="input-styled"
                  rows={3}
                  placeholder="z.B. Terminkonflikt, wird verschoben..."
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                />
              </div>
            </div>

            <div className="p-4 border-t bg-gray-50 flex justify-end gap-3 rounded-b-2xl">
              <button
                onClick={() => {
                  setShowCancelModal(null);
                  setCancelReason('');
                }}
                className="btn-secondary"
              >
                Abbrechen
              </button>
              <button
                onClick={() => cancelInterview(showCancelModal)}
                disabled={cancellingInterview === showCancelModal}
                className="btn-danger flex items-center gap-2"
              >
                {cancellingInterview === showCancelModal ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <XCircle className="h-4 w-4" />
                )}
                Termin absagen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dokumente anfordern Modal */}
      {showDocRequestModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
            <div className="p-6 border-b bg-orange-50 rounded-t-2xl">
              <h2 className="text-xl font-bold flex items-center gap-2 text-orange-700">
                <FilePlus className="h-6 w-6" />
                Dokumente anfordern
              </h2>
              <p className="text-sm text-orange-600 mt-1">
                Der Bewerber wird per E-Mail benachrichtigt
              </p>
            </div>

            <div className="p-6">
              <p className="text-gray-600 mb-4">
                Wählen Sie die Dokumente aus, die der Bewerber nachreichen soll:
              </p>
              
              <div className="grid grid-cols-2 gap-2 mb-6">
                {documentTypeOptions.map((docType) => (
                  <button
                    key={docType.value}
                    onClick={() => toggleDocType(docType.value)}
                    className={`p-3 rounded-lg border text-left transition-colors ${
                      selectedDocTypes.includes(docType.value)
                        ? 'bg-orange-100 border-orange-500 text-orange-800'
                        : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className={`w-4 h-4 rounded border flex items-center justify-center ${
                        selectedDocTypes.includes(docType.value)
                          ? 'bg-orange-500 border-orange-500'
                          : 'border-gray-300'
                      }`}>
                        {selectedDocTypes.includes(docType.value) && (
                          <Check className="h-3 w-3 text-white" />
                        )}
                      </div>
                      <span className="text-sm font-medium">{docType.label}</span>
                    </div>
                  </button>
                ))}
              </div>

              <div>
                <label className="label">Nachricht an den Bewerber (optional)</label>
                <textarea
                  className="input-styled"
                  rows={3}
                  placeholder="z.B. Bitte reichen Sie die fehlenden Unterlagen zeitnah nach..."
                  value={docRequestMessage}
                  onChange={(e) => setDocRequestMessage(e.target.value)}
                />
              </div>
            </div>

            <div className="p-4 border-t bg-gray-50 flex justify-end gap-3 rounded-b-2xl">
              <button
                onClick={() => setShowDocRequestModal(false)}
                className="btn-secondary"
              >
                Abbrechen
              </button>
              <button
                onClick={submitDocumentRequest}
                disabled={submittingDocRequest || selectedDocTypes.length === 0}
                className="bg-orange-500 text-white px-4 py-2 rounded-lg font-medium hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {submittingDocRequest ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                Anforderung senden
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CompanyApplications;
