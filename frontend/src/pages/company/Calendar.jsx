import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { interviewsAPI } from '../../lib/api';
import toast from 'react-hot-toast';
import {
  Calendar as CalendarIcon, Clock, MapPin, User, Briefcase, Download,
  Video, CheckCircle, AlertCircle, Loader2, ChevronLeft, ChevronRight,
  ExternalLink
} from 'lucide-react';

const STATUS_CONFIG = {
  proposed: { label: 'Vorgeschlagen', color: 'bg-yellow-100 text-yellow-700', icon: Clock },
  confirmed: { label: 'Bestätigt', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  completed: { label: 'Durchgeführt', color: 'bg-gray-100 text-gray-600', icon: CheckCircle },
  declined: { label: 'Abgelehnt', color: 'bg-red-100 text-red-700', icon: AlertCircle },
  cancelled: { label: 'Abgesagt', color: 'bg-red-100 text-red-700', icon: AlertCircle },
};

function CompanyCalendar() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [viewMode, setViewMode] = useState('list'); // 'list' oder 'calendar'

  useEffect(() => {
    loadCalendar();
  }, []);

  const loadCalendar = async () => {
    try {
      const response = await interviewsAPI.getCompanyCalendar();
      setEvents(response.data.events || []);
    } catch (error) {
      console.error('Fehler beim Laden des Kalenders:', error);
      toast.error('Kalender konnte nicht geladen werden');
    } finally {
      setLoading(false);
    }
  };

  const downloadICS = async (interviewId, applicantName) => {
    try {
      const response = await interviewsAPI.downloadICS(interviewId);
      const blob = new Blob([response.data], { type: 'text/calendar' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `interview_${applicantName.replace(/\s+/g, '_')}.ics`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Kalender-Datei heruntergeladen');
    } catch (error) {
      toast.error('Download fehlgeschlagen');
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('de-DE', {
      weekday: 'short',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleTimeString('de-DE', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return '-';
    return `${formatDate(dateStr)} um ${formatTime(dateStr)} Uhr`;
  };

  // Gruppiere Events nach Datum
  const groupedEvents = events.reduce((acc, event) => {
    const date = event.confirmed_date || event.proposed_date_1;
    if (!date) return acc;
    const dateKey = new Date(date).toDateString();
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(event);
    return acc;
  }, {});

  // Sortiere nach Datum
  const sortedDates = Object.keys(groupedEvents).sort((a, b) => new Date(a) - new Date(b));

  // Filtere nach aktuellem Monat für Kalenderansicht
  const getEventsForMonth = () => {
    const start = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const end = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
    
    return events.filter(event => {
      const date = new Date(event.confirmed_date || event.proposed_date_1);
      return date >= start && date <= end;
    });
  };

  // Statistiken
  const confirmedCount = events.filter(e => e.status === 'confirmed').length;
  const proposedCount = events.filter(e => e.status === 'proposed').length;
  const upcomingEvents = events.filter(e => {
    const date = new Date(e.confirmed_date || e.proposed_date_1);
    return date >= new Date() && e.status !== 'cancelled';
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-primary-100 rounded-xl">
            <CalendarIcon className="h-8 w-8 text-primary-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Interview-Kalender</h1>
            <p className="text-gray-600">Alle geplanten Interviews im Überblick</p>
          </div>
        </div>
        <Link to="/company/applications" className="btn-secondary flex items-center gap-2">
          <Briefcase className="h-5 w-5" />
          Zu den Bewerbungen
        </Link>
      </div>

      {/* Statistiken */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-200 rounded-lg">
              <CheckCircle className="h-6 w-6 text-green-700" />
            </div>
            <div>
              <p className="text-2xl font-bold text-green-800">{confirmedCount}</p>
              <p className="text-green-700 text-sm">Bestätigte Termine</p>
            </div>
          </div>
        </div>
        <div className="card bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-200 rounded-lg">
              <Clock className="h-6 w-6 text-yellow-700" />
            </div>
            <div>
              <p className="text-2xl font-bold text-yellow-800">{proposedCount}</p>
              <p className="text-yellow-700 text-sm">Warten auf Bestätigung</p>
            </div>
          </div>
        </div>
        <div className="card bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-200 rounded-lg">
              <CalendarIcon className="h-6 w-6 text-blue-700" />
            </div>
            <div>
              <p className="text-2xl font-bold text-blue-800">{upcomingEvents.length}</p>
              <p className="text-blue-700 text-sm">Anstehende Interviews</p>
            </div>
          </div>
        </div>
      </div>

      {/* Event-Liste */}
      {events.length === 0 ? (
        <div className="card text-center py-12">
          <CalendarIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Keine Interviews geplant</h2>
          <p className="text-gray-600 mb-4">
            Sobald Sie Interview-Termine mit Bewerbern vereinbaren, erscheinen diese hier.
          </p>
          <Link to="/company/applications" className="btn-primary inline-flex items-center gap-2">
            <Briefcase className="h-5 w-5" />
            Bewerbungen ansehen
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Alle Termine</h2>
          
          {sortedDates.map(dateKey => (
            <div key={dateKey} className="space-y-2">
              <h3 className="text-sm font-medium text-gray-500 sticky top-0 bg-gray-50 py-2 px-1">
                {new Date(dateKey).toLocaleDateString('de-DE', {
                  weekday: 'long',
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric'
                })}
              </h3>
              
              {groupedEvents[dateKey].map(event => {
                const StatusIcon = STATUS_CONFIG[event.status]?.icon || Clock;
                const statusConfig = STATUS_CONFIG[event.status] || STATUS_CONFIG.proposed;
                const isConfirmed = event.status === 'confirmed';
                const eventDate = event.confirmed_date || event.proposed_date_1;
                
                return (
                  <div key={event.id} className="card hover:shadow-lg transition-shadow">
                    <div className="flex flex-col md:flex-row md:items-center gap-4">
                      {/* Zeit */}
                      <div className="flex items-center gap-3 md:w-32">
                        <Clock className="h-5 w-5 text-gray-400" />
                        <span className="text-lg font-semibold text-gray-900">
                          {formatTime(eventDate)}
                        </span>
                      </div>
                      
                      {/* Details */}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <User className="h-4 w-4 text-gray-400" />
                          <span className="font-medium text-gray-900">{event.applicant_name}</span>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusConfig.color}`}>
                            {statusConfig.label}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                          <span className="flex items-center gap-1">
                            <Briefcase className="h-4 w-4" />
                            {event.job_title}
                          </span>
                          {event.location && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-4 w-4" />
                              {event.location}
                            </span>
                          )}
                          {event.meeting_link && (
                            <a 
                              href={event.meeting_link} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-primary-600 hover:text-primary-700"
                            >
                              <Video className="h-4 w-4" />
                              Meeting-Link
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                        </div>
                        {event.status === 'proposed' && event.proposed_date_2 && (
                          <p className="text-xs text-yellow-600 mt-1">
                            Alternative: {formatDateTime(event.proposed_date_2)}
                          </p>
                        )}
                      </div>
                      
                      {/* Aktionen */}
                      <div className="flex items-center gap-2">
                        {isConfirmed && (
                          <button
                            onClick={() => downloadICS(event.id, event.applicant_name)}
                            className="btn-secondary text-sm flex items-center gap-1"
                            title="Zum Kalender hinzufügen"
                          >
                            <Download className="h-4 w-4" />
                            <span className="hidden sm:inline">Kalender</span>
                          </button>
                        )}
                        <Link
                          to={`/company/applications?highlight=${event.application_id}`}
                          className="btn-primary text-sm flex items-center gap-1"
                        >
                          Details
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default CompanyCalendar;
