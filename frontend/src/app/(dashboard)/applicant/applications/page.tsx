"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { applicationsAPI, documentsAPI, interviewAPI } from "@/lib/api";
import { toast } from "react-hot-toast";
import { useTranslation } from "react-i18next";
import { 
  Loader2, FileText, Building2, Calendar, ExternalLink, XCircle,
  Clock, ChevronDown, ChevronUp, Eye, EyeOff, FilePlus, File,
  CheckCircle, AlertTriangle, MapPin, Video, CalendarCheck, CalendarX
} from "lucide-react";

interface RequestedDocument {
  type: string;
}

interface Interview {
  id: number;
  status: string;
  proposed_date_1: string;
  proposed_date_2?: string;
  confirmed_date?: string;
  location?: string;
  meeting_link?: string;
  notes_company?: string;
}

interface Application {
  id: number;
  job_posting_id: number;
  job_title: string;
  company_name: string;
  status: string;
  applied_at: string;
  updated_at: string;
  applicant_message?: string;
  requested_documents?: RequestedDocument[];
}

interface Document {
  id: number;
  original_name: string;
  document_type: string;
}

interface SharedDocument {
  id: number;
  original_name: string;
  document_type: string;
}


export default function ApplicantApplicationsPage() {
  const { t } = useTranslation();
  
  const statusLabels: Record<string, { label: string; color: string }> = {
    pending: { label: t("applicationStatus.pending"), color: "bg-yellow-100 text-yellow-800" },
    reviewing: { label: t("applicationStatus.reviewing"), color: "bg-blue-100 text-blue-800" },
    company_review: { label: t("applicationStatus.company_review"), color: "bg-blue-100 text-blue-800" },
    interview: { label: t("applicationStatus.interview"), color: "bg-purple-100 text-purple-800" },
    interview_scheduled: { label: t("applicationStatus.interview_scheduled"), color: "bg-purple-100 text-purple-800" },
    accepted: { label: t("applicationStatus.accepted"), color: "bg-green-100 text-green-800" },
    rejected: { label: t("applicationStatus.rejected"), color: "bg-red-100 text-red-800" },
    withdrawn: { label: t("applicationStatus.withdrawn"), color: "bg-gray-100 text-gray-800" },
  };

  const documentTypeLabels: Record<string, string> = {
    cv: t("documentTypes.cv"),
    passport: t("documentTypes.passport"),
    photo: t("documentTypes.photo"),
    language_cert: t("documentTypes.languageCert"),
    diploma: t("documentTypes.diploma"),
    work_reference: t("documentTypes.workReference"),
  };

  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedApp, setExpandedApp] = useState<number | null>(null);
  const [sharedDocuments, setSharedDocuments] = useState<Record<number, SharedDocument[]>>({});
  const [myDocuments, setMyDocuments] = useState<Document[]>([]);
  const [showShareDocsModal, setShowShareDocsModal] = useState<number | null>(null);
  const [selectedDocIds, setSelectedDocIds] = useState<number[]>([]);
  const [sharingDocs, setSharingDocs] = useState(false);
  const [withdrawingId, setWithdrawingId] = useState<number | null>(null);
  
  // Interview States
  const [interviews, setInterviews] = useState<Record<number, Interview[]>>({});
  const [processingInterview, setProcessingInterview] = useState<number | null>(null);
  const [showDeclineModal, setShowDeclineModal] = useState<number | null>(null);
  const [declineReason, setDeclineReason] = useState("");
  const [showCancelModal, setShowCancelModal] = useState<number | null>(null);
  const [cancelReason, setCancelReason] = useState("");

  useEffect(() => {
    loadApplications();
    loadMyDocuments();
  }, []);

  const loadApplications = async () => {
    try {
      const response = await applicationsAPI.getMyApplications();
      setApplications(response.data || []);
      
      // Load interviews for each application
      for (const app of response.data || []) {
        loadInterviewsForApp(app.id);
      }
    } catch (error) {
      console.error("Error loading applications:", error);
      toast.error(t("common.error"));
    } finally {
      setLoading(false);
    }
  };
  
  const loadInterviewsForApp = async (appId: number) => {
    try {
      const response = await interviewAPI.getForApplication(appId);
      setInterviews(prev => ({ ...prev, [appId]: response.data || [] }));
    } catch (error) {
      console.error("Interview-Fehler:", error);
    }
  };
  
  const confirmInterview = async (interviewId: number, selectedDate: string) => {
    setProcessingInterview(interviewId);
    try {
      await interviewAPI.confirm(interviewId, selectedDate);
      toast.success(t("applicantApplications.appointmentConfirmed"));
      loadApplications();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { detail?: string } } };
      toast.error(err.response?.data?.detail || t("common.error"));
    } finally {
      setProcessingInterview(null);
    }
  };
  
  const declineInterview = async (interviewId: number) => {
    setProcessingInterview(interviewId);
    try {
      await interviewAPI.decline(interviewId, declineReason);
      toast.success(t("applicantApplications.datesDeclined"));
      setShowDeclineModal(null);
      setDeclineReason("");
      loadApplications();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { detail?: string } } };
      toast.error(err.response?.data?.detail || t("common.error"));
    } finally {
      setProcessingInterview(null);
    }
  };
  
  const cancelInterview = async (interviewId: number) => {
    setProcessingInterview(interviewId);
    try {
      await interviewAPI.cancel(interviewId, cancelReason);
      toast.success(t("applicantApplications.appointmentCancelled"));
      setShowCancelModal(null);
      setCancelReason("");
      loadApplications();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { detail?: string } } };
      toast.error(err.response?.data?.detail || t("common.error"));
    } finally {
      setProcessingInterview(null);
    }
  };
  
  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString("de-DE", {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const loadMyDocuments = async () => {
    try {
      const response = await documentsAPI.list();
      setMyDocuments(response.data || []);
    } catch (error) {
      console.error("Fehler beim Laden der Dokumente");
    }
  };

  const loadSharedDocuments = async (appId: number) => {
    try {
      const response = await applicationsAPI.getSharedDocuments(appId);
      setSharedDocuments(prev => ({ ...prev, [appId]: response.data }));
    } catch (error) {
      console.error("Fehler beim Laden der freigegebenen Dokumente:", error);
    }
  };

  const toggleAppDetails = (appId: number) => {
    if (expandedApp === appId) {
      setExpandedApp(null);
    } else {
      setExpandedApp(appId);
      if (!sharedDocuments[appId]) {
        loadSharedDocuments(appId);
      }
    }
  };

  const handleWithdraw = async (id: number) => {
    if (!confirm(t("applicant.withdrawConfirm"))) return;
    
    setWithdrawingId(id);
    try {
      await applicationsAPI.withdraw(id);
      toast.success(t("applicant.withdrawn"));
      loadApplications();
    } catch (error) {
      toast.error(t("common.error"));
    } finally {
      setWithdrawingId(null);
    }
  };

  const openShareDocsModal = (appId: number) => {
    setShowShareDocsModal(appId);
    setSelectedDocIds([]);
  };

  const handleShareDocuments = async () => {
    if (selectedDocIds.length === 0) {
      toast.error(t("applicantApplications.selectDocument"));
      return;
    }
    
    setSharingDocs(true);
    try {
      await applicationsAPI.shareDocuments(showShareDocsModal!, selectedDocIds);
      toast.success(t("applicantApplications.documentsShared"));
      setShowShareDocsModal(null);
      setSelectedDocIds([]);
      loadApplications();
      if (expandedApp) {
        loadSharedDocuments(expandedApp);
      }
    } catch (error) {
      toast.error(t("common.error"));
    } finally {
      setSharingDocs(false);
    }
  };

  const toggleDocSelection = (docId: number) => {
    setSelectedDocIds(prev => 
      prev.includes(docId) 
        ? prev.filter(id => id !== docId)
        : [...prev, docId]
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  const currentApp = showShareDocsModal ? applications.find(a => a.id === showShareDocsModal) : null;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-8">
        <FileText className="h-8 w-8 text-primary-600" />
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{t("applicant.applicationsTitle")}</h1>
          <p className="text-gray-600 mt-1">{t("applicant.applicationsSubtitle")}</p>
        </div>
      </div>

      {applications.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center">
          <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">{t("applicant.noApplications")}</h2>
          <p className="text-gray-600 mb-6">{t("applicant.noApplicationsText")}</p>
          <Link href="/jobs" className="btn-primary">
            {t("applicant.browseJobs")}
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {applications.map((app) => (
            <div key={app.id} className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                <div className="flex-1">
                  {/* Header */}
                  <div className="flex items-center gap-3 mb-2 flex-wrap">
                    <Link 
                      href={`/jobs/${app.job_posting_id}`}
                      className="text-xl font-semibold text-gray-900 hover:text-primary-600"
                    >
                      {app.job_title}
                    </Link>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusLabels[app.status]?.color || "bg-gray-100"}`}>
                      {statusLabels[app.status]?.label || app.status}
                    </span>
                  </div>

                  {/* Meta Info */}
                  <div className="flex flex-wrap items-center gap-4 text-gray-600 text-sm">
                    <span className="flex items-center gap-1">
                      <Building2 className="h-4 w-4" />
                      {app.company_name || t("common.unknown")}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {t("applicant.appliedOn")} {formatDate(app.applied_at)}
                    </span>
                    {app.updated_at !== app.applied_at && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {t("applicantApplications.updated")}: {formatDate(app.updated_at)}
                      </span>
                    )}
                  </div>

                  {/* Applicant Message */}
                  {app.applicant_message && (
                    <p className="mt-3 text-gray-600 text-sm">
                      <strong>{t("applicantApplications.yourMessage")}:</strong> {app.applicant_message}
                    </p>
                  )}

                  {/* Toggle Details Button */}
                  <button
                    onClick={() => toggleAppDetails(app.id)}
                    className="mt-3 inline-flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700 font-medium"
                  >
                    {expandedApp === app.id ? (
                      <>
                        <ChevronUp className="h-4 w-4" />
                        {t("common.hideDetails")}
                      </>
                    ) : (
                      <>
                        <ChevronDown className="h-4 w-4" />
                        {t("common.showDetails")}
                      </>
                    )}
                  </button>

                  {/* Expanded Details */}
                  {expandedApp === app.id && (
                    <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <Eye className="h-5 w-5 text-primary-600" />
                        {t("applicantApplications.sharedDocumentsFor")} {app.company_name}
                      </h4>
                      
                      {!sharedDocuments[app.id] ? (
                        <div className="flex items-center gap-2 text-gray-500">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          {t("common.loading")}...
                        </div>
                      ) : sharedDocuments[app.id].length === 0 ? (
                        <div className="text-gray-500 flex items-center gap-2">
                          <EyeOff className="h-4 w-4" />
                          {t("applicantApplications.noSharedDocuments")}
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {sharedDocuments[app.id].map((doc) => (
                            <div 
                              key={doc.id} 
                              className="flex items-center gap-3 p-2 bg-white rounded-lg border border-gray-200"
                            >
                              <File className="h-5 w-5 text-primary-600" />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate">{doc.original_name}</p>
                                <p className="text-xs text-gray-500">{documentTypeLabels[doc.document_type] || doc.document_type}</p>
                              </div>
                              <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
                                {t("applicantApplications.shared")}
                              </span>
                            </div>
                          ))}
                          <p className="text-xs text-gray-500 mt-2">
                            ℹ️ {t("applicantApplications.documentsVisibleTo", { count: sharedDocuments[app.id].length, company: app.company_name })}
                          </p>
                        </div>
                      )}
                      
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <button
                          onClick={() => openShareDocsModal(app.id)}
                          className="inline-flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700 font-medium"
                        >
                          <FilePlus className="h-4 w-4" />
                          {t("applicantApplications.shareMoreDocuments")}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Requested Documents Alert */}
                  {app.requested_documents && app.requested_documents.length > 0 && (
                    <div className="mt-3 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                      <div className="flex items-center gap-2 text-orange-700">
                        <FilePlus className="h-5 w-5" />
                        <span className="font-medium">{t("applicantApplications.documentsRequested")}</span>
                      </div>
                      <p className="text-sm text-orange-600 mt-1">
                        {t("applicantApplications.companyRequestedDocs", { company: app.company_name || t("common.theCompany") })}
                      </p>
                      <ul className="mt-2 space-y-1">
                        {app.requested_documents.map((doc, idx) => (
                          <li key={idx} className="text-sm text-orange-700 flex items-center gap-2">
                            <span className="w-1.5 h-1.5 bg-orange-400 rounded-full"></span>
                            {documentTypeLabels[doc.type] || doc.type}
                          </li>
                        ))}
                      </ul>
                      <div className="mt-3 flex gap-2">
                        <button
                          onClick={() => openShareDocsModal(app.id)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 rounded-lg"
                        >
                          <FilePlus className="h-4 w-4" />
                          {t("applicantApplications.shareDocuments")}
                        </button>
                        <Link 
                          href="/applicant/documents" 
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-orange-700 hover:text-orange-800 border border-orange-300 rounded-lg hover:bg-orange-100"
                        >
                          {t("applicantApplications.uploadNew")}
                        </Link>
                      </div>
                    </div>
                  )}

                  {/* Interview-Termine anzeigen */}
                  {interviews[app.id]?.length > 0 && (
                    <div className="mt-4 space-y-3">
                      {interviews[app.id].map((interview) => (
                        <div key={interview.id} className={`p-4 rounded-xl border-2 ${
                          interview.status === "proposed" ? "bg-purple-50 border-purple-300" :
                          interview.status === "confirmed" ? "bg-green-50 border-green-300" :
                          interview.status === "declined" ? "bg-red-50 border-red-200" :
                          "bg-gray-50 border-gray-200"
                        }`}>
                          {/* Confirmed appointment */}
                          {interview.status === "confirmed" && (
                            <div className="flex items-start gap-3">
                              <CheckCircle className="h-6 w-6 text-green-600 mt-1" />
                              <div className="flex-1">
                                <p className="font-semibold text-green-800">{t("applicantApplications.appointmentConfirmed")}</p>
                                <p className="text-green-700 text-lg">
                                  {formatDateTime(interview.confirmed_date!)}
                                </p>
                                {interview.location && (
                                  <p className="text-green-600 flex items-center gap-1 mt-1">
                                    <MapPin className="h-4 w-4" />
                                    {interview.location}
                                  </p>
                                )}
                                {interview.meeting_link && (
                                  <a 
                                    href={interview.meeting_link} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-green-600 hover:text-green-800 flex items-center gap-1 mt-1"
                                  >
                                    <Video className="h-4 w-4" />
                                    {t("applicantApplications.toMeetingLink")}
                                  </a>
                                )}
                                
                                {/* Cancel button */}
                                <button
                                  onClick={() => setShowCancelModal(interview.id)}
                                  className="mt-3 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 px-3 py-1.5 rounded-lg flex items-center gap-1"
                                >
                                  <XCircle className="h-4 w-4" />
                                  {t("applicantApplications.cancelAppointment")}
                                </button>
                              </div>
                            </div>
                          )}
                          
                          {/* Cancelled appointment */}
                          {interview.status === "cancelled" && (
                            <div className="flex items-start gap-3">
                              <XCircle className="h-6 w-6 text-gray-500 mt-1" />
                              <div>
                                <p className="font-semibold text-gray-700">{t("applicantApplications.appointmentCancelled")}</p>
                                <p className="text-gray-600 text-sm">
                                  {t("applicantApplications.appointmentCancelledDesc")}
                                </p>
                              </div>
                            </div>
                          )}

                          {/* Proposed appointments - Selection */}
                          {interview.status === "proposed" && (
                            <div>
                              <div className="flex items-start gap-3 mb-4">
                                <AlertTriangle className="h-6 w-6 text-purple-600 mt-1" />
                                <div>
                                  <p className="font-semibold text-purple-800">{t("applicantApplications.appointmentProposals")}</p>
                                  <p className="text-purple-600 text-sm">
                                    {t("applicantApplications.selectOrDecline")}
                                  </p>
                                </div>
                              </div>

                              {interview.location && (
                                <p className="text-gray-600 text-sm mb-3 flex items-center gap-1">
                                  <MapPin className="h-4 w-4" />
                                  <strong>{t("common.location")}:</strong> {interview.location}
                                </p>
                              )}
                              {interview.meeting_link && (
                                <p className="text-gray-600 text-sm mb-3 flex items-center gap-1">
                                  <Video className="h-4 w-4" />
                                  <strong>Online:</strong> {t("applicantApplications.linkActiveAfterConfirm")}
                                </p>
                              )}
                              {interview.notes_company && (
                                <p className="text-gray-600 text-sm mb-3">
                                  <strong>{t("common.note")}:</strong> {interview.notes_company}
                                </p>
                              )}

                              <div className="grid sm:grid-cols-2 gap-3 mb-4">
                                {/* Option 1 */}
                                <button
                                  onClick={() => confirmInterview(interview.id, interview.proposed_date_1)}
                                  disabled={processingInterview === interview.id}
                                  className="p-4 bg-white border-2 border-purple-200 rounded-xl hover:border-purple-500 hover:bg-purple-50 transition-all group text-left disabled:opacity-50"
                                >
                                  <p className="text-xs text-purple-600 font-medium mb-1">Option 1</p>
                                  <p className="font-semibold text-gray-900 group-hover:text-purple-700">
                                    {formatDateTime(interview.proposed_date_1)}
                                  </p>
                                  <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                                    <CalendarCheck className="h-3 w-3" />
                                    {t("applicantApplications.clickToConfirm")}
                                  </p>
                                </button>

                                {/* Option 2 */}
                                {interview.proposed_date_2 && (
                                  <button
                                    onClick={() => confirmInterview(interview.id, interview.proposed_date_2!)}
                                    disabled={processingInterview === interview.id}
                                    className="p-4 bg-white border-2 border-purple-200 rounded-xl hover:border-purple-500 hover:bg-purple-50 transition-all group text-left disabled:opacity-50"
                                  >
                                    <p className="text-xs text-purple-600 font-medium mb-1">Option 2</p>
                                    <p className="font-semibold text-gray-900 group-hover:text-purple-700">
                                      {formatDateTime(interview.proposed_date_2)}
                                    </p>
                                    <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                                      <CalendarCheck className="h-3 w-3" />
                                      {t("applicantApplications.clickToConfirm")}
                                    </p>
                                  </button>
                                )}
                              </div>

                              {processingInterview === interview.id ? (
                                <div className="flex items-center justify-center gap-2 text-gray-600">
                                  <Loader2 className="h-5 w-5 animate-spin" />
                                  {t("common.processing")}...
                                </div>
                              ) : (
                                <button
                                  onClick={() => setShowDeclineModal(interview.id)}
                                  className="w-full py-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg text-sm font-medium flex items-center justify-center gap-2"
                                >
                                  <CalendarX className="h-4 w-4" />
                                  {t("applicantApplications.noDateFits")}
                                </button>
                              )}
                            </div>
                          )}

                          {/* Declined */}
                          {interview.status === "declined" && (
                            <div className="flex items-start gap-3">
                              <XCircle className="h-6 w-6 text-red-500 mt-1" />
                              <div>
                                <p className="font-semibold text-red-700">{t("applicantApplications.datesDeclined")}</p>
                                <p className="text-red-600 text-sm">
                                  {t("applicantApplications.datesDeclinedDesc")}
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Link 
                    href={`/jobs/${app.job_posting_id}`}
                    className="btn-secondary text-sm flex items-center gap-1"
                  >
                    <ExternalLink className="h-4 w-4" />
                    {t("common.details")}
                  </Link>
                  {app.status === "pending" && (
                    <button
                      onClick={() => handleWithdraw(app.id)}
                      disabled={withdrawingId === app.id}
                      className="px-3 py-2 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg flex items-center gap-1 disabled:opacity-50"
                    >
                      {withdrawingId === app.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <XCircle className="h-4 w-4" />
                      )}
                      {t("applicant.withdraw")}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Share Documents Modal */}
      {showShareDocsModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full">
            <div className="p-6 border-b">
              <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <FilePlus className="h-6 w-6 text-primary-600" />
                {t("applicantApplications.shareDocuments")}
              </h3>
            </div>
            
            <div className="p-6">
              {currentApp && (
                <div className="bg-blue-50 rounded-lg p-3 mb-4 border border-blue-200">
                  <p className="text-sm text-gray-700">
                    <strong className="text-blue-800">{currentApp.company_name}</strong> {t("applicantApplications.getsAccessTo")}
                  </p>
                  <p className="text-sm font-medium text-gray-900 mt-1">"{currentApp.job_title}"</p>
                </div>
              )}
              
              <p className="text-gray-600 mb-4">
                {t("applicantApplications.selectDocumentsToShare")}
              </p>
              
              {myDocuments.length === 0 ? (
                <div className="text-center py-6 text-gray-500">
                  <FileText className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                  <p>{t("applicantApplications.noDocumentsUploaded")}</p>
                  <Link 
                    href="/applicant/documents" 
                    className="text-primary-600 hover:underline mt-2 inline-block"
                  >
                    {t("applicantApplications.uploadDocuments")}
                  </Link>
                </div>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {myDocuments.map((doc) => (
                    <label
                      key={doc.id}
                      className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                        selectedDocIds.includes(doc.id)
                          ? "border-primary-500 bg-primary-50"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedDocIds.includes(doc.id)}
                        onChange={() => toggleDocSelection(doc.id)}
                        className="h-5 w-5 text-primary-600 rounded"
                      />
                      <File className="h-5 w-5 text-gray-400" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{doc.original_name}</p>
                        <p className="text-xs text-gray-500">{documentTypeLabels[doc.document_type] || doc.document_type}</p>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div className="p-4 border-t bg-gray-50 flex justify-end gap-3 rounded-b-2xl">
              <button
                onClick={() => setShowShareDocsModal(null)}
                className="btn-secondary"
              >
                {t("common.cancel")}
              </button>
              <button
                onClick={handleShareDocuments}
                disabled={sharingDocs || selectedDocIds.length === 0}
                className="btn-primary flex items-center gap-2 disabled:opacity-50"
              >
                {sharingDocs ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle className="h-4 w-4" />
                )}
                {selectedDocIds.length > 0 ? t("applicantApplications.shareXDocuments", { count: selectedDocIds.length }) : t("applicantApplications.share")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Decline Modal */}
      {showDeclineModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="p-6 border-b">
              <h2 className="text-xl font-bold flex items-center gap-2 text-red-700">
                <CalendarX className="h-6 w-6" />
                {t("applicantApplications.declineDates")}
              </h2>
            </div>

            <div className="p-6">
              <p className="text-gray-600 mb-4">
                {t("applicantApplications.declineDatesDesc")}
              </p>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t("applicantApplications.reasonOptional")}</label>
                <textarea
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  rows={3}
                  placeholder={t("applicantApplications.reasonPlaceholder")}
                  value={declineReason}
                  onChange={(e) => setDeclineReason(e.target.value)}
                />
              </div>
            </div>

            <div className="p-4 border-t bg-gray-50 flex justify-end gap-3 rounded-b-2xl">
              <button
                onClick={() => {
                  setShowDeclineModal(null);
                  setDeclineReason("");
                }}
                className="btn-secondary"
              >
                {t("common.cancel")}
              </button>
              <button
                onClick={() => declineInterview(showDeclineModal)}
                disabled={processingInterview === showDeclineModal}
                className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 flex items-center gap-2 disabled:opacity-50"
              >
                {processingInterview === showDeclineModal ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CalendarX className="h-4 w-4" />
                )}
                {t("applicantApplications.declineAndRequestNew")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Modal (for already confirmed appointments) */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="p-6 border-b">
              <h2 className="text-xl font-bold flex items-center gap-2 text-red-700">
                <XCircle className="h-6 w-6" />
                {t("applicantApplications.cancelAppointment")}
              </h2>
            </div>

            <div className="p-6">
              <p className="text-gray-600 mb-4">
                {t("applicantApplications.cancelAppointmentDesc")}
              </p>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t("applicantApplications.reasonOptional")}</label>
                <textarea
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  rows={3}
                  placeholder={t("applicantApplications.cancelReasonPlaceholder")}
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                />
              </div>
            </div>

            <div className="p-4 border-t bg-gray-50 flex justify-end gap-3 rounded-b-2xl">
              <button
                onClick={() => {
                  setShowCancelModal(null);
                  setCancelReason("");
                }}
                className="btn-secondary"
              >
                {t("common.back")}
              </button>
              <button
                onClick={() => cancelInterview(showCancelModal)}
                disabled={processingInterview === showCancelModal}
                className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 flex items-center gap-2 disabled:opacity-50"
              >
                {processingInterview === showCancelModal ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <XCircle className="h-4 w-4" />
                )}
                {t("applicantApplications.cancelAppointment")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
