import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { jobsAPI, applicationsAPI } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { 
  MapPin, Calendar, Building2, Euro, Clock, Globe, 
  ArrowLeft, Send, CheckCircle, Languages, AlertTriangle, FileText, Loader2, ClipboardList,
  Sparkles, TrendingUp, TrendingDown, Minus
} from 'lucide-react';

const positionTypeColors = {
  studentenferienjob: 'bg-blue-100 text-blue-800 border-blue-200',
  saisonjob: 'bg-orange-100 text-orange-800 border-orange-200',
  fachkraft: 'bg-purple-100 text-purple-800 border-purple-200',
  ausbildung: 'bg-green-100 text-green-800 border-green-200'
};

const languageLevelColors = {
  not_required: 'bg-gray-100 text-gray-600',
  // Neue Werte
  a1: 'bg-yellow-100 text-yellow-800',
  a2: 'bg-yellow-100 text-yellow-800',
  b1: 'bg-blue-100 text-blue-800',
  b2: 'bg-blue-200 text-blue-900',
  c1: 'bg-green-100 text-green-800',
  c2: 'bg-green-200 text-green-900',
  // Legacy-Werte
  basic: 'bg-yellow-100 text-yellow-800',
  good: 'bg-blue-100 text-blue-800',
  fluent: 'bg-green-100 text-green-800'
};

