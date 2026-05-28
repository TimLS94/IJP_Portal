import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { jobRequestsAPI, applicantAPI } from '../../lib/api';
import toast from 'react-hot-toast';
import { 
  ClipboardList, CheckCircle, AlertTriangle, FileText, Loader2,
  MapPin, Calendar, X, Shield, Clock, ExternalLink, Briefcase, Building2
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

const positionTypeColors = {
  studentenferienjob: 'bg-blue-500',
  saisonjob: 'bg-orange-500',
  fachkraft: 'bg-purple-500',
  ausbildung: 'bg-green-500',
};

function ApplicantJobRequest() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState([]);
  const [profile, setProfile] = useState(null);
  
  // Modal für neuen Auftrag
  const [showModal, setShowModal] = useState(false);
  const [privacyText, setPrivacyText] = useState('');
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [preferredLocation, setPreferredLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  
  // Stornieren
  const [cancellingId, setCancellingId] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [requestsRes, profileRes] = await Promise.all([
        jobRequestsAPI.getMyRequests(),
        applicantAPI.getProfile()
      ]);
      
      setRequests(requestsRes.data.requests || []);
      setProfile(profileRes.data);
    } catch (error) {
      console.error('Fehler beim Laden:', error);
    } finally {
      setLoading(false);
    }
  };

  const openModal = async () => {
    try {
      const res = await jobRequestsAPI.getPrivacyText();
      setPrivacyText(res.data.text);
      setShowModal(true);
    } catch (error) {
      toast.error(t('jobRequest.loadError'));
    }
  };

  const handleSubmit = async () => {
    if (!privacyAccepted) {
      toast.error(t('jobRequest.privacyRequired'));
      return;
    }

    setSubmitting(true);
    try {
      const res = await jobRequestsAPI.createRequests({
        privacy_consent: true,
        preferred_location: preferredLocation || null,
        notes: notes || null
      });
      toast.success(res.data.message || t('jobRequest.success'));
      setShowModal(false);
      setPrivacyAccepted(false);
      setPreferredLocation('');
      setNotes('');
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.detail || t('jobRequest.createError'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async (requestId) => {
    if (!confirm(t('jobRequest.withdrawConfirm'))) return;
    
    setCancellingId(requestId);
    try {
      await jobRequestsAPI.cancelRequest(requestId);
      toast.success(t('jobRequest.withdrawn'));
      loadData();
    } catch (error) {
      toast.error(t('jobRequest.cancelError'));
    } finally {
      setCancellingId(null);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Stellenarten die noch keinen Auftrag haben
  const getAvailablePositionTypes = () => {
    const allTypes = profile?.position_types || (profile?.position_type ? [profile.position_type] : []);
    const existingTypes = requests.map(r => r.position_type);
    return allTypes.filter(t => !existingTypes.includes(t));
  };

  // Prüfen ob Profil vollständig genug ist
  const hasPositionType = profile && (
    profile.position_type || 
    (profile.position_types && profile.position_types.length > 0)
  );
  
  // Fehlende Felder ermitteln
  const getMissingFields = () => {
    if (!profile) return ['Profil'];
    const missing = [];
    if (!profile.first_name) missing.push('Vorname');
    if (!profile.last_name) missing.push('Nachname');
    if (!profile.phone) missing.push('Telefonnummer');
    if (!hasPositionType) missing.push('Stellenart');
    return missing;
  };
  
  const missingFields = getMissingFields();
  const isProfileComplete = missingFields.length === 0;
  const canCreateMore = isProfileComplete && getAvailablePositionTypes().length > 0;

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-12 w-12 text-primary-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <ClipboardList className="h-8 w-8 text-primary-600" />
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{t('jobRequest.title')}</h1>
          <p className="text-gray-600">{t('jobRequest.subtitle')}</p>
        </div>
      </div>

      {/* Bestehende Aufträge */}
      {requests.length > 0 && (
        <div className="space-y-4 mb-8">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-primary-600" />
            {t('jobRequest.activeOrders')} ({requests.length})
          </h2>
          
          {requests.map((request) => (
            <div key={request.id} className="card border-l-4" style={{ borderLeftColor: positionTypeColors[request.position_type]?.replace('bg-', '#') || '#6b7280' }}>
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                <div className="flex-1">
                  {/* Stellenart Badge */}
                  <div className="flex items-center gap-3 mb-3">
                    <span className={`px-3 py-1 rounded-full text-white text-sm font-medium ${positionTypeColors[request.position_type] || 'bg-gray-500'}`}>
                      {request.position_type_label || 'Allgemein'}
                    </span>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[request.status_color] || statusColors.gray}`}>
                      {request.status_label}
                    </span>
                  </div>
                  
                  {/* Details */}
                  <div className="space-y-2 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      <span>{t('jobRequest.createdAt')} {formatDate(request.created_at)}</span>
                    </div>
                    {request.preferred_location && (
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        <span>{t('jobRequest.preferredLocation')}: {request.preferred_location}</span>
                      </div>
                    )}
                    {request.matched_company_name && (
                      <div className="flex items-center gap-2 text-green-700 font-medium">
                        <Building2 className="h-4 w-4" />
                        <span>{t('jobRequest.matchedTo')}: {request.matched_company_name}</span>
                        {request.matched_job_title && <span>- {request.matched_job_title}</span>}
                      </div>
                    )}
                  </div>
                  
                  {/* Interview-Details Box */}
                  {(request.interview_date || request.interview_link) && (
                    <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                      <h4 className="font-bold text-amber-800 flex items-center gap-2 mb-2">
                        <Calendar className="h-5 w-5" />
                        {t('jobRequest.interview')}
                      </h4>
                      <div className="space-y-2">
                        {request.interview_date && (
                          <p className="text-amber-900 font-medium">
                            📅 {t('jobRequest.interviewDate')}: {new Date(request.interview_date).toLocaleDateString('de-DE', { 
                              weekday: 'long', 
                              year: 'numeric', 
                              month: 'long', 
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        )}
                        {request.interview_link && (
                          <a 
                            href={request.interview_link} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium"
                          >
                            <ExternalLink className="h-4 w-4" />
                            {t('jobRequest.joinInterview')}
                          </a>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Vertragsdatum */}
                  {request.contract_date && (
                    <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-xl">
                      <h4 className="font-bold text-green-800 flex items-center gap-2 mb-2">
                        <FileText className="h-5 w-5" />
                        {t('jobRequest.contract')}
                      </h4>
                      <p className="text-green-900 font-medium">
                        📄 {t('jobRequest.contractDate')}: {new Date(request.contract_date).toLocaleDateString('de-DE', { 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric'
                        })}
                      </p>
                    </div>
                  )}
                  
                  {request.notes && (
                    <p className="mt-3 text-sm text-gray-500 italic">"{request.notes}"</p>
                  )}
                </div>
                
                {/* Stornieren Button */}
                <button
                  onClick={() => handleCancel(request.id)}
                  disabled={cancellingId === request.id}
                  className="btn-secondary text-sm flex items-center gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  {cancellingId === request.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <X className="h-4 w-4" />
                  )}
                  {t('jobRequest.withdraw')}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Neue Aufträge erstellen oder Info */}
      {canCreateMore ? (
        <div className="card bg-gradient-to-br from-primary-50 to-blue-50 border-2 border-primary-200">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            {requests.length > 0 ? t('jobRequest.morePositionTypes') : t('jobRequest.findDreamJob')}
          </h2>
          <p className="text-gray-700 mb-4">
            {requests.length > 0 
              ? t('jobRequest.canOrderMore', { count: getAvailablePositionTypes().length })
              : t('jobRequest.withIJPOrder')
            }
          </p>
          
          {/* Verfügbare Stellenarten anzeigen */}
          <div className="flex flex-wrap gap-2 mb-6">
            {getAvailablePositionTypes().map((type) => {
              return (
                <span key={type} className={`px-3 py-1 rounded-full text-white text-sm font-medium ${positionTypeColors[type] || 'bg-gray-500'}`}>
                  {t(`positionTypes.${type}`) || type}
                </span>
              );
            })}
          </div>
          
          {requests.length === 0 && (
            <div className="grid md:grid-cols-3 gap-4 mb-6">
              <div className="bg-white p-4 rounded-xl">
                <CheckCircle className="h-8 w-8 text-green-500 mb-2" />
                <h4 className="font-semibold">{t('jobRequest.benefits.personal')}</h4>
                <p className="text-sm text-gray-600">{t('jobRequest.benefits.personalDesc')}</p>
              </div>
              <div className="bg-white p-4 rounded-xl">
                <CheckCircle className="h-8 w-8 text-green-500 mb-2" />
                <h4 className="font-semibold">{t('jobRequest.benefits.access')}</h4>
                <p className="text-sm text-gray-600">{t('jobRequest.benefits.accessDesc')}</p>
              </div>
              <div className="bg-white p-4 rounded-xl">
                <CheckCircle className="h-8 w-8 text-green-500 mb-2" />
                <h4 className="font-semibold">{t('jobRequest.benefits.free')}</h4>
                <p className="text-sm text-gray-600">{t('jobRequest.benefits.freeDesc')}</p>
              </div>
            </div>
          )}

          <button onClick={openModal} className="btn-primary text-lg py-3 px-8">
            <ClipboardList className="h-5 w-5 mr-2 inline" />
            {requests.length > 0 ? t('jobRequest.submitMore') : t('jobRequest.submit')}
          </button>
        </div>
      ) : !isProfileComplete ? (
        <div className="card bg-yellow-50 border border-yellow-200">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-6 w-6 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-bold text-gray-900">{t('jobRequest.profileIncomplete')}</h3>
              <p className="text-gray-600 mt-1">
                {t('jobRequest.completeProfileFirst')}
              </p>
              <ul className="mt-2 space-y-1">
                {missingFields.map((field, idx) => (
                  <li key={idx} className="flex items-center gap-2 text-yellow-800">
                    <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
                    {field}
                  </li>
                ))}
              </ul>
              <Link to="/applicant/profile" className="btn-primary mt-4 inline-flex items-center gap-2">
                {t('jobRequest.completeProfile')} <ExternalLink className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      ) : requests.length > 0 ? (
        <div className="card bg-green-50 border border-green-200">
          <div className="flex items-center gap-3">
            <CheckCircle className="h-6 w-6 text-green-600" />
            <div>
              <h3 className="font-bold text-gray-900">{t('jobRequest.allTypesOrdered')}</h3>
              <p className="text-gray-600">{t('jobRequest.allTypesOrderedDesc')}</p>
            </div>
          </div>
        </div>
      ) : null}

      {/* Hinweise */}
      {requests.length === 0 && isProfileComplete && (
        <div className="card mt-6">
          <h3 className="font-bold text-gray-900 mb-4">{t('jobRequest.importantNotes')}</h3>
          <ul className="space-y-2 text-gray-600">
            <li className="flex items-start gap-2">
              <FileText className="h-5 w-5 text-gray-400 flex-shrink-0 mt-0.5" />
              <span>{t('jobRequest.noteDocuments')}</span>
            </li>
            <li className="flex items-start gap-2">
              <Shield className="h-5 w-5 text-gray-400 flex-shrink-0 mt-0.5" />
              <span>{t('jobRequest.notePrivacy')}</span>
            </li>
            <li className="flex items-start gap-2">
              <Clock className="h-5 w-5 text-gray-400 flex-shrink-0 mt-0.5" />
              <span>{t('jobRequest.noteTime')}</span>
            </li>
          </ul>
        </div>
      )}

      {/* Modal für neuen Auftrag */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">{t('jobRequest.createOrders')}</h2>
                <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                  <X className="h-6 w-6" />
                </button>
              </div>
              
              {/* Stellenarten die beauftragt werden */}
              <div className="mt-4">
                <p className="text-sm text-gray-600 mb-2">{t('jobRequest.ordersWillBeCreatedFor')}</p>
                <div className="flex flex-wrap gap-2">
                  {getAvailablePositionTypes().map((type) => {
                    return (
                      <span key={type} className={`px-3 py-1 rounded-full text-white text-sm font-medium ${positionTypeColors[type] || 'bg-gray-500'}`}>
                        {t(`positionTypes.${type}`) || type}
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Optionale Angaben */}
              <div>
                <label className="label">{t('jobRequest.preferredRegion')}</label>
                <input
                  type="text"
                  className="input-styled"
                  placeholder={t('jobRequest.preferredRegionPlaceholder')}
                  value={preferredLocation}
                  onChange={(e) => setPreferredLocation(e.target.value)}
                />
              </div>

              <div>
                <label className="label">{t('jobRequest.additionalWishes')}</label>
                <textarea
                  className="input-styled"
                  rows={3}
                  placeholder={t('jobRequest.additionalWishesPlaceholder')}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              {/* Datenschutzerklärung */}
              <div className="bg-gray-50 rounded-xl p-4 border">
                <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary-600" />
                  {t('jobRequest.privacyTitle')}
                </h3>
                <div className="bg-white rounded-lg p-4 max-h-60 overflow-y-auto text-sm text-gray-700 whitespace-pre-wrap border mb-4">
                  {privacyText}
                </div>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={privacyAccepted}
                    onChange={(e) => setPrivacyAccepted(e.target.checked)}
                    className="mt-1 h-5 w-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-gray-700">
                    {t('jobRequest.privacyAccept')}
                  </span>
                </label>
              </div>
            </div>

            <div className="p-6 border-t bg-gray-50 flex justify-end gap-3">
              <button onClick={() => setShowModal(false)} className="btn-secondary">
                {t('jobRequest.cancel')}
              </button>
              <button
                onClick={handleSubmit}
                disabled={!privacyAccepted || submitting}
                className="btn-primary flex items-center gap-2 disabled:opacity-50"
              >
                {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <CheckCircle className="h-5 w-5" />}
                {t('jobRequest.createOrdersCount', { count: getAvailablePositionTypes().length })}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ApplicantJobRequest;
