import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { adminAPI } from '../../lib/api';
import toast from 'react-hot-toast';
import { 
  Shield, Users, Briefcase, FileText, TrendingUp,
  UserCheck, Building2, Clock, BookOpen, ClipboardList,
  Archive, CheckCircle, AlertTriangle, FileX, Mail, Send
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    setLoading(true);
    try {
      const [statsRes, emailRes] = await Promise.all([
        adminAPI.getStats(),
        adminAPI.getEmailStats().catch(() => ({ data: null }))
      ]);
      setStats(statsRes.data);
      setEmailStats(emailRes.data);
    } catch (error) {
      toast.error('Fehler beim Laden der Statistiken');
    } finally {
      setLoading(false);
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
      <div className="flex items-center gap-3 mb-8">
        <Shield className="h-8 w-8 text-primary-600" />
        <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
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
              <p className="text-sm text-gray-600">Erfolgsrate</p>
              <p className="text-2xl font-bold text-gray-900">
                {stats.applications.total > 0 
                  ? Math.round((stats.applications.accepted / stats.applications.total) * 100) 
                  : 0}%
              </p>
              <p className="text-xs text-green-600">{stats.applications.accepted} angenommen</p>
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

      {/* Bewerbungsstatus */}
      <div className="card mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Bewerbungsstatus</h2>
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
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <p className="text-3xl font-bold text-blue-600">+{stats.applications.new_this_week}</p>
            <p className="text-sm text-gray-600">Diese Woche</p>
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
