"use client";

import { useState, useEffect, useMemo } from "react";
import { applicationsAPI, interviewAPI } from "@/lib/api";
import { toast } from "react-hot-toast";
import { useTranslation } from "react-i18next";
import { 
  Loader2, FileText, User, Calendar, Eye, X, Mail, Phone,
  MapPin, FilePlus, CheckCircle, Search, Filter, Briefcase,
  Users, ArrowUpDown, ChevronUp, ChevronDown, Sparkles,
  StickyNote, Save, CalendarPlus, Check, Clock, Video, MapPinned,
  XCircle, Download, AlertTriangle, HelpCircle
} from "lucide-react";

interface Application {
  id: number;
  applicant_id: number;
  applicant_name?: string;
  applicant_email?: string;
  job_posting_id: number;
  job_id?: number;
  job_title?: string;
  status: string;
  applied_at: string;
  match_score?: number;
  requested_documents?: { type: string }[];
  interview_status?: string;
}

interface ApplicantAddress {
  street?: string;
  house_number?: string;
  postal_code?: string;
  city?: string;
  country?: string;
}

interface Applicant {
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  address?: ApplicantAddress;
  nationality?: string;
  date_of_birth?: string;
  german_level?: string;
  english_level?: string;
  position_type?: string;
  work_experience_years?: number;
  university_name?: string;
  field_of_study?: string;
}

interface Job {
  id: number;
  title: string;
}

interface ApplicationInfo {
  id: number;
  status: string;
}

interface ApplicantDetails {
  applicant: Applicant;
  job: Job;
  application: ApplicationInfo;
  documents?: { id: number; original_name: string; document_type: string }[];
}

