import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { adminAPI } from '../../lib/api';
import toast from 'react-hot-toast';
import { 
  Shield, Users, Briefcase, FileText, TrendingUp,
  UserCheck, Building2, Clock, BookOpen, ClipboardList
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const response = await adminAPI.getStats();
      setStats(response.data);
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
              <p className="text-xs text-green-600">+{stats.users.new_this_week} diese Woche</p>
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
              <p className="text-xs text-yellow-600">{stats.applications.pending} ausstehend</p>
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
