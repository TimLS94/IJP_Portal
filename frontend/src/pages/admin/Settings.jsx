import { useState, useEffect } from 'react';
import { adminAPI } from '../../lib/api';
import toast from 'react-hot-toast';
import { 
  Settings as SettingsIcon, ToggleLeft, ToggleRight, Save, Loader2, 
  Sparkles, Building2, Users, AlertTriangle, RefreshCw, Clock, Trash2,
  ChevronDown, ChevronUp, Calendar, Mail, Bell, Send, Eye, Zap, CalendarDays
} from 'lucide-react';

function AdminSettings() {
  const [flags, setFlags] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(null);
  
  // Archiv-Löschfrist State
  const [archiveDays, setArchiveDays] = useState(90);
  const [archivePreview, setArchivePreview] = useState(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [showArchiveSection, setShowArchiveSection] = useState(false);
  
  // Max. Stellenlaufzeit State
  const [maxDeadlineDays, setMaxDeadlineDays] = useState(90);
  const [showDeadlineSection, setShowDeadlineSection] = useState(false);
  
  // E-Mail Benachrichtigungen State
  const [showEmailSection, setShowEmailSection] = useState(false);
  const [emailThreshold, setEmailThreshold] = useState(85);
  const [digestDays, setDigestDays] = useState([1]);
  const [digestHour, setDigestHour] = useState(9);
  const [triggeringDigest, setTriggeringDigest] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [emailTemplates, setEmailTemplates] = useState(null);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);

  useEffect(() => {
    loadFlags();
  }, []);

  const loadFlags = async () => {
    try {
      const response = await adminAPI.getFeatureFlags();
      setFlags(response.data);
      if (response.data.archive_deletion_days) {
        setArchiveDays(response.data.archive_deletion_days);
      }
      if (response.data.max_job_deadline_days) {
        setMaxDeadlineDays(response.data.max_job_deadline_days);
      }
      if (response.data.job_notifications_threshold) {
        setEmailThreshold(response.data.job_notifications_threshold);
      }
      if (response.data.weekly_digest_days) {
        setDigestDays(response.data.weekly_digest_days);
      }
      if (response.data.weekly_digest_hour !== undefined) {
        setDigestHour(response.data.weekly_digest_hour);
      }
    } catch (error) {
      console.error('Fehler beim Laden:', error);
      // Fallback auf Standard-Werte
      setFlags({
        matching_enabled_for_companies: false,
        matching_enabled_for_applicants: false,
        archive_deletion_days: 90,
        max_job_deadline_days: 90
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleFlag = async (key) => {
    setSaving(key);
    const currentValue = typeof flags[key] === 'object' ? flags[key]?.value : flags[key];
    
    try {
      await adminAPI.setFeatureFlag(key, !currentValue);
      setFlags(prev => ({
        ...prev,
        [key]: !currentValue
      }));
      
      const labels = {
        'matching_enabled_for_companies': 'Firmen-Matching',
        'matching_enabled_for_applicants': 'Bewerber-Matching',
        'auto_deactivate_expired_jobs': 'Auto-Deaktivierung'
      };
      toast.success(`${labels[key] || key} ${!currentValue ? 'aktiviert' : 'deaktiviert'}`);
    } catch (error) {
      toast.error('Fehler beim Speichern');
    } finally {
      setSaving(null);
    }
  };

  const loadArchivePreview = async (days) => {
    setLoadingPreview(true);
    try {
      const response = await adminAPI.getArchiveDeletionPreview(days);
      setArchivePreview(response.data);
    } catch (error) {
      console.error('Fehler beim Laden der Vorschau:', error);
    } finally {
      setLoadingPreview(false);
    }
  };

  const saveArchiveDays = async () => {
    setSaving('archive_deletion_days');
    try {
      await adminAPI.setSetting('archive_deletion_days', archiveDays);
      setFlags(prev => ({
        ...prev,
        archive_deletion_days: archiveDays
      }));
      toast.success(`Archiv-Löschfrist auf ${archiveDays} Tage gesetzt`);
      setArchivePreview(null);
    } catch (error) {
      toast.error('Fehler beim Speichern');
    } finally {
      setSaving(null);
    }
  };
  
  const saveMaxDeadlineDays = async () => {
    setSaving('max_job_deadline_days');
    try {
      await adminAPI.setSetting('max_job_deadline_days', maxDeadlineDays);
      setFlags(prev => ({
        ...prev,
        max_job_deadline_days: maxDeadlineDays
      }));
      toast.success(`Max. Stellenlaufzeit auf ${maxDeadlineDays} Tage gesetzt`);
    } catch (error) {
      toast.error('Fehler beim Speichern');
    } finally {
      setSaving(null);
    }
  };

  const flagConfig = {
    matching_enabled_for_companies: {
      title: 'Matching für Firmen',
      description: 'Firmen können sehen, wie gut Bewerber zu ihren Stellenangeboten passen (Matching-Score)',
      icon: Building2,
      color: 'blue'
    },
    matching_enabled_for_applicants: {
      title: 'Matching für Bewerber',
      description: 'Bewerber können sehen, wie gut Stellenangebote zu ihrem Profil passen',
      icon: Users,
      color: 'green'
    },
    job_notifications_enabled: {
      title: 'E-Mail Benachrichtigungen',
      description: 'Bewerber erhalten E-Mails über passende neue Stellen (basierend auf Matching-Score)',
      icon: Mail,
      color: 'purple'
    }
  };
  
  const saveEmailThreshold = async () => {
    setSaving('job_notifications_threshold');
    try {
      await adminAPI.setSetting('job_notifications_threshold', emailThreshold);
      setFlags(prev => ({
        ...prev,
        job_notifications_threshold: emailThreshold
      }));
      toast.success(`E-Mail Schwellenwert auf ${emailThreshold}% gesetzt`);
    } catch (error) {
      toast.error('Fehler beim Speichern');
    } finally {
      setSaving(null);
    }
  };

  const saveDigestDays = async () => {
    setSaving('weekly_digest_days');
    try {
      await adminAPI.setSetting('weekly_digest_days', digestDays);
      setFlags(prev => ({
        ...prev,
        weekly_digest_days: digestDays
      }));
      toast.success('Digest-Wochentage gespeichert');
    } catch (error) {
      toast.error('Fehler beim Speichern');
    } finally {
      setSaving(null);
    }
  };

  const saveDigestHour = async () => {
    setSaving('weekly_digest_hour');
    try {
      await adminAPI.setSetting('weekly_digest_hour', digestHour);
      setFlags(prev => ({
        ...prev,
        weekly_digest_hour: digestHour
      }));
      toast.success(`Digest-Uhrzeit auf ${digestHour}:00 Uhr gesetzt`);
    } catch (error) {
      toast.error('Fehler beim Speichern');
    } finally {
      setSaving(null);
    }
  };

  const triggerDigestNow = async () => {
    setTriggeringDigest(true);
    try {
      const response = await adminAPI.triggerDigest();
      toast.success(response.data.message);
    } catch (error) {
      toast.error('Fehler beim Senden des Digests');
    } finally {
      setTriggeringDigest(false);
    }
  };

  const loadEmailTemplates = async () => {
    setLoadingTemplates(true);
    try {
      const response = await adminAPI.getEmailTemplates();
      setEmailTemplates(response.data);
    } catch (error) {
      toast.error('Fehler beim Laden der Vorlagen');
    } finally {
      setLoadingTemplates(false);
    }
  };

  const toggleDigestDay = (day) => {
    setDigestDays(prev => {
      if (prev.includes(day)) {
        return prev.filter(d => d !== day);
      } else {
        return [...prev, day].sort();
      }
    });
  };

  const dayNames = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <SettingsIcon className="h-8 w-8 text-primary-600" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Einstellungen</h1>
            <p className="text-gray-600">Feature Flags und globale Konfiguration</p>
          </div>
        </div>
        <button
          onClick={loadFlags}
          className="btn-secondary flex items-center gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          Aktualisieren
        </button>
      </div>

      {/* Feature Flags */}
      <div className="card mb-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-purple-100 rounded-lg">
            <Sparkles className="h-5 w-5 text-purple-600" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Feature Flags</h2>
            <p className="text-sm text-gray-600">Aktivieren oder deaktivieren Sie Features global</p>
          </div>
        </div>

        <div className="space-y-4">
          {Object.entries(flagConfig).map(([key, config]) => {
            const flagValue = typeof flags[key] === 'object' ? flags[key]?.value : flags[key];
            const isToggling = saving === key;
            const Icon = config.icon;
            
            return (
              <div 
                key={key}
                className={`p-4 rounded-xl border-2 transition-all ${
                  flagValue 
                    ? 'bg-green-50 border-green-200' 
                    : 'bg-gray-50 border-gray-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-xl ${
                      flagValue ? 'bg-green-100' : 'bg-gray-200'
                    }`}>
                      <Icon className={`h-6 w-6 ${
                        flagValue ? 'text-green-600' : 'text-gray-500'
                      }`} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{config.title}</h3>
                      <p className="text-sm text-gray-600">{config.description}</p>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => toggleFlag(key)}
                    disabled={isToggling}
                    className={`relative p-1 rounded-full transition-colors ${
                      flagValue 
                        ? 'bg-green-500 hover:bg-green-600' 
                        : 'bg-gray-300 hover:bg-gray-400'
                    }`}
                  >
                    {isToggling ? (
                      <Loader2 className="h-8 w-8 text-white animate-spin p-1" />
                    ) : flagValue ? (
                      <ToggleRight className="h-8 w-8 text-white" />
                    ) : (
                      <ToggleLeft className="h-8 w-8 text-white" />
                    )}
                  </button>
                </div>
                
                <div className={`mt-3 pt-3 border-t ${
                  flagValue ? 'border-green-200' : 'border-gray-200'
                }`}>
                  <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${
                    flagValue 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-gray-200 text-gray-600'
                  }`}>
                    {flagValue ? '✓ Aktiviert' : '○ Deaktiviert'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* E-Mail Benachrichtigungs-Einstellungen */}
      {flags.job_notifications_enabled && (
        <div className="card mb-8">
          <button
            onClick={() => setShowEmailSection(!showEmailSection)}
            className="w-full flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Mail className="h-5 w-5 text-purple-600" />
              </div>
              <div className="text-left">
                <h2 className="text-xl font-semibold text-gray-900">E-Mail Einstellungen</h2>
                <p className="text-sm text-gray-600">
                  Schwellenwert, Zeitplan und Vorlagen für Bewerber-Benachrichtigungen
                </p>
              </div>
            </div>
            {showEmailSection ? (
              <ChevronUp className="h-5 w-5 text-gray-500" />
            ) : (
              <ChevronDown className="h-5 w-5 text-gray-500" />
            )}
          </button>

          {showEmailSection && (
            <div className="mt-6 pt-6 border-t border-gray-200 space-y-8">
              
              {/* Sofort-Benachrichtigung Toggle */}
              <div className="flex items-center justify-between p-4 bg-blue-50 rounded-xl border border-blue-200">
                <div className="flex items-center gap-3">
                  <Zap className="h-5 w-5 text-blue-600" />
                  <div>
                    <h3 className="font-medium text-gray-900">Sofort-Benachrichtigung bei neuer Stelle</h3>
                    <p className="text-sm text-gray-600">Bewerber erhalten sofort eine E-Mail wenn eine passende Stelle online geht</p>
                  </div>
                </div>
                <button
                  onClick={() => toggleFlag('instant_job_notifications_enabled')}
                  disabled={saving === 'instant_job_notifications_enabled'}
                  className={`relative p-1 rounded-full transition-colors ${
                    flags.instant_job_notifications_enabled 
                      ? 'bg-blue-500 hover:bg-blue-600' 
                      : 'bg-gray-300 hover:bg-gray-400'
                  }`}
                >
                  {saving === 'instant_job_notifications_enabled' ? (
                    <Loader2 className="h-6 w-6 text-white animate-spin p-0.5" />
                  ) : flags.instant_job_notifications_enabled ? (
                    <ToggleRight className="h-6 w-6 text-white" />
                  ) : (
                    <ToggleLeft className="h-6 w-6 text-white" />
                  )}
                </button>
              </div>

              {/* Wöchentlicher Digest Toggle */}
              <div className="flex items-center justify-between p-4 bg-violet-50 rounded-xl border border-violet-200">
                <div className="flex items-center gap-3">
                  <CalendarDays className="h-5 w-5 text-violet-600" />
                  <div>
                    <h3 className="font-medium text-gray-900">Wöchentlicher Job-Digest</h3>
                    <p className="text-sm text-gray-600">Zusammenfassung aller passenden Stellen der letzten Woche</p>
                  </div>
                </div>
                <button
                  onClick={() => toggleFlag('weekly_digest_enabled')}
                  disabled={saving === 'weekly_digest_enabled'}
                  className={`relative p-1 rounded-full transition-colors ${
                    flags.weekly_digest_enabled 
                      ? 'bg-violet-500 hover:bg-violet-600' 
                      : 'bg-gray-300 hover:bg-gray-400'
                  }`}
                >
                  {saving === 'weekly_digest_enabled' ? (
                    <Loader2 className="h-6 w-6 text-white animate-spin p-0.5" />
                  ) : flags.weekly_digest_enabled ? (
                    <ToggleRight className="h-6 w-6 text-white" />
                  ) : (
                    <ToggleLeft className="h-6 w-6 text-white" />
                  )}
                </button>
              </div>

              {/* Matching-Score Schwellenwert */}
              <div>
                <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                  <Bell className="h-4 w-4 text-purple-600" />
                  Mindest-Matching-Score
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <div className="flex items-center gap-3">
                      <input
                        type="number"
                        min="50"
                        max="100"
                        value={emailThreshold}
                        onChange={(e) => {
                          const value = parseInt(e.target.value) || 85;
                          setEmailThreshold(Math.min(100, Math.max(50, value)));
                        }}
                        className="input w-32"
                      />
                      <span className="text-gray-600">%</span>
                      {emailThreshold !== (flags.job_notifications_threshold || 85) && (
                        <button
                          onClick={saveEmailThreshold}
                          disabled={saving === 'job_notifications_threshold'}
                          className="btn-primary btn-sm flex items-center gap-1"
                        >
                          {saving === 'job_notifications_threshold' ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Save className="h-3 w-3" />
                          )}
                          Speichern
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      Bewerber erhalten nur E-Mails wenn ihr Match ≥ {emailThreshold}% ist
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {[70, 80, 85, 90].map(val => (
                      <button
                        key={val}
                        onClick={() => setEmailThreshold(val)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                          emailThreshold === val 
                            ? 'bg-purple-100 text-purple-700 border-2 border-purple-300' 
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {val}%
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Digest Wochentage */}
              {flags.weekly_digest_enabled && (
                <div>
                  <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                    <CalendarDays className="h-4 w-4 text-violet-600" />
                    Digest-Versand Wochentage
                  </h3>
                  <div className="flex items-center gap-2 flex-wrap">
                    {dayNames.map((name, index) => (
                      <button
                        key={index}
                        onClick={() => toggleDigestDay(index)}
                        className={`w-10 h-10 rounded-full text-sm font-medium transition-colors ${
                          digestDays.includes(index)
                            ? 'bg-violet-500 text-white' 
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {name}
                      </button>
                    ))}
                    {JSON.stringify(digestDays) !== JSON.stringify(flags.weekly_digest_days || [1]) && (
                      <button
                        onClick={saveDigestDays}
                        disabled={saving === 'weekly_digest_days'}
                        className="btn-primary btn-sm flex items-center gap-1 ml-2"
                      >
                        {saving === 'weekly_digest_days' ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Save className="h-3 w-3" />
                        )}
                        Speichern
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Aktuell: {digestDays.length === 0 ? 'Keine Tage ausgewählt' : digestDays.map(d => dayNames[d]).join(', ')}
                  </p>
                </div>
              )}

              {/* Digest Uhrzeit */}
              {flags.weekly_digest_enabled && (
                <div>
                  <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                    <Clock className="h-4 w-4 text-violet-600" />
                    Digest-Versand Uhrzeit (UTC)
                  </h3>
                  <div className="flex items-center gap-3">
                    <select
                      value={digestHour}
                      onChange={(e) => setDigestHour(parseInt(e.target.value))}
                      className="input w-32"
                    >
                      {Array.from({length: 24}, (_, i) => (
                        <option key={i} value={i}>{i.toString().padStart(2, '0')}:00</option>
                      ))}
                    </select>
                    <span className="text-gray-600">Uhr (UTC)</span>
                    {digestHour !== (flags.weekly_digest_hour ?? 9) && (
                      <button
                        onClick={saveDigestHour}
                        disabled={saving === 'weekly_digest_hour'}
                        className="btn-primary btn-sm flex items-center gap-1"
                      >
                        {saving === 'weekly_digest_hour' ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Save className="h-3 w-3" />
                        )}
                        Speichern
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    In Deutschland: {(digestHour + 1) % 24}:00 Uhr (MEZ) / {(digestHour + 2) % 24}:00 Uhr (MESZ)
                  </p>
                </div>
              )}

              {/* Manueller Digest-Trigger */}
              <div className="p-4 bg-orange-50 rounded-xl border border-orange-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Send className="h-5 w-5 text-orange-600" />
                    <div>
                      <h3 className="font-medium text-gray-900">Digest jetzt senden</h3>
                      <p className="text-sm text-gray-600">Sendet sofort den wöchentlichen Digest an alle Bewerber</p>
                    </div>
                  </div>
                  <button
                    onClick={triggerDigestNow}
                    disabled={triggeringDigest}
                    className="btn-primary flex items-center gap-2"
                  >
                    {triggeringDigest ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                    Jetzt senden
                  </button>
                </div>
              </div>

              {/* E-Mail Vorlagen */}
              <div>
                <button
                  onClick={() => {
                    setShowTemplates(!showTemplates);
                    if (!emailTemplates && !showTemplates) {
                      loadEmailTemplates();
                    }
                  }}
                  className="flex items-center gap-2 text-purple-600 hover:text-purple-700 font-medium"
                >
                  <Eye className="h-4 w-4" />
                  E-Mail Vorlagen anzeigen
                  {showTemplates ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>

                {showTemplates && (
                  <div className="mt-4">
                    {loadingTemplates ? (
                      <div className="flex justify-center py-8">
                        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
                      </div>
                    ) : emailTemplates ? (
                      <div className="space-y-4">
                        {/* Template Tabs */}
                        <div className="flex gap-2 border-b border-gray-200">
                          {Object.entries(emailTemplates).map(([key, template]) => (
                            <button
                              key={key}
                              onClick={() => setSelectedTemplate(key)}
                              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                                selectedTemplate === key
                                  ? 'border-purple-500 text-purple-600'
                                  : 'border-transparent text-gray-500 hover:text-gray-700'
                              }`}
                            >
                              {template.name}
                            </button>
                          ))}
                        </div>

                        {/* Template Preview */}
                        {selectedTemplate && emailTemplates[selectedTemplate] && (
                          <div className="border rounded-lg overflow-hidden">
                            <div className="bg-gray-100 px-4 py-2 border-b">
                              <p className="text-sm text-gray-600">{emailTemplates[selectedTemplate].description}</p>
                              <p className="text-xs text-gray-500 mt-1">
                                <strong>Betreff:</strong> {emailTemplates[selectedTemplate].subject}
                              </p>
                            </div>
                            <div 
                              className="p-4 bg-white max-h-96 overflow-y-auto"
                              dangerouslySetInnerHTML={{ __html: emailTemplates[selectedTemplate].html }}
                            />
                          </div>
                        )}

                        {!selectedTemplate && (
                          <p className="text-gray-500 text-center py-4">
                            Wähle eine Vorlage aus, um die Vorschau zu sehen
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="text-gray-500">Keine Vorlagen verfügbar</p>
                    )}
                  </div>
                )}
              </div>

            </div>
          )}
        </div>
      )}

      {/* Max. Stellenlaufzeit */}
      <div className="card mb-8">
        <button
          onClick={() => setShowDeadlineSection(!showDeadlineSection)}
          className="w-full flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Calendar className="h-5 w-5 text-blue-600" />
            </div>
            <div className="text-left">
              <h2 className="text-xl font-semibold text-gray-900">Max. Stellenlaufzeit</h2>
              <p className="text-sm text-gray-600">
                Wie lange eine Stelle maximal aktiv bleiben kann
                <span className="ml-2 font-medium text-gray-800">
                  (Aktuell: {flags.max_job_deadline_days || 90} Tage)
                </span>
              </p>
            </div>
          </div>
          {showDeadlineSection ? (
            <ChevronUp className="h-5 w-5 text-gray-500" />
          ) : (
            <ChevronDown className="h-5 w-5 text-gray-500" />
          )}
        </button>

        {showDeadlineSection && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Maximale Laufzeit in Tagen
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min="7"
                    max="365"
                    value={maxDeadlineDays}
                    onChange={(e) => {
                      const value = parseInt(e.target.value) || 90;
                      setMaxDeadlineDays(value);
                    }}
                    className="input w-32"
                  />
                  <span className="text-gray-600">Tage</span>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Standard: 90 Tage (3 Monate)
                </p>
              </div>

              <div className="flex items-center gap-4">
                <button
                  onClick={() => setMaxDeadlineDays(30)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    maxDeadlineDays === 30 
                      ? 'bg-primary-100 text-primary-700 border-2 border-primary-300' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  30 Tage
                </button>
                <button
                  onClick={() => setMaxDeadlineDays(60)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    maxDeadlineDays === 60 
                      ? 'bg-primary-100 text-primary-700 border-2 border-primary-300' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  60 Tage
                </button>
                <button
                  onClick={() => setMaxDeadlineDays(90)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    maxDeadlineDays === 90 
                      ? 'bg-primary-100 text-primary-700 border-2 border-primary-300' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  90 Tage
                </button>
                <button
                  onClick={() => setMaxDeadlineDays(180)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    maxDeadlineDays === 180 
                      ? 'bg-primary-100 text-primary-700 border-2 border-primary-300' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  180 Tage
                </button>
              </div>
            </div>

            <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-700">
                <strong>Hinweis:</strong> Diese Einstellung legt fest, wie lange eine Stellenanzeige 
                maximal online bleiben kann. Nach Ablauf wird sie automatisch archiviert.
              </p>
            </div>

            {/* Speichern-Button */}
            {maxDeadlineDays !== (flags.max_job_deadline_days || 90) && (
              <div className="mt-6 flex items-center justify-end gap-4">
                <button
                  onClick={() => {
                    setMaxDeadlineDays(flags.max_job_deadline_days || 90);
                  }}
                  className="btn-secondary"
                >
                  Abbrechen
                </button>
                <button
                  onClick={saveMaxDeadlineDays}
                  disabled={saving === 'max_job_deadline_days'}
                  className="btn-primary flex items-center gap-2"
                >
                  {saving === 'max_job_deadline_days' ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  Speichern
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Archiv-Löschfrist */}
      <div className="card mb-8">
        <button
          onClick={() => setShowArchiveSection(!showArchiveSection)}
          className="w-full flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <Trash2 className="h-5 w-5 text-red-600" />
            </div>
            <div className="text-left">
              <h2 className="text-xl font-semibold text-gray-900">Archiv-Löschfrist</h2>
              <p className="text-sm text-gray-600">
                Nach wie vielen Tagen archivierte Stellen endgültig gelöscht werden
                <span className="ml-2 font-medium text-gray-800">
                  (Aktuell: {flags.archive_deletion_days || 90} Tage)
                </span>
              </p>
            </div>
          </div>
          {showArchiveSection ? (
            <ChevronUp className="h-5 w-5 text-gray-500" />
          ) : (
            <ChevronDown className="h-5 w-5 text-gray-500" />
          )}
        </button>

        {showArchiveSection && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Löschfrist in Tagen
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min="1"
                    max="365"
                    value={archiveDays}
                    onChange={(e) => {
                      const value = parseInt(e.target.value) || 90;
                      setArchiveDays(value);
                    }}
                    className="input w-32"
                  />
                  <span className="text-gray-600">Tage</span>
                  <button
                    onClick={() => loadArchivePreview(archiveDays)}
                    disabled={loadingPreview}
                    className="btn-secondary text-sm"
                  >
                    {loadingPreview ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      'Vorschau'
                    )}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Standard: 90 Tage (3 Monate)
                </p>
              </div>

              <div className="flex items-center gap-4">
                <button
                  onClick={() => setArchiveDays(30)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    archiveDays === 30 
                      ? 'bg-primary-100 text-primary-700 border-2 border-primary-300' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  30 Tage
                </button>
                <button
                  onClick={() => setArchiveDays(60)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    archiveDays === 60 
                      ? 'bg-primary-100 text-primary-700 border-2 border-primary-300' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  60 Tage
                </button>
                <button
                  onClick={() => setArchiveDays(90)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    archiveDays === 90 
                      ? 'bg-primary-100 text-primary-700 border-2 border-primary-300' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  90 Tage
                </button>
                <button
                  onClick={() => setArchiveDays(180)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    archiveDays === 180 
                      ? 'bg-primary-100 text-primary-700 border-2 border-primary-300' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  180 Tage
                </button>
              </div>
            </div>

            {/* Vorschau der betroffenen Stellen */}
            {archivePreview && (
              <div className={`mt-6 p-4 rounded-lg ${
                archivePreview.affected_count > 0 
                  ? 'bg-red-50 border border-red-200' 
                  : 'bg-green-50 border border-green-200'
              }`}>
                <div className="flex items-start gap-3">
                  {archivePreview.affected_count > 0 ? (
                    <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                  ) : (
                    <Clock className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                  )}
                  <div>
                    <h4 className={`font-semibold ${
                      archivePreview.affected_count > 0 ? 'text-red-800' : 'text-green-800'
                    }`}>
                      {archivePreview.affected_count > 0 
                        ? `${archivePreview.affected_count} Stellen würden sofort gelöscht`
                        : 'Keine Stellen betroffen'
                      }
                    </h4>
                    {archivePreview.warning && (
                      <p className="text-sm text-red-700 mt-1">{archivePreview.warning}</p>
                    )}
                    
                    {archivePreview.affected_jobs?.length > 0 && (
                      <div className="mt-3">
                        <p className="text-sm text-red-700 mb-2">Betroffene Stellen:</p>
                        <ul className="text-sm text-red-600 space-y-1">
                          {archivePreview.affected_jobs.map(job => (
                            <li key={job.id} className="flex items-center gap-2">
                              <span className="font-medium">#{job.id}</span>
                              <span>{job.title}</span>
                              <span className="text-red-500">
                                ({job.days_archived} Tage archiviert)
                              </span>
                            </li>
                          ))}
                        </ul>
                        {archivePreview.affected_count > 20 && (
                          <p className="text-sm text-red-500 mt-2">
                            ... und {archivePreview.affected_count - 20} weitere
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Speichern-Button */}
            {archiveDays !== (flags.archive_deletion_days || 90) && (
              <div className="mt-6 flex items-center justify-end gap-4">
                <button
                  onClick={() => {
                    setArchiveDays(flags.archive_deletion_days || 90);
                    setArchivePreview(null);
                  }}
                  className="btn-secondary"
                >
                  Abbrechen
                </button>
                <button
                  onClick={saveArchiveDays}
                  disabled={saving === 'archive_deletion_days'}
                  className="btn-primary flex items-center gap-2"
                >
                  {saving === 'archive_deletion_days' ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  Speichern
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Info-Box */}
      <div className="card bg-yellow-50 border-yellow-200">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-yellow-800">Hinweis zu Einstellungen</h3>
            <p className="text-sm text-yellow-700 mt-1">
              Änderungen werden sofort wirksam. Das Matching-Feature verwendet 
              einen Algorithmus, der Bewerberprofile mit Stellenanforderungen vergleicht. 
              Diskriminierende Faktoren wie Geschlecht oder Herkunft werden nicht berücksichtigt.
            </p>
            <p className="text-sm text-yellow-700 mt-2">
              <strong>Max. Stellenlaufzeit:</strong> Stellen werden nach dieser Zeit automatisch archiviert.
            </p>
            <p className="text-sm text-yellow-700 mt-2">
              <strong>Archiv-Löschfrist:</strong> Archivierte Stellen werden nach dieser Zeit endgültig 
              aus dem System entfernt.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminSettings;
