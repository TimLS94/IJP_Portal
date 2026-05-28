"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { 
  Calendar as CalendarIcon, ChevronLeft, ChevronRight, Clock, CheckCircle, 
  AlertCircle, Video, MapPin, User, Briefcase, List, LayoutGrid, Loader2,
  Download, History, X, Mail, Phone, FileText
} from "lucide-react";
import { interviewsAPI, applicationsAPI } from "@/lib/api";
import toast from "react-hot-toast";

interface CalendarEvent {
  id: number;
  application_id: number;
  applicant_name: string;
  job_title: string;
  status: string;
  proposed_date_1: string;
  proposed_date_2?: string;
  confirmed_date?: string;
  location?: string;
  meeting_link?: string;
}

interface ApplicantDetails {
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  city?: string;
  country?: string;
  nationality?: string;
  date_of_birth?: string;
  german_level?: string;
  english_level?: string;
  documents?: { id: number; original_name: string; document_type: string }[];
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  proposed: { label: "Wartet auf Antwort", color: "bg-yellow-100 text-yellow-700", icon: Clock },
  confirmed: { label: "Bestätigt", color: "bg-green-100 text-green-700", icon: CheckCircle },
  completed: { label: "Durchgeführt", color: "bg-gray-100 text-gray-600", icon: CheckCircle },
  declined: { label: "Abgelehnt", color: "bg-red-100 text-red-700", icon: AlertCircle },
  cancelled: { label: "Abgesagt", color: "bg-red-100 text-red-700", icon: AlertCircle },
  needs_new_dates: { label: "Neue Termine nötig", color: "bg-orange-100 text-orange-700", icon: AlertCircle },
};

const MONTHS = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];
const WEEKDAYS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

