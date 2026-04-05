import { useState, useEffect } from 'react';
import { companyAPI } from '../../lib/api';
import toast from 'react-hot-toast';
import { 
  Mail, Save, Loader2, Clock, Calendar, Bell, BellOff, ChevronDown
} from 'lucide-react';

const WEEKDAYS = [
  { value: 0, label: 'Sonntag', short: 'So' },
  { value: 1, label: 'Montag', short: 'Mo' },
  { value: 2, label: 'Dienstag', short: 'Di' },
  { value: 3, label: 'Mittwoch', short: 'Mi' },
  { value: 4, label: 'Donnerstag', short: 'Do' },
  { value: 5, label: 'Freitag', short: 'Fr' },
  { value: 6, label: 'Samstag', short: 'Sa' },
];

function DigestSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    enabled: true,
    days: '1,2,3,4,5',
    hour: 8
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const response = await companyAPI.getDigestSettings();
      setSettings({
        enabled: response.data.enabled,
        days: response.data.days || '1,2,3,4,5',
        hour: response.data.hour ?? 8
      });
    } catch (error) {
      toast.error('Fehler beim Laden der Einstellungen');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await companyAPI.updateDigestSettings(settings);
      toast.success('Einstellungen gespeichert');
    } catch (error) {
      toast.error('Fehler beim Speichern');
    } finally {
      setSaving(false);
    }
  };

  const toggleDay = (dayValue) => {
    const currentDays = settings.days ? settings.days.split(',').map(d => parseInt(d.trim())) : [];
    let newDays;
    
    if (currentDays.includes(dayValue)) {
      newDays = currentDays.filter(d => d !== dayValue);
    } else {
      newDays = [...currentDays, dayValue].sort((a, b) => a - b);
    }
    
    setSettings({ ...settings, days: newDays.join(',') });
  };

  const isDaySelected = (dayValue) => {
    if (!settings.days) return false;
    const days = settings.days.split(',').map(d => parseInt(d.trim()));
    return days.includes(dayValue);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
          <Mail className="h-7 w-7 text-primary-600" />
          E-Mail-Benachrichtigungen
        </h1>
        <p className="text-gray-600 mt-2">
          Erhalten Sie eine tägliche Übersicht neuer Bewerber per E-Mail, sortiert nach Matching-Score.
        </p>
      </div>

      <div className="card space-y-6">
        {/* Aktivierung */}
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
          <div className="flex items-center gap-3">
            {settings.enabled ? (
              <Bell className="h-6 w-6 text-green-600" />
            ) : (
              <BellOff className="h-6 w-6 text-gray-400" />
            )}
            <div>
              <p className="font-medium text-gray-900">Bewerber-Digest aktivieren</p>
              <p className="text-sm text-gray-500">
                {settings.enabled 
                  ? 'Sie erhalten E-Mails mit neuen Bewerbern' 
                  : 'Keine Digest-E-Mails'}
              </p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settings.enabled}
              onChange={(e) => setSettings({ ...settings, enabled: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
          </label>
        </div>

        {settings.enabled && (
          <>
            {/* Wochentage */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-3">
                <Calendar className="h-4 w-4" />
                An welchen Tagen möchten Sie den Digest erhalten?
              </label>
              <div className="flex flex-wrap gap-2">
                {WEEKDAYS.map((day) => (
                  <button
                    key={day.value}
                    type="button"
                    onClick={() => toggleDay(day.value)}
                    className={`px-4 py-2 rounded-lg font-medium transition-all ${
                      isDaySelected(day.value)
                        ? 'bg-primary-600 text-white shadow-sm'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {day.short}
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Tipp: Mo-Fr ist ideal für Werktage
              </p>
            </div>

            {/* Uhrzeit */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-3">
                <Clock className="h-4 w-4" />
                Um welche Uhrzeit? (UTC)
              </label>
              <div className="relative w-48">
                <select
                  value={settings.hour}
                  onChange={(e) => setSettings({ ...settings, hour: parseInt(e.target.value) })}
                  className="appearance-none w-full px-4 py-3 pr-10 bg-white border-2 border-gray-200 rounded-xl 
                           focus:border-primary-500 focus:ring-2 focus:ring-primary-200 focus:outline-none
                           transition-all cursor-pointer text-gray-700 font-medium"
                >
                  {Array.from({ length: 24 }, (_, i) => (
                    <option key={i} value={i}>
                      {i.toString().padStart(2, '0')}:00 Uhr
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Hinweis: Die Zeit ist in UTC. In Deutschland (MEZ/MESZ) ist es 1-2 Stunden später.
              </p>
            </div>

            {/* Info-Box */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <h3 className="font-medium text-blue-900 mb-2">Was enthält der Digest?</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Alle neuen Bewerbungen der letzten 24 Stunden</li>
                <li>• Sortiert nach Matching-Score (beste Kandidaten zuerst)</li>
                <li>• Direktlinks zu den Bewerbungen</li>
              </ul>
            </div>
          </>
        )}

        {/* Speichern Button */}
        <div className="flex justify-end pt-4 border-t">
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn-primary flex items-center gap-2"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Einstellungen speichern
          </button>
        </div>
      </div>
    </div>
  );
}

export default DigestSettings;
