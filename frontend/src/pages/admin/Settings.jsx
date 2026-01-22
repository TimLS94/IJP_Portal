import { useState, useEffect } from 'react';
import { adminAPI } from '../../lib/api';
import toast from 'react-hot-toast';
import { 
  Settings as SettingsIcon, ToggleLeft, ToggleRight, Save, Loader2, 
  Sparkles, Building2, Users, AlertTriangle, RefreshCw
} from 'lucide-react';

function AdminSettings() {
  const [flags, setFlags] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(null);

  useEffect(() => {
    loadFlags();
  }, []);

  const loadFlags = async () => {
    try {
      const response = await adminAPI.getFeatureFlags();
      setFlags(response.data);
    } catch (error) {
      console.error('Fehler beim Laden:', error);
      // Fallback auf Standard-Werte
      setFlags({
        company_matching_enabled: { value: false, description: 'Ermöglicht Firmen das Matching-Score der Bewerber zu sehen' },
        applicant_matching_enabled: { value: false, description: 'Ermöglicht Bewerbern das Matching-Score für Stellen zu sehen' }
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleFlag = async (key) => {
    setSaving(key);
    const currentValue = flags[key]?.value ?? false;
    
    try {
      await adminAPI.setFeatureFlag(key, !currentValue);
      setFlags(prev => ({
        ...prev,
        [key]: { ...prev[key], value: !currentValue }
      }));
      toast.success(`${key === 'company_matching_enabled' ? 'Firmen-Matching' : 'Bewerber-Matching'} ${!currentValue ? 'aktiviert' : 'deaktiviert'}`);
    } catch (error) {
      toast.error('Fehler beim Speichern');
    } finally {
      setSaving(null);
    }
  };

  const flagConfig = {
    company_matching_enabled: {
      title: 'Matching für Firmen',
      description: 'Firmen können sehen, wie gut Bewerber zu ihren Stellenangeboten passen (Matching-Score)',
      icon: Building2,
      color: 'blue'
    },
    applicant_matching_enabled: {
      title: 'Matching für Bewerber',
      description: 'Bewerber können sehen, wie gut Stellenangebote zu ihrem Profil passen',
      icon: Users,
      color: 'green'
    }
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
            const flagValue = flags[key]?.value ?? false;
            const isToggling = saving === key;
            const Icon = config.icon;
            
            return (
              <div 
                key={key}
                className={`p-4 rounded-xl border-2 transition-all ${
                  flagValue 
                    ? `bg-${config.color}-50 border-${config.color}-200` 
                    : 'bg-gray-50 border-gray-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-xl ${
                      flagValue ? `bg-${config.color}-100` : 'bg-gray-200'
                    }`}>
                      <Icon className={`h-6 w-6 ${
                        flagValue ? `text-${config.color}-600` : 'text-gray-500'
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
                  flagValue ? `border-${config.color}-200` : 'border-gray-200'
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

      {/* Info-Box */}
      <div className="card bg-yellow-50 border-yellow-200">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-yellow-800">Hinweis zu Feature Flags</h3>
            <p className="text-sm text-yellow-700 mt-1">
              Änderungen an Feature Flags werden sofort wirksam. Das Matching-Feature verwendet 
              einen Algorithmus, der Bewerberprofile mit Stellenanforderungen vergleicht. 
              Diskriminierende Faktoren wie Geschlecht oder Herkunft werden nicht berücksichtigt.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminSettings;

