import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { applicationsAPI, interviewAPI } from '../../lib/api';
import toast from 'react-hot-toast';
import { 
  FileText, Building2, Calendar, Clock, XCircle, ExternalLink,
  CalendarCheck, CalendarX, MapPin, Video, CheckCircle, AlertTriangle,
  Loader2
} from 'lucide-react';

const statusLabels = {
  pending: { label: 'Eingereicht', color: 'bg-yellow-100 text-yellow-800' },
  reviewing: { label: 'In Prüfung', color: 'bg-blue-100 text-blue-800' },
  company_review: { label: 'In Prüfung', color: 'bg-blue-100 text-blue-800' },
  interview: { label: 'Vorstellungsgespräch', color: 'bg-purple-100 text-purple-800' },
  interview_scheduled: { label: 'Vorstellungsgespräch geplant', color: 'bg-purple-100 text-purple-800' },
  accepted: { label: 'Angenommen', color: 'bg-green-100 text-green-800' },
  rejected: { label: 'Abgelehnt', color: 'bg-red-100 text-red-800' },
  withdrawn: { label: 'Zurückgezogen', color: 'bg-gray-100 text-gray-800' }
};

function ApplicantApplications() {
  const { t } = useTranslation();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [interviews, setInterviews] = useState({});
  const [processingInterview, setProcessingInterview] = useState(null);
  const [declineReason, setDeclineReason] = useState('');
  const [showDeclineModal, setShowDeclineModal] = useState(null);
  const [showCancelModal, setShowCancelModal] = useState(null);
  const [cancelReason, setCancelReason] = useState('');

  useEffect(() => {
    loadApplications();
  }, []);

  const loadApplications = async () => {
    try {
      const response = await applicationsAPI.getMyApplications();
      setApplications(response.data);
      
      // Lade Interviews für jede Bewerbung
      for (const app of response.data) {
        loadInterviewsForApp(app.id);
      }
    } catch (error) {
      toast.error('Fehler beim Laden der Bewerbungen');
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

  const confirmInterview = async (interviewId, selectedDate) => {
    setProcessingInterview(interviewId);
    try {
      await interviewAPI.confirm(interviewId, selectedDate);
      toast.success('Termin bestätigt! Die Firma wird benachrichtigt.');
      loadApplications();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Fehler beim Bestätigen');
    } finally {
      setProcessingInterview(null);
    }
  };

  const cancelInterview = async (interviewId) => {
    setProcessingInterview(interviewId);
    try {
      await interviewAPI.cancel(interviewId, cancelReason);
      toast.success('Termin abgesagt! Die Firma wird benachrichtigt.');
      setShowCancelModal(null);
      setCancelReason('');
      loadApplications();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Fehler beim Absagen');
    } finally {
      setProcessingInterview(null);
    }
  };

  const declineInterview = async (interviewId) => {
    setProcessingInterview(interviewId);
    try {
      await interviewAPI.decline(interviewId, declineReason);
      toast.success('Termine abgelehnt. Die Firma wird gebeten, neue Termine vorzuschlagen.');
      setShowDeclineModal(null);
      setDeclineReason('');
      loadApplications();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Fehler beim Ablehnen');
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
    if (!confirm('Möchten Sie diese Bewerbung wirklich zurückziehen?')) return;
    
    try {
      await applicationsAPI.withdraw(id);
      toast.success('Bewerbung zurückgezogen');
      loadApplications();
    } catch (error) {
      toast.error('Fehler beim Zurückziehen der Bewerbung');
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
                      {app.job_title || 'Stellenangebot'}
                    </Link>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusLabels[app.status]?.color || 'bg-gray-100 text-gray-800'}`}>
                      {statusLabels[app.status]?.label || app.status}
                    </span>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-4 text-gray-600">
                    <span className="flex items-center gap-1">
                      <Building2 className="h-4 w-4" />
                      {app.company_name || 'Unbekannt'}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      Beworben am {formatDate(app.applied_at)}
                    </span>
                    {app.updated_at !== app.applied_at && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        Aktualisiert: {formatDate(app.updated_at)}
                      </span>
                    )}
                  </div>

                  {app.applicant_message && (
                    <p className="mt-3 text-gray-600 text-sm">
                      <strong>Ihre Nachricht:</strong> {app.applicant_message}
                    </p>
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
                          {/* Bestätigter Termin */}
                          {interview.status === 'confirmed' && (
                            <div className="flex items-start gap-3">
                              <CheckCircle className="h-6 w-6 text-green-600 mt-1" />
                              <div className="flex-1">
                                <p className="font-semibold text-green-800">Termin bestätigt!</p>
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
                                    Zum Meeting-Link
                                  </a>
                                )}
                                
                                {/* Absagen-Button */}
                                <button
                                  onClick={() => setShowCancelModal(interview.id)}
                                  className="mt-3 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 px-3 py-1.5 rounded-lg flex items-center gap-1"
                                >
                                  <XCircle className="h-4 w-4" />
                                  Termin absagen
                                </button>
                              </div>
                            </div>
                          )}
                          
                          {/* Abgesagter Termin */}
                          {interview.status === 'cancelled' && (
                            <div className="flex items-start gap-3">
                              <XCircle className="h-6 w-6 text-gray-500 mt-1" />
                              <div>
                                <p className="font-semibold text-gray-700">Termin abgesagt</p>
                                <p className="text-gray-600 text-sm">
                                  Dieser Termin wurde abgesagt. Die Firma kann neue Termine vorschlagen.
                                </p>
                              </div>
                            </div>
                          )}

                          {/* Termine vorgeschlagen - Auswahl */}
                          {interview.status === 'proposed' && (
                            <div>
                              <div className="flex items-start gap-3 mb-4">
                                <AlertTriangle className="h-6 w-6 text-purple-600 mt-1" />
                                <div>
                                  <p className="font-semibold text-purple-800">Terminvorschläge erhalten!</p>
                                  <p className="text-purple-600 text-sm">
                                    Bitte wählen Sie einen Termin aus oder lehnen Sie ab, um neue Termine anzufordern.
                                  </p>
                                </div>
                              </div>

                              {interview.location && (
                                <p className="text-gray-600 text-sm mb-3 flex items-center gap-1">
                                  <MapPin className="h-4 w-4" />
                                  <strong>Ort:</strong> {interview.location}
                                </p>
                              )}
                              {interview.meeting_link && (
                                <p className="text-gray-600 text-sm mb-3 flex items-center gap-1">
                                  <Video className="h-4 w-4" />
                                  <strong>Online:</strong> Link wird nach Bestätigung aktiv
                                </p>
                              )}
                              {interview.notes_company && (
                                <p className="text-gray-600 text-sm mb-3">
                                  <strong>Hinweis:</strong> {interview.notes_company}
                                </p>
                              )}

                              <div className="grid sm:grid-cols-2 gap-3 mb-4">
                                {/* Termin 1 */}
                                <button
                                  onClick={() => confirmInterview(interview.id, interview.proposed_date_1)}
                                  disabled={processingInterview === interview.id}
                                  className="p-4 bg-white border-2 border-purple-200 rounded-xl hover:border-purple-500 hover:bg-purple-50 transition-all group text-left"
                                >
                                  <p className="text-xs text-purple-600 font-medium mb-1">Option 1</p>
                                  <p className="font-semibold text-gray-900 group-hover:text-purple-700">
                                    {formatDateTime(interview.proposed_date_1)}
                                  </p>
                                  <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                                    <CalendarCheck className="h-3 w-3" />
                                    Klicken zum Bestätigen
                                  </p>
                                </button>

                                {/* Termin 2 */}
                                {interview.proposed_date_2 && (
                                  <button
                                    onClick={() => confirmInterview(interview.id, interview.proposed_date_2)}
                                    disabled={processingInterview === interview.id}
                                    className="p-4 bg-white border-2 border-purple-200 rounded-xl hover:border-purple-500 hover:bg-purple-50 transition-all group text-left"
                                  >
                                    <p className="text-xs text-purple-600 font-medium mb-1">Option 2</p>
                                    <p className="font-semibold text-gray-900 group-hover:text-purple-700">
                                      {formatDateTime(interview.proposed_date_2)}
                                    </p>
                                    <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                                      <CalendarCheck className="h-3 w-3" />
                                      Klicken zum Bestätigen
                                    </p>
                                  </button>
                                )}
                              </div>

                              {processingInterview === interview.id ? (
                                <div className="flex items-center justify-center gap-2 text-gray-600">
                                  <Loader2 className="h-5 w-5 animate-spin" />
                                  Wird verarbeitet...
                                </div>
                              ) : (
                                <button
                                  onClick={() => setShowDeclineModal(interview.id)}
                                  className="w-full py-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg text-sm font-medium flex items-center justify-center gap-2"
                                >
                                  <CalendarX className="h-4 w-4" />
                                  Beide Termine passen nicht - Neue Termine anfordern
                                </button>
                              )}
                            </div>
                          )}

                          {/* Abgelehnt */}
                          {interview.status === 'declined' && (
                            <div className="flex items-start gap-3">
                              <XCircle className="h-6 w-6 text-red-500 mt-1" />
                              <div>
                                <p className="font-semibold text-red-700">Termine abgelehnt</p>
                                <p className="text-red-600 text-sm">
                                  Die Firma wurde gebeten, neue Termine vorzuschlagen.
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
                    Details
                  </Link>
                  {app.status === 'pending' && (
                    <button
                      onClick={() => handleWithdraw(app.id)}
                      className="btn-danger text-sm flex items-center gap-1"
                    >
                      <XCircle className="h-4 w-4" />
                      Zurückziehen
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Ablehnen-Modal */}
      {showDeclineModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="p-6 border-b">
              <h2 className="text-xl font-bold flex items-center gap-2 text-red-700">
                <CalendarX className="h-6 w-6" />
                Termine ablehnen
              </h2>
            </div>

            <div className="p-6">
              <p className="text-gray-600 mb-4">
                Wenn Sie beide Termine ablehnen, wird die Firma gebeten, neue Terminvorschläge zu senden.
              </p>
              
              <div>
                <label className="label">Grund (optional)</label>
                <textarea
                  className="input-styled"
                  rows={3}
                  placeholder="z.B. An diesen Tagen bin ich verhindert, bitte Termine ab dem..."
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
                Abbrechen
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
                Ablehnen & neue Termine anfordern
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Absage-Modal (für bereits bestätigte Termine) */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="p-6 border-b">
              <h2 className="text-xl font-bold flex items-center gap-2 text-red-700">
                <XCircle className="h-6 w-6" />
                Termin absagen
              </h2>
            </div>

            <div className="p-6">
              <p className="text-gray-600 mb-4">
                Möchten Sie diesen bestätigten Termin wirklich absagen? Die Firma wird per E-Mail benachrichtigt.
              </p>
              
              <div>
                <label className="label">Grund (optional)</label>
                <textarea
                  className="input-styled"
                  rows={3}
                  placeholder="z.B. Krankheit, familiärer Notfall..."
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
                Zurück
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
                Termin absagen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ApplicantApplications;
