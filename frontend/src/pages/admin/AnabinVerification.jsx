import { useState, useEffect } from 'react';
import { adminAPI } from '../../lib/api';
import toast from 'react-hot-toast';
import { 
  GraduationCap, Search, CheckCircle, XCircle, AlertTriangle, 
  HelpCircle, Loader2, ExternalLink, RefreshCw, Save, ChevronDown,
  MapPin, Flag, BookOpen, User, Copy, Link2
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
  const [saving, setSaving] = useState(false);
  
  // Manuelle Verifizierungsfelder
  const [manualData, setManualData] = useState({
    anabin_verified: 'verified',
    anabin_match_score: 100,
    anabin_institution_name: '',
    anabin_institution_id: '',
    anabin_status: 'H+',
    anabin_notes: '',
  });
  
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

  const openVerifyModal = (student) => {
    setSelectedStudent(student);
    // Vorausfüllen mit vorhandenen Daten
    setManualData({
      anabin_verified: student.anabin_verified || 'verified',
      anabin_match_score: student.anabin_match_score || 100,
      anabin_institution_name: student.anabin_institution_name || student.university_name || '',
      anabin_institution_id: student.anabin_institution_id || '',
      anabin_status: student.anabin_status || 'H+',
      anabin_notes: student.anabin_notes || '',
    });
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
    } catch (error) {
      toast.error('Fehler beim Speichern');
    } finally {
      setSaving(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('In Zwischenablage kopiert!');
  };

  // Anabin-Such-URL generieren
  const getAnabinSearchUrl = (universityName, country) => {
    // Direkte Suche auf anabin
    const baseUrl = 'https://anabin.kmk.org/no_cache/filter/institutionen.html';
    return baseUrl;
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
          <p className="text-gray-600">Universitäten manuell in anabin.kmk.org prüfen</p>
        </div>
      </div>

      {/* Anleitung */}
      <div className="card mb-6 bg-blue-50 border-blue-200">
        <h3 className="font-bold text-blue-900 mb-2">📋 So funktioniert's:</h3>
        <ol className="list-decimal list-inside text-sm text-blue-800 space-y-1">
          <li>Klicken Sie auf "Prüfen" bei einem Studenten</li>
          <li>Kopieren Sie den Universitätsnamen und öffnen Sie anabin</li>
          <li>Suchen Sie die Universität auf anabin (Land: Usbekistan/Kirgisistan)</li>
          <li>Tragen Sie die gefundenen Daten ein und speichern Sie</li>
        </ol>
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
                          onClick={() => openVerifyModal(student)}
                          className="px-3 py-1 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-1"
                        >
                          <Search className="h-3 w-3" />
                          Prüfen
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

      {/* Verifizierungs-Modal */}
      {selectedStudent && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold">Uni-Verifizierung: {selectedStudent.name}</h2>
                <button onClick={() => setSelectedStudent(null)} className="p-2 hover:bg-gray-100 rounded-lg">
                  ✕
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Schritt 1: Universität kopieren */}
              <div className="bg-gray-50 rounded-xl p-4">
                <h3 className="font-bold mb-3 flex items-center gap-2">
                  <span className="bg-primary-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-sm">1</span>
                  Universität des Studenten
                </h3>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={selectedStudent.university_name || 'Keine Universität hinterlegt'}
                    className="input-styled flex-1 bg-white"
                  />
                  <button
                    onClick={() => copyToClipboard(selectedStudent.university_name)}
                    className="btn-secondary flex items-center gap-1"
                    disabled={!selectedStudent.university_name}
                  >
                    <Copy className="h-4 w-4" />
                    Kopieren
                  </button>
                </div>
                <div className="mt-2 text-sm text-gray-600">
                  <p><strong>Land:</strong> {selectedStudent.university_country || selectedStudent.nationality || '-'}</p>
                  <p><strong>Stadt:</strong> {selectedStudent.university_city || '-'}</p>
                </div>
              </div>

              {/* Schritt 2: Anabin öffnen */}
              <div className="bg-blue-50 rounded-xl p-4">
                <h3 className="font-bold mb-3 flex items-center gap-2">
                  <span className="bg-primary-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-sm">2</span>
                  In Anabin suchen
                </h3>
                <p className="text-sm text-gray-600 mb-3">
                  Öffnen Sie anabin und suchen Sie nach der Universität. Wählen Sie das Land 
                  <strong> {selectedStudent.university_country || 'Usbekistan/Kirgisistan'}</strong>.
                </p>
                <a
                  href="https://anabin.kmk.org/no_cache/filter/institutionen.html"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-primary inline-flex items-center gap-2"
                >
                  <ExternalLink className="h-4 w-4" />
                  Anabin öffnen
                </a>
              </div>

              {/* Schritt 3: Daten eintragen */}
              <div className="bg-green-50 rounded-xl p-4">
                <h3 className="font-bold mb-3 flex items-center gap-2">
                  <span className="bg-primary-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-sm">3</span>
                  Ergebnis eintragen
                </h3>
                
                <div className="space-y-4">
                  {/* Status */}
                  <div>
                    <label className="label">Verifizierungsstatus</label>
                    <select
                      className="input-styled"
                      value={manualData.anabin_verified}
                      onChange={(e) => setManualData({...manualData, anabin_verified: e.target.value})}
                    >
                      <option value="verified">✅ Verifiziert - Uni gefunden</option>
                      <option value="uncertain">⚠️ Unsicher - Ähnliche Uni gefunden</option>
                      <option value="not_found">❌ Nicht gefunden</option>
                    </select>
                  </div>

                  {manualData.anabin_verified !== 'not_found' && (
                    <>
                      {/* Gefundener Name */}
                      <div>
                        <label className="label">Name in Anabin (deutsche Übersetzung)</label>
                        <input
                          type="text"
                          className="input-styled"
                          placeholder="z.B. Staatliche Technische Universität Taschkent"
                          value={manualData.anabin_institution_name}
                          onChange={(e) => setManualData({...manualData, anabin_institution_name: e.target.value})}
                        />
                      </div>

                      {/* Match Score */}
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
                        <p className="text-xs text-gray-500 mt-1">
                          100% = Exakt gleicher Name, 80-99% = Leicht abweichend, &lt;80% = Unsicher
                        </p>
                      </div>

                      {/* Anabin Status */}
                      <div>
                        <label className="label">Anabin Bewertung</label>
                        <select
                          className="input-styled"
                          value={manualData.anabin_status}
                          onChange={(e) => setManualData({...manualData, anabin_status: e.target.value})}
                        >
                          <option value="H+">H+ (Hochschule, anerkannt)</option>
                          <option value="H+/-">H+/- (Eingeschränkt anerkannt)</option>
                          <option value="H-">H- (Nicht anerkannt)</option>
                          <option value="">Unbekannt</option>
                        </select>
                      </div>
                    </>
                  )}

                  {/* Notizen */}
                  <div>
                    <label className="label">Notizen (optional)</label>
                    <textarea
                      className="input-styled"
                      rows={2}
                      placeholder="z.B. 'Filiale in Taschkent gefunden' oder 'Mehrere ähnliche Unis'"
                      value={manualData.anabin_notes}
                      onChange={(e) => setManualData({...manualData, anabin_notes: e.target.value})}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t bg-gray-50 flex justify-between">
              <button
                onClick={() => setSelectedStudent(null)}
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
      )}
    </div>
  );
}

export default AnabinVerification;
