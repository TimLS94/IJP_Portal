import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { applicationsAPI, generatorAPI, downloadBlob } from '../../lib/api';
import toast from 'react-hot-toast';
import { FileText, Building2, Calendar, Clock, XCircle, Download, Loader2 } from 'lucide-react';

const statusLabels = {
  pending: { label: 'Eingereicht', color: 'bg-yellow-100 text-yellow-800' },
  reviewing: { label: 'In Prüfung', color: 'bg-blue-100 text-blue-800' },
  interview: { label: 'Vorstellungsgespräch', color: 'bg-purple-100 text-purple-800' },
  accepted: { label: 'Angenommen', color: 'bg-green-100 text-green-800' },
  rejected: { label: 'Abgelehnt', color: 'bg-red-100 text-red-800' },
  withdrawn: { label: 'Zurückgezogen', color: 'bg-gray-100 text-gray-800' }
};

function ApplicantApplications() {
  const { t } = useTranslation();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(null);

  useEffect(() => {
    loadApplications();
  }, []);

  const loadApplications = async () => {
    try {
      const response = await applicationsAPI.getMyApplications();
      setApplications(response.data);
    } catch (error) {
      toast.error('Fehler beim Laden der Bewerbungen');
    } finally {
      setLoading(false);
    }
  };

  const handleWithdraw = async (id) => {
    if (!confirm('Möchten Sie diese Bewerbung wirklich zurückziehen?')) return;
    
    try {
      await applicationsAPI.withdraw(id);
      toast.success('Bewerbung zurückgezogen');
      loadApplications();
    } catch (error) {
      toast.error('Fehler beim Zurückziehen der Bewerbung');
    }
  };

  const handleGeneratePDF = async (appId, jobTitle) => {
    setGenerating(appId);
    try {
      const response = await generatorAPI.stellenbescheinigung(appId);
      downloadBlob(response.data, `Stellenbescheinigung_${jobTitle || 'Bewerbung'}.pdf`);
      toast.success('PDF wurde generiert!');
    } catch (error) {
      toast.error('PDF-Generierung fehlgeschlagen');
    } finally {
      setGenerating(null);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
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
      <div className="flex items-center gap-3 mb-8">
        <FileText className="h-8 w-8 text-primary-600" />
        <h1 className="text-3xl font-bold text-gray-900">{t('applicant.applicationsTitle')}</h1>
      </div>

      {applications.length === 0 ? (
          <div className="card text-center py-12">
            <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">{t('applicant.noApplications')}</h2>
            <p className="text-gray-600 mb-4">
              {t('applicant.noApplicationsText')}
            </p>
            <Link to="/jobs" className="btn-primary inline-block">
              {t('applicant.browseJobs')}
            </Link>
          </div>
      ) : (
        <div className="space-y-4">
          {applications.map((app) => (
            <div key={app.id} className="card">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <Link 
                      to={`/jobs/${app.job_posting_id}`}
                      className="text-xl font-semibold text-gray-900 hover:text-primary-600"
                    >
                      {app.job_title || 'Stellenangebot'}
                    </Link>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusLabels[app.status]?.color}`}>
                      {statusLabels[app.status]?.label}
                    </span>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-4 text-gray-600">
                    <span className="flex items-center gap-1">
                      <Building2 className="h-4 w-4" />
                      {app.company_name || 'Unbekannt'}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      Beworben am {formatDate(app.applied_at)}
                    </span>
                    {app.updated_at !== app.applied_at && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        Aktualisiert: {formatDate(app.updated_at)}
                      </span>
                    )}
                  </div>

                  {app.applicant_message && (
                    <p className="mt-3 text-gray-600 text-sm">
                      <strong>Ihre Nachricht:</strong> {app.applicant_message}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleGeneratePDF(app.id, app.job_title)}
                    disabled={generating === app.id}
                    className="btn-secondary text-sm flex items-center gap-1"
                    title="Stellenbescheinigung herunterladen"
                  >
                    {generating === app.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Download className="h-4 w-4" />
                    )}
                    PDF
                  </button>
                  <Link 
                    to={`/jobs/${app.job_posting_id}`}
                    className="btn-secondary text-sm"
                  >
                    Details
                  </Link>
                  {app.status === 'pending' && (
                    <button
                      onClick={() => handleWithdraw(app.id)}
                      className="btn-danger text-sm flex items-center gap-1"
                    >
                      <XCircle className="h-4 w-4" />
                      Zurückziehen
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default ApplicantApplications;
