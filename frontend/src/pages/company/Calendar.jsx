import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { interviewsAPI, applicationsAPI, documentsAPI, downloadBlob } from '../../lib/api';
import { getNationalityLabel } from '../../data/nationalities';
import toast from 'react-hot-toast';
import {
  Calendar as CalendarIcon, Clock, MapPin, User, Briefcase, Download,
  Video, CheckCircle, AlertCircle, Loader2, ChevronLeft, ChevronRight,
  ExternalLink, List, LayoutGrid, History, X, Mail, Phone, FileText,
  GraduationCap, Globe, Building2
} from 'lucide-react';

const STATUS_CONFIG = {
  proposed: { label: 'Wartet auf Antwort', color: 'bg-yellow-100 text-yellow-700', dotColor: 'bg-yellow-500', icon: Clock },
  confirmed: { label: 'Vom Bewerber bestätigt', color: 'bg-green-100 text-green-700', dotColor: 'bg-green-500', icon: CheckCircle },
  completed: { label: 'Durchgeführt', color: 'bg-gray-100 text-gray-600', dotColor: 'bg-gray-400', icon: CheckCircle },
  declined: { label: 'Vom Bewerber abgelehnt', color: 'bg-red-100 text-red-700', dotColor: 'bg-red-500', icon: AlertCircle },
  cancelled: { label: 'Abgesagt', color: 'bg-red-100 text-red-700', dotColor: 'bg-red-500', icon: AlertCircle },
  needs_new_dates: { label: 'Neue Termine nötig', color: 'bg-orange-100 text-orange-700', dotColor: 'bg-orange-500', icon: AlertCircle },
};

const WEEKDAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
const MONTHS = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];

