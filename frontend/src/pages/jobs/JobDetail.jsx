import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { jobsAPI, applicationsAPI, documentsAPI } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { 
  MapPin, Calendar, Building2, Euro, Clock, Globe, 
  ArrowLeft, Send, CheckCircle, Languages, AlertTriangle, FileText, Loader2, ClipboardList,
  Sparkles, TrendingUp, TrendingDown, Minus, User, Phone, Mail, Briefcase, ListTodo, Globe2
} from 'lucide-react';

// Verfügbare Sprachen
const JOB_LANGUAGES = [
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'ru', name: 'Русский', flag: '🇷🇺' },
];

const positionTypeColors = {
  studentenferienjob: 'bg-blue-100 text-blue-800 border-blue-200',
  saisonjob: 'bg-orange-100 text-orange-800 border-orange-200',
  workandholiday: 'bg-pink-100 text-pink-800 border-pink-200',
  fachkraft: 'bg-purple-100 text-purple-800 border-purple-200',
  ausbildung: 'bg-green-100 text-green-800 border-green-200'
};

// Employment type labels werden jetzt über t() geladen

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
  const { t, i18n } = useTranslation();
  
  const positionTypeLabels = {
    studentenferienjob: t('positionTypes.studentenferienjob'),
    saisonjob: t('positionTypes.saisonjob'),
    workandholiday: 'Work & Holiday',
    fachkraft: t('positionTypes.fachkraft'),
    ausbildung: 'Ausbildung'
  };
  
  // Translate backend matching texts
  const translateMatchingText = (text) => {
    if (!text) return text;
    
    // Recommendation translations
    const recommendations = {
      'Sehr gute Übereinstimmung': t('matching.veryGood'),
      'Gute Übereinstimmung': t('matching.good'),
      'Teilweise Übereinstimmung': t('matching.partial'),
      'Geringe Übereinstimmung': t('matching.low'),
    };
    
    if (recommendations[text]) return recommendations[text];
    
    // Detail translations with patterns
    if (text.includes('✓ Positionstyp passt')) return `✓ ${t('matching.positionMatches')}`;
    if (text.includes('✗ Positionstyp stimmt nicht überein')) return `✗ ${t('matching.positionMismatch')}`;
    if (text.includes('✓ Deutschkenntnisse übertreffen Anforderungen')) return `✓ ${t('matching.germanExceeds')}`;
    if (text.includes('✓ Deutschkenntnisse erfüllen Anforderungen')) return `✓ ${t('matching.germanMeets')}`;
    if (text.includes('✗ Deutschkenntnisse unter Anforderungen')) {
      const match = text.match(/\((\d+) Stufen?\)/);
      const levels = match ? match[1] : '';
      return `✗ ${t('matching.germanBelow', { levels })}`;
    }
    if (text.includes('✓ Englischkenntnisse erfüllen Anforderungen')) return `✓ ${t('matching.englishMeets')}`;
    if (text.includes('✗ Englischkenntnisse unter Anforderungen')) return `✗ ${t('matching.englishBelow')}`;
    if (text.includes('Jahre Berufserfahrung')) {
      const match = text.match(/(\d+) Jahre/);
      const years = match ? match[1] : '0';
      return `✓ ${t('matching.yearsExperience', { years })}`;
    }
    if (text.includes('✓ Verfügbarkeit passt')) return `✓ ${t('matching.availabilityMatches')}`;
    
    return text;
  };
  
  // Translate backend requirement warnings/errors
  const translateRequirementText = (text) => {
    if (!text) return text;
    
    // Required field missing
    if (text.includes('Pflichtfeld fehlt:')) {
      const field = text.split(': ')[1];
      const fieldTranslations = {
        'Vorname': t('profile.firstName'),
        'Nachname': t('profile.lastName'),
        'Geburtsdatum': t('applicant.dateOfBirth'),
        'Nationalität': t('applicant.nationality'),
        'Telefonnummer': t('applicant.phone'),
        'Straße': t('applicant.street'),
        'Stadt': t('applicant.city'),
        'Land': t('applicant.country'),
      };
      return t('requirements.fieldMissing', { field: fieldTranslations[field] || field });
    }
    
    // Position type warnings
    if (text.includes('Ihre Stellenart') && text.includes('unterscheidet sich')) {
      const matches = text.match(/\(([^)]+)\)/g);
      if (matches && matches.length >= 2) {
        const yourType = matches[0].replace(/[()]/g, '');
        const jobType = matches[1].replace(/[()]/g, '');
        return t('requirements.positionMismatch', { 
          yourType: positionTypeLabels[yourType] || yourType,
          jobType: positionTypeLabels[jobType] || jobType
        });
      }
    }
    
    if (text.includes('Bitte wählen Sie eine Stellenart')) {
      return t('requirements.selectPositionType');
    }
    
    if (text.includes('Empfohlenes Dokument fehlt:')) {
      const docName = text.split(': ')[1];
      return t('requirements.recommendedDocMissing', { doc: docName });
    }
    
    if (text.includes('Bitte erstellen Sie zuerst Ihr Bewerber-Profil')) {
      return t('requirements.createProfileFirst');
    }
    
    return text;
  };

  const employmentTypeLabels = {
    fulltime: t('jobDetail.fulltime'),
    parttime: t('jobDetail.parttime'),
    both: t('jobDetail.fulltimeOrParttime')
  };

  const languageLevelLabels = {
    not_required: t('languageLevels.none'),
    a1: t('languageLevels.a1'),
    a2: t('languageLevels.a2'),
    b1: t('languageLevels.b1'),
    b2: t('languageLevels.b2'),
    c1: t('languageLevels.c1'),
    c2: t('languageLevels.c2'),
    basic: t('languageLevels.a2'),
    good: t('languageLevels.b1'),
    fluent: t('languageLevels.c1')
  };
  
  const salaryTypeLabels = {
    hourly: t('jobDetail.hourly'),
    monthly: t('jobDetail.monthly'),
    yearly: t('jobDetail.yearly')
  };
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, isApplicant } = useAuth();
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState(false);
  const [message, setMessage] = useState('');
  
  // Mehrsprachige Anzeige
  const [displayLanguage, setDisplayLanguage] = useState('de');
  
  // Bewerbungsvoraussetzungen
  const [requirements, setRequirements] = useState(null);
  const [requirementsLoading, setRequirementsLoading] = useState(false);
  
  // Matching Score
  const [matchScore, setMatchScore] = useState(null);
  const [matchLoading, setMatchLoading] = useState(false);
  
  // Dokumentenauswahl für Bewerbung
  const [myDocuments, setMyDocuments] = useState([]);
  const [selectedDocIds, setSelectedDocIds] = useState([]);
  const [showDocumentSelection, setShowDocumentSelection] = useState(false);
  
  // Helper: Text in der gewählten Sprache abrufen (mit Fallback auf Deutsch)
  const getTranslatedText = (field) => {
    if (!job) return '';
    
    // Wenn Deutsch gewählt oder keine Übersetzung vorhanden, Hauptfelder verwenden
    if (displayLanguage === 'de') {
      return job[field] || '';
    }
    
    // Übersetzung aus translations abrufen
    const translation = job.translations?.[displayLanguage]?.[field];
    if (translation) {
      return translation;
    }
    
    // Fallback auf Deutsch
    return job[field] || '';
  };
  
  // Sprache beim Laden basierend auf Browser-Sprache setzen
  useEffect(() => {
    if (job?.available_languages?.includes(i18n.language)) {
      setDisplayLanguage(i18n.language);
    } else {
      setDisplayLanguage('de');
    }
  }, [job, i18n.language]);

  useEffect(() => {
    loadJob();
  }, [id]);
  
  // Voraussetzungen und Matching laden wenn Bewerber eingeloggt
  useEffect(() => {
    if (isApplicant && id) {
      loadRequirements();
      loadMatchScore();
      loadMyDocuments();
    }
  }, [isApplicant, id]);
  
  const loadMyDocuments = async () => {
    try {
      const response = await documentsAPI.list();
      setMyDocuments(response.data || []);
      // Standardmäßig alle Dokumente auswählen
      setSelectedDocIds((response.data || []).map(d => d.id));
    } catch (error) {
      console.error('Fehler beim Laden der Dokumente');
    }
  };

  const loadJob = async () => {
    try {
      const response = await jobsAPI.get(id);
      setJob(response.data);
    } catch (error) {
      toast.error(t('jobDetail.jobNotFound'));
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

    // Zeige Dokumentenauswahl wenn Dokumente vorhanden
    if (myDocuments.length > 0 && !showDocumentSelection) {
      setShowDocumentSelection(true);
      return;
    }

    setApplying(true);
    try {
      await applicationsAPI.create({
        job_posting_id: parseInt(id),
        applicant_message: message,
        document_ids: selectedDocIds
      });
      toast.success('Bewerbung erfolgreich eingereicht!');
      setApplied(true);
      setShowDocumentSelection(false);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Bewerbung fehlgeschlagen');
    } finally {
      setApplying(false);
    }
  };

  const toggleDocumentSelection = (docId) => {
    setSelectedDocIds(prev => 
      prev.includes(docId) 
        ? prev.filter(id => id !== docId)
        : [...prev, docId]
    );
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
        {t('jobDetail.backToJobs')}
      </Link>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Hauptinhalt */}
        <div className="lg:col-span-2 space-y-6">
          <div className="card">
            {/* Sprachauswahl - ändert die gesamte UI-Sprache (wie Navbar) */}
            {job.available_languages?.length > 1 && (
              <div className="flex items-center gap-2 mb-4 pb-4 border-b">
                <Globe2 className="h-5 w-5 text-indigo-600" />
                <span className="text-sm text-gray-600 mr-2">{t('jobDetail.language')}:</span>
                <div className="flex gap-1 p-1 bg-gray-100 rounded-lg">
                  {job.available_languages.map((langCode) => {
                    const lang = JOB_LANGUAGES.find(l => l.code === langCode);
                    if (!lang) return null;
                    return (
                      <button
                        key={langCode}
                        onClick={() => i18n.changeLanguage(langCode)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                          i18n.language === langCode
                            ? 'bg-white text-gray-900 shadow-sm'
                            : 'text-gray-600 hover:text-gray-900'
                        }`}
                      >
                        <span>{lang.flag}</span>
                        <span className="hidden sm:inline">{lang.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            
            <div className="flex items-start justify-between gap-4 mb-4">
              <h1 className="text-3xl font-bold text-gray-900">{getTranslatedText('title')}</h1>
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
                  {job.postal_code && ` (${job.postal_code})`}
                </span>
              )}
              {job.employment_type && (
                <span className="flex items-center gap-1.5">
                  <Briefcase className="h-5 w-5 text-gray-400" />
                  {employmentTypeLabels[job.employment_type]}
                </span>
              )}
              {job.remote_possible && (
                <span className="flex items-center gap-1.5 text-teal-600">
                  <Globe className="h-5 w-5" />
                  {t('jobDetail.remotePossible')}
                </span>
              )}
            </div>

            <div className="prose max-w-none">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {t('jobDetail.description', 'Beschreibung')}
              </h3>
              <p className="text-gray-600 whitespace-pre-wrap">{getTranslatedText('description')}</p>

              {(job.tasks || job.translations?.[displayLanguage]?.tasks) && (
                <>
                  <h3 className="text-lg font-semibold text-gray-900 mt-6 mb-2 flex items-center gap-2">
                    <ListTodo className="h-5 w-5 text-purple-600" />
                    {t('jobDetail.tasks', 'Aufgaben')}
                  </h3>
                  <p className="text-gray-600 whitespace-pre-wrap">{getTranslatedText('tasks')}</p>
                </>
              )}

              {(job.requirements || job.translations?.[displayLanguage]?.requirements) && (
                <>
                  <h3 className="text-lg font-semibold text-gray-900 mt-6 mb-2">
                    {t('jobDetail.requirements', 'Anforderungen')}
                  </h3>
                  <p className="text-gray-600 whitespace-pre-wrap">{getTranslatedText('requirements')}</p>
                </>
              )}

              {(job.benefits || job.translations?.[displayLanguage]?.benefits) && (
                <>
                  <h3 className="text-lg font-semibold text-gray-900 mt-6 mb-2">
                    {t('jobDetail.benefits', 'Wir bieten')}
                  </h3>
                  <p className="text-gray-600 whitespace-pre-wrap">{getTranslatedText('benefits')}</p>
                </>
              )}

              {/* Adresse */}
              {job.address && (
                <>
                  <h3 className="text-lg font-semibold text-gray-900 mt-6 mb-2 flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-primary-600" />
                    {t('jobDetail.workLocation')}
                  </h3>
                  <p className="text-gray-600">
                    {job.address}
                    {job.postal_code && <><br />{job.postal_code} </>}
                    {job.location}
                  </p>
                </>
              )}
            </div>
          </div>

          {/* Sprachanforderungen */}
          {hasLanguageRequirements(job) && (
            <div className="card border-l-4 border-l-blue-500">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Languages className="h-5 w-5 text-blue-600" />
                {t('jobDetail.languageRequirements')}
              </h3>
              <div className="grid md:grid-cols-2 gap-4">
                {job.german_required && job.german_required !== 'not_required' && (
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="font-medium text-gray-700">{t('jobDetail.german')}</span>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${languageLevelColors[job.german_required]}`}>
                      {languageLevelLabels[job.german_required]}
                    </span>
                  </div>
                )}
                {job.english_required && job.english_required !== 'not_required' && (
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="font-medium text-gray-700">{t('jobDetail.english')}</span>
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
                  <h3 className="text-lg font-semibold text-gray-900">{t('jobDetail.yourMatching')}</h3>
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
                {translateMatchingText(matchScore.recommendation)}
              </p>
              
              {/* Score Breakdown */}
              {matchScore.breakdown && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">{t('jobDetail.positionType')}</span>
                    <span className="font-medium">{matchScore.breakdown.position_type}/30</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">{t('jobDetail.german')}</span>
                    <span className="font-medium">{matchScore.breakdown.german_level}/25</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">{t('jobDetail.english')}</span>
                    <span className="font-medium">{matchScore.breakdown.english_level}/15</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">{t('jobDetail.experience')}</span>
                    <span className="font-medium">{matchScore.breakdown.experience}/20</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">{t('jobDetail.availability')}</span>
                    <span className="font-medium">{matchScore.breakdown.availability}/10</span>
                  </div>
                </div>
              )}
              
              {/* Details */}
              {matchScore.details?.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <p className="text-sm text-gray-600 font-medium mb-2">{t('jobDetail.details')}:</p>
                  <ul className="text-sm text-gray-600 space-y-1">
                    {matchScore.details.map((detail, i) => (
                      <li key={i}>{translateMatchingText(detail)}</li>
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
                <span className="text-gray-600">{t('jobDetail.calculatingMatching')}</span>
              </div>
            </div>
          )}
          
          {/* Bewerbungs-Box */}
          <div className="card">
            {applied ? (
              <div className="text-center py-4">
                <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
                <h3 className="text-lg font-semibold text-gray-900">{t('jobDetail.applicationSubmitted')}</h3>
                <p className="text-gray-600 mt-2">
                  {t('jobDetail.trackStatus')}
                </p>
                <Link to="/applicant/applications" className="btn-primary mt-4 inline-block">
                  {t('jobDetail.toMyApplications')}
                </Link>
              </div>
            ) : (
              <>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('jobDetail.applyNow')}</h3>
                
                {/* Voraussetzungsprüfung für Bewerber */}
                {isApplicant && (
                  <>
                    {requirementsLoading ? (
                      <div className="flex items-center gap-2 text-gray-500 mb-4">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        {t('jobDetail.checkingRequirements')}
                      </div>
                    ) : requirements && !requirements.can_apply ? (
                      <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl">
                        <div className="flex items-start gap-2 text-red-800 mb-2">
                          <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                          <span className="font-semibold">{t('jobDetail.applicationNotPossible')}</span>
                        </div>
                        <p className="text-sm text-red-700 mb-3">
                          {t('jobDetail.completeProfileFirst')}
                        </p>
                        <ul className="text-sm text-red-700 space-y-1 mb-3">
                          {requirements.errors.map((error, i) => (
                            <li key={i} className="flex items-center gap-2">
                              <span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span>
                              {translateRequirementText(error)}
                            </li>
                          ))}
                        </ul>
                        <div className="flex gap-2">
                          <Link 
                            to="/applicant/profile" 
                            className="flex-1 bg-white text-red-700 border border-red-300 px-3 py-2 rounded-lg text-sm font-medium hover:bg-red-50 text-center"
                          >
                            {t('jobDetail.editProfile')}
                          </Link>
                          <Link 
                            to="/applicant/documents" 
                            className="flex-1 bg-white text-red-700 border border-red-300 px-3 py-2 rounded-lg text-sm font-medium hover:bg-red-50 text-center flex items-center justify-center gap-1"
                          >
                            <FileText className="h-4 w-4" />
                            {t('jobDetail.documents')}
                          </Link>
                        </div>
                      </div>
                    ) : requirements?.can_apply ? (
                      <>
                        {requirements.warnings?.length > 0 && (
                          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                            <p className="text-sm text-yellow-800">
                              <AlertTriangle className="h-4 w-4 inline mr-1" />
                              {translateRequirementText(requirements.warnings[0])}
                            </p>
                          </div>
                        )}
                        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                          <p className="text-sm text-green-800 flex items-center gap-2">
                            <CheckCircle className="h-4 w-4" />
                            {t('jobDetail.allRequirementsMet')}
                          </p>
                        </div>
                        <div className="mb-4">
                          <label className="label">{t('jobDetail.messageOptional')}</label>
                          <textarea
                            className="input-styled"
                            rows={4}
                            placeholder={t('jobDetail.addPersonalMessage')}
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                          />
                        </div>
                      </>
                    ) : null}
                  </>
                )}
                
                {/* Dokumentenauswahl */}
                {showDocumentSelection && myDocuments.length > 0 && (
                  <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <h4 className="font-medium text-blue-800 mb-3 flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      Dokumente für {job.company_name || 'diese Firma'} freigeben
                    </h4>
                    <div className="bg-white rounded-lg p-3 mb-3 border border-blue-200">
                      <p className="text-sm text-gray-700">
                        <strong className="text-blue-800">{job.company_name}</strong> erhält Zugriff auf die ausgewählten Dokumente für die Stelle:
                      </p>
                      <p className="text-sm font-medium text-gray-900 mt-1">"{getTranslatedText('title')}"</p>
                    </div>
                    <p className="text-sm text-blue-600 mb-3">
                      Wählen Sie aus, welche Dokumente freigegeben werden sollen:
                    </p>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {myDocuments.map((doc) => (
                        <label 
                          key={doc.id} 
                          className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                            selectedDocIds.includes(doc.id) 
                              ? 'bg-blue-100 border border-blue-300' 
                              : 'bg-white border border-gray-200 hover:bg-gray-50'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={selectedDocIds.includes(doc.id)}
                            onChange={() => toggleDocumentSelection(doc.id)}
                            className="w-4 h-4 text-blue-600 rounded"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{doc.original_name}</p>
                            <p className="text-xs text-gray-500">{doc.document_type}</p>
                          </div>
                          {selectedDocIds.includes(doc.id) && (
                            <span className="text-xs bg-blue-200 text-blue-800 px-2 py-0.5 rounded">
                              wird geteilt
                            </span>
                          )}
                        </label>
                      ))}
                    </div>
                    <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <p className="text-xs text-yellow-700">
                        ⚠️ <strong>Datenschutz:</strong> Nur die ausgewählten {selectedDocIds.length} Dokument(e) werden für <strong>{job.company_name}</strong> sichtbar. Andere Firmen sehen diese Dokumente nicht.
                      </p>
                    </div>
                  </div>
                )}
                
                <button
                  onClick={handleApply}
                  disabled={applying || (isApplicant && requirements && !requirements.can_apply)}
                  className="btn-primary w-full flex items-center justify-center py-3 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {applying ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  ) : showDocumentSelection ? (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Bewerbung absenden ({selectedDocIds.length} Dokumente)
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      {t('jobDetail.submitApplication')}
                    </>
                  )}
                </button>
                
                {!isAuthenticated && (
                  <p className="text-sm text-gray-500 mt-3 text-center">
                    <Link to="/login" className="text-primary-600 hover:underline font-medium">
                      {t('jobDetail.login')}
                    </Link>
                    {' '}{t('jobDetail.loginToApply')}
                  </p>
                )}
              </>
            )}
          </div>

          {/* Details Box */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('jobDetail.details')}</h3>
            <div className="space-y-4">
              {(job.salary_min || job.salary_max) && (
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Euro className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">{t('jobDetail.salary')}</p>
                    <p className="font-semibold text-gray-900">
                      {job.salary_min?.toLocaleString('de-DE', { minimumFractionDigits: job.salary_min % 1 !== 0 ? 2 : 0, maximumFractionDigits: 2 })}€ - {job.salary_max?.toLocaleString('de-DE', { minimumFractionDigits: job.salary_max % 1 !== 0 ? 2 : 0, maximumFractionDigits: 2 })}€
                      <span className="text-gray-500 font-normal">
                        /{salaryTypeLabels[job.salary_type] || job.salary_type}
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
                    <p className="text-sm text-gray-500">{t('jobDetail.startDate')}</p>
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
                    <p className="text-sm text-gray-500">{t('jobDetail.endDate')}</p>
                    <p className="font-semibold text-gray-900">{formatDate(job.end_date)}</p>
                  </div>
                </div>
              )}
              
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gray-100 rounded-lg">
                  <Calendar className="h-5 w-5 text-gray-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">{t('jobDetail.publishedAt')}</p>
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
                <h3 className="text-lg font-semibold text-gray-900">{t('jobDetail.ijpService')}</h3>
              </div>
              <p className="text-gray-600 text-sm mb-4">
                {t('jobDetail.ijpServiceDesc')}
              </p>
              <Link 
                to="/applicant/ijp-auftrag" 
                className="btn-primary w-full flex items-center justify-center gap-2"
              >
                <ClipboardList className="h-4 w-4" />
                {t('jobDetail.ijpServiceButton')}
              </Link>
            </div>
          )}

          {!isAuthenticated && (
            <div className="card bg-gradient-to-br from-primary-50 to-blue-50 border-2 border-primary-200">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-primary-600 rounded-lg">
                  <ClipboardList className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">{t('jobDetail.ijpService')}</h3>
              </div>
              <p className="text-gray-600 text-sm mb-4">
                {t('jobDetail.ijpServiceDescGuest')}
              </p>
              <Link 
                to="/register" 
                className="btn-primary w-full flex items-center justify-center gap-2"
              >
                {t('jobDetail.registerNow')}
              </Link>
            </div>
          )}

          {/* Kontaktperson */}
          {(job.contact_person || job.contact_phone || job.contact_email) && (
            <div className="card border-l-4 border-l-green-500">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <User className="h-5 w-5 text-green-600" />
                {t('jobDetail.contactPerson')}
              </h3>
              <div className="space-y-3">
                {job.contact_person && (
                  <p className="font-semibold text-gray-900">{job.contact_person}</p>
                )}
                {job.contact_phone && (
                  <a href={`tel:${job.contact_phone}`} className="flex items-center gap-2 text-gray-600 hover:text-primary-600">
                    <Phone className="h-4 w-4" />
                    {job.contact_phone}
                  </a>
                )}
                {job.contact_email && (
                  <a href={`mailto:${job.contact_email}`} className="flex items-center gap-2 text-gray-600 hover:text-primary-600">
                    <Mail className="h-4 w-4" />
                    {job.contact_email}
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Firmen-Info */}
          {job.company && (
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('jobDetail.aboutCompany')}</h3>
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
