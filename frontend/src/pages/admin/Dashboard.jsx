import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { adminAPI } from '../../lib/api';
import toast from 'react-hot-toast';
import { 
  Shield, Users, Briefcase, FileText, TrendingUp,
  UserCheck, Building2, Clock, BookOpen, ClipboardList,
  Archive, CheckCircle, AlertTriangle, FileX, Mail, Send,
  Calendar, LogIn, UserPlus, BarChart3
} from 'lucide-react';

const positionTypeLabels = {
  studentenferienjob: 'Studentenferienjob',
  saisonjob: 'Saisonjob',
  workandholiday: 'Work & Holiday',
  fachkraft: 'Fachkräfte',
  ausbildung: 'Ausbildung'
};

function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [emailStats, setEmailStats] = useState(null);
  const [coldOutreachStats, setColdOutreachStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [periodDays, setPeriodDays] = useState(7);
  const [customRange, setCustomRange] = useState({ from: '', to: '' });
  const [showCustomRange, setShowCustomRange] = useState(false);

  useEffect(() => {
    loadStats(periodDays, !stats);
  }, [periodDays]);

  const loadStats = async (days, isInitial = false) => {
    if (isInitial) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }
    try {
      const [statsRes, emailRes, coldOutreachRes] = await Promise.all([
        adminAPI.getStats(days),
        adminAPI.getEmailStats(days).catch(() => ({ data: null })),
        adminAPI.getColdOutreachStats(days).catch(() => ({ data: null }))
      ]);
      setStats(statsRes.data);
      setEmailStats(emailRes.data);
      setColdOutreachStats(coldOutreachRes.data);
    } catch (error) {
      toast.error('Fehler beim Laden der Statistiken');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleCustomRangeApply = () => {
    if (customRange.from && customRange.to) {
      const fromDate = new Date(customRange.from);
      const toDate = new Date(customRange.to);
      const diffDays = Math.ceil((toDate - fromDate) / (1000 * 60 * 60 * 24)) + 1;
      if (diffDays > 0 && diffDays <= 365) {
        setPeriodDays(diffDays);
        setShowCustomRange(false);
      } else {
        toast.error('Ungültiger Zeitraum (max. 365 Tage)');
      }
    }
  };

  const getPeriodLabel = () => {
    switch(periodDays) {
      case 1: return 'Heute';
      case 7: return 'Letzte 7 Tage';
      case 14: return 'Letzte 14 Tage';
      case 30: return 'Letzte 30 Tage';
      case 90: return 'Letzte 90 Tage';
      case 365: return 'Letztes Jahr';
      default: return `Letzte ${periodDays} Tage`;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <Shield className="h-8 w-8 text-primary-600" />
        <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
      </div>

      {/* ==================== STATISCHE STATISTIKEN (Gesamtzahlen) ==================== */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="h-5 w-5 text-gray-500" />
          <h2 className="text-lg font-semibold text-gray-700">Gesamtübersicht</h2>
          <span className="text-sm text-gray-400">(alle Zeiten)</span>
        </div>
      </div>

      {/* Hauptstatistiken */}
      <div className="grid md:grid-cols-4 gap-6 mb-8">
        <div className="card">
          <div className="flex items-center gap-4">
            <div className="bg-blue-100 p-3 rounded-lg">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Benutzer gesamt</p>
              <p className="text-2xl font-bold text-gray-900">{stats.users.total}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center gap-4">
            <div className="bg-green-100 p-3 rounded-lg">
              <Briefcase className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Stellenangebote</p>
              <p className="text-2xl font-bold text-gray-900">{stats.jobs.total}</p>
              <p className="text-xs text-green-600">{stats.jobs.active} aktiv</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center gap-4">
            <div className="bg-purple-100 p-3 rounded-lg">
              <FileText className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Bewerbungen</p>
              <p className="text-2xl font-bold text-gray-900">{stats.applications.total}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center gap-4">
            <div className="bg-orange-100 p-3 rounded-lg">
              <TrendingUp className="h-6 w-6 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Vermittlungen</p>
              <p className="text-2xl font-bold text-gray-900">
                {stats.success_rate?.total_successes || 0}
              </p>
              <p className="text-xs text-green-600">
                {stats.success_rate?.success_percentage || 0}% Erfolgsquote
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Stellen-Metriken */}
      <div className="grid md:grid-cols-4 gap-4 mb-8">
        <div className="card bg-green-50 border border-green-200">
          <div className="flex items-center gap-3">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <div>
              <p className="text-xs text-green-700">Aktive Stellen</p>
              <p className="text-xl font-bold text-green-800">{stats.jobs.active}</p>
            </div>
          </div>
        </div>
        <div className="card bg-blue-50 border border-blue-200">
          <div className="flex items-center gap-3">
            <FileX className="h-5 w-5 text-blue-600" />
            <div>
              <p className="text-xs text-blue-700">Entwürfe</p>
              <p className="text-xl font-bold text-blue-800">{stats.jobs.drafts}</p>
            </div>
          </div>
        </div>
        <div className="card bg-yellow-50 border border-yellow-200">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
            <div>
              <p className="text-xs text-yellow-700">Abgelaufen</p>
              <p className="text-xl font-bold text-yellow-800">{stats.jobs.expired}</p>
            </div>
          </div>
        </div>
        <div className="card bg-gray-50 border border-gray-200">
          <div className="flex items-center gap-3">
            <Archive className="h-5 w-5 text-gray-600" />
            <div>
              <p className="text-xs text-gray-700">Archiviert</p>
              <p className="text-xl font-bold text-gray-800">{stats.jobs.archived}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Erfolgsstatistik - Vermittlungen über JobOn */}
      {stats.success_rate && (
        <div className="card mb-8 border-2 border-green-200 bg-gradient-to-r from-green-50 to-emerald-50">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-green-500 p-2 rounded-lg">
              <CheckCircle className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Erfolgreiche Vermittlungen</h2>
              <p className="text-sm text-gray-600">Stellen, die über JobOn besetzt wurden</p>
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="text-center p-4 bg-white rounded-lg shadow-sm">
              <p className="text-4xl font-bold text-green-600">{stats.success_rate.total_successes}</p>
              <p className="text-sm text-gray-600">Gesamt</p>
            </div>
            <div className="text-center p-4 bg-white rounded-lg shadow-sm">
              <p className="text-4xl font-bold text-green-600">{stats.success_rate.successes_in_period}</p>
              <p className="text-sm text-gray-600">Letzte {stats.period_days} Tage</p>
            </div>
            <div className="text-center p-4 bg-white rounded-lg shadow-sm">
              <p className="text-4xl font-bold text-green-600">{stats.success_rate.success_percentage}%</p>
              <p className="text-sm text-gray-600">Erfolgsquote</p>
            </div>
          </div>

          {/* Löschgründe Aufschlüsselung */}
          {stats.deletion_reasons && stats.deletion_reasons.total_deleted > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3">Archivierungsgründe (alle Zeiten)</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="flex items-center justify-between p-3 bg-green-100 rounded-lg">
                  <span className="text-sm text-green-800">✅ Über JobOn</span>
                  <span className="font-bold text-green-700">{stats.deletion_reasons.filled_via_jobon}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-100 rounded-lg">
                  <span className="text-sm text-gray-700">Andere Plattform</span>
                  <span className="font-bold text-gray-600">{stats.deletion_reasons.filled_via_other}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-100 rounded-lg">
                  <span className="text-sm text-gray-700">Nicht besetzt</span>
                  <span className="font-bold text-gray-600">{stats.deletion_reasons.position_cancelled}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-100 rounded-lg">
                  <span className="text-sm text-gray-700">Sonstige</span>
                  <span className="font-bold text-gray-600">
                    {(stats.deletion_reasons.seasonal_end || 0) + 
                     (stats.deletion_reasons.budget_reasons || 0) + 
                     (stats.deletion_reasons.company_closed || 0) + 
                     (stats.deletion_reasons.other || 0)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Detailstatistiken */}
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        {/* Benutzer nach Typ */}
        <div className="card">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Benutzer nach Typ</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <UserCheck className="h-5 w-5 text-blue-600" />
                <span>Bewerber</span>
              </div>
              <span className="font-semibold">{stats.users.applicants}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <Building2 className="h-5 w-5 text-green-600" />
                <span>Unternehmen</span>
              </div>
              <span className="font-semibold">{stats.users.companies}</span>
            </div>
          </div>
        </div>

        {/* Stellen nach Typ */}
        <div className="card">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Stellen nach Typ</h2>
          <div className="space-y-3">
            {Object.entries(stats.position_types).map(([type, count]) => (
              <div key={type} className="flex items-center justify-between">
                <span className="text-gray-600">{positionTypeLabels[type] || type}</span>
                <div className="flex items-center gap-2">
                  <div className="w-32 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-primary-600 h-2 rounded-full" 
                      style={{ 
                        width: `${stats.jobs.total > 0 ? (count / stats.jobs.total) * 100 : 0}%` 
                      }}
                    />
                  </div>
                  <span className="font-semibold w-8 text-right">{count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bewerbungsstatus (statisch - Gesamtzahlen) */}
      <div className="card mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Bewerbungsstatus (Gesamt)</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-yellow-50 rounded-lg">
            <p className="text-3xl font-bold text-yellow-600">{stats.applications.pending}</p>
            <p className="text-sm text-gray-600">Ausstehend</p>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <p className="text-3xl font-bold text-green-600">{stats.applications.accepted}</p>
            <p className="text-sm text-gray-600">Angenommen</p>
          </div>
          <div className="text-center p-4 bg-red-50 rounded-lg">
            <p className="text-3xl font-bold text-red-600">{stats.applications.rejected}</p>
            <p className="text-sm text-gray-600">Abgelehnt</p>
          </div>
          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <p className="text-3xl font-bold text-purple-600">{stats.applications.in_review || 0}</p>
            <p className="text-sm text-gray-600">In Prüfung</p>
          </div>
        </div>
      </div>

      {/* ==================== ZEITBASIERTE AUSWERTUNGEN ==================== */}
      <div className="mb-6 mt-12">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl border border-indigo-200">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-500 p-2 rounded-lg">
              <Calendar className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Zeitbasierte Auswertungen</h2>
              <p className="text-sm text-gray-600">Aktivitäten im gewählten Zeitraum</p>
            </div>
          </div>
          
          {/* Zeitraum-Auswahl */}
          <div className="flex flex-wrap items-center gap-2">
            {[
              { value: 1, label: 'Heute' },
              { value: 7, label: '7 Tage' },
              { value: 14, label: '14 Tage' },
              { value: 30, label: '30 Tage' },
              { value: 90, label: '90 Tage' },
            ].map(({ value, label }) => (
              <button
                key={value}
                onClick={() => { setPeriodDays(value); setShowCustomRange(false); }}
                disabled={refreshing}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  periodDays === value && !showCustomRange
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'bg-white text-gray-700 hover:bg-indigo-100 border border-gray-200'
                } ${refreshing ? 'opacity-50 cursor-wait' : ''}`}
              >
                {label}
              </button>
            ))}
            {refreshing && (
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-indigo-600 border-t-transparent"></div>
            )}
            <button
              onClick={() => setShowCustomRange(!showCustomRange)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1 ${
                showCustomRange
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'bg-white text-gray-700 hover:bg-indigo-100 border border-gray-200'
              }`}
            >
              <Calendar className="h-4 w-4" />
              Zeitraum
            </button>
          </div>
        </div>
        
        {/* Benutzerdefinierter Zeitraum */}
        {showCustomRange && (
          <div className="mt-3 p-4 bg-white rounded-lg border border-indigo-200 shadow-sm">
            <div className="flex flex-wrap items-end gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Von</label>
                <input
                  type="date"
                  value={customRange.from}
                  onChange={(e) => setCustomRange({ ...customRange, from: e.target.value })}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bis</label>
                <input
                  type="date"
                  value={customRange.to}
                  onChange={(e) => setCustomRange({ ...customRange, to: e.target.value })}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <button
                onClick={handleCustomRangeApply}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
              >
                Anwenden
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Zeitraum-Anzeige */}
      <div className="text-center mb-6">
        <span className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-100 text-indigo-800 rounded-full text-sm font-medium">
          <Clock className="h-4 w-4" />
          Zeitraum: {getPeriodLabel()}
        </span>
      </div>

      {/* Zeitbasierte Statistiken Grid */}
      <div className="grid md:grid-cols-3 gap-6 mb-8">
        {/* Aktive Logins */}
        <div className="card border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-blue-500 p-2 rounded-lg">
              <LogIn className="h-5 w-5 text-white" />
            </div>
            <h3 className="font-semibold text-gray-900">Aktive Logins</h3>
          </div>
          <p className="text-4xl font-bold text-blue-600 mb-1">{stats.users.logins_in_period || 0}</p>
          <p className="text-sm text-gray-600">Benutzer eingeloggt</p>
        </div>

        {/* Neue Bewerbungen */}
        <div className="card border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-purple-100">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-purple-500 p-2 rounded-lg">
              <FileText className="h-5 w-5 text-white" />
            </div>
            <h3 className="font-semibold text-gray-900">Neue Bewerbungen</h3>
          </div>
          <p className="text-4xl font-bold text-purple-600 mb-1">{stats.applications.new_in_period || 0}</p>
          <p className="text-sm text-gray-600">eingegangen</p>
        </div>

        {/* Neue Registrierungen */}
        <div className="card border-2 border-green-200 bg-gradient-to-br from-green-50 to-green-100">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-green-500 p-2 rounded-lg">
              <UserPlus className="h-5 w-5 text-white" />
            </div>
            <h3 className="font-semibold text-gray-900">Neue Registrierungen</h3>
          </div>
          <p className="text-4xl font-bold text-green-600 mb-1">{stats.users.new_in_period || 0}</p>
          <p className="text-sm text-gray-600">neue Benutzer</p>
        </div>
      </div>

      {/* Detaillierte zeitbasierte Statistiken */}
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        {/* Login-Details */}
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <LogIn className="h-5 w-5 text-blue-600" />
            Login-Übersicht
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <span className="text-gray-600">Heute</span>
              <span className="font-bold text-blue-600">{stats.users.logins_today || 0}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <span className="text-gray-600">Diese Woche</span>
              <span className="font-bold text-blue-600">{stats.users.logins_this_week || 0}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <span className="text-gray-600">Diesen Monat</span>
              <span className="font-bold text-blue-600">{stats.users.logins_this_month || 0}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-indigo-50 rounded-lg border border-indigo-200">
              <span className="text-indigo-700 font-medium">{getPeriodLabel()}</span>
              <span className="font-bold text-indigo-600">{stats.users.logins_in_period || 0}</span>
            </div>
          </div>
        </div>

        {/* Bewerbungen im Zeitraum */}
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <FileText className="h-5 w-5 text-purple-600" />
            Bewerbungen im Zeitraum
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <span className="text-gray-600">Neue Bewerbungen</span>
              <span className="font-bold text-purple-600">{stats.applications.new_in_period || 0}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <span className="text-gray-600">Angenommen</span>
              <span className="font-bold text-green-600">{stats.applications.accepted_in_period || 0}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <span className="text-gray-600">Diese Woche (neu)</span>
              <span className="font-bold text-blue-600">{stats.applications.new_this_week || 0}</span>
            </div>
          </div>
        </div>
      </div>

      {/* E-Mail-Statistiken */}
      {emailStats && (
        <div className="card mb-8">
          <div className="flex items-center gap-3 mb-4">
            <Mail className="h-6 w-6 text-primary-600" />
            <h2 className="text-xl font-semibold text-gray-900">E-Mail-Statistiken</h2>
            <span className="text-sm text-gray-500">(letzte {emailStats.period_days} Tage)</span>
          </div>
          
          {/* Übersicht */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <p className="text-3xl font-bold text-blue-600">{emailStats.total_sent}</p>
              <p className="text-sm text-gray-600">Gesendet</p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <p className="text-3xl font-bold text-green-600">{emailStats.total_success}</p>
              <p className="text-sm text-gray-600">Erfolgreich</p>
            </div>
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <p className="text-3xl font-bold text-red-600">{emailStats.total_failed}</p>
              <p className="text-sm text-gray-600">Fehlgeschlagen</p>
            </div>
          </div>
          
          {/* Nach Typ */}
          {emailStats.by_type && emailStats.by_type.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-700 mb-3">Nach Typ</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {emailStats.by_type.map((item) => (
                  <div key={item.type} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm text-gray-700">{item.label}</span>
                    <span className="font-semibold text-gray-900">{item.total}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Letzte E-Mails */}
          {emailStats.recent && emailStats.recent.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3">Letzte E-Mails</h3>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {emailStats.recent.slice(0, 5).map((email, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-2 bg-gray-50 rounded text-sm">
                    <Send className={`h-4 w-4 ${email.success ? 'text-green-500' : 'text-red-500'}`} />
                    <span className="text-gray-500 w-24 truncate">{email.label}</span>
                    <span className="text-gray-700 flex-1 truncate">{email.recipient}</span>
                    <span className="text-gray-400 text-xs">
                      {email.created_at ? new Date(email.created_at).toLocaleString('de-DE', { 
                        day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' 
                      }) : ''}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Kaltakquise-Statistiken */}
      {coldOutreachStats && (
        <div className="card mb-8 border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-blue-500 p-2 rounded-lg">
              <Send className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Kaltakquise E-Mails</h2>
              <p className="text-sm text-gray-600">Letzte {coldOutreachStats.period_days} Tage</p>
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="text-center p-4 bg-white rounded-lg shadow-sm">
              <p className="text-4xl font-bold text-blue-600">{coldOutreachStats.total}</p>
              <p className="text-sm text-gray-600">Gesendet</p>
            </div>
            <div className="text-center p-4 bg-white rounded-lg shadow-sm">
              <p className="text-4xl font-bold text-green-600">{coldOutreachStats.success}</p>
              <p className="text-sm text-gray-600">Erfolgreich</p>
            </div>
            <div className="text-center p-4 bg-white rounded-lg shadow-sm">
              <p className="text-4xl font-bold text-red-600">{coldOutreachStats.failed}</p>
              <p className="text-sm text-gray-600">Fehlgeschlagen</p>
            </div>
          </div>

          {/* Pro Mitarbeiter */}
          {coldOutreachStats.by_user && coldOutreachStats.by_user.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3">Pro Mitarbeiter</h3>
              <div className="space-y-2">
                {coldOutreachStats.by_user.map((user, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-white rounded-lg shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-semibold text-sm">
                        {idx + 1}
                      </div>
                      <span className="font-medium text-gray-800">{user.email}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-sm text-gray-500">{user.success} erfolgreich</span>
                      <span className="text-xl font-bold text-blue-600">{user.total}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Schnellzugriff */}
      <div className="card">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Verwaltung</h2>
        <div className="grid md:grid-cols-3 gap-4">
          <Link 
            to="/admin/users"
            className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <Users className="h-6 w-6 text-primary-600" />
            <div>
              <p className="font-medium">Benutzer verwalten</p>
              <p className="text-sm text-gray-500">{stats.users.total} Benutzer</p>
            </div>
          </Link>
          <Link 
            to="/admin/jobs"
            className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <Briefcase className="h-6 w-6 text-primary-600" />
            <div>
              <p className="font-medium">Stellen verwalten</p>
              <p className="text-sm text-gray-500">{stats.jobs.total} Stellen</p>
            </div>
          </Link>
          <Link 
            to="/admin/job-requests"
            className="flex items-center gap-3 p-4 bg-primary-50 border-2 border-primary-200 rounded-lg hover:bg-primary-100 transition-colors"
          >
            <ClipboardList className="h-6 w-6 text-primary-600" />
            <div>
              <p className="font-medium text-primary-900">IJP-Aufträge</p>
              <p className="text-sm text-primary-600">Vermittlungsaufträge</p>
            </div>
          </Link>
          <Link 
            to="/admin/applications"
            className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <FileText className="h-6 w-6 text-primary-600" />
            <div>
              <p className="font-medium">Bewerbungen ansehen</p>
              <p className="text-sm text-gray-500">{stats.applications.total} Bewerbungen</p>
            </div>
          </Link>
          <Link 
            to="/admin/blog"
            className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <BookOpen className="h-6 w-6 text-primary-600" />
            <div>
              <p className="font-medium">Blog verwalten</p>
              <p className="text-sm text-gray-500">Artikel & SEO</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default AdminDashboard;