function CompanyCalendar() {
  const { i18n } = useTranslation();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [viewMode, setViewMode] = useState('list'); // 'list' oder 'calendar'
  const [filterTab, setFilterTab] = useState('upcoming'); // 'upcoming', 'past', 'all'
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedApplicant, setSelectedApplicant] = useState(null);
  const [applicantLoading, setApplicantLoading] = useState(false);

  useEffect(() => {
    loadCalendar();
  }, []);

  const loadApplicantDetails = async (applicationId, event) => {
    setApplicantLoading(true);
    try {
      const response = await applicationsAPI.getApplicantDetails(applicationId);
      // API gibt { applicant, application, job, documents } zurück
      const data = response.data;
      setSelectedApplicant({
        ...data.applicant,
        application: data.application,
        job: data.job,
        documents: data.documents,
        event
      });
    } catch (error) {
      console.error('Fehler beim Laden der Bewerber-Details:', error);
      toast.error('Bewerber-Details konnten nicht geladen werden');
    } finally {
      setApplicantLoading(false);
    }
  };

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

  // Dokument herunterladen (mit Auth-Token)
  const handleDocumentDownload = async (doc) => {
    try {
      const response = await documentsAPI.download(doc.id);
      downloadBlob(response.data, doc.original_name || `${doc.document_type}.pdf`);
    } catch (error) {
      console.error('Download-Fehler:', error);
      toast.error('Dokument konnte nicht heruntergeladen werden');
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

  // Filtere Events nach Tab
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  
  // Status die als "abgeschlossen/vergangen" gelten
  const pastStatuses = ['completed', 'declined', 'cancelled'];
  
  const getFilteredEvents = () => {
    return events.filter(event => {
      const eventDate = new Date(event.confirmed_date || event.proposed_date_1);
      eventDate.setHours(0, 0, 0, 0);
      
      if (filterTab === 'upcoming') {
        // Bevorstehend: Datum in Zukunft UND nicht abgesagt/abgelehnt
        return eventDate >= now && !pastStatuses.includes(event.status);
      } else if (filterTab === 'past') {
        // Vergangen: Datum in Vergangenheit ODER abgeschlossen/abgelehnt/abgesagt
        return eventDate < now || pastStatuses.includes(event.status);
      }
      return true; // 'all'
    });
  };

  const filteredEvents = getFilteredEvents();

  // Gruppiere Events nach Datum
  const groupedEvents = filteredEvents.reduce((acc, event) => {
    const date = event.confirmed_date || event.proposed_date_1;
    if (!date) return acc;
    const dateKey = new Date(date).toDateString();
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(event);
    return acc;
  }, {});

  // Sortiere nach Datum (aufsteigend für bevorstehend, absteigend für vergangen)
  const sortedDates = Object.keys(groupedEvents).sort((a, b) => {
    if (filterTab === 'past') {
      return new Date(b) - new Date(a); // Neueste zuerst
    }
    return new Date(a) - new Date(b); // Älteste zuerst
  });

  // Kalender-Hilfsfunktionen
  const getDaysInMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date) => {
    const day = new Date(date.getFullYear(), date.getMonth(), 1).getDay();
    return day === 0 ? 6 : day - 1; // Montag = 0
  };

  const getEventsForDate = (day) => {
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    return events.filter(event => {
      const eventDate = new Date(event.confirmed_date || event.proposed_date_1);
      return eventDate.toDateString() === date.toDateString();
    });
  };

  const isToday = (day) => {
    const today = new Date();
    return (
      day === today.getDate() &&
      currentMonth.getMonth() === today.getMonth() &&
      currentMonth.getFullYear() === today.getFullYear()
    );
  };

  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const goToToday = () => {
    setCurrentMonth(new Date());
  };

  // Statistiken
  const confirmedCount = events.filter(e => e.status === 'confirmed').length;
  const proposedCount = events.filter(e => e.status === 'proposed').length;
  const upcomingCount = events.filter(e => {
    const date = new Date(e.confirmed_date || e.proposed_date_1);
    return date >= now && !pastStatuses.includes(e.status);
  }).length;
  const pastCount = events.filter(e => {
    const date = new Date(e.confirmed_date || e.proposed_date_1);
    return date < now || pastStatuses.includes(e.status);
  }).length;

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
        <div className="flex gap-2">
          {/* Ansicht umschalten */}
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded ${viewMode === 'list' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'}`}
              title="Listenansicht"
            >
              <List className="h-5 w-5" />
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={`p-2 rounded ${viewMode === 'calendar' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'}`}
              title="Kalenderansicht"
            >
              <LayoutGrid className="h-5 w-5" />
            </button>
          </div>
          <Link to="/company/applications" className="btn-secondary flex items-center gap-2">
            <Briefcase className="h-5 w-5" />
            <span className="hidden sm:inline">Bewerbungen</span>
          </Link>
        </div>
      </div>

      {/* Statistiken */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card bg-gradient-to-br from-green-50 to-green-100 border-green-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-200 rounded-lg">
              <CheckCircle className="h-5 w-5 text-green-700" />
            </div>
            <div>
              <p className="text-xl font-bold text-green-800">{confirmedCount}</p>
              <p className="text-green-700 text-xs">Bestätigt</p>
            </div>
          </div>
        </div>
        <div className="card bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-200 rounded-lg">
              <Clock className="h-5 w-5 text-yellow-700" />
            </div>
            <div>
              <p className="text-xl font-bold text-yellow-800">{proposedCount}</p>
              <p className="text-yellow-700 text-xs">Wartend</p>
            </div>
          </div>
        </div>
        <div className="card bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-200 rounded-lg">
              <CalendarIcon className="h-5 w-5 text-blue-700" />
            </div>
            <div>
              <p className="text-xl font-bold text-blue-800">{upcomingCount}</p>
              <p className="text-blue-700 text-xs">Bevorstehend</p>
            </div>
          </div>
        </div>
        <div className="card bg-gradient-to-br from-gray-50 to-gray-100 border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gray-200 rounded-lg">
              <History className="h-5 w-5 text-gray-600" />
            </div>
            <div>
              <p className="text-xl font-bold text-gray-700">{pastCount}</p>
              <p className="text-gray-600 text-xs">Vergangen</p>
            </div>
          </div>
        </div>
      </div>

      {/* Kalenderansicht */}
      {viewMode === 'calendar' && (
        <div className="card">
          {/* Monat-Navigation */}
          <div className="flex items-center justify-between mb-4">
            <button onClick={prevMonth} className="p-2 hover:bg-gray-100 rounded-lg">
              <ChevronLeft className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-semibold">
                {MONTHS[currentMonth.getMonth()]} {currentMonth.getFullYear()}
              </h2>
              <button onClick={goToToday} className="text-sm text-primary-600 hover:text-primary-700">
                Heute
              </button>
            </div>
            <button onClick={nextMonth} className="p-2 hover:bg-gray-100 rounded-lg">
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>

          {/* Wochentage */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {WEEKDAYS.map(day => (
              <div key={day} className="text-center text-sm font-medium text-gray-500 py-2">
                {day}
              </div>
            ))}
          </div>

          {/* Kalender-Grid */}
          <div className="grid grid-cols-7 gap-1">
            {/* Leere Zellen vor dem ersten Tag */}
            {Array.from({ length: getFirstDayOfMonth(currentMonth) }).map((_, i) => (
              <div key={`empty-${i}`} className="h-24 bg-gray-50 rounded-lg" />
            ))}
            
            {/* Tage des Monats */}
            {Array.from({ length: getDaysInMonth(currentMonth) }).map((_, i) => {
              const day = i + 1;
              const dayEvents = getEventsForDate(day);
              const hasEvents = dayEvents.length > 0;
              
              return (
                <div
                  key={day}
                  onClick={() => hasEvents && setSelectedDate(selectedDate === day ? null : day)}
                  className={`h-24 p-1 rounded-lg border transition-colors cursor-pointer ${
                    isToday(day) 
                      ? 'bg-primary-50 border-primary-300' 
                      : hasEvents 
                        ? 'bg-white border-gray-200 hover:border-primary-300' 
                        : 'bg-gray-50 border-transparent'
                  } ${selectedDate === day ? 'ring-2 ring-primary-500' : ''}`}
                >
                  <div className={`text-sm font-medium mb-1 ${isToday(day) ? 'text-primary-600' : 'text-gray-700'}`}>
                    {day}
                  </div>
                  {hasEvents && (
                    <div className="space-y-0.5">
                      {dayEvents.slice(0, 2).map(event => (
                        <div
                          key={event.id}
                          className={`text-xs px-1 py-0.5 rounded truncate ${STATUS_CONFIG[event.status]?.color || 'bg-gray-100'}`}
                          title={`${formatTime(event.confirmed_date || event.proposed_date_1)} - ${event.applicant_name}`}
                        >
                          {formatTime(event.confirmed_date || event.proposed_date_1)} {event.applicant_name.split(' ')[0]}
                        </div>
                      ))}
                      {dayEvents.length > 2 && (
                        <div className="text-xs text-gray-500 px-1">
                          +{dayEvents.length - 2} weitere
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Ausgewählter Tag - Details */}
          {selectedDate && getEventsForDate(selectedDate).length > 0 && (
            <div className="mt-4 pt-4 border-t">
              <h3 className="font-medium text-gray-900 mb-3">
                {selectedDate}. {MONTHS[currentMonth.getMonth()]} {currentMonth.getFullYear()}
              </h3>
              <div className="space-y-2">
                {getEventsForDate(selectedDate).map(event => {
                  const statusConfig = STATUS_CONFIG[event.status] || STATUS_CONFIG.proposed;
                  return (
                    <div key={event.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <span className="font-medium">{formatTime(event.confirmed_date || event.proposed_date_1)}</span>
                        <span>{event.applicant_name}</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs ${statusConfig.color}`}>
                          {statusConfig.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {event.status === 'confirmed' && (
                          <button
                            onClick={() => downloadICS(event.id, event.applicant_name)}
                            className="p-1.5 hover:bg-gray-200 rounded"
                            title="Kalender-Datei"
                          >
                            <Download className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          onClick={() => loadApplicantDetails(event.application_id, event)}
                          className="text-primary-600 hover:text-primary-700 text-sm"
                        >
                          Details →
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Listenansicht */}
      {viewMode === 'list' && (
        <>
          {/* Filter-Tabs */}
          <div className="flex gap-1 border-b">
            <button
              onClick={() => setFilterTab('upcoming')}
              className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
                filterTab === 'upcoming'
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <span className="flex items-center gap-2">
                <CalendarIcon className="h-4 w-4" />
                Bevorstehend ({upcomingCount})
              </span>
            </button>
            <button
              onClick={() => setFilterTab('past')}
              className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
                filterTab === 'past'
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <span className="flex items-center gap-2">
                <History className="h-4 w-4" />
                Vergangen ({pastCount})
              </span>
            </button>
            <button
              onClick={() => setFilterTab('all')}
              className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
                filterTab === 'all'
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <span className="flex items-center gap-2">
                Alle ({events.length})
              </span>
            </button>
          </div>

          {/* Event-Liste */}
          {filteredEvents.length === 0 ? (
            <div className="card text-center py-12">
              <CalendarIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                {filterTab === 'past' ? 'Keine vergangenen Interviews' : 'Keine bevorstehenden Interviews'}
              </h2>
              <p className="text-gray-600 mb-4">
                {filterTab === 'past' 
                  ? 'Es wurden noch keine Interviews durchgeführt.'
                  : 'Sobald Sie Interview-Termine mit Bewerbern vereinbaren, erscheinen diese hier.'}
              </p>
              <Link to="/company/applications" className="btn-primary inline-flex items-center gap-2">
                <Briefcase className="h-5 w-5" />
                Bewerbungen ansehen
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
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
                    const statusConfig = STATUS_CONFIG[event.status] || STATUS_CONFIG.proposed;
                    const isConfirmed = event.status === 'confirmed';
                    const eventDate = event.confirmed_date || event.proposed_date_1;
                    
                    return (
                      <div key={event.id} className="card hover:shadow-lg transition-shadow">
                        <div className="flex flex-col md:flex-row md:items-center gap-4">
                          <div className="flex items-center gap-3 md:w-32">
                            <Clock className="h-5 w-5 text-gray-400" />
                            <span className="text-lg font-semibold text-gray-900">
                              {formatTime(eventDate)}
                            </span>
                          </div>
                          
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
                            <button
                              onClick={() => loadApplicantDetails(event.application_id, event)}
                              className="btn-primary text-sm flex items-center gap-1"
                            >
                              Details
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Bewerber-Detail-Modal */}
      {(selectedApplicant || applicantLoading) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {applicantLoading ? (
              <div className="p-12 text-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary-600 mx-auto mb-4" />
                <p className="text-gray-600">Lade Bewerber-Details...</p>
              </div>
            ) : selectedApplicant && (
              <>
                {/* Header */}
                <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">
                      {selectedApplicant.first_name} {selectedApplicant.last_name}
                    </h2>
                    <p className="text-sm text-gray-500">
                      Interview: {selectedApplicant.event?.job_title}
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedApplicant(null)}
                    className="p-2 hover:bg-gray-100 rounded-lg"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                  {/* Interview-Info */}
                  {selectedApplicant.event && (
                    <div className="bg-primary-50 rounded-xl p-4">
                      <h3 className="font-medium text-primary-900 mb-2 flex items-center gap-2">
                        <CalendarIcon className="h-5 w-5" />
                        Interview-Termin
                      </h3>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">Datum:</span>
                          <p className="font-medium">
                            {formatDateTime(selectedApplicant.event.confirmed_date || selectedApplicant.event.proposed_date_1)}
                          </p>
                        </div>
                        <div>
                          <span className="text-gray-500">Status:</span>
                          <p className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_CONFIG[selectedApplicant.event.status]?.color}`}>
                            {STATUS_CONFIG[selectedApplicant.event.status]?.label}
                          </p>
                        </div>
                        {selectedApplicant.event.location && (
                          <div>
                            <span className="text-gray-500">Ort:</span>
                            <p className="font-medium">{selectedApplicant.event.location}</p>
                          </div>
                        )}
                        {selectedApplicant.event.meeting_link && (
                          <div>
                            <span className="text-gray-500">Meeting:</span>
                            <a 
                              href={selectedApplicant.event.meeting_link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary-600 hover:text-primary-700 flex items-center gap-1"
                            >
                              <Video className="h-4 w-4" />
                              Link öffnen
                            </a>
                          </div>
                        )}
                      </div>
                      {selectedApplicant.event.status === 'confirmed' && (
                        <button
                          onClick={() => downloadICS(selectedApplicant.event.id, selectedApplicant.event.applicant_name)}
                          className="mt-3 btn-secondary text-sm flex items-center gap-2"
                        >
                          <Download className="h-4 w-4" />
                          Zum Kalender hinzufügen
                        </button>
                      )}
                    </div>
                  )}

                  {/* Kontaktdaten */}
                  <div>
                    <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                      <User className="h-5 w-5 text-gray-400" />
                      Kontaktdaten
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {selectedApplicant.email && (
                        <a 
                          href={`mailto:${selectedApplicant.email}`}
                          className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100"
                        >
                          <Mail className="h-5 w-5 text-gray-400" />
                          <span className="text-sm">{selectedApplicant.email}</span>
                        </a>
                      )}
                      {selectedApplicant.phone && (
                        <a 
                          href={`tel:${selectedApplicant.phone}`}
                          className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100"
                        >
                          <Phone className="h-5 w-5 text-gray-400" />
                          <span className="text-sm">{selectedApplicant.phone}</span>
                        </a>
                      )}
                      {selectedApplicant.address && (selectedApplicant.address.street || selectedApplicant.address.city) && (
                        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                          <MapPin className="h-5 w-5 text-gray-400" />
                          <span className="text-sm">
                            {selectedApplicant.address.street} {selectedApplicant.address.house_number}, {selectedApplicant.address.postal_code} {selectedApplicant.address.city}
                          </span>
                        </div>
                      )}
                      {selectedApplicant.nationality && (
                        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                          <Globe className="h-5 w-5 text-gray-400" />
                          <span className="text-sm">{getNationalityLabel(selectedApplicant.nationality, i18n.language) || selectedApplicant.nationality}</span>
                        </div>
                      )}
                      {selectedApplicant.date_of_birth && (
                        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                          <CalendarIcon className="h-5 w-5 text-gray-400" />
                          <span className="text-sm">
                            Geb.: {new Date(selectedApplicant.date_of_birth).toLocaleDateString('de-DE')}
                            {selectedApplicant.place_of_birth && ` in ${selectedApplicant.place_of_birth}`}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Qualifikationen */}
                  {(selectedApplicant.profession || selectedApplicant.field_of_study || selectedApplicant.work_experience) && (
                    <div>
                      <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                        <GraduationCap className="h-5 w-5 text-gray-400" />
                        Qualifikationen
                      </h3>
                      <div className="space-y-3">
                        {selectedApplicant.profession && (
                          <div className="p-3 bg-gray-50 rounded-lg">
                            <p className="text-xs text-gray-500 mb-1">Beruf</p>
                            <p className="text-sm font-medium">{selectedApplicant.profession}</p>
                          </div>
                        )}
                        {selectedApplicant.field_of_study && (
                          <div className="p-3 bg-gray-50 rounded-lg">
                            <p className="text-xs text-gray-500 mb-1">Studiengang</p>
                            <p className="text-sm font-medium">
                              {selectedApplicant.field_of_study}
                              {selectedApplicant.university_name && ` an ${selectedApplicant.university_name}`}
                              {selectedApplicant.current_semester && ` (${selectedApplicant.current_semester}. Semester)`}
                            </p>
                          </div>
                        )}
                        {selectedApplicant.work_experience && (
                          <div className="p-3 bg-gray-50 rounded-lg">
                            <p className="text-xs text-gray-500 mb-1">Berufserfahrung</p>
                            <p className="text-sm">{selectedApplicant.work_experience}</p>
                            {selectedApplicant.work_experience_years && (
                              <p className="text-xs text-gray-500 mt-1">{selectedApplicant.work_experience_years} Jahre</p>
                            )}
                          </div>
                        )}
                        {selectedApplicant.degree && (
                          <div className="p-3 bg-gray-50 rounded-lg">
                            <p className="text-xs text-gray-500 mb-1">Abschluss</p>
                            <p className="text-sm font-medium">{selectedApplicant.degree}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Sprachkenntnisse */}
                  {(selectedApplicant.german_level || selectedApplicant.english_level || selectedApplicant.other_languages) && (
                    <div>
                      <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                        <Globe className="h-5 w-5 text-gray-400" />
                        Sprachen
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {selectedApplicant.german_level && (
                          <span className="px-3 py-1 bg-gray-100 rounded-full text-sm">
                            Deutsch: {selectedApplicant.german_level}
                          </span>
                        )}
                        {selectedApplicant.english_level && (
                          <span className="px-3 py-1 bg-gray-100 rounded-full text-sm">
                            Englisch: {selectedApplicant.english_level}
                          </span>
                        )}
                        {selectedApplicant.other_languages && selectedApplicant.other_languages.map((lang, i) => (
                          <span key={i} className="px-3 py-1 bg-gray-100 rounded-full text-sm">
                            {typeof lang === 'string' ? lang : `${lang.language}: ${lang.level}`}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Verfügbarkeit */}
                  {(selectedApplicant.available_from || selectedApplicant.available_until) && (
                    <div>
                      <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                        <Clock className="h-5 w-5 text-gray-400" />
                        Verfügbarkeit
                      </h3>
                      <div className="p-3 bg-gray-50 rounded-lg text-sm">
                        {selectedApplicant.available_from && (
                          <span>Ab {new Date(selectedApplicant.available_from).toLocaleDateString('de-DE')}</span>
                        )}
                        {selectedApplicant.available_from && selectedApplicant.available_until && ' - '}
                        {selectedApplicant.available_until && (
                          <span>Bis {new Date(selectedApplicant.available_until).toLocaleDateString('de-DE')}</span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Dokumente */}
                  {selectedApplicant.documents && selectedApplicant.documents.length > 0 && (
                    <div>
                      <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                        <FileText className="h-5 w-5 text-gray-400" />
                        Dokumente ({selectedApplicant.documents.length})
                      </h3>
                      <div className="space-y-2">
                        {selectedApplicant.documents.map((doc, i) => (
                          <button
                            key={i}
                            onClick={() => handleDocumentDownload(doc)}
                            className="w-full flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 text-left"
                          >
                            <FileText className="h-5 w-5 text-primary-600" />
                            <div className="flex-1">
                              <p className="text-sm font-medium">{doc.original_name || doc.document_type}</p>
                              <p className="text-xs text-gray-500">{doc.document_type}</p>
                            </div>
                            <Download className="h-4 w-4 text-gray-400" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="sticky bottom-0 bg-gray-50 border-t px-6 py-4 flex justify-between">
                  <Link
                    to={`/company/applications?highlight=${selectedApplicant.event?.application_id}`}
                    className="btn-secondary flex items-center gap-2"
                  >
                    <Briefcase className="h-4 w-4" />
                    Zur Bewerbung
                  </Link>
                  <button
                    onClick={() => setSelectedApplicant(null)}
                    className="btn-primary"
                  >
                    Schließen
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default CompanyCalendar;
