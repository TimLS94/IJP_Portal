import { useState, useEffect } from 'react';
import { adminAPI } from '../../lib/api';
import toast from 'react-hot-toast';
import { 
  GraduationCap, Search, CheckCircle, XCircle, AlertTriangle, 
  HelpCircle, Loader2, ExternalLink, RefreshCw, Save, ChevronDown,
  MapPin, Flag, BookOpen, User
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
  
  // Filter
  const [statusFilter, setStatusFilter] = useState('');

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

  const handleSearch = async (student) => {
    setSelectedStudent(student);
    setSearching(true);
    setSearchResult(null);
    
    try {
      const response = await adminAPI.searchAnabin(student.id);
      setSearchResult(response.data);
    } catch (error) {
      console.error('Fehler:', error);
      toast.error('Fehler bei der Anabin-Suche');
      setSearchResult({
        success: false,
        message: 'Suche fehlgeschlagen',
        result: { status: 'error', message: error.message }
      });
    } finally {
      setSearching(false);
    }
  };

  const handleAutoVerify = async (studentId) => {
    setSearching(true);
    try {
      const response = await adminAPI.autoVerifyAnabin(studentId);
      toast.success(response.data.message);
      loadStudents();
      setSearchResult(response.data);
    } catch (error) {
      toast.error('Auto-Verifizierung fehlgeschlagen');
    } finally {
      setSearching(false);
    }
  };

  const handleManualVerify = async (studentId, data) => {
    setSaving(true);
    try {
      await adminAPI.verifyAnabin({
        applicant_id: studentId,
        ...data
      });
      toast.success('Verifizierung gespeichert');
      loadStudents();
      setSelectedStudent(null);
      setSearchResult(null);
    } catch (error) {
      toast.error('Fehler beim Speichern');
    } finally {
      setSaving(false);
    }
  };

  const filteredStudents = statusFilter 
    ? students.filter(s => s.anabin_verified === statusFilter)
    : students;

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

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <GraduationCap className="h-8 w-8 text-primary-600" />
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Anabin Uni-Verifizierung</h1>
          <p className="text-gray-600">Universitäten in anabin.kmk.org prüfen</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <div className="card py-4 text-center">
          <p className="text-3xl font-bold text-gray-900">{stats.total || 0}</p>
          <p className="text-sm text-gray-500">Gesamt</p>
        </div>
        <div className="card py-4 text-center cursor-pointer hover:bg-gray-50" onClick={() => setStatusFilter('not_checked')}>
          <p className="text-3xl font-bold text-gray-600">{stats.not_checked || 0}</p>
          <p className="text-sm text-gray-500">Nicht geprüft</p>
        </div>
        <div className="card py-4 text-center cursor-pointer hover:bg-green-50" onClick={() => setStatusFilter('verified')}>
          <p className="text-3xl font-bold text-green-600">{stats.verified || 0}</p>
          <p className="text-sm text-gray-500">Verifiziert</p>
        </div>
        <div className="card py-4 text-center cursor-pointer hover:bg-yellow-50" onClick={() => setStatusFilter('uncertain')}>
          <p className="text-3xl font-bold text-yellow-600">{stats.uncertain || 0}</p>
          <p className="text-sm text-gray-500">Unsicher</p>
        </div>
        <div className="card py-4 text-center cursor-pointer hover:bg-red-50" onClick={() => setStatusFilter('not_found')}>
          <p className="text-3xl font-bold text-red-600">{stats.not_found || 0}</p>
          <p className="text-sm text-gray-500">Nicht gefunden</p>
        </div>
      </div>

      {/* Filter */}
      <div className="card mb-6">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <label className="label">Status-Filter</label>
            <div className="relative">
              <select
                className="input-styled appearance-none pr-10"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">Alle anzeigen</option>
                <option value="not_checked">Nicht geprüft</option>
                <option value="verified">Verifiziert</option>
                <option value="uncertain">Unsicher</option>
                <option value="not_found">Nicht gefunden</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
            </div>
          </div>
          <button onClick={loadStudents} className="btn-secondary flex items-center gap-2 mt-6">
            <RefreshCw className="h-4 w-4" />
            Aktualisieren
          </button>
        </div>
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
                        <span className="text-sm">{student.university_name || '-'}</span>
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
                      {student.anabin_institution_name && (
                        <div className="text-xs text-gray-500 mt-1 max-w-[200px] truncate" title={student.anabin_institution_name}>
                          → {student.anabin_institution_name}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {student.anabin_match_score !== null && student.anabin_match_score !== undefined ? (
                        <span className={`font-bold ${
                          student.anabin_match_score >= 90 ? 'text-green-600' :
                          student.anabin_match_score >= 70 ? 'text-yellow-600' :
                          'text-red-600'
                        }`}>
                          {student.anabin_match_score}%
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleSearch(student)}
                          className="px-3 py-1 text-sm bg-primary-100 text-primary-700 rounded-lg hover:bg-primary-200 flex items-center gap-1"
                        >
                          <Search className="h-3 w-3" />
                          Suchen
                        </button>
                        <button
                          onClick={() => handleAutoVerify(student.id)}
                          className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded-lg hover:bg-green-200 flex items-center gap-1"
                        >
                          <RefreshCw className="h-3 w-3" />
                          Auto
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Such-Modal */}
      {selectedStudent && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold">Anabin-Suche: {selectedStudent.name}</h2>
                <button onClick={() => { setSelectedStudent(null); setSearchResult(null); }} className="p-2 hover:bg-gray-100 rounded-lg">
                  ✕
                </button>
              </div>
              <div className="mt-2 text-sm text-gray-600">
                <p><strong>Universität:</strong> {selectedStudent.university_name}</p>
                <p><strong>Land:</strong> {selectedStudent.university_country || selectedStudent.nationality}</p>
                <p><strong>Stadt:</strong> {selectedStudent.university_city || '-'}</p>
              </div>
            </div>

            {/* Content */}
            <div className="p-6">
              {searching ? (
                <div className="flex flex-col items-center py-12">
                  <Loader2 className="h-12 w-12 text-primary-600 animate-spin mb-4" />
                  <p className="text-gray-600">Suche in anabin.kmk.org...</p>
                </div>
              ) : searchResult ? (
                <div className="space-y-6">
                  {/* Ergebnis-Status */}
                  <div className={`p-4 rounded-xl ${
                    searchResult.result?.status === 'verified' ? 'bg-green-50 border border-green-200' :
                    searchResult.result?.status === 'uncertain' ? 'bg-yellow-50 border border-yellow-200' :
                    'bg-red-50 border border-red-200'
                  }`}>
                    <p className="font-medium">{searchResult.result?.message || 'Kein Ergebnis'}</p>
                  </div>

                  {/* Beste Übereinstimmung */}
                  {searchResult.result?.best_match && (
                    <div className="bg-gray-50 rounded-xl p-4">
                      <h3 className="font-bold mb-3">Beste Übereinstimmung</h3>
                      <div className="space-y-2 text-sm">
                        <p><strong>Name:</strong> {searchResult.result.best_match.name}</p>
                        {searchResult.result.best_match.german_name && (
                          <p><strong>Deutscher Name:</strong> {searchResult.result.best_match.german_name}</p>
                        )}
                        <p><strong>Stadt:</strong> {searchResult.result.best_match.city}</p>
                        <p><strong>Land:</strong> {searchResult.result.best_match.country}</p>
                        <p><strong>Typ:</strong> {searchResult.result.best_match.type}</p>
                        <p><strong>Status:</strong> {searchResult.result.best_match.status || '-'}</p>
                        <p className="text-lg font-bold text-primary-600">
                          Übereinstimmung: {searchResult.result.best_match.match_score}%
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Weitere Treffer */}
                  {searchResult.result?.all_matches?.length > 1 && (
                    <div>
                      <h3 className="font-bold mb-2">Weitere Treffer</h3>
                      <div className="space-y-2">
                        {searchResult.result.all_matches.slice(1).map((match, idx) => (
                          <div key={idx} className="p-3 bg-gray-50 rounded-lg text-sm">
                            <span className="font-medium">{match.name}</span>
                            <span className="text-gray-500 ml-2">({match.city}, {match.country})</span>
                            <span className="ml-2 text-primary-600 font-bold">{match.match_score}%</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Manuelle Verifizierung */}
                  <div className="border-t pt-6">
                    <h3 className="font-bold mb-4">Manuell verifizieren</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <button
                        onClick={() => handleManualVerify(selectedStudent.id, {
                          anabin_verified: 'verified',
                          anabin_match_score: searchResult.result?.best_match?.match_score,
                          anabin_institution_name: searchResult.result?.best_match?.name,
                          anabin_institution_id: searchResult.result?.best_match?.anabin_id,
                          anabin_status: searchResult.result?.best_match?.status,
                        })}
                        disabled={saving}
                        className="flex items-center justify-center gap-2 py-3 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 disabled:opacity-50"
                      >
                        <CheckCircle className="h-5 w-5" />
                        Als verifiziert markieren
                      </button>
                      <button
                        onClick={() => handleManualVerify(selectedStudent.id, {
                          anabin_verified: 'not_found',
                          anabin_notes: 'Manuell als nicht gefunden markiert',
                        })}
                        disabled={saving}
                        className="flex items-center justify-center gap-2 py-3 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 disabled:opacity-50"
                      >
                        <XCircle className="h-5 w-5" />
                        Nicht gefunden
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  Klicken Sie auf "Suchen" um die Anabin-Datenbank zu durchsuchen.
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t bg-gray-50 flex justify-between">
              <a
                href="https://anabin.kmk.org/db/institutionen"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary-600 hover:underline flex items-center gap-1"
              >
                <ExternalLink className="h-4 w-4" />
                Anabin manuell öffnen
              </a>
              <button
                onClick={() => { setSelectedStudent(null); setSearchResult(null); }}
                className="btn-secondary"
              >
                Schließen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AnabinVerification;
