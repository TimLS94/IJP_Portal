import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { jobsAPI, applicationsAPI, companyAPI } from '../../lib/api';
import { Building2, Briefcase, Users, Plus, FileText } from 'lucide-react';

function CompanyDashboard() {
  const [stats, setStats] = useState({
    jobs: 0,
    activeJobs: 0,
    applications: 0,
    pendingApplications: 0
  });
  const [company, setCompany] = useState(null);
  const [recentApplications, setRecentApplications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const [companyRes, jobsRes, appsRes] = await Promise.all([
        companyAPI.getProfile().catch(() => ({ data: null })),
        jobsAPI.getMyJobs().catch(() => ({ data: [] })),
        applicationsAPI.getCompanyApplications().catch(() => ({ data: [] }))
      ]);

      setCompany(companyRes.data);
      
      const jobs = jobsRes.data || [];
      const apps = appsRes.data || [];
      
      setStats({
        jobs: jobs.length,
        activeJobs: jobs.filter(j => j.is_active).length,
        applications: apps.length,
        pendingApplications: apps.filter(a => a.status === 'pending').length
      });

      setRecentApplications(apps.slice(0, 5));
    } catch (error) {
      console.error('Dashboard laden fehlgeschlagen:', error);
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

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <Building2 className="h-8 w-8 text-primary-600" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            {company && <p className="text-gray-600">{company.company_name}</p>}
          </div>
        </div>
        <Link to="/company/jobs/new" className="btn-primary flex items-center gap-2">
          <Plus className="h-5 w-5" />
          Neue Stelle erstellen
        </Link>
      </div>

      {/* Statistiken */}
      <div className="grid md:grid-cols-4 gap-6 mb-8">
        <div className="card">
          <div className="flex items-center gap-4">
            <div className="bg-primary-100 p-3 rounded-lg">
              <Briefcase className="h-6 w-6 text-primary-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Stellenangebote</p>
              <p className="text-2xl font-bold text-gray-900">{stats.jobs}</p>
            </div>
          </div>
        </div>
        
        <div className="card">
          <div className="flex items-center gap-4">
            <div className="bg-green-100 p-3 rounded-lg">
              <Briefcase className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Aktive Stellen</p>
              <p className="text-2xl font-bold text-gray-900">{stats.activeJobs}</p>
            </div>
          </div>
        </div>
        
        <div className="card">
          <div className="flex items-center gap-4">
            <div className="bg-blue-100 p-3 rounded-lg">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Bewerbungen</p>
              <p className="text-2xl font-bold text-gray-900">{stats.applications}</p>
            </div>
          </div>
        </div>
        
        <div className="card">
          <div className="flex items-center gap-4">
            <div className="bg-yellow-100 p-3 rounded-lg">
              <FileText className="h-6 w-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Ausstehend</p>
              <p className="text-2xl font-bold text-gray-900">{stats.pendingApplications}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Schnellzugriff */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Schnellzugriff</h2>
          <div className="space-y-3">
            <Link 
              to="/company/jobs" 
              className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <Briefcase className="h-5 w-5 text-primary-600" />
              <span>Meine Stellenangebote verwalten</span>
            </Link>
            <Link 
              to="/company/applications" 
              className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <Users className="h-5 w-5 text-primary-600" />
              <span>Bewerbungen ansehen</span>
            </Link>
            <Link 
              to="/company/jobs/new" 
              className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <Plus className="h-5 w-5 text-primary-600" />
              <span>Neue Stelle erstellen</span>
            </Link>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Neue Bewerbungen</h2>
            <Link to="/company/applications" className="text-primary-600 hover:text-primary-700 text-sm">
              Alle ansehen
            </Link>
          </div>
          
          {recentApplications.length === 0 ? (
            <p className="text-gray-500 text-center py-4">Noch keine Bewerbungen</p>
          ) : (
            <div className="space-y-3">
              {recentApplications.map((app) => (
                <div key={app.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">{app.applicant_name || 'Bewerber'}</p>
                    <p className="text-sm text-gray-600">{app.job_title}</p>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    app.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {app.status === 'pending' ? 'Neu' : app.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default CompanyDashboard;