export default function CompanyApplicationsPage() {
  const { t } = useTranslation();

  const statusOptions = [
    { value: "pending", label: t('applicationStatus.pending'), color: "bg-yellow-100 text-yellow-800", dotColor: "bg-yellow-500" },
    { value: "company_review", label: t('applicationStatus.company_review'), color: "bg-blue-100 text-blue-800", dotColor: "bg-blue-500" },
    { value: "interview_scheduled", label: t('applicationStatus.interview_scheduled'), color: "bg-purple-100 text-purple-800", dotColor: "bg-purple-500" },
    { value: "accepted", label: t('applicationStatus.accepted'), color: "bg-green-100 text-green-800", dotColor: "bg-green-500" },
    { value: "rejected", label: t('applicationStatus.rejected'), color: "bg-red-100 text-red-800", dotColor: "bg-red-500" },
  ];

  const documentTypes = [
    { value: "cv", label: t('documentTypes.cv') },
    { value: "passport", label: t('documentTypes.passport') },
    { value: "photo", label: t('documentTypes.photo') },
    { value: "language_cert", label: t('documentTypes.language_cert') },
    { value: "diploma", label: t('documentTypes.diploma') },
    { value: "school_cert", label: t('documentTypes.school_cert') },
    { value: "work_reference", label: t('documentTypes.work_reference') },
    { value: "visa", label: t('documentTypes.visa') },
    { value: "other", label: t('documentTypes.other') },
  ];
  const [applications, setApplications] = useState<Application[]>([]);
  const [filteredOutApplications, setFilteredOutApplications] = useState<Application[]>([]); // Bewerbungen unter Score-Schwellenwert
  const [activeTab, setActiveTab] = useState<"main" | "filtered">("main");
  const [loading, setLoading] = useState(true);
  
  // Filter & Sortierung
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [jobFilter, setJobFilter] = useState("all");
  const [scoreFilter, setScoreFilter] = useState("all");
  const [sortBy, setSortBy] = useState("applied_at");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  
  // Detail Modal
  const [selectedAppId, setSelectedAppId] = useState<number | null>(null);
  const [applicantDetails, setApplicantDetails] = useState<ApplicantDetails | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  
  // Status ändern
  const [updatingStatus, setUpdatingStatus] = useState<number | null>(null);
  const [pendingStatus, setPendingStatus] = useState<string | null>(null);
  const [savingStatus, setSavingStatus] = useState(false);
  
  // Notizen
  const [companyNotes, setCompanyNotes] = useState("");
  const [notesLoading, setNotesLoading] = useState(false);
  const [savingNotes, setSavingNotes] = useState(false);
  
  // Dokumente anfordern
  const [showDocRequestModal, setShowDocRequestModal] = useState(false);
  const [selectedDocTypes, setSelectedDocTypes] = useState<string[]>([]);
  const [docRequestMessage, setDocRequestMessage] = useState("");
  const [submittingDocRequest, setSubmittingDocRequest] = useState(false);
  
  // Interview
  const [showInterviewModal, setShowInterviewModal] = useState(false);
  const [interviews, setInterviews] = useState<any[]>([]);
  const [interviewData, setInterviewData] = useState({
    proposed_date_1: "",
    proposed_time_1: "10:00",
    proposed_date_2: "",
    proposed_time_2: "14:00",
    location: "",
    meeting_link: "",
    notes: "",
  });
  const [pendingInterview, setPendingInterview] = useState<any>(null);

  useEffect(() => {
    loadApplications();
  }, []);

  const loadApplications = async () => {
    try {
      // Normale Bewerbungen laden (nicht gefiltert)
      const response = await applicationsAPI.getCompanyApplications(false);
      setApplications(response.data || []);
      
      // Gefilterte Bewerbungen laden (unter Score-Schwellenwert)
      const filteredResponse = await applicationsAPI.getFilteredApplications();
      setFilteredOutApplications(filteredResponse.data || []);
    } catch (error) {
      console.error("Error loading applications:", error);
      toast.error(t("common.error"));
    } finally {
      setLoading(false);
    }
  };

  // Alle einzigartigen Jobs für Filter
  const uniqueJobs = useMemo(() => {
    const jobs = [...new Map(applications.map(a => {
      const jobId = a.job_id || a.job_posting_id;
      return [jobId, { id: jobId, title: a.job_title || t("common.unknown") }];
    })).values()].filter(j => j.id);
    return jobs;
  }, [applications]);

  // Aktuelle Bewerbungsliste basierend auf Tab
  const currentApplications = activeTab === "main" ? applications : filteredOutApplications;

  // Gefilterte und sortierte Bewerbungen
  const filteredApplications = useMemo(() => {
    let filtered = [...currentApplications];

    // Suchfilter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(a => 
        a.applicant_name?.toLowerCase().includes(term) ||
        a.job_title?.toLowerCase().includes(term) ||
        a.applicant_email?.toLowerCase().includes(term)
      );
    }

    // Statusfilter
    if (statusFilter !== "all") {
      filtered = filtered.filter(a => a.status === statusFilter);
    }

    // Jobfilter
    if (jobFilter !== "all") {
      filtered = filtered.filter(a => (a.job_id || a.job_posting_id) === parseInt(jobFilter));
    }
    
    // Score-Filter
    if (scoreFilter !== "all") {
      filtered = filtered.filter(a => {
        const score = a.match_score || 0;
        if (scoreFilter === "high") return score >= 70;
        if (scoreFilter === "medium") return score >= 40 && score < 70;
        if (scoreFilter === "low") return score < 40;
        return true;
      });
    }

    // Sortierung
    filtered.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case "applicant_name":
          comparison = (a.applicant_name || "").localeCompare(b.applicant_name || "");
          break;
        case "job_title":
          comparison = (a.job_title || "").localeCompare(b.job_title || "");
          break;
        case "status":
          const statusOrder = statusOptions.map(s => s.value);
          comparison = statusOrder.indexOf(a.status) - statusOrder.indexOf(b.status);
          break;
        case "match_score":
          comparison = (a.match_score || 0) - (b.match_score || 0);
          break;
        case "applied_at":
        default:
          comparison = new Date(a.applied_at).getTime() - new Date(b.applied_at).getTime();
          break;
      }
      return sortOrder === "asc" ? comparison : -comparison;
    });

    return filtered;
  }, [currentApplications, searchTerm, statusFilter, jobFilter, scoreFilter, sortBy, sortOrder]);

  // Statistiken
  const stats = useMemo(() => ({
    total: applications.length,
    pending: applications.filter(a => a.status === "pending").length,
    inReview: applications.filter(a => a.status === "company_review").length,
    interview: applications.filter(a => a.status === "interview_scheduled").length,
    accepted: applications.filter(a => a.status === "accepted").length,
    rejected: applications.filter(a => a.status === "rejected").length,
  }), [applications]);

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortOrder("desc");
    }
  };

  const SortIcon = ({ column }: { column: string }) => {
    if (sortBy !== column) return <ArrowUpDown className="h-4 w-4 text-gray-400" />;
    return sortOrder === "asc" 
      ? <ChevronUp className="h-4 w-4 text-primary-600" />
      : <ChevronDown className="h-4 w-4 text-primary-600" />;
  };

  const loadApplicantDetails = async (appId: number) => {
    setDetailsLoading(true);
    try {
      const response = await applicationsAPI.getApplicantDetails(appId);
      setApplicantDetails(response.data);
    } catch (error) {
      console.error("Error loading applicant details:", error);
      toast.error(t("common.error"));
    } finally {
      setDetailsLoading(false);
    }
  };

  const openDetails = (appId: number) => {
    setSelectedAppId(appId);
    setApplicantDetails(null);
    setPendingStatus(null);
    setCompanyNotes("");
    setPendingInterview(null);
    setInterviews([]);
    loadApplicantDetails(appId);
    loadCompanyNotes(appId);
    loadInterviews(appId);
    // Set initial pending status from application
    const app = applications.find(a => a.id === appId);
    if (app) {
      setPendingStatus(app.status);
    }
  };

  const closeDetails = () => {
    if (pendingInterview) {
      if (!confirm(t("company.unsavedInterviewWarning"))) {
        return;
      }
    }
    setSelectedAppId(null);
    setApplicantDetails(null);
    setPendingStatus(null);
    setCompanyNotes("");
    setPendingInterview(null);
    setInterviews([]);
  };

  const loadInterviews = async (appId: number) => {
    try {
      const response = await interviewAPI.getForApplication(appId);
      setInterviews(response.data || []);
    } catch (error) {
      console.error("Fehler beim Laden der Interviews");
    }
  };

  const openInterviewModal = () => {
    setInterviewData({
      proposed_date_1: "",
      proposed_time_1: "10:00",
      proposed_date_2: "",
      proposed_time_2: "14:00",
      location: "",
      meeting_link: "",
      notes: "",
    });
    setShowInterviewModal(true);
  };

  const submitInterviewProposal = () => {
    if (!interviewData.proposed_date_1 || !interviewData.proposed_time_1) {
      toast.error(t("company.pleaseSelectDate"));
      return;
    }

    // Kombiniere Datum und Uhrzeit
    const dateTime1 = `${interviewData.proposed_date_1}T${interviewData.proposed_time_1}:00`;
    let dateTime2 = null;
    if (interviewData.proposed_date_2 && interviewData.proposed_time_2) {
      dateTime2 = `${interviewData.proposed_date_2}T${interviewData.proposed_time_2}:00`;
    }

    // Speichere lokal - wird erst beim "Speichern" gesendet
    setPendingInterview({
      application_id: selectedAppId,
      proposed_date_1: dateTime1,
      proposed_date_2: dateTime2,
      location: interviewData.location || null,
      meeting_link: interviewData.meeting_link || null,
      notes: interviewData.notes || null,
    });

    // Status auf "Vorstellungsgespräch" setzen
    setPendingStatus("interview_scheduled");

    toast.success(t("company.datesMarked"));
    setShowInterviewModal(false);
  };

  const formatDateTime = (dateString: string) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const downloadICS = async (interviewId: number) => {
    try {
      const response = await interviewAPI.downloadICS(interviewId);
      const blob = new Blob([response.data], { type: "text/calendar" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `interview_${interviewId}.ics`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success(t("company.calendarDownloaded"));
    } catch (error) {
      toast.error(t("common.error"));
    }
  };

  const loadCompanyNotes = async (appId: number) => {
    setNotesLoading(true);
    try {
      const response = await applicationsAPI.getCompanyNotes(appId);
      setCompanyNotes(response.data.notes || "");
    } catch (error) {
      console.error("Fehler beim Laden der Notizen");
    } finally {
      setNotesLoading(false);
    }
  };

  const saveCompanyNotes = async () => {
    if (!selectedAppId) return;
    
    setSavingNotes(true);
    try {
      await applicationsAPI.updateCompanyNotes(selectedAppId, companyNotes);
      toast.success(t("company.notesSaved"));
    } catch (error) {
      toast.error(t("common.error"));
    } finally {
      setSavingNotes(false);
    }
  };

  const saveStatusAndClose = async () => {
    if (!selectedAppId) return;
    
    const currentApp = applications.find(a => a.id === selectedAppId);
    const statusChanged = pendingStatus && currentApp && pendingStatus !== currentApp.status;
    const hasNewInterview = pendingInterview !== null;
    
    if (!statusChanged && !hasNewInterview) {
      // Keine Änderungen - einfach schließen
      setSelectedAppId(null);
      setApplicantDetails(null);
      setPendingStatus(null);
      setCompanyNotes("");
      setPendingInterview(null);
      setInterviews([]);
      return;
    }
    
    setSavingStatus(true);
    try {
      // 1. Interview-Vorschlag speichern (ohne separate Email)
      if (hasNewInterview) {
        await interviewAPI.propose(pendingInterview, false);
      }
      
      // 2. Status aktualisieren (falls geändert)
      if (statusChanged) {
        await applicationsAPI.update(selectedAppId, { status: pendingStatus });
      }
      
      // 3. Kombinierte Email senden
      const emailData: any = {
        application_id: selectedAppId,
      };
      
      if (statusChanged) {
        emailData.new_status = pendingStatus;
      }
      
      if (hasNewInterview) {
        const dates = [
          new Date(pendingInterview.proposed_date_1).toLocaleString("de-DE", {
            weekday: "long", day: "2-digit", month: "long", year: "numeric",
            hour: "2-digit", minute: "2-digit"
          })
        ];
        if (pendingInterview.proposed_date_2) {
          dates.push(new Date(pendingInterview.proposed_date_2).toLocaleString("de-DE", {
            weekday: "long", day: "2-digit", month: "long", year: "numeric",
            hour: "2-digit", minute: "2-digit"
          }));
        }
        emailData.interview_dates = dates;
        emailData.interview_location = pendingInterview.location;
        emailData.interview_link = pendingInterview.meeting_link;
        emailData.interview_notes = pendingInterview.notes;
      }
      
      await interviewAPI.sendUpdateEmail(emailData);
      
      toast.success(t("company.savedAndNotified"));
      loadApplications();
      
      // Modal schließen
      setSelectedAppId(null);
      setApplicantDetails(null);
      setPendingStatus(null);
      setCompanyNotes("");
      setPendingInterview(null);
      setInterviews([]);
    } catch (error: any) {
      console.error("Fehler:", error);
      toast.error(error.response?.data?.detail || t("common.error"));
    } finally {
      setSavingStatus(false);
    }
  };

  const updateStatus = async (appId: number, newStatus: string) => {
    setUpdatingStatus(appId);
    try {
      await applicationsAPI.update(appId, { status: newStatus });
      toast.success(t("company.statusUpdated"));
      loadApplications();
    } catch (error) {
      toast.error(t("common.error"));
    } finally {
      setUpdatingStatus(null);
    }
  };

  const openDocRequestModal = () => {
    setSelectedDocTypes([]);
    setDocRequestMessage("");
    setShowDocRequestModal(true);
  };

  const toggleDocType = (docType: string) => {
    setSelectedDocTypes(prev => 
      prev.includes(docType) 
        ? prev.filter(t => t !== docType)
        : [...prev, docType]
    );
  };

  const submitDocumentRequest = async () => {
    if (selectedDocTypes.length === 0) {
      toast.error(t("applicantApplications.selectDocument"));
      return;
    }

    setSubmittingDocRequest(true);
    try {
      await applicationsAPI.requestDocuments(selectedAppId!, {
        document_types: selectedDocTypes,
        message: docRequestMessage || null
      });
      toast.success(t("company.documentRequestSent"));
      setShowDocRequestModal(false);
      loadApplicantDetails(selectedAppId!);
      loadApplications();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || t("common.error"));
    } finally {
      setSubmittingDocRequest(false);
    }
  };

  const clearAllFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
    setJobFilter("all");
    setScoreFilter("all");
  };

  const hasActiveFilters = searchTerm || statusFilter !== "all" || jobFilter !== "all" || scoreFilter !== "all";

  const selectedApp = selectedAppId 
    ? applications.find(a => a.id === selectedAppId) || filteredOutApplications.find(a => a.id === selectedAppId) 
    : null;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  const getStatusInfo = (status: string) => {
    return statusOptions.find(s => s.value === status) || { label: status, color: "bg-gray-100 text-gray-800" };
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      {/* Header mit Statistiken */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Users className="h-8 w-8 text-primary-600" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{t('companyApplications.title')}</h1>
            <p className="text-gray-600">{t('companyApplications.totalCount', { count: stats.total })}</p>
          </div>
        </div>
        
        {/* Mini-Stats */}
        <div className="flex flex-wrap gap-2">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-1.5 text-sm">
            <span className="font-bold text-yellow-700">{stats.pending}</span>
            <span className="text-yellow-600 ml-1">{t('applicationStatus.pending')}</span>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-1.5 text-sm">
            <span className="font-bold text-blue-700">{stats.inReview}</span>
            <span className="text-blue-600 ml-1">{t('applicationStatus.company_review')}</span>
          </div>
          <div className="bg-purple-50 border border-purple-200 rounded-lg px-3 py-1.5 text-sm">
            <span className="font-bold text-purple-700">{stats.interview}</span>
            <span className="text-purple-600 ml-1">{t('applicationStatus.interview_scheduled')}</span>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-1.5 text-sm">
            <span className="font-bold text-green-700">{stats.accepted}</span>
            <span className="text-green-600 ml-1">{t('applicationStatus.accepted')}</span>
          </div>
        </div>
      </div>

      {/* Tabs für Bewerbungen */}
      <div className="bg-white rounded-xl shadow-sm">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            <button
              onClick={() => setActiveTab("main")}
              className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "main"
                  ? "border-primary-500 text-primary-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                {t('companyApplications.mainApplications')}
                <span className={`px-2 py-0.5 rounded-full text-xs ${
                  activeTab === "main" ? "bg-primary-100 text-primary-700" : "bg-gray-100 text-gray-600"
                }`}>
                  {applications.length}
                </span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab("filtered")}
              className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "filtered"
                  ? "border-orange-500 text-orange-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                {t('companyApplications.filteredApplications')}
                {filteredOutApplications.length > 0 && (
                  <span className={`px-2 py-0.5 rounded-full text-xs ${
                    activeTab === "filtered" ? "bg-orange-100 text-orange-700" : "bg-gray-100 text-gray-600"
                  }`}>
                    {filteredOutApplications.length}
                  </span>
                )}
              </div>
            </button>
          </nav>
        </div>

        {/* Info-Box für gefilterte Bewerbungen */}
        {activeTab === "filtered" && (
          <div className="bg-orange-50 border-b border-orange-100 px-6 py-3">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-orange-500 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-orange-800">
                <p className="font-medium">{t('companyApplications.filteredInfo')}</p>
                <p className="text-orange-600 mt-1">{t('companyApplications.filteredDescription')}</p>
              </div>
            </div>
          </div>
        )}

        {/* Filter-Bereich */}
        <div className="px-3 py-3 border-b border-gray-100">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Suche */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder={t('companyApplications.searchPlaceholder')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>

            {/* Status Filter */}
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="appearance-none pl-4 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 min-w-[160px]"
            >
              <option value="all">{t('companyApplications.allStatus')}</option>
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
              className="appearance-none pl-4 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 min-w-[180px]"
            >
              <option value="all">{t('companyApplications.allJobs')}</option>
              {uniqueJobs.map((job) => (
                <option key={job.id} value={job.id}>
                  {job.title}
                </option>
              ))}
            </select>
            <Briefcase className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          </div>

          {/* Score Filter */}
          <div className="relative">
            <select
              value={scoreFilter}
              onChange={(e) => setScoreFilter(e.target.value)}
              className="appearance-none pl-4 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 min-w-[140px]"
            >
              <option value="all">{t('companyApplications.allScores')}</option>
              <option value="high">🟢 {t('companyApplications.scoreHigh')}</option>
              <option value="medium">🟡 {t('companyApplications.scoreMedium')}</option>
              <option value="low">🔴 {t('companyApplications.scoreLow')}</option>
            </select>
            <Sparkles className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          </div>
        </div>

        {/* Aktive Filter anzeigen */}
        {hasActiveFilters && (
          <div className="flex flex-wrap items-center gap-2 mt-4 pt-4 border-t">
            <span className="text-sm text-gray-500">{t('common.filter')}:</span>
            {searchTerm && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 rounded-lg text-sm">
                {t('common.search')}: "{searchTerm}"
                <button onClick={() => setSearchTerm("")} className="hover:text-red-600">
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            {statusFilter !== "all" && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 rounded-lg text-sm">
                Status: {statusOptions.find(s => s.value === statusFilter)?.label}
                <button onClick={() => setStatusFilter("all")} className="hover:text-red-600">
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            {jobFilter !== "all" && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 rounded-lg text-sm">
                {t('common.job')}: {uniqueJobs.find(j => j.id === parseInt(jobFilter))?.title}
                <button onClick={() => setJobFilter("all")} className="hover:text-red-600">
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            {scoreFilter !== "all" && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 rounded-lg text-sm">
                Score: {scoreFilter === "high" ? `🟢 ${t('companyApplications.scoreHigh')}` : scoreFilter === "medium" ? `🟡 ${t('companyApplications.scoreMedium')}` : `🔴 ${t('companyApplications.scoreLow')}`}
                <button onClick={() => setScoreFilter("all")} className="hover:text-red-600">
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            <button
              onClick={clearAllFilters}
              className="text-sm text-primary-600 hover:text-primary-700 font-medium"
            >
              {t('common.resetAll')}
            </button>
          </div>
        )}
        </div>

        {/* Ergebnisse – gleiche Card wie Filter */}
        {filteredApplications.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              {activeTab === "filtered" ? t('companyApplications.noFilteredApplications') : t('companyApplications.noApplications')}
            </h2>
            <p className="text-gray-600">
              {activeTab === "filtered"
                ? t('companyApplications.noFilteredApplicationsDesc')
                : applications.length === 0
                  ? t('companyApplications.noApplicationsYet')
                  : t('companyApplications.noMatchingApplications')}
            </p>
          </div>
        ) : (
          <>
          {/* Desktop Tabelle */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full min-w-[950px] table-fixed">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 w-[200px]">
                    <button 
                      onClick={() => handleSort("applicant_name")}
                      className="flex items-center gap-1 font-semibold text-gray-700 hover:text-primary-600"
                    >
                      {t('common.applicant')} <SortIcon column="applicant_name" />
                    </button>
                  </th>
                  <th className="text-left px-3 py-2.5 w-[180px]">
                    <button
                      onClick={() => handleSort("job_title")}
                      className="flex items-center gap-1 font-semibold text-gray-700 hover:text-primary-600"
                    >
                      {t('common.job')} <SortIcon column="job_title" />
                    </button>
                  </th>
                  <th className="text-left px-3 py-2.5 w-[70px]">
                    <button
                      onClick={() => handleSort("match_score")}
                      className="flex items-center gap-1 font-semibold text-gray-700 hover:text-primary-600"
                    >
                      Score <SortIcon column="match_score" />
                    </button>
                  </th>
                  <th className="text-left px-3 py-2.5 w-[90px]">
                    <button
                      onClick={() => handleSort("applied_at")}
                      className="flex items-center gap-1 font-semibold text-gray-700 hover:text-primary-600"
                    >
                      {t('common.date')} <SortIcon column="applied_at" />
                    </button>
                  </th>
                  <th className="text-left px-3 py-2.5 w-[120px]">
                    <button
                      onClick={() => handleSort("status")}
                      className="flex items-center gap-1 font-semibold text-gray-700 hover:text-primary-600"
                    >
                      Status <SortIcon column="status" />
                    </button>
                  </th>
                  <th className="text-center px-3 py-2.5 font-semibold text-gray-700 w-[80px]">Gespräch</th>
                  <th className="text-left px-3 py-2.5 font-semibold text-gray-700 w-[150px]">{t('companyApplications.changeStatus')}</th>
                  <th className="text-right px-3 py-2.5 font-semibold text-gray-700 w-[80px]">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredApplications.map((app) => {
                  const statusInfo = getStatusInfo(app.status);
                  const score = app.match_score || 0;
                  const scoreColor = score >= 70 ? "text-green-600" : score >= 40 ? "text-yellow-600" : "text-red-600";
                  return (
                    <tr key={app.id} className="hover:bg-gray-50">
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
                            <User className="h-4 w-4 text-primary-600" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-gray-900 truncate text-sm">
                              {app.applicant_name || t('common.unknown')}
                            </p>
                            <p className="text-xs text-gray-500 truncate">{app.applicant_email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-gray-900 text-sm">
                        <span className="block truncate" title={app.job_title || ''}>{app.job_title}</span>
                      </td>
                      <td className="px-3 py-2.5">
                        {app.match_score !== undefined && app.match_score !== null ? (
                          <span className={`font-semibold text-sm ${scoreColor}`}>
                            {app.match_score}%
                          </span>
                        ) : (
                          <span className="text-gray-400 text-sm">-</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-gray-600 text-sm">
                        {new Date(app.applied_at).toLocaleDateString("de-DE")}
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-1 flex-wrap">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusInfo.color}`}>
                            {statusInfo.label}
                          </span>
                          {app.requested_documents && app.requested_documents.some((d: any) => !d.fulfilled) && (
                            <span className="px-1.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700">Dok.⏳</span>
                          )}
                          {app.requested_documents && app.requested_documents.length > 0 && app.requested_documents.every((d: any) => d.fulfilled) && (
                            <span className="px-1.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">Dok.✓</span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        {app.interview_status === "confirmed" && (
                          <span title="Termin bestätigt"><CheckCircle className="h-5 w-5 text-green-500 mx-auto" /></span>
                        )}
                        {app.interview_status === "declined" && (
                          <span title="Termin abgelehnt"><XCircle className="h-5 w-5 text-red-500 mx-auto" /></span>
                        )}
                        {app.interview_status === "proposed" && (
                          <span title="Warte auf Antwort"><HelpCircle className="h-5 w-5 text-yellow-500 mx-auto" /></span>
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="relative inline-block">
                          <select
                            value={app.status}
                            onChange={(e) => updateStatus(app.id, e.target.value)}
                            disabled={updatingStatus === app.id}
                            className={`appearance-none text-sm border-2 rounded-lg pl-3 pr-8 py-1.5 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white cursor-pointer font-medium transition-colors ${
                              app.status === 'pending' ? 'border-yellow-300 text-yellow-700 bg-yellow-50' :
                              app.status === 'company_review' ? 'border-blue-300 text-blue-700 bg-blue-50' :
                              app.status === 'interview_scheduled' ? 'border-purple-300 text-purple-700 bg-purple-50' :
                              app.status === 'accepted' ? 'border-green-300 text-green-700 bg-green-50' :
                              app.status === 'rejected' ? 'border-red-300 text-red-700 bg-red-50' :
                              'border-gray-300 text-gray-700'
                            }`}
                          >
                            {statusOptions.map(opt => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 pointer-events-none" />
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <button
                          onClick={() => openDetails(app.id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-primary-600 text-white rounded-lg text-xs font-medium hover:bg-primary-700 transition-colors"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          {t('common.details')}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Karten-Ansicht */}
          <div className="lg:hidden divide-y divide-gray-100">
            {filteredApplications.map((app) => {
              const statusInfo = getStatusInfo(app.status);
              const score = app.match_score || 0;
              const scoreColor = score >= 70 ? "text-green-600 bg-green-50" : score >= 40 ? "text-yellow-600 bg-yellow-50" : "text-red-600 bg-red-50";
              return (
                <div key={app.id} className="p-4 hover:bg-gray-50">
                  {/* Kopfzeile: Name + Score */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <User className="h-5 w-5 text-primary-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{app.applicant_name || t('common.unknown')}</p>
                        <p className="text-sm text-gray-500">{app.applicant_email}</p>
                      </div>
                    </div>
                    {app.match_score !== undefined && app.match_score !== null && (
                      <span className={`px-2.5 py-1 rounded-full text-sm font-bold ${scoreColor}`}>
                        {app.match_score}%
                      </span>
                    )}
                  </div>

                  {/* Stelle + Datum */}
                  <div className="mb-3 pl-13">
                    <p className="text-sm text-gray-700 font-medium">{app.job_title}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(app.applied_at).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" })}
                    </p>
                  </div>

                  {/* Status + Interview Icons */}
                  <div className="flex items-center gap-2 mb-3 flex-wrap">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${statusInfo.color}`}>
                      {statusInfo.label}
                    </span>
                    {app.requested_documents && app.requested_documents.some((d: any) => !d.fulfilled) && (
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700">Dok.⏳</span>
                    )}
                    {app.requested_documents && app.requested_documents.length > 0 && app.requested_documents.every((d: any) => d.fulfilled) && (
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">Dok.✓</span>
                    )}
                    {app.interview_status === "confirmed" && (
                      <span className="flex items-center gap-1 text-xs text-green-600"><CheckCircle className="h-4 w-4" /> Termin</span>
                    )}
                    {app.interview_status === "proposed" && (
                      <span className="flex items-center gap-1 text-xs text-yellow-600"><HelpCircle className="h-4 w-4" /> Warte</span>
                    )}
                  </div>

                  {/* Aktionen */}
                  <div className="flex items-center gap-3">
                    <div className="relative flex-1">
                      <select
                        value={app.status}
                        onChange={(e) => updateStatus(app.id, e.target.value)}
                        disabled={updatingStatus === app.id}
                        className={`w-full appearance-none text-sm border-2 rounded-lg pl-3 pr-8 py-2 focus:ring-2 focus:ring-primary-500 bg-white cursor-pointer font-medium ${
                          app.status === 'pending' ? 'border-yellow-300 text-yellow-700 bg-yellow-50' :
                          app.status === 'company_review' ? 'border-blue-300 text-blue-700 bg-blue-50' :
                          app.status === 'interview_scheduled' ? 'border-purple-300 text-purple-700 bg-purple-50' :
                          app.status === 'accepted' ? 'border-green-300 text-green-700 bg-green-50' :
                          app.status === 'rejected' ? 'border-red-300 text-red-700 bg-red-50' :
                          'border-gray-300 text-gray-700'
                        }`}
                      >
                        {statusOptions.map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 pointer-events-none" />
                    </div>
                    <button
                      onClick={() => openDetails(app.id)}
                      className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors"
                    >
                      <Eye className="h-4 w-4" />
                      Details
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          </>
        )}
      </div>

      {/* Detail Modal */}
      {selectedAppId && (
        <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl my-8 relative">
            {/* Schließen-Button immer sichtbar */}
            <button 
              onClick={closeDetails}
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
                  <p className="text-gray-600">{applicantDetails.job?.title || selectedApp?.job_title}</p>
                </div>

                <div className="p-6 grid md:grid-cols-2 gap-6">
                  {/* Kontaktdaten */}
                  <div className="bg-gray-50 rounded-xl p-5">
                    <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <User className="h-5 w-5 text-primary-600" />
                      {t('companyApplications.contactInfo')}
                    </h3>
                    <div className="space-y-3">
                      <a 
                        href={`mailto:${applicantDetails.applicant.email}`}
                        className="flex items-center gap-3 p-3 bg-white rounded-lg hover:bg-primary-50 transition-colors"
                      >
                        <Mail className="h-5 w-5 text-primary-600" />
                        <div>
                          <p className="text-xs text-gray-500">{t('common.email')}</p>
                          <p className="font-medium text-primary-600">{applicantDetails.applicant.email}</p>
                        </div>
                      </a>
                      <a 
                        href={`tel:${applicantDetails.applicant.phone}`}
                        className="flex items-center gap-3 p-3 bg-white rounded-lg hover:bg-primary-50 transition-colors"
                      >
                        <Phone className="h-5 w-5 text-primary-600" />
                        <div>
                          <p className="text-xs text-gray-500">{t('common.phone')}</p>
                          <p className="font-medium text-primary-600">{applicantDetails.applicant.phone || "-"}</p>
                        </div>
                      </a>
                      {applicantDetails.applicant.address && (applicantDetails.applicant.address.city || applicantDetails.applicant.address.country) && (
                        <div className="flex items-center gap-3 p-3 bg-white rounded-lg">
                          <MapPin className="h-5 w-5 text-gray-500" />
                          <div>
                            <p className="text-xs text-gray-500">{t('common.location')}</p>
                            <p className="font-medium">
                              {[applicantDetails.applicant.address.city, applicantDetails.applicant.address.country].filter(Boolean).join(", ")}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Profil */}
                  <div className="bg-gray-50 rounded-xl p-5">
                    <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <FileText className="h-5 w-5 text-primary-600" />
                      {t('common.profile')}
                    </h3>
                    <div className="space-y-2 text-sm">
                      {applicantDetails.applicant.date_of_birth && (
                        <div className="flex justify-between p-2 bg-white rounded">
                          <span className="text-gray-500">{t('applicant.dateOfBirth')}</span>
                          <span className="font-medium">{new Date(applicantDetails.applicant.date_of_birth).toLocaleDateString("de-DE")}</span>
                        </div>
                      )}
                      {applicantDetails.applicant.nationality && (
                        <div className="flex justify-between p-2 bg-white rounded">
                          <span className="text-gray-500">{t('applicant.nationality')}</span>
                          <span className="font-medium">{applicantDetails.applicant.nationality}</span>
                        </div>
                      )}
                      {applicantDetails.applicant.position_type && (
                        <div className="flex justify-between p-2 bg-white rounded">
                          <span className="text-gray-500">{t('common.positionType')}</span>
                          <span className="font-medium">{applicantDetails.applicant.position_type}</span>
                        </div>
                      )}
                      {applicantDetails.applicant.german_level && (
                        <div className="flex justify-between p-2 bg-white rounded">
                          <span className="text-gray-500">{t('common.german')}</span>
                          <span className="font-medium">{applicantDetails.applicant.german_level}</span>
                        </div>
                      )}
                      {applicantDetails.applicant.english_level && (
                        <div className="flex justify-between p-2 bg-white rounded">
                          <span className="text-gray-500">{t('common.english')}</span>
                          <span className="font-medium">{applicantDetails.applicant.english_level}</span>
                        </div>
                      )}
                      {applicantDetails.applicant.work_experience_years !== undefined && (
                        <div className="flex justify-between p-2 bg-white rounded">
                          <span className="text-gray-500">{t('applicant.workExperience')}</span>
                          <span className="font-medium">{applicantDetails.applicant.work_experience_years} {t('common.years')}</span>
                        </div>
                      )}
                      {applicantDetails.applicant.university_name && (
                        <div className="flex justify-between p-2 bg-white rounded">
                          <span className="text-gray-500">{t('applicant.university')}</span>
                          <span className="font-medium">{applicantDetails.applicant.university_name}</span>
                        </div>
                      )}
                      {applicantDetails.applicant.field_of_study && (
                        <div className="flex justify-between p-2 bg-white rounded">
                          <span className="text-gray-500">{t('applicant.fieldOfStudy')}</span>
                          <span className="font-medium">{applicantDetails.applicant.field_of_study}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Dokumente */}
                  <div className="md:col-span-2 bg-gray-50 rounded-xl p-5">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-bold text-gray-900 flex items-center gap-2">
                        <FileText className="h-5 w-5 text-primary-600" />
                        {t('common.documents')} ({applicantDetails.documents?.length || 0})
                      </h3>
                      <button
                        onClick={openDocRequestModal}
                        className="px-4 py-2 bg-orange-500 text-white rounded-lg font-medium hover:bg-orange-600 transition-colors flex items-center gap-2"
                      >
                        <FilePlus className="h-4 w-4" />
                        {t('companyApplications.requestDocuments')}
                      </button>
                    </div>

                    {/* Angeforderte Dokumente */}
                    {selectedApp?.requested_documents && selectedApp.requested_documents.length > 0 && (
                      <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                        <p className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1">
                          <FilePlus className="h-4 w-4 text-orange-500" />
                          Angeforderte Unterlagen:
                        </p>
                        <div className="space-y-1">
                          {selectedApp.requested_documents.map((doc: any, idx: number) => (
                            <div key={idx} className="flex items-center gap-2 text-sm">
                              {doc.fulfilled ? (
                                <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                              ) : (
                                <Clock className="h-4 w-4 text-orange-400 flex-shrink-0" />
                              )}
                              <span className={doc.fulfilled ? "text-green-700" : "text-orange-700"}>
                                {String(t(`documentTypes.${doc.type}`, doc.type))}
                              </span>
                              {doc.fulfilled ? (
                                <span className="text-xs text-green-500 ml-auto">Eingereicht ✓</span>
                              ) : (
                                <span className="text-xs text-orange-400 ml-auto">Ausstehend</span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {!applicantDetails.documents || applicantDetails.documents.length === 0 ? (
                      <p className="text-gray-500">{t('companyApplications.noDocumentsShared')}</p>
                    ) : (
                      <div className="grid md:grid-cols-2 gap-3">
                        {applicantDetails.documents.map((doc) => (
                          <div
                            key={doc.id}
                            className="flex items-center justify-between p-3 bg-white rounded-lg hover:bg-primary-50 transition-colors group"
                          >
                            <div className="flex items-center gap-3">
                              <FileText className="h-5 w-5 text-gray-400 group-hover:text-primary-600" />
                              <div>
                                <p className="font-medium text-gray-900 group-hover:text-primary-600">{doc.original_name}</p>
                                <p className="text-xs text-gray-500">{t(`documentTypes.${doc.document_type}`, doc.document_type)}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Vorstellungsgespräch */}
                  <div className="md:col-span-2 bg-purple-50 rounded-xl p-5 border border-purple-200">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-bold text-gray-900 flex items-center gap-2">
                        <CalendarPlus className="h-5 w-5 text-purple-600" />
                        {t('companyApplications.interview')}
                      </h3>
                      <button
                        onClick={openInterviewModal}
                        className="px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors flex items-center gap-2"
                      >
                        <CalendarPlus className="h-4 w-4" />
                        {t('companyApplications.proposeDates')}
                      </button>
                    </div>
                    
                    {/* Vorgemerkte (noch nicht gespeicherte) Termine */}
                    {pendingInterview && (
                      <div className="mb-4 p-4 bg-yellow-100 rounded-lg border-2 border-yellow-300">
                        <div className="flex items-center gap-2 mb-2 text-yellow-800 font-medium">
                          <AlertTriangle className="h-4 w-4" />
                          {t('companyApplications.pendingDates')}
                        </div>
                        <div className="text-sm space-y-1">
                          <p><strong>{t('companyApplications.date1')}:</strong> {formatDateTime(pendingInterview.proposed_date_1)}</p>
                          {pendingInterview.proposed_date_2 && (
                            <p><strong>{t('companyApplications.date2')}:</strong> {formatDateTime(pendingInterview.proposed_date_2)}</p>
                          )}
                          {pendingInterview.location && (
                            <p className="flex items-center gap-1"><MapPinned className="h-3 w-3" /> {pendingInterview.location}</p>
                          )}
                          {pendingInterview.meeting_link && (
                            <p className="flex items-center gap-1"><Video className="h-3 w-3" /> {pendingInterview.meeting_link}</p>
                          )}
                        </div>
                        <button
                          onClick={() => setPendingInterview(null)}
                          className="mt-2 text-sm text-red-600 hover:underline"
                        >
                          {t('companyApplications.discardDates')}
                        </button>
                      </div>
                    )}
                    
                    {/* Bestehende Interviews */}
                    {interviews.length > 0 ? (
                      <div className="space-y-3">
                        {interviews.map((interview) => (
                          <div key={interview.id} className={`p-4 rounded-lg border ${
                            interview.status === "confirmed" ? "bg-green-50 border-green-200" :
                            interview.status === "declined" ? "bg-red-50 border-red-200" :
                            interview.status === "cancelled" ? "bg-gray-100 border-gray-300" :
                            "bg-white border-gray-200"
                          }`}>
                            <div className="flex items-start justify-between">
                              <div>
                                <div className="flex items-center gap-2 mb-2">
                                  {interview.status === "confirmed" && <CheckCircle className="h-5 w-5 text-green-600" />}
                                  {interview.status === "declined" && <XCircle className="h-5 w-5 text-red-600" />}
                                  {interview.status === "proposed" && <Clock className="h-5 w-5 text-yellow-600" />}
                                  {interview.status === "cancelled" && <XCircle className="h-5 w-5 text-gray-500" />}
                                  <span className={`font-medium ${
                                    interview.status === "confirmed" ? "text-green-700" :
                                    interview.status === "declined" ? "text-red-700" :
                                    interview.status === "cancelled" ? "text-gray-600" :
                                    "text-yellow-700"
                                  }`}>
                                    {interview.status === "confirmed" ? t('interviewStatus.confirmed') :
                                     interview.status === "declined" ? t('interviewStatus.declined') :
                                     interview.status === "cancelled" ? t('interviewStatus.cancelled') :
                                     t('interviewStatus.proposed')}
                                  </span>
                                </div>
                                
                                {interview.confirmed_date ? (
                                  <p className="text-sm">
                                    <strong>{t('companyApplications.confirmedDate')}:</strong> {formatDateTime(interview.confirmed_date)}
                                  </p>
                                ) : (
                                  <div className="text-sm space-y-1">
                                    <p><strong>{t('companyApplications.proposal1')}:</strong> {formatDateTime(interview.proposed_date_1)}</p>
                                    {interview.proposed_date_2 && (
                                      <p><strong>{t('companyApplications.proposal2')}:</strong> {formatDateTime(interview.proposed_date_2)}</p>
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
                                    <a href={interview.meeting_link} target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline">
                                      {interview.meeting_link}
                                    </a>
                                  </p>
                                )}
                              </div>
                              
                              {/* Kalender-Download für bestätigte Termine */}
                              {interview.status === "confirmed" && (
                                <button
                                  onClick={() => downloadICS(interview.id)}
                                  className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg"
                                  title={t('companyApplications.addToCalendar')}
                                >
                                  <Download className="h-5 w-5" />
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : !pendingInterview && (
                      <p className="text-gray-600 text-sm">
                        {t('companyApplications.noInterviewsYet')}
                      </p>
                    )}
                  </div>

                  {/* Interne Notizen */}
                  <div className="md:col-span-2 bg-yellow-50 rounded-xl p-5 border border-yellow-200">
                    <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                      <StickyNote className="h-5 w-5 text-yellow-600" />
                      {t('companyApplications.internalNotes')}
                      <span className="text-xs font-normal text-gray-500">({t('companyApplications.onlyVisibleToTeam')})</span>
                    </h3>
                    {notesLoading ? (
                      <div className="flex items-center gap-2 text-gray-500">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        {t('common.loading')}...
                      </div>
                    ) : (
                      <>
                        <textarea
                          value={companyNotes}
                          onChange={(e) => setCompanyNotes(e.target.value)}
                          placeholder={t('companyApplications.notesPlaceholder')}
                          className="w-full p-3 border-2 border-yellow-200 rounded-lg focus:border-yellow-400 focus:outline-none bg-white resize-none"
                          rows={3}
                        />
                        <div className="flex justify-end mt-2">
                          <button
                            onClick={saveCompanyNotes}
                            disabled={savingNotes}
                            className="px-4 py-2 bg-yellow-500 text-white rounded-lg font-medium hover:bg-yellow-600 transition-colors flex items-center gap-2 disabled:opacity-50"
                          >
                            {savingNotes ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Save className="h-4 w-4" />
                            )}
                            {t('companyApplications.saveNotes')}
                          </button>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Bewerbungsstatus ändern */}
                  <div className="md:col-span-2 bg-white rounded-xl p-5 border-2 border-primary-200">
                    <h3 className="font-bold text-gray-900 mb-4">{t('companyApplications.changeApplicationStatus')}</h3>
                    <div className="flex flex-wrap gap-2">
                      {statusOptions.map((status) => (
                        <button
                          key={status.value}
                          onClick={() => setPendingStatus(status.value)}
                          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                            pendingStatus === status.value
                              ? status.value === "rejected" 
                                ? "bg-red-600 text-white ring-2 ring-red-300"
                                : status.value === "accepted"
                                  ? "bg-green-600 text-white ring-2 ring-green-300"
                                  : "bg-primary-600 text-white ring-2 ring-primary-300"
                              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                          }`}
                        >
                          {status.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Footer mit Buttons */}
                {(() => {
                  const currentApp = applications.find(a => a.id === selectedAppId);
                  const hasChanges = (pendingStatus && currentApp && pendingStatus !== currentApp.status) || pendingInterview !== null;
                  return (
                    <div className="p-4 border-t bg-gray-50 flex justify-end gap-3 rounded-b-2xl">
                      <button
                        onClick={closeDetails}
                        className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors flex items-center gap-2"
                      >
                        <X className="h-4 w-4" />
                        {t('common.close')}
                      </button>
                      <button
                        onClick={saveStatusAndClose}
                        disabled={savingStatus}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 disabled:opacity-50 ${
                          hasChanges 
                            ? "bg-green-600 text-white hover:bg-green-700" 
                            : "bg-gray-300 text-gray-500 cursor-default"
                        }`}
                      >
                        {savingStatus ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Check className="h-4 w-4" />
                        )}
                        {hasChanges ? t('common.save') : t('common.noChanges')}
                      </button>
                    </div>
                  );
                })()}
              </>
            ) : (
              <div className="p-12 text-center text-gray-500">
                {t('common.noDetailsAvailable')}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Document Request Modal */}
      {showDocRequestModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full">
            <div className="p-6 border-b">
              <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <FilePlus className="h-6 w-6 text-primary-600" />
                {t('companyApplications.requestDocuments')}
              </h3>
            </div>
            
            <div className="p-6">
              {selectedApp && (
                <div className="bg-blue-50 rounded-lg p-3 mb-4 border border-blue-200">
                  <p className="text-sm text-gray-700">
                    {t('companyApplications.requestTo')}: <strong className="text-blue-800">{selectedApp.applicant_name}</strong>
                  </p>
                  <p className="text-sm text-gray-600">{t('common.for')}: {selectedApp.job_title}</p>
                </div>
              )}
              
              <p className="text-gray-600 mb-4">
                {t('companyApplications.selectDocuments')}:
              </p>
              
              <div className="space-y-2 max-h-48 overflow-y-auto mb-4">
                {documentTypes.map((doc) => (
                  <label
                    key={doc.value}
                    className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                      selectedDocTypes.includes(doc.value)
                        ? "border-primary-500 bg-primary-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedDocTypes.includes(doc.value)}
                      onChange={() => toggleDocType(doc.value)}
                      className="h-5 w-5 text-primary-600 rounded"
                    />
                    <span className="font-medium text-gray-900">{doc.label}</span>
                  </label>
                ))}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('companyApplications.messageOptional')}
                </label>
                <textarea
                  value={docRequestMessage}
                  onChange={(e) => setDocRequestMessage(e.target.value)}
                  placeholder={t('companyApplications.additionalHints')}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  rows={3}
                />
              </div>
            </div>

            <div className="p-4 border-t bg-gray-50 flex justify-end gap-3 rounded-b-2xl">
              <button
                onClick={() => setShowDocRequestModal(false)}
                className="btn-secondary"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={submitDocumentRequest}
                disabled={submittingDocRequest || selectedDocTypes.length === 0}
                className="btn-primary flex items-center gap-2 disabled:opacity-50"
              >
                {submittingDocRequest ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle className="h-4 w-4" />
                )}
                {t('companyApplications.sendRequest')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Interview Modal */}
      {showInterviewModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full my-4 max-h-[90vh] flex flex-col">
            <div className="p-6 border-b flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <CalendarPlus className="h-6 w-6 text-purple-600" />
                {t('companyApplications.proposeDates')}
              </h3>
              <button 
                onClick={() => setShowInterviewModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              <p className="text-gray-600 text-sm bg-blue-50 p-3 rounded-lg border border-blue-200">
                {t('companyApplications.proposeHint')}
              </p>
              
              {/* Termin 1 */}
              <div className="bg-purple-50 rounded-lg p-4">
                <h4 className="font-medium text-purple-800 mb-3">{t('companyApplications.date1Required')}</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('common.date')}</label>
                    <input
                      type="date"
                      value={interviewData.proposed_date_1}
                      onChange={(e) => setInterviewData({...interviewData, proposed_date_1: e.target.value})}
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                      min={new Date().toISOString().split("T")[0]}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('common.time')}</label>
                    <input
                      type="time"
                      value={interviewData.proposed_time_1}
                      onChange={(e) => setInterviewData({...interviewData, proposed_time_1: e.target.value})}
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>
              </div>

              {/* Termin 2 */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-700 mb-3">{t('companyApplications.date2Optional')}</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('common.date')}</label>
                    <input
                      type="date"
                      value={interviewData.proposed_date_2}
                      onChange={(e) => setInterviewData({...interviewData, proposed_date_2: e.target.value})}
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                      min={new Date().toISOString().split("T")[0]}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('common.time')}</label>
                    <input
                      type="time"
                      value={interviewData.proposed_time_2}
                      onChange={(e) => setInterviewData({...interviewData, proposed_time_2: e.target.value})}
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>
              </div>

              {/* Ort */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                  <MapPinned className="h-4 w-4" />
                  {t('companyApplications.locationOptional')}
                </label>
                <input
                  type="text"
                  value={interviewData.location}
                  onChange={(e) => setInterviewData({...interviewData, location: e.target.value})}
                  placeholder={t('companyApplications.locationPlaceholder')}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>

              {/* Meeting-Link */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                  <Video className="h-4 w-4" />
                  {t('companyApplications.meetingLinkOptional')}
                </label>
                <input
                  type="url"
                  value={interviewData.meeting_link}
                  onChange={(e) => setInterviewData({...interviewData, meeting_link: e.target.value})}
                  placeholder="https://zoom.us/j/..."
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>

              {/* Notizen */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('companyApplications.notesForApplicant')}
                </label>
                <textarea
                  value={interviewData.notes}
                  onChange={(e) => setInterviewData({...interviewData, notes: e.target.value})}
                  placeholder={t('companyApplications.notesPlaceholderInterview')}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  rows={2}
                />
              </div>
            </div>

            <div className="p-4 border-t bg-gray-50 flex justify-end gap-3 rounded-b-2xl">
              <button
                onClick={() => setShowInterviewModal(false)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={submitInterviewProposal}
                disabled={!interviewData.proposed_date_1}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 disabled:opacity-50 flex items-center gap-2"
              >
                <CalendarPlus className="h-4 w-4" />
                {t('companyApplications.markDates')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
