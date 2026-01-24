import { useState, useEffect } from 'react';
import { adminAPI } from '../../lib/api';
import toast from 'react-hot-toast';
import { 
  GraduationCap, Search, CheckCircle, XCircle, AlertTriangle, 
  HelpCircle, Loader2, ExternalLink, RefreshCw, Save, ChevronDown,
  MapPin, Flag, BookOpen, User, Sparkles, Database, FileDown
} from 'lucide-react';

// Status-Konfiguration
const statusConfig = {
  not_checked: { label: 'Nicht geprüft', color: 'gray', icon: HelpCircle },
  verified: { label: 'Verifiziert', color: 'green', icon: CheckCircle },
  not_found: { label: 'Nicht gefunden', color: 'red', icon: XCircle },
  uncertain: { label: 'Unsicher', color: 'yellow', icon: AlertTriangle },
  error: { label: 'Fehler', color: 'red', icon: XCircle },
};

function AnabinVerification() {
  const [students, setStudents] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [searchResult, setSearchResult] = useState(null);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadingPdf, setLoadingPdf] = useState(null);
  
  // Manuelle Verifizierungsfelder
  const [manualData, setManualData] = useState({
    anabin_verified: 'verified',
    anabin_match_score: 100,
    anabin_institution_name: '',
    anabin_status: 'H+',
    anabin_notes: '',
  });
  
  // Filter
  const [statusFilter, setStatusFilter] = useState('');
  const [nameFilter, setNameFilter] = useState('');

  useEffect(() => {
    loadStudents();
  }, []);

  const loadStudents = async () => {
    setLoading(true);
    try {
      const response = await adminAPI.getAnabinStudents();
      setStudents(response.data.students);
      setStats({
        total: response.data.total,
        not_checked: response.data.not_checked,
        verified: response.data.verified,
        not_found: response.data.not_found,
        uncertain: response.data.uncertain,
      });
    } catch (error) {
      console.error('Fehler:', error);
      toast.error('Fehler beim Laden der Studenten');
    } finally {
      setLoading(false);
    }
  };

  const openVerifyModal = async (student) => {
    setSelectedStudent(student);
    setSearchResult(null);
    
    // Vorausfüllen mit vorhandenen Daten
    setManualData({
      anabin_verified: student.anabin_verified || 'verified',
      anabin_match_score: student.anabin_match_score || 100,
      anabin_institution_name: student.anabin_institution_name || student.university_name || '',
      anabin_status: student.anabin_status || 'H+',
      anabin_notes: student.anabin_notes || '',
    });
    
    // Automatische Suche starten
    if (student.university_name) {
      await searchAnabin(student);
    }
  };

  const searchAnabin = async (student) => {
    setSearching(true);
    try {
      const response = await adminAPI.searchAnabin(student.id);
      setSearchResult(response.data);
      
      // Bei gutem Match automatisch Felder vorausfüllen
      if (response.data.result?.best_match) {
        const match = response.data.result.best_match;
        setManualData(prev => ({
          ...prev,
          anabin_institution_name: match.display_name || match.name_german || match.name_original,
          anabin_match_score: Math.round(match.match_score),
          anabin_status: match.status || 'H+',
          anabin_verified: match.match_score >= 85 ? 'verified' : match.match_score >= 60 ? 'uncertain' : 'not_found',
        }));
      }
    } catch (error) {
      console.error('Fehler:', error);
      const statusCode = error.response?.status;
      const errorDetail = error.response?.data?.detail || '';
      
      let userMessage = 'Die Suche konnte nicht durchgeführt werden. ';
      
      if (statusCode === 404 || errorDetail.toLowerCase().includes('not found')) {
        userMessage = '📚 Keine passende Universität in der Anabin-Datenbank gefunden. Bitte prüfen Sie die Schreibweise oder suchen Sie manuell auf anabin.kmk.org';
      } else if (statusCode === 503) {
        userMessage = '🌐 Der Dienst ist momentan nicht verfügbar. Bitte versuchen Sie es später erneut.';
      } else {
        userMessage += errorDetail || 'Bitte versuchen Sie es später erneut.';
      }
      
      toast.error(userMessage, { duration: 5000 });
      
      // Bei nicht gefunden trotzdem Ergebnis setzen
      setSearchResult({
        result: {
          status: 'not_found',
          message: 'Keine Übereinstimmung in der Anabin-Datenbank gefunden.',
          all_matches: [],
          database_count: 0
        }
      });
    } finally {
      setSearching(false);
    }
  };

  const handleAutoVerify = async (studentId) => {
    try {
      const response = await adminAPI.autoVerifyAnabin(studentId);
      if (response.data.result?.status === 'verified') {
        toast.success('✅ Universität verifiziert!');
      } else if (response.data.result?.status === 'uncertain') {
        toast.success('⚠️ Mögliche Übereinstimmung - bitte prüfen');
      } else {
        toast.error('❌ Keine Übereinstimmung gefunden');
      }
      loadStudents();
    } catch (error) {
      toast.error('Auto-Verifizierung fehlgeschlagen');
    }
  };

  const handleSaveVerification = async () => {
    if (!selectedStudent) return;
    
    setSaving(true);
    try {
      await adminAPI.verifyAnabin({
        applicant_id: selectedStudent.id,
        ...manualData
      });
      toast.success('Verifizierung gespeichert!');
      loadStudents();
      setSelectedStudent(null);
      setSearchResult(null);
    } catch (error) {
      toast.error('Fehler beim Speichern');
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadPdf = async (student, forceRefresh = false) => {
    if (!student.university_name && !student.anabin_institution_name) {
      toast.error('Keine Universität hinterlegt');
      return;
    }
    
    setLoadingPdf(student.id);
    const toastId = toast.loading(
      forceRefresh 
        ? 'Lade PDF neu von Anabin... (kann 10-15 Sekunden dauern)' 
        : 'Lade PDF von Anabin... (kann 5-10 Sekunden dauern)'
    );
    
    try {
      const response = await adminAPI.getAnabinPdf(student.id, forceRefresh);
      
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank');
      
      toast.success(forceRefresh ? 'PDF neu geladen!' : 'PDF geladen!', { id: toastId });
    } catch (error) {
      console.error('PDF-Fehler:', error);
      const statusCode = error.response?.status;
      const errorDetail = error.response?.data?.detail || '';
      
      let userMessage = 'Das PDF konnte nicht geladen werden. ';
      
      if (statusCode === 404 || errorDetail.toLowerCase().includes('not found') || errorDetail.toLowerCase().includes('nicht gefunden')) {
        userMessage = '📄 Kein Anabin-Dokument gefunden. Die Universität ist möglicherweise nicht in der Anabin-Datenbank verzeichnet oder der Name stimmt nicht überein. Versuchen Sie, den Universitätsnamen manuell zu suchen.';
      } else if (statusCode === 503 || errorDetail.toLowerCase().includes('unavailable') || errorDetail.toLowerCase().includes('timeout')) {
        userMessage = '🌐 Der Anabin-Server ist momentan nicht erreichbar. Bitte versuchen Sie es in einigen Minuten erneut.';
      } else if (statusCode === 400) {
        userMessage = '⚠️ Die Universität konnte nicht gefunden werden. Bitte prüfen Sie den eingegebenen Namen und versuchen Sie es erneut.';
      } else if (statusCode === 500) {
        userMessage = '❌ Es ist ein technischer Fehler aufgetreten. Bitte versuchen Sie es später erneut oder kontaktieren Sie den Support.';
      } else {
        userMessage += errorDetail || 'Bitte versuchen Sie es später erneut.';
      }
      
      toast.error(userMessage, { id: toastId, duration: 6000 });
    } finally {
      setLoadingPdf(null);
    }
  };

  const selectMatch = (match) => {
    setManualData(prev => ({
      ...prev,
      anabin_institution_name: match.display_name || match.name_german || match.name_original,
      anabin_match_score: Math.round(match.match_score),
      anabin_status: match.status || '',
      anabin_verified: match.match_score >= 85 ? 'verified' : 'uncertain',
    }));
    toast.success('Daten übernommen!');
  };

  const filteredStudents = students.filter(s => {
    // Status-Filter
    if (statusFilter && s.anabin_verified !== statusFilter) return false;
    
    // Namen-Filter (Student oder Universität)
    if (nameFilter) {
      const search = nameFilter.toLowerCase();
      const matchesName = s.name?.toLowerCase().includes(search);
      const matchesUni = s.university_name?.toLowerCase().includes(search);
      const matchesAnabinName = s.anabin_institution_name?.toLowerCase().includes(search);
      if (!matchesName && !matchesUni && !matchesAnabinName) return false;
    }
    
    return true;
  });

  const StatusBadge = ({ status }) => {
    const config = statusConfig[status] || statusConfig.not_checked;
    const Icon = config.icon;
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium
        ${config.color === 'green' ? 'bg-green-100 text-green-800' : ''}
        ${config.color === 'red' ? 'bg-red-100 text-red-800' : ''}
        ${config.color === 'yellow' ? 'bg-yellow-100 text-yellow-800' : ''}
        ${config.color === 'gray' ? 'bg-gray-100 text-gray-800' : ''}
      `}>
        <Icon className="h-3 w-3" />
        {config.label}
      </span>
    );
  };

  const MatchScoreBadge = ({ score }) => {
    const color = score >= 85 ? 'green' : score >= 60 ? 'yellow' : 'red';
    return (
      <span className={`font-bold ${
        color === 'green' ? 'text-green-600' :
        color === 'yellow' ? 'text-yellow-600' :
        'text-red-600'
      }`}>
        {score}%
      </span>
    );
  };

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <GraduationCap className="h-8 w-8 text-primary-600" />
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Anabin Uni-Verifizierung</h1>
          <p className="text-gray-600 flex items-center gap-2">
            <Database className="h-4 w-4" />
            Automatische Suche in lokaler Anabin-Datenbank (Usbekistan & Kirgisistan)
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <div className="card py-4 text-center cursor-pointer hover:bg-gray-50" onClick={() => setStatusFilter('')}>
          <p className="text-3xl font-bold text-gray-900">{stats.total || 0}</p>
          <p className="text-sm text-gray-500">Gesamt</p>
        </div>
        <div className="card py-4 text-center cursor-pointer hover:bg-gray-50" onClick={() => setStatusFilter('not_checked')}>
          <p className="text-3xl font-bold text-gray-600">{stats.not_checked || 0}</p>
          <p className="text-sm text-gray-500">Nicht geprüft</p>
        </div>
        <div className="card py-4 text-center cursor-pointer hover:bg-green-50" onClick={() => setStatusFilter('verified')}>
          <p className="text-3xl font-bold text-green-600">{stats.verified || 0}</p>
          <p className="text-sm text-green-500">Verifiziert</p>
        </div>
        <div className="card py-4 text-center cursor-pointer hover:bg-yellow-50" onClick={() => setStatusFilter('uncertain')}>
          <p className="text-3xl font-bold text-yellow-600">{stats.uncertain || 0}</p>
          <p className="text-sm text-yellow-500">Unsicher</p>
        </div>
        <div className="card py-4 text-center cursor-pointer hover:bg-red-50" onClick={() => setStatusFilter('not_found')}>
          <p className="text-3xl font-bold text-red-600">{stats.not_found || 0}</p>
          <p className="text-sm text-red-500">Nicht gefunden</p>
        </div>
      </div>

      {/* Filter */}
      <div className="card mb-6">
        <div className="flex flex-col md:flex-row items-end gap-4">
          {/* Namenssuche */}
          <div className="flex-1 w-full">
            <label className="label">Suche nach Name / Universität</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                className="input-styled pl-10"
                placeholder="Name oder Universität suchen..."
                value={nameFilter}
                onChange={(e) => setNameFilter(e.target.value)}
              />
              {nameFilter && (
                <button 
                  onClick={() => setNameFilter('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
          
          {/* Status-Filter */}
          <div className="w-full md:w-48">
            <label className="label">Status</label>
            <div className="relative">
              <select
                className="input-styled appearance-none pr-10"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">Alle Status</option>
                <option value="not_checked">Nicht geprüft</option>
                <option value="verified">Verifiziert</option>
                <option value="uncertain">Unsicher</option>
                <option value="not_found">Nicht gefunden</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
            </div>
          </div>
          
          <button onClick={loadStudents} className="btn-secondary flex items-center gap-2 whitespace-nowrap">
            <RefreshCw className="h-4 w-4" />
            Aktualisieren
          </button>
        </div>
        
        {/* Aktive Filter anzeigen */}
        {(nameFilter || statusFilter) && (
          <div className="mt-4 pt-4 border-t flex items-center gap-2 flex-wrap">
            <span className="text-sm text-gray-500">Filter aktiv:</span>
            {nameFilter && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-primary-100 text-primary-700 rounded-full text-sm">
                "{nameFilter}"
                <button onClick={() => setNameFilter('')} className="hover:text-primary-900">✕</button>
              </span>
            )}
            {statusFilter && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">
                {statusConfig[statusFilter]?.label}
                <button onClick={() => setStatusFilter('')} className="hover:text-gray-900">✕</button>
              </span>
            )}
            <button 
              onClick={() => { setNameFilter(''); setStatusFilter(''); }}
              className="text-sm text-red-600 hover:text-red-700 ml-2"
            >
              Alle Filter zurücksetzen
            </button>
          </div>
        )}
      </div>

      {/* Studenten-Liste */}
      <div className="card">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-12 w-12 text-primary-600 animate-spin" />
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="text-center py-12">
            <GraduationCap className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Keine Studenten gefunden</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Student</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Universität</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Land/Stadt</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Status</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Match</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900">Aktionen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredStudents.map((student) => (
                  <tr key={student.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-gray-400" />
                        <span className="font-medium">{student.name}</span>
                      </div>
                      <div className="text-xs text-gray-500 ml-6">{student.nationality}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <GraduationCap className="h-4 w-4 text-gray-400" />
                        <span className="text-sm max-w-[250px] truncate" title={student.university_name}>
                          {student.university_name || '-'}
                        </span>
                      </div>
                      {student.field_of_study && (
                        <div className="text-xs text-gray-500 ml-6">
                          <BookOpen className="h-3 w-3 inline mr-1" />
                          {student.field_of_study}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {student.university_country && (
                        <div className="flex items-center gap-1">
                          <Flag className="h-3 w-3 text-gray-400" />
                          {student.university_country}
                        </div>
                      )}
                      {student.university_city && (
                        <div className="flex items-center gap-1 text-gray-500">
                          <MapPin className="h-3 w-3 text-gray-400" />
                          {student.university_city}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={student.anabin_verified} />
                      {student.anabin_institution_name && student.anabin_institution_name !== student.university_name && (
                        <div className="text-xs text-gray-500 mt-1 max-w-[200px] truncate" title={student.anabin_institution_name}>
                          → {student.anabin_institution_name}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {student.anabin_match_score !== null && student.anabin_match_score !== undefined ? (
                        <MatchScoreBadge score={student.anabin_match_score} />
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openVerifyModal(student)}
                          className="px-3 py-1 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-1"
                        >
                          <Search className="h-3 w-3" />
                          Prüfen
                        </button>
                        <button
                          onClick={() => handleAutoVerify(student.id)}
                          className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded-lg hover:bg-green-200 flex items-center gap-1"
                          title="Automatisch verifizieren"
                        >
                          <Sparkles className="h-3 w-3" />
                          Auto
                        </button>
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleDownloadPdf(student, false)}
                            disabled={loadingPdf === student.id || (!student.university_name && !student.anabin_institution_name)}
                            className="px-2 py-1 text-sm bg-blue-100 text-blue-700 rounded-l-lg hover:bg-blue-200 flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Anabin-PDF laden (aus Cache wenn vorhanden)"
                          >
                            {loadingPdf === student.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <FileDown className="h-3 w-3" />
                            )}
                            PDF
                          </button>
                          <button
                            onClick={() => handleDownloadPdf(student, true)}
                            disabled={loadingPdf === student.id || (!student.university_name && !student.anabin_institution_name)}
                            className="px-2 py-1 text-sm bg-orange-100 text-orange-700 rounded-r-lg hover:bg-orange-200 flex items-center disabled:opacity-50 disabled:cursor-not-allowed border-l border-orange-200"
                            title="PDF neu von Anabin laden (Cache ignorieren)"
                          >
                            <RefreshCw className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Verifizierungs-Modal */}
      {selectedStudent && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold">Uni-Verifizierung: {selectedStudent.name}</h2>
                <button onClick={() => { setSelectedStudent(null); setSearchResult(null); }} className="p-2 hover:bg-gray-100 rounded-lg">
                  ✕
                </button>
              </div>
              <div className="mt-2 text-sm text-gray-600">
                <p><strong>Universität:</strong> {selectedStudent.university_name || 'Nicht angegeben'}</p>
                <p><strong>Land:</strong> {selectedStudent.university_country || selectedStudent.nationality || '-'}</p>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Suchergebnis */}
              {searching ? (
                <div className="flex flex-col items-center py-8">
                  <Loader2 className="h-10 w-10 text-primary-600 animate-spin mb-3" />
                  <p className="text-gray-600">Suche in Anabin-Datenbank...</p>
                </div>
              ) : searchResult?.result ? (
                <div className="space-y-4">
                  {/* Status-Anzeige */}
                  <div className={`p-4 rounded-xl ${
                    searchResult.result.status === 'verified' ? 'bg-green-50 border border-green-200' :
                    searchResult.result.status === 'uncertain' ? 'bg-yellow-50 border border-yellow-200' :
                    'bg-red-50 border border-red-200'
                  }`}>
                    <p className="font-medium">{searchResult.result.message}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Datenbank: {searchResult.result.database_count} Universitäten
                    </p>
                  </div>

                  {/* Alle Treffer */}
                  {searchResult.result.all_matches?.length > 0 && (
                    <div>
                      <h3 className="font-bold mb-2 flex items-center gap-2">
                        <Database className="h-4 w-4" />
                        Gefundene Übereinstimmungen
                      </h3>
                      <div className="space-y-2 max-h-[200px] overflow-y-auto">
                        {searchResult.result.all_matches.map((match, idx) => (
                          <div 
                            key={idx} 
                            className="p-3 bg-gray-50 rounded-lg text-sm cursor-pointer hover:bg-gray-100 border border-transparent hover:border-primary-300"
                            onClick={() => selectMatch(match)}
                          >
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <span className="font-medium">{match.display_name}</span>
                                {match.name_original !== match.display_name && (
                                  <div className="text-xs text-gray-500 mt-0.5">{match.name_original}</div>
                                )}
                                <div className="text-xs text-gray-500 mt-1">
                                  {match.city}, {match.country} • {match.status}
                                </div>
                              </div>
                              <MatchScoreBadge score={match.match_score} />
                            </div>
                          </div>
                        ))}
                      </div>
                      <p className="text-xs text-gray-500 mt-2">Klicken Sie auf einen Eintrag, um die Daten zu übernehmen</p>
                    </div>
                  )}
                </div>
              ) : null}

              {/* Manuelle Eingabe */}
              <div className="border-t pt-4">
                <h3 className="font-bold mb-4">Verifizierungsdaten</h3>
                <div className="space-y-4">
                  {/* Status */}
                  <div>
                    <label className="label">Status</label>
                    <select
                      className="input-styled"
                      value={manualData.anabin_verified}
                      onChange={(e) => setManualData({...manualData, anabin_verified: e.target.value})}
                    >
                      <option value="verified">✅ Verifiziert</option>
                      <option value="uncertain">⚠️ Unsicher</option>
                      <option value="not_found">❌ Nicht gefunden</option>
                    </select>
                  </div>

                  {/* Name */}
                  <div>
                    <label className="label">Universitätsname (Anabin)</label>
                    <input
                      type="text"
                      className="input-styled"
                      value={manualData.anabin_institution_name}
                      onChange={(e) => setManualData({...manualData, anabin_institution_name: e.target.value})}
                      placeholder="Name wie in Anabin gefunden"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {/* Score */}
                    <div>
                      <label className="label">Übereinstimmung (%)</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        className="input-styled"
                        value={manualData.anabin_match_score}
                        onChange={(e) => setManualData({...manualData, anabin_match_score: parseInt(e.target.value) || 0})}
                      />
                    </div>

                    {/* Anabin Status */}
                    <div>
                      <label className="label">Anabin-Status</label>
                      <select
                        className="input-styled"
                        value={manualData.anabin_status}
                        onChange={(e) => setManualData({...manualData, anabin_status: e.target.value})}
                      >
                        <option value="H+">H+ (Anerkannt)</option>
                        <option value="H +/-">H+/- (Eingeschränkt)</option>
                        <option value="H -">H- (Nicht anerkannt)</option>
                        <option value="">Unbekannt</option>
                      </select>
                    </div>
                  </div>

                  {/* Notizen */}
                  <div>
                    <label className="label">Notizen (optional)</label>
                    <textarea
                      className="input-styled"
                      rows={2}
                      value={manualData.anabin_notes}
                      onChange={(e) => setManualData({...manualData, anabin_notes: e.target.value})}
                      placeholder="Weitere Informationen..."
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t bg-gray-50 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <a
                  href="https://anabin.kmk.org/no_cache/filter/institutionen.html"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary-600 hover:underline flex items-center gap-1"
                >
                  <ExternalLink className="h-4 w-4" />
                  Anabin manuell öffnen
                </a>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => { setSelectedStudent(null); setSearchResult(null); }}
                  className="btn-secondary"
                >
                  Abbrechen
                </button>
                <button
                  onClick={handleSaveVerification}
                  disabled={saving}
                  className="btn-primary flex items-center gap-2"
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  Speichern
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AnabinVerification;


