import { useState, useEffect } from 'react';
import { adminAPI, downloadBlob } from '../../lib/api';
import toast from 'react-hot-toast';
import { 
  Users, Search, UserCheck, UserX, Building2, 
  User, Shield, Filter, Plus, X, Trash2, Eye, EyeOff, Loader2,
  Download, FileText, ShieldAlert, AlertTriangle, File
} from 'lucide-react';

const roleLabels = {
  applicant: { label: 'Bewerber', icon: User, color: 'bg-blue-100 text-blue-800' },
  company: { label: 'Unternehmen', icon: Building2, color: 'bg-green-100 text-green-800' },
  admin: { label: 'Admin', icon: Shield, color: 'bg-purple-100 text-purple-800' }
};

function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [page, setPage] = useState(0);
  const limit = 20;

  // Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({ email: '', password: '', confirmPassword: '' });
  const [creating, setCreating] = useState(false);

  // DSGVO Modal State
  const [showGdprModal, setShowGdprModal] = useState(false);
  const [gdprUser, setGdprUser] = useState(null);
  const [gdprDocuments, setGdprDocuments] = useState([]);
  const [gdprLoading, setGdprLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    loadUsers();
  }, [roleFilter, page]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const params = {
        skip: page * limit,
        limit,
        ...(roleFilter && { role: roleFilter }),
        ...(search && { search })
      };
      const response = await adminAPI.listUsers(params);
      setUsers(response.data.users);
      setTotal(response.data.total);
    } catch (error) {
      toast.error('Fehler beim Laden der Benutzer');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(0);
    loadUsers();
  };

  const toggleActive = async (userId) => {
    try {
      const response = await adminAPI.toggleUserActive(userId);
      toast.success(response.data.message);
      loadUsers();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Fehler beim Aktualisieren');
    }
  };

  const handleCreateAdmin = async (e) => {
    e.preventDefault();
    
    if (createForm.password !== createForm.confirmPassword) {
      toast.error('Passwörter stimmen nicht überein');
      return;
    }
    
    if (createForm.password.length < 6) {
      toast.error('Passwort muss mindestens 6 Zeichen haben');
      return;
    }
    
    setCreating(true);
    try {
      await adminAPI.createAdmin({
        email: createForm.email,
        password: createForm.password
      });
      toast.success('Admin-Benutzer erstellt');
      setShowCreateModal(false);
      setCreateForm({ email: '', password: '', confirmPassword: '' });
      loadUsers();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Fehler beim Erstellen');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteUser = async (userId, email) => {
    if (!confirm(`Möchten Sie den Benutzer "${email}" wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.`)) {
      return;
    }
    
    try {
      await adminAPI.deleteUser(userId);
      toast.success('Benutzer gelöscht');
      loadUsers();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Fehler beim Löschen');
    }
  };

  // DSGVO: Modal öffnen
  const openGdprModal = async (user) => {
    setGdprUser(user);
    setShowGdprModal(true);
    setGdprLoading(true);
    
    try {
      const response = await adminAPI.gdprGetDocuments(user.id);
      setGdprDocuments(response.data.documents || []);
    } catch (error) {
      console.error('Fehler beim Laden der Dokumente:', error);
      setGdprDocuments([]);
    } finally {
      setGdprLoading(false);
    }
  };

  // DSGVO: Daten exportieren (Art. 15)
  const handleExportData = async () => {
    if (!gdprUser) return;
    setExportLoading(true);
    
    try {
      const response = await adminAPI.gdprExportData(gdprUser.id);
      const dataStr = JSON.stringify(response.data, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      downloadBlob(blob, `dsgvo_export_${gdprUser.email}_${new Date().toISOString().split('T')[0]}.json`);
      toast.success('Datenexport heruntergeladen');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Fehler beim Exportieren');
    } finally {
      setExportLoading(false);
    }
  };

  // DSGVO: Einzelnes Dokument löschen
  const handleDeleteDocument = async (documentId) => {
    if (!confirm('Möchten Sie dieses Dokument wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.')) {
      return;
    }
    
    try {
      await adminAPI.gdprDeleteDocument(documentId);
      toast.success('Dokument gelöscht');
      // Liste aktualisieren
      setGdprDocuments(docs => docs.filter(d => d.id !== documentId));
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Fehler beim Löschen');
    }
  };

  // DSGVO: Alle Daten löschen/anonymisieren (Art. 17)
  const handleDeleteAllData = async () => {
    if (!gdprUser) return;
    
    const confirmText = `Möchten Sie wirklich ALLE personenbezogenen Daten von "${gdprUser.email}" löschen?\n\nDies umfasst:\n- Alle Dokumente (Lebenslauf, Reisepass etc.)\n- Bewerbungen\n- IJP-Aufträge\n- Persönliche Profildaten\n\nDer Account bleibt anonymisiert bestehen. Diese Aktion kann NICHT rückgängig gemacht werden!`;
    
    if (!confirm(confirmText)) {
      return;
    }
    
    setDeleteLoading(true);
    try {
      const response = await adminAPI.gdprDeleteData(gdprUser.id, true);
      toast.success('Personenbezogene Daten wurden gelöscht/anonymisiert');
      setShowGdprModal(false);
      setGdprUser(null);
      loadUsers();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Fehler beim Löschen');
    } finally {
      setDeleteLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <Users className="h-8 w-8 text-primary-600" />
          <h1 className="text-3xl font-bold text-gray-900">Benutzer verwalten</h1>
        </div>
        <button 
          onClick={() => setShowCreateModal(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="h-5 w-5" />
          Admin erstellen
        </button>
      </div>

      {/* Filter */}
      <div className="card mb-6">
        <form onSubmit={handleSearch} className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                className="input-styled pl-10"
                placeholder="E-Mail suchen..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          <div>
            <select
              className="input-styled"
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value);
                setPage(0);
              }}
            >
              <option value="">Alle Rollen</option>
              <option value="applicant">Bewerber</option>
              <option value="company">Unternehmen</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <button type="submit" className="btn-primary">
            <Filter className="h-4 w-4 inline mr-2" />
            Filtern
          </button>
        </form>
      </div>

      {/* Benutzer-Tabelle */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Benutzer</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">E-Mail</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Rolle</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Registriert</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Status</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900">Aktionen</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {users.map((user) => {
                    const roleInfo = roleLabels[user.role] || roleLabels.applicant;
                    const RoleIcon = roleInfo.icon;
                    return (
                      <tr key={user.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="bg-gray-100 p-2 rounded-full">
                              <RoleIcon className="h-5 w-5 text-gray-600" />
                            </div>
                            <span className="font-medium">{user.name || '-'}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-600">{user.email}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${roleInfo.color}`}>
                            {roleInfo.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-600">{formatDate(user.created_at)}</td>
                        <td className="px-4 py-3">
                          {user.is_active ? (
                            <span className="flex items-center gap-1 text-green-600">
                              <UserCheck className="h-4 w-4" />
                              Aktiv
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-red-600">
                              <UserX className="h-4 w-4" />
                              Inaktiv
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {/* DSGVO Button */}
                            <button
                              onClick={() => openGdprModal(user)}
                              className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                              title="DSGVO: Daten verwalten"
                            >
                              <ShieldAlert className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => toggleActive(user.id)}
                              className={`p-2 rounded-lg transition-colors ${
                                user.is_active 
                                  ? 'text-orange-600 hover:bg-orange-50' 
                                  : 'text-green-600 hover:bg-green-50'
                              }`}
                              title={user.is_active ? 'Deaktivieren' : 'Aktivieren'}
                            >
                              {user.is_active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                            <button
                              onClick={() => handleDeleteUser(user.id, user.email)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Löschen"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between px-4 py-3 border-t">
              <p className="text-sm text-gray-600">
                Zeige {page * limit + 1}-{Math.min((page + 1) * limit, total)} von {total}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(p => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="btn-secondary text-sm disabled:opacity-50"
                >
                  Zurück
                </button>
                <button
                  onClick={() => setPage(p => p + 1)}
                  disabled={(page + 1) * limit >= total}
                  className="btn-secondary text-sm disabled:opacity-50"
                >
                  Weiter
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Modal: Admin erstellen */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Shield className="h-6 w-6 text-purple-600" />
                Neuen Admin erstellen
              </h2>
              <button 
                onClick={() => setShowCreateModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleCreateAdmin} className="p-6 space-y-4">
              <div>
                <label className="label">E-Mail-Adresse</label>
                <input
                  type="email"
                  className="input-styled"
                  placeholder="admin@beispiel.de"
                  value={createForm.email}
                  onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                  required
                />
              </div>
              
              <div>
                <label className="label">Passwort</label>
                <input
                  type="password"
                  className="input-styled"
                  placeholder="Mindestens 6 Zeichen"
                  value={createForm.password}
                  onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                  required
                  minLength={6}
                />
              </div>
              
              <div>
                <label className="label">Passwort bestätigen</label>
                <input
                  type="password"
                  className="input-styled"
                  placeholder="Passwort wiederholen"
                  value={createForm.confirmPassword}
                  onChange={(e) => setCreateForm({ ...createForm, confirmPassword: e.target.value })}
                  required
                />
              </div>
              
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 text-sm text-purple-800">
                <Shield className="h-4 w-4 inline mr-2" />
                Admin-Benutzer haben vollen Zugriff auf alle Bereiche des Portals.
              </div>
              
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="btn-secondary flex-1"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="btn-primary flex-1 flex items-center justify-center gap-2"
                >
                  {creating ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Plus className="h-5 w-5" />
                  )}
                  Admin erstellen
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: DSGVO Datenverwaltung */}
      {showGdprModal && gdprUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <ShieldAlert className="h-6 w-6 text-purple-600" />
                DSGVO Datenverwaltung
              </h2>
              <button 
                onClick={() => { setShowGdprModal(false); setGdprUser(null); }}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              {/* Benutzer-Info */}
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <div className="flex items-center gap-3">
                  <div className="bg-purple-100 p-3 rounded-full">
                    <User className="h-6 w-6 text-purple-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{gdprUser.name || 'Kein Name'}</p>
                    <p className="text-gray-600">{gdprUser.email}</p>
                    <p className="text-sm text-gray-500">
                      {roleLabels[gdprUser.role]?.label || gdprUser.role} • Registriert am {formatDate(gdprUser.created_at)}
                    </p>
                  </div>
                </div>
              </div>

              {/* DSGVO Art. 15: Datenexport */}
              <div className="mb-6">
                <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  <Download className="h-5 w-5 text-blue-600" />
                  Art. 15 DSGVO: Recht auf Auskunft
                </h3>
                <p className="text-sm text-gray-600 mb-3">
                  Exportiert alle gespeicherten Daten des Benutzers als JSON-Datei.
                </p>
                <button
                  onClick={handleExportData}
                  disabled={exportLoading}
                  className="btn-secondary flex items-center gap-2"
                >
                  {exportLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                  Daten exportieren (JSON)
                </button>
              </div>

              {/* Dokumente */}
              {gdprUser.role === 'applicant' && (
                <div className="mb-6">
                  <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                    <FileText className="h-5 w-5 text-orange-600" />
                    Hochgeladene Dokumente
                  </h3>
                  
                  {gdprLoading ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                    </div>
                  ) : gdprDocuments.length > 0 ? (
                    <div className="space-y-2">
                      {gdprDocuments.map((doc) => (
                        <div key={doc.id} className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                          <div className="flex items-center gap-3">
                            <File className="h-5 w-5 text-gray-400" />
                            <div>
                              <p className="font-medium text-gray-900">{doc.type_label}</p>
                              <p className="text-sm text-gray-500">
                                {doc.original_name} • {doc.file_size_kb} KB
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={() => handleDeleteDocument(doc.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Dokument löschen"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-sm py-4">
                      Keine Dokumente vorhanden.
                    </p>
                  )}
                </div>
              )}

              {/* DSGVO Art. 17: Datenlöschung */}
              <div className="border-t pt-6">
                <h3 className="font-semibold text-red-600 mb-2 flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Art. 17 DSGVO: Recht auf Löschung
                </h3>
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                  <p className="text-sm text-red-800 mb-2">
                    <strong>Achtung:</strong> Diese Aktion löscht alle personenbezogenen Daten:
                  </p>
                  <ul className="text-sm text-red-700 list-disc list-inside space-y-1">
                    <li>Alle hochgeladenen Dokumente (Lebenslauf, Reisepass etc.)</li>
                    <li>Bewerbungen und IJP-Aufträge</li>
                    <li>Persönliche Profildaten werden anonymisiert</li>
                    <li>E-Mail-Adresse wird anonymisiert</li>
                  </ul>
                  <p className="text-sm text-red-800 mt-2">
                    Der Account-Eintrag bleibt für Audit-Zwecke anonymisiert bestehen.
                  </p>
                </div>
                <button
                  onClick={handleDeleteAllData}
                  disabled={deleteLoading}
                  className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  {deleteLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                  Alle personenbezogenen Daten löschen
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminUsers;
