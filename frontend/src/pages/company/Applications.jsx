import { useState, useEffect } from 'react';
import { applicationsAPI } from '../../lib/api';
import toast from 'react-hot-toast';
import { 
  Users, User, Briefcase, Calendar, MessageSquare, Check, X, 
  Eye, Mail, Phone, MapPin, FileText, Download, GraduationCap,
  Globe, Loader2, ChevronDown
} from 'lucide-react';

const statusOptions = [
  { value: 'pending', label: 'Eingereicht', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'company_review', label: 'In Prüfung', color: 'bg-blue-100 text-blue-800' },
  { value: 'interview_scheduled', label: 'Vorstellungsgespräch geplant', color: 'bg-purple-100 text-purple-800' },
  { value: 'accepted', label: 'Angenommen', color: 'bg-green-100 text-green-800' },
  { value: 'rejected', label: 'Abgelehnt', color: 'bg-red-100 text-red-800' }
];

const positionTypeLabels = {
  studentenferienjob: 'Studentenferienjob',
  saisonjob: 'Saisonjob (8 Monate)',
  fachkraft: 'Fachkraft',
  ausbildung: 'Ausbildung'
};

function CompanyApplications() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  
  // Detail Modal
  const [selectedApp, setSelectedApp] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [applicantDetails, setApplicantDetails] = useState(null);

  useEffect(() => {
    loadApplications();
  }, []);

  const loadApplications = async () => {
    try {
      const response = await applicationsAPI.getCompanyApplications();
      setApplications(response.data);
    } catch (error) {
      toast.error('Fehler beim Laden der Bewerbungen');
    } finally {
      setLoading(false);
    }
  };

  const loadApplicantDetails = async (appId) => {
    setSelectedApp(appId);
    setDetailsLoading(true);
    try {
      const response = await applicationsAPI.getApplicantDetails(appId);
      setApplicantDetails(response.data);
    } catch (error) {
      toast.error('Fehler beim Laden der Details');
      setSelectedApp(null);
    } finally {
      setDetailsLoading(false);
    }
  };

  const updateStatus = async (id, status) => {
    try {
      await applicationsAPI.update(id, { status });
      toast.success('Status aktualisiert');
      loadApplications();
      if (applicantDetails) {
        loadApplicantDetails(id);
      }
    } catch (error) {
      toast.error('Fehler beim Aktualisieren');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const filteredApplications = filter === 'all' 
    ? applications 
    : applications.filter(a => a.status === filter);

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
        <Users className="h-8 w-8 text-primary-600" />
        <h1 className="text-3xl font-bold text-gray-900">Bewerbungen</h1>
      </div>

      {/* Filter */}
      <div className="card mb-6">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === 'all' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Alle ({applications.length})
          </button>
          {statusOptions.map((status) => {
            const count = applications.filter(a => a.status === status.value).length;
            return (
              <button
                key={status.value}
                onClick={() => setFilter(status.value)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filter === status.value ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {status.label} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {filteredApplications.length === 0 ? (
        <div className="card text-center py-12">
          <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Keine Bewerbungen</h2>
          <p className="text-gray-600">
            {filter === 'all' 
              ? 'Sie haben noch keine Bewerbungen erhalten.'
              : 'Keine Bewerbungen mit diesem Status.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredApplications.map((app) => (
            <div key={app.id} className="card">
              <div className="flex flex-col lg:flex-row lg:items-start gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="bg-gray-100 p-2 rounded-full">
                      <User className="h-6 w-6 text-gray-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {app.applicant_name || 'Bewerber'}
                      </h3>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Briefcase className="h-4 w-4" />
                        {app.job_title}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-4 text-gray-600 text-sm mt-3">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      Beworben am {formatDate(app.applied_at)}
                    </span>
                  </div>

                  {app.applicant_message && (
                    <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                        <MessageSquare className="h-4 w-4" />
                        Nachricht des Bewerbers
                      </div>
                      <p className="text-gray-700">{app.applicant_message}</p>
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-3 lg:items-end">
                  {/* Status Badge */}
                  <span className={`px-4 py-2 rounded-full text-sm font-medium ${
                    statusOptions.find(s => s.value === app.status)?.color || 'bg-gray-100 text-gray-800'
                  }`}>
                    {statusOptions.find(s => s.value === app.status)?.label || app.status}
                  </span>
                  
                  {/* Status Actions */}
                  <div className="relative">
                    <select
                      value={app.status}
                      onChange={(e) => updateStatus(app.id, e.target.value)}
                      className="input-styled text-sm py-2 pr-8 appearance-none"
                    >
                      {statusOptions.map((status) => (
                        <option key={status.value} value={status.value}>
                          {status.label}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                  </div>

                  {/* Detail Button */}
                  <button
                    onClick={() => loadApplicantDetails(app.id)}
                    className="btn-primary text-sm py-2 px-4 flex items-center gap-2"
                  >
                    <Eye className="h-4 w-4" />
                    Bewerber ansehen
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail Modal */}
      {selectedApp && (
        <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl my-8">
            {detailsLoading ? (
              <div className="p-12 flex justify-center">
                <Loader2 className="h-12 w-12 text-primary-600 animate-spin" />
              </div>
            ) : applicantDetails ? (
              <>
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b bg-primary-50">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">
                      {applicantDetails.applicant.first_name} {applicantDetails.applicant.last_name}
                    </h2>
                    <p className="text-gray-600">{applicantDetails.job.title}</p>
                  </div>
                  <button 
                    onClick={() => { setSelectedApp(null); setApplicantDetails(null); }}
                    className="p-2 hover:bg-gray-100 rounded-lg"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>

                <div className="p-6 grid md:grid-cols-2 gap-6">
                  {/* Kontaktdaten */}
                  <div className="bg-gray-50 rounded-xl p-5">
                    <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <User className="h-5 w-5 text-primary-600" />
                      Kontaktdaten
                    </h3>
                    <div className="space-y-3">
                      <a 
                        href={`mailto:${applicantDetails.applicant.email}`}
                        className="flex items-center gap-3 p-3 bg-white rounded-lg hover:bg-primary-50 transition-colors"
                      >
                        <Mail className="h-5 w-5 text-primary-600" />
                        <div>
                          <p className="text-xs text-gray-500">E-Mail</p>
                          <p className="font-medium text-primary-600">{applicantDetails.applicant.email}</p>
                        </div>
                      </a>
                      <a 
                        href={`tel:${applicantDetails.applicant.phone}`}
                        className="flex items-center gap-3 p-3 bg-white rounded-lg hover:bg-primary-50 transition-colors"
                      >
                        <Phone className="h-5 w-5 text-primary-600" />
                        <div>
                          <p className="text-xs text-gray-500">Telefon</p>
                          <p className="font-medium text-primary-600">{applicantDetails.applicant.phone || '-'}</p>
                        </div>
                      </a>
                      <div className="flex items-center gap-3 p-3 bg-white rounded-lg">
                        <MapPin className="h-5 w-5 text-gray-500" />
                        <div>
                          <p className="text-xs text-gray-500">Adresse</p>
                          <p className="font-medium">
                            {applicantDetails.applicant.address.street} {applicantDetails.applicant.address.house_number}<br />
                            {applicantDetails.applicant.address.postal_code} {applicantDetails.applicant.address.city}<br />
                            {applicantDetails.applicant.address.country}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Persönliche Daten */}
                  <div className="bg-gray-50 rounded-xl p-5">
                    <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <GraduationCap className="h-5 w-5 text-primary-600" />
                      Profil
                    </h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between p-2 bg-white rounded">
                        <span className="text-gray-500">Geburtsdatum</span>
                        <span className="font-medium">{formatDate(applicantDetails.applicant.date_of_birth)}</span>
                      </div>
                      <div className="flex justify-between p-2 bg-white rounded">
                        <span className="text-gray-500">Nationalität</span>
                        <span className="font-medium">{applicantDetails.applicant.nationality || '-'}</span>
                      </div>
                      <div className="flex justify-between p-2 bg-white rounded">
                        <span className="text-gray-500">Stellenart</span>
                        <span className="font-medium">{positionTypeLabels[applicantDetails.applicant.position_type] || '-'}</span>
                      </div>
                      <div className="flex justify-between p-2 bg-white rounded">
                        <span className="text-gray-500">Deutsch</span>
                        <span className="font-medium">{applicantDetails.applicant.german_level || '-'}</span>
                      </div>
                      <div className="flex justify-between p-2 bg-white rounded">
                        <span className="text-gray-500">Englisch</span>
                        <span className="font-medium">{applicantDetails.applicant.english_level || '-'}</span>
                      </div>
                      <div className="flex justify-between p-2 bg-white rounded">
                        <span className="text-gray-500">Berufserfahrung</span>
                        <span className="font-medium">{applicantDetails.applicant.work_experience_years || 0} Jahre</span>
                      </div>
                      {applicantDetails.applicant.university_name && (
                        <div className="flex justify-between p-2 bg-white rounded">
                          <span className="text-gray-500">Universität</span>
                          <span className="font-medium">{applicantDetails.applicant.university_name}</span>
                        </div>
                      )}
                      {applicantDetails.applicant.field_of_study && (
                        <div className="flex justify-between p-2 bg-white rounded">
                          <span className="text-gray-500">Studiengang</span>
                          <span className="font-medium">{applicantDetails.applicant.field_of_study}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Dokumente */}
                  <div className="md:col-span-2 bg-gray-50 rounded-xl p-5">
                    <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <FileText className="h-5 w-5 text-primary-600" />
                      Dokumente ({applicantDetails.documents.length})
                    </h3>
                    {applicantDetails.documents.length === 0 ? (
                      <p className="text-gray-500">Keine Dokumente hochgeladen</p>
                    ) : (
                      <div className="grid md:grid-cols-2 gap-3">
                        {applicantDetails.documents.map((doc) => (
                          <a
                            key={doc.id}
                            href={`/uploads/${doc.file_path.split('/').pop()}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-between p-3 bg-white rounded-lg hover:bg-primary-50 transition-colors group"
                          >
                            <div className="flex items-center gap-3">
                              <FileText className="h-5 w-5 text-gray-400 group-hover:text-primary-600" />
                              <div>
                                <p className="font-medium text-gray-900 group-hover:text-primary-600">{doc.original_name}</p>
                                <p className="text-xs text-gray-500">{doc.document_type}</p>
                              </div>
                            </div>
                            <Download className="h-4 w-4 text-gray-400 group-hover:text-primary-600" />
                          </a>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Status ändern */}
                  <div className="md:col-span-2 bg-primary-50 rounded-xl p-5 border-2 border-primary-200">
                    <h3 className="font-bold text-gray-900 mb-4">Bewerbungsstatus ändern</h3>
                    <div className="flex flex-wrap gap-3">
                      {statusOptions.map((status) => (
                        <button
                          key={status.value}
                          onClick={() => updateStatus(selectedApp, status.value)}
                          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                            applicantDetails.application.status === status.value
                              ? 'ring-2 ring-primary-500 ' + status.color
                              : 'bg-white hover:bg-gray-50 text-gray-700'
                          }`}
                        >
                          {status.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}

export default CompanyApplications;