function JobDetail() {
  const { t } = useTranslation();
  
  const positionTypeLabels = {
    studentenferienjob: t('positionTypes.studentenferienjob'),
    saisonjob: t('positionTypes.saisonjob'),
    fachkraft: t('positionTypes.fachkraft'),
    ausbildung: t('positionTypes.ausbildung')
  };

  const languageLevelLabels = {
    not_required: t('languageLevels.none'),
    // Neue Werte
    a1: 'A1 - Grundkenntnisse',
    a2: 'A2 - Grundkenntnisse',
    b1: 'B1 - Gute Kenntnisse',
    b2: 'B2 - Sehr gute Kenntnisse',
    c1: 'C1 - Fließend',
    c2: 'C2 - Fließend',
    // Legacy-Werte
    basic: 'A2 - Grundkenntnisse',
    good: 'B1 - Gute Kenntnisse',
    fluent: 'C1 - Fließend'
  };
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, isApplicant } = useAuth();
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState(false);
  const [message, setMessage] = useState('');
  
  // Bewerbungsvoraussetzungen
  const [requirements, setRequirements] = useState(null);
  const [requirementsLoading, setRequirementsLoading] = useState(false);
  
  // Matching Score
  const [matchScore, setMatchScore] = useState(null);
  const [matchLoading, setMatchLoading] = useState(false);

  useEffect(() => {
    loadJob();
  }, [id]);
  
  // Voraussetzungen und Matching laden wenn Bewerber eingeloggt
  useEffect(() => {
    if (isApplicant && id) {
      loadRequirements();
      loadMatchScore();
    }
  }, [isApplicant, id]);

  const loadJob = async () => {
    try {
      const response = await jobsAPI.get(id);
      setJob(response.data);
    } catch (error) {
      toast.error('Stellenangebot nicht gefunden');
      navigate('/jobs');
    } finally {
      setLoading(false);
    }
  };
  
  const loadRequirements = async () => {
    setRequirementsLoading(true);
    try {
      const response = await applicationsAPI.checkRequirements(id);
      setRequirements(response.data);
    } catch (error) {
      console.error('Fehler beim Prüfen der Voraussetzungen');
    } finally {
      setRequirementsLoading(false);
    }
  };
  
  const loadMatchScore = async () => {
    setMatchLoading(true);
    try {
      const response = await jobsAPI.getMatchScore(id);
      setMatchScore(response.data);
    } catch (error) {
      console.error('Fehler beim Laden des Matching-Scores');
    } finally {
      setMatchLoading(false);
    }
  };

  const handleApply = async () => {
    if (!isAuthenticated) {
      toast.error('Bitte melden Sie sich an, um sich zu bewerben');
      navigate('/login');
      return;
    }

    if (!isApplicant) {
      toast.error('Nur Bewerber können sich auf Stellen bewerben');
      return;
    }

    setApplying(true);
    try {
      await applicationsAPI.create({
        job_posting_id: parseInt(id),
        applicant_message: message
      });
      toast.success('Bewerbung erfolgreich eingereicht!');
      setApplied(true);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Bewerbung fehlgeschlagen');
    } finally {
      setApplying(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return null;
    return new Date(dateString).toLocaleDateString('de-DE');
  };

  // Prüfen ob Sprachanforderungen vorhanden sind
  const hasLanguageRequirements = (job) => {
    return (job.german_required && job.german_required !== 'not_required') ||
           (job.english_required && job.english_required !== 'not_required') ||
           (job.other_languages_required && job.other_languages_required.length > 0);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!job) return null;

  return (
    <div className="max-w-5xl mx-auto">
      {/* Zurück-Button */}
      <Link to="/jobs" className="inline-flex items-center text-gray-600 hover:text-primary-600 mb-6 group">
        <ArrowLeft className="h-4 w-4 mr-2 group-hover:-translate-x-1 transition-transform" />
        Zurück zu den Stellenangeboten
      </Link>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Hauptinhalt */}
        <div className="lg:col-span-2 space-y-6">
          <div className="card">
            <div className="flex items-start justify-between gap-4 mb-4">
              <h1 className="text-3xl font-bold text-gray-900">{job.title}</h1>
              <span className={`px-4 py-1.5 rounded-full text-sm font-semibold whitespace-nowrap border ${positionTypeColors[job.position_type]}`}>
                {positionTypeLabels[job.position_type]}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-gray-600 mb-6">
              <span className="flex items-center gap-1.5">
                <Building2 className="h-5 w-5 text-gray-400" />
                <span className="font-medium">{job.company?.company_name}</span>
              </span>
              {job.location && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="h-5 w-5 text-gray-400" />
                  {job.location}
                </span>
              )}
              {job.remote_possible && (
                <span className="flex items-center gap-1.5 text-teal-600">
                  <Globe className="h-5 w-5" />
                  Remote möglich
                </span>
              )}
            </div>

            <div className="prose max-w-none">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Beschreibung</h3>
              <p className="text-gray-600 whitespace-pre-wrap">{job.description}</p>

              {job.requirements && (
                <>
                  <h3 className="text-lg font-semibold text-gray-900 mt-6 mb-2">Anforderungen</h3>
                  <p className="text-gray-600 whitespace-pre-wrap">{job.requirements}</p>
                </>
              )}

              {job.benefits && (
                <>
                  <h3 className="text-lg font-semibold text-gray-900 mt-6 mb-2">Wir bieten</h3>
                  <p className="text-gray-600 whitespace-pre-wrap">{job.benefits}</p>
                </>
              )}
            </div>
          </div>

          {/* Sprachanforderungen */}
          {hasLanguageRequirements(job) && (
            <div className="card border-l-4 border-l-blue-500">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Languages className="h-5 w-5 text-blue-600" />
                Sprachanforderungen
              </h3>
              <div className="grid md:grid-cols-2 gap-4">
                {job.german_required && job.german_required !== 'not_required' && (
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="font-medium text-gray-700">Deutsch</span>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${languageLevelColors[job.german_required]}`}>
                      {languageLevelLabels[job.german_required]}
                    </span>
                  </div>
                )}
                {job.english_required && job.english_required !== 'not_required' && (
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="font-medium text-gray-700">Englisch</span>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${languageLevelColors[job.english_required]}`}>
                      {languageLevelLabels[job.english_required]}
                    </span>
                  </div>
                )}
                {job.other_languages_required?.map((lang, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="font-medium text-gray-700">{lang.language}</span>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${languageLevelColors[lang.level]}`}>
                      {languageLevelLabels[lang.level]}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Matching Score Box - Nur für eingeloggte Bewerber */}
          {isApplicant && matchScore?.enabled && (
            <div className={`card border-2 ${
              matchScore.total_score >= 70 
                ? 'border-green-300 bg-gradient-to-br from-green-50 to-emerald-50' 
                : matchScore.total_score >= 40 
                  ? 'border-yellow-300 bg-gradient-to-br from-yellow-50 to-amber-50'
                  : 'border-red-300 bg-gradient-to-br from-red-50 to-orange-50'
            }`}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Sparkles className={`h-5 w-5 ${
                    matchScore.total_score >= 70 
                      ? 'text-green-600' 
                      : matchScore.total_score >= 40 
                        ? 'text-yellow-600'
                        : 'text-red-600'
                  }`} />
                  <h3 className="text-lg font-semibold text-gray-900">Ihr Matching</h3>
                </div>
                {matchScore.total_score >= 70 ? (
                  <TrendingUp className="h-5 w-5 text-green-600" />
                ) : matchScore.total_score >= 40 ? (
                  <Minus className="h-5 w-5 text-yellow-600" />
                ) : (
                  <TrendingDown className="h-5 w-5 text-red-600" />
                )}
              </div>
              
              {/* Score Circle */}
              <div className="flex items-center justify-center mb-4">
                <div className={`relative w-28 h-28 rounded-full flex items-center justify-center ${
                  matchScore.total_score >= 70 
                    ? 'bg-green-100' 
                    : matchScore.total_score >= 40 
                      ? 'bg-yellow-100'
                      : 'bg-red-100'
                }`}>
                  <div className={`text-4xl font-bold ${
                    matchScore.total_score >= 70 
                      ? 'text-green-700' 
                      : matchScore.total_score >= 40 
                        ? 'text-yellow-700'
                        : 'text-red-700'
                  }`}>
                    {matchScore.total_score}%
                  </div>
                </div>
              </div>
              
              {/* Recommendation */}
              <p className={`text-center font-medium mb-4 ${
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
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Positionstyp</span>
                    <span className="font-medium">{matchScore.breakdown.position_type}/30</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Deutsch</span>
                    <span className="font-medium">{matchScore.breakdown.german_level}/25</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Englisch</span>
                    <span className="font-medium">{matchScore.breakdown.english_level}/15</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Erfahrung</span>
                    <span className="font-medium">{matchScore.breakdown.experience}/20</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Verfügbarkeit</span>
                    <span className="font-medium">{matchScore.breakdown.availability}/10</span>
                  </div>
                </div>
              )}
              
              {/* Details */}
              {matchScore.details?.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <p className="text-sm text-gray-600 font-medium mb-2">Details:</p>
                  <ul className="text-sm text-gray-600 space-y-1">
                    {matchScore.details.map((detail, i) => (
                      <li key={i}>{detail}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
          
          {/* Matching Loading */}
          {isApplicant && matchLoading && (
            <div className="card">
              <div className="flex items-center justify-center gap-2 py-4">
                <Loader2 className="h-5 w-5 animate-spin text-primary-600" />
                <span className="text-gray-600">Berechne Matching...</span>
              </div>
            </div>
          )}
          
          {/* Bewerbungs-Box */}
          <div className="card">
            {applied ? (
              <div className="text-center py-4">
                <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
                <h3 className="text-lg font-semibold text-gray-900">Bewerbung eingereicht!</h3>
                <p className="text-gray-600 mt-2">
                  Sie können den Status in Ihrem Profil verfolgen.
                </p>
                <Link to="/applicant/applications" className="btn-primary mt-4 inline-block">
                  Zu meinen Bewerbungen
                </Link>
              </div>
            ) : (
              <>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Jetzt bewerben</h3>
                
                {/* Voraussetzungsprüfung für Bewerber */}
                {isApplicant && (
                  <>
                    {requirementsLoading ? (
                      <div className="flex items-center gap-2 text-gray-500 mb-4">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Prüfe Voraussetzungen...
                      </div>
                    ) : requirements && !requirements.can_apply ? (
                      <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl">
                        <div className="flex items-start gap-2 text-red-800 mb-2">
                          <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                          <span className="font-semibold">Bewerbung noch nicht möglich</span>
                        </div>
                        <p className="text-sm text-red-700 mb-3">
                          Bitte vervollständigen Sie zuerst Ihr Profil und laden Sie alle erforderlichen Dokumente hoch:
                        </p>
                        <ul className="text-sm text-red-700 space-y-1 mb-3">
                          {requirements.errors.map((error, i) => (
                            <li key={i} className="flex items-center gap-2">
                              <span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span>
                              {error}
                            </li>
                          ))}
                        </ul>
                        <div className="flex gap-2">
                          <Link 
                            to="/applicant/profile" 
                            className="flex-1 bg-white text-red-700 border border-red-300 px-3 py-2 rounded-lg text-sm font-medium hover:bg-red-50 text-center"
                          >
                            Profil bearbeiten
                          </Link>
                          <Link 
                            to="/applicant/documents" 
                            className="flex-1 bg-white text-red-700 border border-red-300 px-3 py-2 rounded-lg text-sm font-medium hover:bg-red-50 text-center flex items-center justify-center gap-1"
                          >
                            <FileText className="h-4 w-4" />
                            Dokumente
                          </Link>
                        </div>
                      </div>
                    ) : requirements?.can_apply ? (
                      <>
                        {requirements.warnings?.length > 0 && (
                          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                            <p className="text-sm text-yellow-800">
                              <AlertTriangle className="h-4 w-4 inline mr-1" />
                              {requirements.warnings[0]}
                            </p>
                          </div>
                        )}
                        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                          <p className="text-sm text-green-800 flex items-center gap-2">
                            <CheckCircle className="h-4 w-4" />
                            Alle Voraussetzungen erfüllt!
                          </p>
                        </div>
                        <div className="mb-4">
                          <label className="label">Nachricht (optional)</label>
                          <textarea
                            className="input-styled"
                            rows={4}
                            placeholder="Fügen Sie eine persönliche Nachricht hinzu..."
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                          />
                        </div>
                      </>
                    ) : null}
                  </>
                )}
                
                <button
                  onClick={handleApply}
                  disabled={applying || (isApplicant && requirements && !requirements.can_apply)}
                  className="btn-primary w-full flex items-center justify-center py-3 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {applying ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Bewerbung einreichen
                    </>
                  )}
                </button>
                
                {!isAuthenticated && (
                  <p className="text-sm text-gray-500 mt-3 text-center">
                    <Link to="/login" className="text-primary-600 hover:underline font-medium">
                      Anmelden
                    </Link>
                    {' '}um sich zu bewerben
                  </p>
                )}
              </>
            )}
          </div>

          {/* Details Box */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Details</h3>
            <div className="space-y-4">
              {(job.salary_min || job.salary_max) && (
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Euro className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Vergütung</p>
                    <p className="font-semibold text-gray-900">
                      {job.salary_min?.toLocaleString('de-DE', { minimumFractionDigits: job.salary_min % 1 !== 0 ? 2 : 0, maximumFractionDigits: 2 })}€ - {job.salary_max?.toLocaleString('de-DE', { minimumFractionDigits: job.salary_max % 1 !== 0 ? 2 : 0, maximumFractionDigits: 2 })}€
                      <span className="text-gray-500 font-normal">
                        /{job.salary_type === 'hourly' ? 'Stunde' : job.salary_type === 'monthly' ? 'Monat' : 'Jahr'}
                      </span>
                    </p>
                  </div>
                </div>
              )}
              
              {job.start_date && (
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Calendar className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Startdatum</p>
                    <p className="font-semibold text-gray-900">{formatDate(job.start_date)}</p>
                  </div>
                </div>
              )}
              
              {job.end_date && (
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <Clock className="h-5 w-5 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Enddatum</p>
                    <p className="font-semibold text-gray-900">{formatDate(job.end_date)}</p>
                  </div>
                </div>
              )}
              
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gray-100 rounded-lg">
                  <Calendar className="h-5 w-5 text-gray-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Veröffentlicht am</p>
                  <p className="font-semibold text-gray-900">{formatDate(job.created_at)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* IJP beauftragen Box */}
          {isApplicant && (
            <div className="card bg-gradient-to-br from-primary-50 to-blue-50 border-2 border-primary-200">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-primary-600 rounded-lg">
                  <ClipboardList className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">IJP beauftragen</h3>
              </div>
              <p className="text-gray-600 text-sm mb-4">
                Sie möchten, dass wir den passenden Job für Sie finden? 
                Wir vermitteln Sie an unsere Partnerunternehmen!
              </p>
              <Link 
                to="/applicant/ijp-auftrag" 
                className="btn-primary w-full flex items-center justify-center gap-2"
              >
                <ClipboardList className="h-4 w-4" />
                IJP mit Jobsuche beauftragen
              </Link>
            </div>
          )}

          {!isAuthenticated && (
            <div className="card bg-gradient-to-br from-primary-50 to-blue-50 border-2 border-primary-200">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-primary-600 rounded-lg">
                  <ClipboardList className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">IJP beauftragen</h3>
              </div>
              <p className="text-gray-600 text-sm mb-4">
                Lassen Sie uns den passenden Job für Sie finden! 
                Registrieren Sie sich und beauftragen Sie IJP.
              </p>
              <Link 
                to="/register" 
                className="btn-primary w-full flex items-center justify-center gap-2"
              >
                Jetzt registrieren
              </Link>
            </div>
          )}

          {/* Firmen-Info */}
          {job.company && (
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Über das Unternehmen</h3>
              <p className="font-semibold text-gray-900 text-lg">{job.company.company_name}</p>
              {job.company.industry && (
                <p className="text-primary-600 font-medium">{job.company.industry}</p>
              )}
              {job.company.city && (
                <p className="text-gray-600 flex items-center gap-1 mt-1">
                  <MapPin className="h-4 w-4" />
                  {job.company.city}{job.company.country && `, ${job.company.country}`}
                </p>
              )}
              {job.company.description && (
                <p className="text-gray-600 mt-3 text-sm">{job.company.description}</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default JobDetail;
