import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { jobRequestsAPI, applicantAPI } from '../../lib/api';
import toast from 'react-hot-toast';
import { 
  ClipboardList, CheckCircle, AlertTriangle, FileText, Loader2,
  MapPin, Calendar, X, Shield, Clock, ExternalLink
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

function ApplicantJobRequest() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [hasRequest, setHasRequest] = useState(false);
  const [request, setRequest] = useState(null);
  const [profile, setProfile] = useState(null);
  
  // Modal für neuen Auftrag
  const [showModal, setShowModal] = useState(false);
  const [privacyText, setPrivacyText] = useState('');
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [preferredLocation, setPreferredLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  
  // Stornieren
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [requestRes, profileRes] = await Promise.all([
        jobRequestsAPI.getMyRequest(),
        applicantAPI.getProfile()
      ]);
      
      setHasRequest(requestRes.data.has_request);
      setRequest(requestRes.data.request);
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
      toast.error('Fehler beim Laden');
    }
  };

  const handleSubmit = async () => {
    if (!privacyAccepted) {
      toast.error('Bitte stimmen Sie der Datenschutzerklärung zu');
      return;
    }

    setSubmitting(true);
    try {
      await jobRequestsAPI.createRequest({
        privacy_consent: true,
        preferred_location: preferredLocation || null,
        notes: notes || null
      });
      toast.success('IJP-Auftrag erfolgreich erstellt!');
      setShowModal(false);
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Fehler beim Erstellen');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async () => {
    if (!confirm('Möchten Sie den IJP-Auftrag wirklich stornieren?')) return;
    
    setCancelling(true);
    try {
      await jobRequestsAPI.cancelRequest();
      toast.success('Auftrag storniert');
      loadData();
    } catch (error) {
      toast.error('Fehler beim Stornieren');
    } finally {
      setCancelling(false);
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

  // Prüfen ob Profil vollständig genug ist
  const isProfileComplete = profile && profile.first_name && profile.last_name && profile.phone && profile.position_type;

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
          <h1 className="text-3xl font-bold text-gray-900">IJP beauftragen</h1>
          <p className="text-gray-600">Wir finden den passenden Job für Sie</p>
        </div>
      </div>

      {hasRequest && request ? (
        // Bestehender Auftrag
        <div className="space-y-6">
          {/* Status Card */}
          <div className="card">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Ihr IJP-Auftrag #{request.id}</h2>
              <span className={`px-4 py-2 rounded-full font-semibold ${statusColors[request.status_color] || statusColors.gray}`}>
                {request.status_label}
              </span>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">Erstellt am</p>
                    <p className="font-medium">{formatDate(request.created_at)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">Zuletzt aktualisiert</p>
                    <p className="font-medium">{formatDate(request.updated_at)}</p>
                  </div>
                </div>
                {request.preferred_location && (
                  <div className="flex items-center gap-3">
                    <MapPin className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500">Bevorzugte Region</p>
                      <p className="font-medium">{request.preferred_location}</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-green-50 rounded-xl p-4 border border-green-200">
                <div className="flex items-center gap-2 text-green-800 mb-2">
                  <Shield className="h-5 w-5" />
                  <span className="font-semibold">Datenschutz-Zustimmung</span>
                </div>
                <p className="text-sm text-green-700">
                  Erteilt am {formatDate(request.privacy_consent_date)}
                </p>
              </div>
            </div>

            {request.notes && (
              <div className="mt-6 p-4 bg-gray-50 rounded-xl">
                <p className="text-sm text-gray-500 mb-1">Ihre Notizen</p>
                <p className="text-gray-700">{request.notes}</p>
              </div>
            )}

            <div className="mt-6 pt-6 border-t flex justify-between items-center">
              <p className="text-sm text-gray-500">
                Wir melden uns bei Ihnen, sobald wir passende Stellen gefunden haben.
              </p>
              <button
                onClick={handleCancel}
                disabled={cancelling}
                className="btn-danger text-sm flex items-center gap-2"
              >
                {cancelling ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
                Auftrag stornieren
              </button>
            </div>
          </div>

          {/* Nächste Schritte */}
          <div className="card bg-primary-50 border-2 border-primary-200">
            <h3 className="font-bold text-gray-900 mb-3">Was passiert jetzt?</h3>
            <div className="space-y-3 text-sm text-gray-700">
              <div className="flex items-start gap-3">
                <span className="bg-primary-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs flex-shrink-0">1</span>
                <p>Wir prüfen Ihre Unterlagen und Ihr Profil</p>
              </div>
              <div className="flex items-start gap-3">
                <span className="bg-primary-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs flex-shrink-0">2</span>
                <p>Wir suchen passende Stellen bei unseren Partnerunternehmen</p>
              </div>
              <div className="flex items-start gap-3">
                <span className="bg-primary-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs flex-shrink-0">3</span>
                <p>Wir kontaktieren Sie mit konkreten Vorschlägen</p>
              </div>
              <div className="flex items-start gap-3">
                <span className="bg-primary-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs flex-shrink-0">4</span>
                <p>Wir koordinieren Vorstellungsgespräche und unterstützen Sie im gesamten Prozess</p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        // Kein aktiver Auftrag
        <div className="space-y-6">
          {/* Info Box */}
          <div className="card bg-gradient-to-br from-primary-50 to-blue-50 border-2 border-primary-200">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Lassen Sie uns Ihren Traumjob finden!
            </h2>
            <p className="text-gray-700 mb-6">
              Mit einem IJP-Auftrag beauftragen Sie uns, aktiv nach passenden Stellen für Sie zu suchen.
              Wir nutzen unser Netzwerk aus Partnerunternehmen in Deutschland, um für Sie die beste Stelle zu finden.
            </p>
            <div className="grid md:grid-cols-3 gap-4 mb-6">
              <div className="bg-white p-4 rounded-xl">
                <CheckCircle className="h-8 w-8 text-green-500 mb-2" />
                <h4 className="font-semibold">Persönliche Betreuung</h4>
                <p className="text-sm text-gray-600">Individuelle Beratung und Unterstützung</p>
              </div>
              <div className="bg-white p-4 rounded-xl">
                <CheckCircle className="h-8 w-8 text-green-500 mb-2" />
                <h4 className="font-semibold">30+ Partner</h4>
                <p className="text-sm text-gray-600">Zugang zu exklusiven Stellenangeboten</p>
              </div>
              <div className="bg-white p-4 rounded-xl">
                <CheckCircle className="h-8 w-8 text-green-500 mb-2" />
                <h4 className="font-semibold">Kostenlos</h4>
                <p className="text-sm text-gray-600">Keine Kosten für Bewerber</p>
              </div>
            </div>

            {!isProfileComplete ? (
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-4">
                <div className="flex items-start gap-2 text-yellow-800">
                  <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold">Profil unvollständig</p>
                    <p className="text-sm mt-1">
                      Bitte vervollständigen Sie zuerst Ihr Profil mit allen Pflichtangaben,
                      bevor Sie einen IJP-Auftrag erstellen können.
                    </p>
                    <Link to="/applicant/profile" className="inline-flex items-center gap-1 mt-2 text-yellow-700 font-medium hover:underline">
                      Profil vervollständigen <ExternalLink className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              </div>
            ) : (
              <button onClick={openModal} className="btn-primary text-lg py-3 px-8">
                <ClipboardList className="h-5 w-5 mr-2 inline" />
                Jetzt IJP beauftragen
              </button>
            )}
          </div>

          {/* Hinweise */}
          <div className="card">
            <h3 className="font-bold text-gray-900 mb-4">Wichtige Hinweise</h3>
            <ul className="space-y-2 text-gray-600">
              <li className="flex items-start gap-2">
                <FileText className="h-5 w-5 text-gray-400 flex-shrink-0 mt-0.5" />
                <span>Stellen Sie sicher, dass alle erforderlichen Dokumente hochgeladen sind</span>
              </li>
              <li className="flex items-start gap-2">
                <Shield className="h-5 w-5 text-gray-400 flex-shrink-0 mt-0.5" />
                <span>Mit der Beauftragung stimmen Sie der Weitergabe Ihrer Daten an Partnerunternehmen zu</span>
              </li>
              <li className="flex items-start gap-2">
                <Clock className="h-5 w-5 text-gray-400 flex-shrink-0 mt-0.5" />
                <span>Der Vermittlungsprozess kann je nach Verfügbarkeit einige Wochen dauern</span>
              </li>
            </ul>
          </div>
        </div>
      )}

      {/* Modal für neuen Auftrag */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">IJP-Auftrag erstellen</h2>
                <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Optionale Angaben */}
              <div>
                <label className="label">Bevorzugte Region/Stadt (optional)</label>
                <input
                  type="text"
                  className="input-styled"
                  placeholder="z.B. München, Bayern, Süddeutschland..."
                  value={preferredLocation}
                  onChange={(e) => setPreferredLocation(e.target.value)}
                />
              </div>

              <div>
                <label className="label">Zusätzliche Wünsche (optional)</label>
                <textarea
                  className="input-styled"
                  rows={3}
                  placeholder="Besondere Anforderungen, Präferenzen, Zeitraum..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              {/* Datenschutzerklärung */}
              <div className="bg-gray-50 rounded-xl p-4 border">
                <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary-600" />
                  Datenschutzerklärung
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
                    Ich habe die Datenschutzerklärung gelesen und stimme der Verarbeitung und
                    Weitergabe meiner Daten zum Zweck der Arbeitsvermittlung zu.
                  </span>
                </label>
              </div>
            </div>

            <div className="p-6 border-t bg-gray-50 flex justify-end gap-3">
              <button onClick={() => setShowModal(false)} className="btn-secondary">
                Abbrechen
              </button>
              <button
                onClick={handleSubmit}
                disabled={!privacyAccepted || submitting}
                className="btn-primary flex items-center gap-2 disabled:opacity-50"
              >
                {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <CheckCircle className="h-5 w-5" />}
                IJP-Auftrag erstellen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ApplicantJobRequest;