export default function CompanyCalendarPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");
  const [filterTab, setFilterTab] = useState<"upcoming" | "past" | "all">("upcoming");
  const [selectedDate, setSelectedDate] = useState<number | null>(null);
  
  // Detail Modal
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [applicantDetails, setApplicantDetails] = useState<ApplicantDetails | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  useEffect(() => {
    loadCalendar();
  }, []);

  const loadCalendar = async () => {
    try {
      const response = await interviewsAPI.getCompanyCalendar();
      setEvents(response.data?.events || []);
    } catch {
      toast.error("Kalender konnte nicht geladen werden");
    } finally {
      setLoading(false);
    }
  };

  const downloadICS = async (interviewId: number, applicantName: string) => {
    try {
      const response = await interviewsAPI.downloadICS(interviewId);
      const blob = new Blob([response.data], { type: "text/calendar" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `interview_${applicantName.replace(/\s+/g, "_")}.ics`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success("Kalender-Datei heruntergeladen");
    } catch {
      toast.error("Download fehlgeschlagen");
    }
  };

  const openDetails = async (event: CalendarEvent) => {
    setSelectedEvent(event);
    setApplicantDetails(null);
    setDetailsLoading(true);
    try {
      const response = await applicationsAPI.getApplicantDetails(event.application_id);
      setApplicantDetails(response.data);
    } catch {
      toast.error("Fehler beim Laden der Details");
    } finally {
      setDetailsLoading(false);
    }
  };

  const closeDetails = () => {
    setSelectedEvent(null);
    setApplicantDetails(null);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("de-DE", { weekday: "short", day: "2-digit", month: "2-digit", year: "numeric" });
  };

  const formatTime = (dateStr: string) => {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
  };

  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const pastStatuses = ["completed", "declined", "cancelled"];

  // Statistiken
  const confirmedCount = events.filter(e => e.status === "confirmed").length;
  const proposedCount = events.filter(e => e.status === "proposed").length;
  const upcomingCount = events.filter(e => {
    const date = new Date(e.confirmed_date || e.proposed_date_1);
    return date >= now && !pastStatuses.includes(e.status);
  }).length;
  const pastCount = events.filter(e => {
    const date = new Date(e.confirmed_date || e.proposed_date_1);
    return date < now || pastStatuses.includes(e.status);
  }).length;

  const filteredEvents = events.filter((event) => {
    const eventDate = new Date(event.confirmed_date || event.proposed_date_1);
    eventDate.setHours(0, 0, 0, 0);
    if (filterTab === "upcoming") return eventDate >= now && !pastStatuses.includes(event.status);
    if (filterTab === "past") return eventDate < now || pastStatuses.includes(event.status);
    return true;
  });

  const sortedEvents = [...filteredEvents].sort((a, b) => {
    const dateA = new Date(a.confirmed_date || a.proposed_date_1).getTime();
    const dateB = new Date(b.confirmed_date || b.proposed_date_1).getTime();
    return filterTab === "past" ? dateB - dateA : dateA - dateB;
  });

  const getDaysInMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const getFirstDayOfMonth = (date: Date) => {
    const day = new Date(date.getFullYear(), date.getMonth(), 1).getDay();
    return day === 0 ? 6 : day - 1;
  };

  const getEventsForDate = (day: number) => {
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    return events.filter((event) => {
      const eventDate = new Date(event.confirmed_date || event.proposed_date_1);
      return eventDate.toDateString() === date.toDateString();
    });
  };

  const isToday = (day: number) => {
    const today = new Date();
    return day === today.getDate() && currentMonth.getMonth() === today.getMonth() && currentMonth.getFullYear() === today.getFullYear();
  };

  const goToToday = () => {
    setCurrentMonth(new Date());
    setSelectedDate(new Date().getDate());
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-12 w-12 text-primary-600 animate-spin" />
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
              onClick={() => setViewMode("list")}
              className={`p-2 rounded ${viewMode === "list" ? "bg-white shadow-sm" : "hover:bg-gray-200"}`}
              title="Listenansicht"
            >
              <List className="h-5 w-5" />
            </button>
            <button
              onClick={() => setViewMode("calendar")}
              className={`p-2 rounded ${viewMode === "calendar" ? "bg-white shadow-sm" : "hover:bg-gray-200"}`}
              title="Kalenderansicht"
            >
              <LayoutGrid className="h-5 w-5" />
            </button>
          </div>
          <Link href="/company/applications" className="btn-secondary flex items-center gap-2">
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
      {viewMode === "calendar" && (
        <div className="card">
          {/* Monat-Navigation */}
          <div className="flex items-center justify-between mb-4">
            <button 
              onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))} 
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
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
            <button 
              onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))} 
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
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
                  className={`h-24 p-1 rounded-lg border transition-colors ${hasEvents ? "cursor-pointer" : ""} ${
                    isToday(day) 
                      ? "bg-primary-50 border-primary-300" 
                      : hasEvents 
                        ? "bg-white border-gray-200 hover:border-primary-300" 
                        : "bg-gray-50 border-transparent"
                  } ${selectedDate === day ? "ring-2 ring-primary-500" : ""}`}
                >
                  <div className={`text-sm font-medium mb-1 ${isToday(day) ? "text-primary-600" : "text-gray-700"}`}>
                    {day}
                  </div>
                  {hasEvents && (
                    <div className="space-y-0.5">
                      {dayEvents.slice(0, 2).map(event => (
                        <div
                          key={event.id}
                          className={`text-xs px-1 py-0.5 rounded truncate ${STATUS_CONFIG[event.status]?.color || "bg-gray-100"}`}
                          title={`${formatTime(event.confirmed_date || event.proposed_date_1)} - ${event.applicant_name}`}
                        >
                          {formatTime(event.confirmed_date || event.proposed_date_1)} {event.applicant_name.split(" ")[0]}
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
                        {event.status === "confirmed" && (
                          <button
                            onClick={() => downloadICS(event.id, event.applicant_name)}
                            className="p-1.5 hover:bg-gray-200 rounded"
                            title="Kalender-Datei herunterladen"
                          >
                            <Download className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          onClick={() => openDetails(event)}
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
      {viewMode === "list" && (
        <>
          {/* Filter-Tabs */}
          <div className="flex gap-1 border-b">
            <button
              onClick={() => setFilterTab("upcoming")}
              className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
                filterTab === "upcoming"
                  ? "border-primary-600 text-primary-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              <span className="flex items-center gap-2">
                <CalendarIcon className="h-4 w-4" />
                Bevorstehend ({upcomingCount})
              </span>
            </button>
            <button
              onClick={() => setFilterTab("past")}
              className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
                filterTab === "past"
                  ? "border-primary-600 text-primary-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              <span className="flex items-center gap-2">
                <History className="h-4 w-4" />
                Vergangen ({pastCount})
              </span>
            </button>
            <button
              onClick={() => setFilterTab("all")}
              className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
                filterTab === "all"
                  ? "border-primary-600 text-primary-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              <span className="flex items-center gap-2">
                Alle ({events.length})
              </span>
            </button>
          </div>

          {/* Event-Liste */}
          {sortedEvents.length === 0 ? (
            <div className="card text-center py-12">
              <CalendarIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                {filterTab === "past" ? "Keine vergangenen Interviews" : "Keine bevorstehenden Interviews"}
              </h2>
              <p className="text-gray-600 mb-4">
                {filterTab === "past" 
                  ? "Es wurden noch keine Interviews durchgeführt."
                  : "Sobald Sie Interview-Termine mit Bewerbern vereinbaren, erscheinen diese hier."}
              </p>
              <Link href="/company/applications" className="btn-primary inline-flex items-center gap-2">
                <Briefcase className="h-5 w-5" />
                Bewerbungen ansehen
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {sortedEvents.map((event) => {
                const statusConfig = STATUS_CONFIG[event.status] || STATUS_CONFIG.proposed;
                const StatusIcon = statusConfig.icon;
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
                          <span className="flex items-center gap-1">
                            <CalendarIcon className="h-4 w-4" />
                            {formatDate(eventDate)}
                          </span>
                          {event.location && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-4 w-4" />
                              {event.location}
                            </span>
                          )}
                          {event.meeting_link && (
                            <a href={event.meeting_link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-primary-600 hover:underline">
                              <Video className="h-4 w-4" />
                              Video-Link
                            </a>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {event.status === "confirmed" && (
                          <button
                            onClick={() => downloadICS(event.id, event.applicant_name)}
                            className="p-2 hover:bg-gray-100 rounded-lg"
                            title="In Kalender eintragen"
                          >
                            <Download className="h-5 w-5 text-gray-600" />
                          </button>
                        )}
                        <button
                          onClick={() => openDetails(event)}
                          className="btn-secondary text-sm"
                        >
                          Details
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Detail Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl my-8 relative">
            <button 
              onClick={closeDetails}
              className="absolute top-4 right-4 p-2 hover:bg-gray-200 rounded-lg z-10 bg-gray-100 shadow-sm"
            >
              <X className="h-6 w-6 text-gray-700" />
            </button>
            
            {detailsLoading ? (
              <div className="p-12 flex justify-center">
                <Loader2 className="h-12 w-12 text-primary-600 animate-spin" />
              </div>
            ) : applicantDetails ? (
              <>
                {/* Header */}
                <div className="p-6 border-b bg-primary-50 pr-16">
                  <h2 className="text-2xl font-bold text-gray-900">
                    {applicantDetails.first_name} {applicantDetails.last_name}
                  </h2>
                  <p className="text-gray-600">{selectedEvent.job_title}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${STATUS_CONFIG[selectedEvent.status]?.color || "bg-gray-100"}`}>
                      {STATUS_CONFIG[selectedEvent.status]?.label || selectedEvent.status}
                    </span>
                  </div>
                </div>

                <div className="p-6 grid md:grid-cols-2 gap-6">
                  {/* Interview-Termin */}
                  <div className="md:col-span-2 bg-purple-50 rounded-xl p-5 border border-purple-200">
                    <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                      <CalendarIcon className="h-5 w-5 text-purple-600" />
                      Interview-Termin
                    </h3>
                    <div className="space-y-2 text-sm">
                      {selectedEvent.confirmed_date ? (
                        <p><strong>Bestätigter Termin:</strong> {formatDate(selectedEvent.confirmed_date)} um {formatTime(selectedEvent.confirmed_date)} Uhr</p>
                      ) : (
                        <>
                          <p><strong>Vorschlag 1:</strong> {formatDate(selectedEvent.proposed_date_1)} um {formatTime(selectedEvent.proposed_date_1)} Uhr</p>
                          {selectedEvent.proposed_date_2 && (
                            <p><strong>Vorschlag 2:</strong> {formatDate(selectedEvent.proposed_date_2)} um {formatTime(selectedEvent.proposed_date_2)} Uhr</p>
                          )}
                        </>
                      )}
                      {selectedEvent.location && (
                        <p className="flex items-center gap-1"><MapPin className="h-4 w-4" /> {selectedEvent.location}</p>
                      )}
                      {selectedEvent.meeting_link && (
                        <p className="flex items-center gap-1">
                          <Video className="h-4 w-4" />
                          <a href={selectedEvent.meeting_link} target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline">
                            {selectedEvent.meeting_link}
                          </a>
                        </p>
                      )}
                    </div>
                    {selectedEvent.status === "confirmed" && (
                      <button
                        onClick={() => downloadICS(selectedEvent.id, selectedEvent.applicant_name)}
                        className="mt-3 px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors flex items-center gap-2"
                      >
                        <Download className="h-4 w-4" />
                        In Kalender eintragen
                      </button>
                    )}
                  </div>

                  {/* Kontaktdaten */}
                  <div className="bg-gray-50 rounded-xl p-5">
                    <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <User className="h-5 w-5 text-primary-600" />
                      Kontaktdaten
                    </h3>
                    <div className="space-y-3">
                      <a 
                        href={`mailto:${applicantDetails.email}`}
                        className="flex items-center gap-3 p-3 bg-white rounded-lg hover:bg-primary-50 transition-colors"
                      >
                        <Mail className="h-5 w-5 text-primary-600" />
                        <div>
                          <p className="text-xs text-gray-500">E-Mail</p>
                          <p className="font-medium text-primary-600">{applicantDetails.email}</p>
                        </div>
                      </a>
                      {applicantDetails.phone && (
                        <a 
                          href={`tel:${applicantDetails.phone}`}
                          className="flex items-center gap-3 p-3 bg-white rounded-lg hover:bg-primary-50 transition-colors"
                        >
                          <Phone className="h-5 w-5 text-primary-600" />
                          <div>
                            <p className="text-xs text-gray-500">Telefon</p>
                            <p className="font-medium text-primary-600">{applicantDetails.phone}</p>
                          </div>
                        </a>
                      )}
                      {(applicantDetails.city || applicantDetails.country) && (
                        <div className="flex items-center gap-3 p-3 bg-white rounded-lg">
                          <MapPin className="h-5 w-5 text-gray-500" />
                          <div>
                            <p className="text-xs text-gray-500">Standort</p>
                            <p className="font-medium">
                              {[applicantDetails.city, applicantDetails.country].filter(Boolean).join(", ")}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Profil */}
                  <div className="bg-gray-50 rounded-xl p-5">
                    <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <FileText className="h-5 w-5 text-primary-600" />
                      Profil
                    </h3>
                    <div className="space-y-2 text-sm">
                      {applicantDetails.date_of_birth && (
                        <div className="flex justify-between p-2 bg-white rounded">
                          <span className="text-gray-500">Geburtsdatum</span>
                          <span className="font-medium">{new Date(applicantDetails.date_of_birth).toLocaleDateString("de-DE")}</span>
                        </div>
                      )}
                      {applicantDetails.nationality && (
                        <div className="flex justify-between p-2 bg-white rounded">
                          <span className="text-gray-500">Nationalität</span>
                          <span className="font-medium">{applicantDetails.nationality}</span>
                        </div>
                      )}
                      {applicantDetails.german_level && (
                        <div className="flex justify-between p-2 bg-white rounded">
                          <span className="text-gray-500">Deutsch</span>
                          <span className="font-medium">{applicantDetails.german_level}</span>
                        </div>
                      )}
                      {applicantDetails.english_level && (
                        <div className="flex justify-between p-2 bg-white rounded">
                          <span className="text-gray-500">Englisch</span>
                          <span className="font-medium">{applicantDetails.english_level}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Dokumente */}
                  {applicantDetails.documents && applicantDetails.documents.length > 0 && (
                    <div className="md:col-span-2 bg-gray-50 rounded-xl p-5">
                      <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <FileText className="h-5 w-5 text-primary-600" />
                        Dokumente ({applicantDetails.documents.length})
                      </h3>
                      <div className="grid md:grid-cols-2 gap-3">
                        {applicantDetails.documents.map((doc) => (
                          <div
                            key={doc.id}
                            className="flex items-center gap-3 p-3 bg-white rounded-lg"
                          >
                            <FileText className="h-5 w-5 text-gray-400" />
                            <div>
                              <p className="font-medium text-gray-900">{doc.original_name}</p>
                              <p className="text-xs text-gray-500">{doc.document_type}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t bg-gray-50 flex justify-between items-center rounded-b-2xl">
                  <Link
                    href={`/company/applications?highlight=${selectedEvent.application_id}`}
                    className="text-primary-600 hover:underline text-sm"
                  >
                    Zur vollständigen Bewerbung →
                  </Link>
                  <button
                    onClick={closeDetails}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors"
                  >
                    Schließen
                  </button>
                </div>
              </>
            ) : (
              <div className="p-12 text-center text-gray-500">
                Keine Details verfügbar
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
