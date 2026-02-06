import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { applicationsAPI, interviewAPI, documentsAPI } from '../../lib/api';
import toast from 'react-hot-toast';
import { 
  FileText, Building2, Calendar, Clock, XCircle, ExternalLink,
  CalendarCheck, CalendarX, MapPin, Video, CheckCircle, AlertTriangle,
  Loader2, FilePlus, Eye, EyeOff, ChevronDown, ChevronUp, File
} from 'lucide-react';

function ApplicantApplications() {
  const { t, i18n } = useTranslation();
  
  const statusLabels = {
    pending: { label: t('applicationStatus.pending'), color: 'bg-yellow-100 text-yellow-800' },
    reviewing: { label: t('applicationStatus.reviewing'), color: 'bg-blue-100 text-blue-800' },
    company_review: { label: t('applicationStatus.reviewing'), color: 'bg-blue-100 text-blue-800' },
    interview: { label: t('applicationStatus.interview'), color: 'bg-purple-100 text-purple-800' },
    interview_scheduled: { label: t('applicationStatus.interviewScheduled'), color: 'bg-purple-100 text-purple-800' },
    accepted: { label: t('applicationStatus.accepted'), color: 'bg-green-100 text-green-800' },
    rejected: { label: t('applicationStatus.rejected'), color: 'bg-red-100 text-red-800' },
    withdrawn: { label: t('applicationStatus.withdrawn'), color: 'bg-gray-100 text-gray-800' }
  };
  
  // Helper to get translated job title
  const getJobTitle = (app) => {
    const lang = i18n.language;
    if (app.job_translations && app.job_translations[lang]?.title) {
      return app.job_translations[lang].title;
    }
    return app.job_title || t('applicantApplications.jobPosting');
  };
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [interviews, setInterviews] = useState({});
  const [processingInterview, setProcessingInterview] = useState(null);
  const [declineReason, setDeclineReason] = useState('');
  const [showDeclineModal, setShowDeclineModal] = useState(null);
  const [showCancelModal, setShowCancelModal] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  
  // Dokumentenfreigabe
  const [showShareDocsModal, setShowShareDocsModal] = useState(null);
  const [myDocuments, setMyDocuments] = useState([]);
  const [selectedDocIds, setSelectedDocIds] = useState([]);
  const [sharingDocs, setSharingDocs] = useState(false);
  
  // Freigegebene Dokumente pro Bewerbung
  const [sharedDocuments, setSharedDocuments] = useState({});
  const [expandedApp, setExpandedApp] = useState(null);

  useEffect(() => {
    loadApplications();
    loadMyDocuments();
  }, []);
  
  const loadMyDocuments = async () => {
    try {
      const response = await documentsAPI.list();
      setMyDocuments(response.data || []);
    } catch (error) {
      console.error('Fehler beim Laden der Dokumente');
    }
  };

  const loadApplications = async () => {
    try {
      const response = await applicationsAPI.getMyApplications();
      setApplications(response.data);
      
      // Load interviews for each application
      for (const app of response.data) {
        loadInterviewsForApp(app.id);
      }
    } catch (error) {
      toast.error(t('applicantApplications.loadError'));
    } finally {
      setLoading(false);
    }
  };

  const loadInterviewsForApp = async (appId) => {
    try {
      const response = await interviewAPI.getForApplication(appId);
      setInterviews(prev => ({ ...prev, [appId]: response.data }));
    } catch (error) {
      console.error('Interview-Fehler:', error);
    }
  };

  const loadSharedDocuments = async (appId) => {
    try {
      const response = await applicationsAPI.getSharedDocuments(appId);
      setSharedDocuments(prev => ({ ...prev, [appId]: response.data }));
    } catch (error) {
      console.error('Fehler beim Laden der freigegebenen Dokumente:', error);
    }
  };

  const toggleAppDetails = (appId) => {
    if (expandedApp === appId) {
      setExpandedApp(null);
    } else {
      setExpandedApp(appId);
      if (!sharedDocuments[appId]) {
        loadSharedDocuments(appId);
      }
    }
  };

  const confirmInterview = async (interviewId, selectedDate) => {
    setProcessingInterview(interviewId);
    try {
      await interviewAPI.confirm(interviewId, selectedDate);
      toast.success(t('applicantApplications.interviewConfirmed'));
      loadApplications();
    } catch (error) {
      toast.error(error.response?.data?.detail || t('applicantApplications.confirmError'));
    } finally {
      setProcessingInterview(null);
    }
  };

  const cancelInterview = async (interviewId) => {
    setProcessingInterview(interviewId);
    try {
      await interviewAPI.cancel(interviewId, cancelReason);
      toast.success(t('applicantApplications.interviewCancelled'));
      setShowCancelModal(null);
      setCancelReason('');
      loadApplications();
    } catch (error) {
      toast.error(error.response?.data?.detail || t('applicantApplications.cancelError'));
    } finally {
      setProcessingInterview(null);
    }
  };

  const declineInterview = async (interviewId) => {
    setProcessingInterview(interviewId);
    try {
      await interviewAPI.decline(interviewId, declineReason);
      toast.success(t('applicantApplications.interviewDeclined'));
      setShowDeclineModal(null);
      setDeclineReason('');
      loadApplications();
    } catch (error) {
      toast.error(error.response?.data?.detail || t('applicantApplications.declineError'));
    } finally {
      setProcessingInterview(null);
    }
  };

  const formatDateTime = (dateString) => {
    return new Date(dateString).toLocaleString('de-DE', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleWithdraw = async (id) => {
    if (!confirm(t('applicantApplications.withdrawConfirm'))) return;
    
    try {
      await applicationsAPI.withdraw(id);
      toast.success(t('applicantApplications.withdrawSuccess'));
      loadApplications();
    } catch (error) {
      toast.error(t('applicantApplications.withdrawError'));
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const openShareDocsModal = (appId) => {
    setShowShareDocsModal(appId);
    setSelectedDocIds([]);
  };

  const handleShareDocuments = async () => {
    if (selectedDocIds.length === 0) {
      toast.error('Bitte wählen Sie mindestens ein Dokument aus');
      return;
    }
    
    setSharingDocs(true);
    try {
      await applicationsAPI.shareDocuments(showShareDocsModal, selectedDocIds);
      toast.success('Dokumente erfolgreich freigegeben');
      setShowShareDocsModal(null);
      setSelectedDocIds([]);
      loadApplications();
    } catch (error) {
      toast.error('Fehler beim Freigeben der Dokumente');
    } finally {
      setSharingDocs(false);
    }
  };

  const toggleDocSelection = (docId) => {
    setSelectedDocIds(prev => 
      prev.includes(docId) 
        ? prev.filter(id => id !== docId)
        : [...prev, docId]
    );
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
      <div className="flex items-center gap-3 mb-8">
        <FileText className="h-8 w-8 text-primary-600" />
        <h1 className="text-3xl font-bold text-gray-900">{t('applicant.applicationsTitle')}</h1>
      </div>

      {applications.length === 0 ? (
          <div className="card text-center py-12">
            <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">{t('applicant.noApplications')}</h2>
            <p className="text-gray-600 mb-4">
              {t('applicant.noApplicationsText')}
            </p>
            <Link to="/jobs" className="btn-primary inline-block">
              {t('applicant.browseJobs')}
            </Link>
          </div>
      ) : (
        <div className="space-y-4">
          {applications.map((app) => (
            <div key={app.id} className="card">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <Link 
                      to={`/jobs/${app.job_posting_id}`}
                      className="text-xl font-semibold text-gray-900 hover:text-primary-600"
                    >
                      {getJobTitle(app)}
                    </Link>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusLabels[app.status]?.color || 'bg-gray-100 text-gray-800'}`}>
                      {statusLabels[app.status]?.label || app.status}
                    </span>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-4 text-gray-600">
                    <span className="flex items-center gap-1">
                      <Building2 className="h-4 w-4" />
                      {app.company_name || t('applicantApplications.unknown')}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {t('applicantApplications.appliedOn')} {formatDate(app.applied_at)}
                    </span>
                    {app.updated_at !== app.applied_at && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {t('applicantApplications.updated')}: {formatDate(app.updated_at)}
                      </span>
                    )}
                  </div>

                  {app.applicant_message && (
                    <p className="mt-3 text-gray-600 text-sm">
                      <strong>{t('applicantApplications.yourMessage')}:</strong> {app.applicant_message}
                    </p>
                  )}

                  {/* Button: Bewerbungsdetails anzeigen */}
                  <button
                    onClick={() => toggleAppDetails(app.id)}
                    className="mt-3 inline-flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700 font-medium"
                  >
                    {expandedApp === app.id ? (
                      <>
                        <ChevronUp className="h-4 w-4" />
                        Details ausblenden
                      </>
                    ) : (
                      <>
                        <ChevronDown className="h-4 w-4" />
                        Bewerbungsdetails anzeigen
                      </>
                    )}
                  </button>

                  {/* Expandierte Bewerbungsdetails */}
                  {expandedApp === app.id && (
                    <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <Eye className="h-5 w-5 text-primary-600" />
                        Freigegebene Dokumente für {app.company_name}
                      </h4>
                      
                      {!sharedDocuments[app.id] ? (
                        <div className="flex items-center gap-2 text-gray-500">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Lade Dokumente...
                        </div>
                      ) : sharedDocuments[app.id].length === 0 ? (
                        <div className="text-gray-500 flex items-center gap-2">
                          <EyeOff className="h-4 w-4" />
                          Keine Dokumente freigegeben
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
                                <p className="text-xs text-gray-500">{doc.document_type}</p>
                              </div>
                              <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
                                freigegeben
                              </span>
                            </div>
                          ))}
                          <p className="text-xs text-gray-500 mt-2">
                            ℹ️ Diese {sharedDocuments[app.id].length} Dokument(e) sind für <strong>{app.company_name}</strong> sichtbar.
                          </p>
                        </div>
                      )}
                      
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <button
                          onClick={() => openShareDocsModal(app.id)}
                          className="inline-flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700 font-medium"
                        >
                          <FilePlus className="h-4 w-4" />
                          Weitere Dokumente freigeben
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Angeforderte Dokumente Hinweis */}
                  {app.requested_documents?.length > 0 && (
                    <div className="mt-3 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                      <div className="flex items-center gap-2 text-orange-700">
                        <FilePlus className="h-5 w-5" />
                        <span className="font-medium">Dokumente angefordert!</span>
                      </div>
                      <p className="text-sm text-orange-600 mt-1">
                        {app.company_name || 'Das Unternehmen'} hat folgende Dokumente angefordert:
                      </p>
                      <ul className="mt-2 space-y-1">
                        {app.requested_documents.map((doc, idx) => (
                          <li key={idx} className="text-sm text-orange-700 flex items-center gap-2">
                            <span className="w-1.5 h-1.5 bg-orange-400 rounded-full"></span>
                            {doc.type === 'cv' ? 'Lebenslauf' :
                             doc.type === 'passport' ? 'Reisepass' :
                             doc.type === 'photo' ? 'Bewerbungsfoto' :
                             doc.type === 'language_cert' ? 'Sprachzertifikat' :
                             doc.type === 'diploma' ? 'Studienzeugnis' :
                             doc.type === 'work_reference' ? 'Arbeitszeugnis' :
                             doc.type}
                          </li>
                        ))}
                      </ul>
                      <div className="mt-3 flex gap-2">
                        <button
                          onClick={() => openShareDocsModal(app.id)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 rounded-lg"
                        >
                          <FilePlus className="h-4 w-4" />
                          Dokumente freigeben
                        </button>
                        <Link 
                          to="/applicant/documents" 
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-orange-700 hover:text-orange-800 border border-orange-300 rounded-lg hover:bg-orange-100"
                        >
                          Neue hochladen
                        </Link>
                      </div>
                    </div>
                  )}

                  {/* Interview-Termine anzeigen */}
                  {interviews[app.id]?.length > 0 && (
                    <div className="mt-4 space-y-3">
                      {interviews[app.id].map((interview) => (
                        <div key={interview.id} className={`p-4 rounded-xl border-2 ${
                          interview.status === 'proposed' ? 'bg-purple-50 border-purple-300' :
                          interview.status === 'confirmed' ? 'bg-green-50 border-green-300' :
                          interview.status === 'declined' ? 'bg-red-50 border-red-200' :
                          'bg-gray-50 border-gray-200'
                        }`}>
                          {/* Confirmed appointment */}
                          {interview.status === 'confirmed' && (
                            <div className="flex items-start gap-3">
                              <CheckCircle className="h-6 w-6 text-green-600 mt-1" />
                              <div className="flex-1">
                                <p className="font-semibold text-green-800">{t('applicantApplications.appointmentConfirmed')}</p>
                                <p className="text-green-700 text-lg">
                                  {formatDateTime(interview.confirmed_date)}
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
                                    {t('applicantApplications.toMeetingLink')}
                                  </a>
                                )}
                                
                                {/* Cancel button */}
                                <button
                                  onClick={() => setShowCancelModal(interview.id)}
                                  className="mt-3 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 px-3 py-1.5 rounded-lg flex items-center gap-1"
                                >
                                  <XCircle className="h-4 w-4" />
                                  {t('applicantApplications.cancelAppointment')}
                                </button>
                              </div>
                            </div>
                          )}
                          
                          {/* Cancelled appointment */}
                          {interview.status === 'cancelled' && (
                            <div className="flex items-start gap-3">
                              <XCircle className="h-6 w-6 text-gray-500 mt-1" />
                              <div>
                                <p className="font-semibold text-gray-700">{t('applicantApplications.appointmentCancelled')}</p>
                                <p className="text-gray-600 text-sm">
                                  {t('applicantApplications.appointmentCancelledText')}
                                </p>
                              </div>
                            </div>
                          )}

                          {/* Proposed appointments - Selection */}
                          {interview.status === 'proposed' && (
                            <div>
                              <div className="flex items-start gap-3 mb-4">
                                <AlertTriangle className="h-6 w-6 text-purple-600 mt-1" />
                                <div>
                                  <p className="font-semibold text-purple-800">{t('applicantApplications.proposalsReceived')}</p>
                                  <p className="text-purple-600 text-sm">
                                    {t('applicantApplications.selectOrDecline')}
                                  </p>
                                </div>
                              </div>

                              {interview.location && (
                                <p className="text-gray-600 text-sm mb-3 flex items-center gap-1">
                                  <MapPin className="h-4 w-4" />
                                  <strong>{t('applicantApplications.location')}:</strong> {interview.location}
                                </p>
                              )}
                              {interview.meeting_link && (
                                <p className="text-gray-600 text-sm mb-3 flex items-center gap-1">
                                  <Video className="h-4 w-4" />
                                  <strong>{t('applicantApplications.online')}:</strong> {t('applicantApplications.linkActiveAfterConfirm')}
                                </p>
                              )}
                              {interview.notes_company && (
                                <p className="text-gray-600 text-sm mb-3">
                                  <strong>{t('applicantApplications.note')}:</strong> {interview.notes_company}
                                </p>
                              )}

                              {/* Hinweis zur deutschen Zeitzone */}
                              <p className="text-xs text-amber-600 mb-3 flex items-center gap-1 bg-amber-50 px-3 py-2 rounded-lg">
                                <Clock className="h-3 w-3" />
                                {t('applicantApplications.germanTime', 'Alle Zeiten in deutscher Zeit (MEZ/MESZ)')}
                              </p>

                              <div className="grid sm:grid-cols-2 gap-3 mb-4">
                                {/* Option 1 */}
                                <button
                                  onClick={() => confirmInterview(interview.id, interview.proposed_date_1)}
                                  disabled={processingInterview === interview.id}
                                  className="p-4 bg-white border-2 border-purple-200 rounded-xl hover:border-purple-500 hover:bg-purple-50 transition-all group text-left"
                                >
                                  <p className="text-xs text-purple-600 font-medium mb-1">{t('applicantApplications.option')} 1</p>
                                  <p className="font-semibold text-gray-900 group-hover:text-purple-700">
                                    {formatDateTime(interview.proposed_date_1)}
                                  </p>
                                  <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                                    <CalendarCheck className="h-3 w-3" />
                                    {t('applicantApplications.clickToConfirm')}
                                  </p>
                                </button>

                                {/* Option 2 */}
                                {interview.proposed_date_2 && (
                                  <button
                                    onClick={() => confirmInterview(interview.id, interview.proposed_date_2)}
                                    disabled={processingInterview === interview.id}
                                    className="p-4 bg-white border-2 border-purple-200 rounded-xl hover:border-purple-500 hover:bg-purple-50 transition-all group text-left"
                                  >
                                    <p className="text-xs text-purple-600 font-medium mb-1">{t('applicantApplications.option')} 2</p>
                                    <p className="font-semibold text-gray-900 group-hover:text-purple-700">
                                      {formatDateTime(interview.proposed_date_2)}
                                    </p>
                                    <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                                      <CalendarCheck className="h-3 w-3" />
                                      {t('applicantApplications.clickToConfirm')}
                                    </p>
                                  </button>
                                )}
                              </div>

                              {processingInterview === interview.id ? (
                                <div className="flex items-center justify-center gap-2 text-gray-600">
                                  <Loader2 className="h-5 w-5 animate-spin" />
                                  {t('applicantApplications.processing')}
                                </div>
                              ) : (
                                <button
                                  onClick={() => setShowDeclineModal(interview.id)}
                                  className="w-full py-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg text-sm font-medium flex items-center justify-center gap-2"
                                >
                                  <CalendarX className="h-4 w-4" />
                                  {t('applicantApplications.neitherFits')}
                                </button>
                              )}
                            </div>
                          )}

                          {/* Declined */}
                          {interview.status === 'declined' && (
                            <div className="flex items-start gap-3">
                              <XCircle className="h-6 w-6 text-red-500 mt-1" />
                              <div>
                                <p className="font-semibold text-red-700">{t('applicantApplications.datesDeclined')}</p>
                                <p className="text-red-600 text-sm">
                                  {t('applicantApplications.datesDeclinedText')}
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Link 
                    to={`/jobs/${app.job_posting_id}`}
                    className="btn-secondary text-sm flex items-center gap-1"
                  >
                    <ExternalLink className="h-4 w-4" />
                    {t('applicantApplications.details')}
                  </Link>
                  {app.status === 'pending' && (
                    <button
                      onClick={() => handleWithdraw(app.id)}
                      className="btn-danger text-sm flex items-center gap-1"
                    >
                      <XCircle className="h-4 w-4" />
                      {t('applicantApplications.withdraw')}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Decline Modal */}
      {showDeclineModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="p-6 border-b">
              <h2 className="text-xl font-bold flex items-center gap-2 text-red-700">
                <CalendarX className="h-6 w-6" />
                {t('applicantApplications.declineDatesTitle')}
              </h2>
            </div>

            <div className="p-6">
              <p className="text-gray-600 mb-4">
                {t('applicantApplications.declineDatesText')}
              </p>
              
              <div>
                <label className="label">{t('applicantApplications.reasonOptional')}</label>
                <textarea
                  className="input-styled"
                  rows={3}
                  placeholder={t('applicantApplications.reasonPlaceholder')}
                  value={declineReason}
                  onChange={(e) => setDeclineReason(e.target.value)}
                />
              </div>
            </div>

            <div className="p-4 border-t bg-gray-50 flex justify-end gap-3 rounded-b-2xl">
              <button
                onClick={() => {
                  setShowDeclineModal(null);
                  setDeclineReason('');
                }}
                className="btn-secondary"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={() => declineInterview(showDeclineModal)}
                disabled={processingInterview === showDeclineModal}
                className="btn-danger flex items-center gap-2"
              >
                {processingInterview === showDeclineModal ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CalendarX className="h-4 w-4" />
                )}
                {t('applicantApplications.declineAndRequest')}
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
                {t('applicantApplications.cancelAppointmentTitle')}
              </h2>
            </div>

            <div className="p-6">
              <p className="text-gray-600 mb-4">
                {t('applicantApplications.cancelAppointmentText')}
              </p>
              
              <div>
                <label className="label">{t('applicantApplications.reasonOptional')}</label>
                <textarea
                  className="input-styled"
                  rows={3}
                  placeholder={t('applicantApplications.cancelReasonPlaceholder')}
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
                {t('common.back')}
              </button>
              <button
                onClick={() => cancelInterview(showCancelModal)}
                disabled={processingInterview === showCancelModal}
                className="btn-danger flex items-center gap-2"
              >
                {processingInterview === showCancelModal ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <XCircle className="h-4 w-4" />
                )}
                {t('applicantApplications.cancelAppointment')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Dokumente freigeben */}
      {showShareDocsModal && (() => {
        const app = applications.find(a => a.id === showShareDocsModal);
        return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <FilePlus className="h-6 w-6 text-primary-600" />
              Dokumente freigeben
            </h3>
            
            {app && (
              <div className="bg-blue-50 rounded-lg p-3 mb-4 border border-blue-200">
                <p className="text-sm text-gray-700">
                  <strong className="text-blue-800">{app.company_name}</strong> erhält Zugriff auf die ausgewählten Dokumente für:
                </p>
                <p className="text-sm font-medium text-gray-900 mt-1">"{getJobTitle(app)}"</p>
              </div>
            )}
            
            <p className="text-gray-600 mb-4">
              Wählen Sie die Dokumente aus, die freigegeben werden sollen:
            </p>
            
            {myDocuments.length === 0 ? (
              <div className="text-center py-6 text-gray-500">
                <FileText className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                <p>Sie haben noch keine Dokumente hochgeladen.</p>
                <Link 
                  to="/applicant/documents" 
                  className="text-primary-600 hover:underline mt-2 inline-block"
                >
                  Jetzt Dokumente hochladen
                </Link>
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto mb-4">
                {myDocuments.map((doc) => (
                  <label 
                    key={doc.id} 
                    className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                      selectedDocIds.includes(doc.id) 
                        ? 'bg-primary-50 border-2 border-primary-300' 
                        : 'bg-gray-50 border-2 border-transparent hover:bg-gray-100'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedDocIds.includes(doc.id)}
                      onChange={() => toggleDocSelection(doc.id)}
                      className="w-5 h-5 text-primary-600 rounded"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">{doc.original_name}</p>
                      <p className="text-sm text-gray-500">{doc.document_type}</p>
                    </div>
                  </label>
                ))}
              </div>
            )}
            
            {myDocuments.length > 0 && selectedDocIds.length > 0 && app && (
              <div className="p-2 bg-yellow-50 border border-yellow-200 rounded-lg mb-4">
                <p className="text-xs text-yellow-700">
                  ⚠️ <strong>Datenschutz:</strong> Nur die ausgewählten {selectedDocIds.length} Dokument(e) werden für <strong>{app.company_name}</strong> sichtbar. Andere Firmen sehen diese Dokumente nicht.
                </p>
              </div>
            )}
            
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowShareDocsModal(null);
                  setSelectedDocIds([]);
                }}
                className="btn-secondary flex-1"
              >
                Abbrechen
              </button>
              <button
                onClick={handleShareDocuments}
                disabled={sharingDocs || selectedDocIds.length === 0}
                className="btn-primary flex-1 flex items-center justify-center gap-2"
              >
                {sharingDocs ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle className="h-4 w-4" />
                )}
                Freigeben ({selectedDocIds.length})
              </button>
            </div>
          </div>
        </div>
        );
      })()}
    </div>
  );
}

export default ApplicantApplications;
