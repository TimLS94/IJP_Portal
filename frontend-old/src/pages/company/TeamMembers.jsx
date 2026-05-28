import { useState, useEffect } from 'react';
import { companyAPI } from '../../lib/api';
import toast from 'react-hot-toast';
import { 
  Users, UserPlus, Mail, Shield, Trash2, Edit2, 
  Loader2, X, Check, AlertTriangle, Crown, User
} from 'lucide-react';

const roleIcons = {
  owner: Crown,
  admin: Shield,
  member: User,
};

const roleColors = {
  owner: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  admin: 'bg-purple-100 text-purple-800 border-purple-200',
  member: 'bg-blue-100 text-blue-800 border-blue-200',
};

function TeamMembers() {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [availableRoles, setAvailableRoles] = useState([]);
  
  // Modal für neuen Benutzer
  const [showAddModal, setShowAddModal] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newMember, setNewMember] = useState({
    email: '',
    first_name: '',
    last_name: '',
    role: 'member'
  });
  
  // Bearbeiten
  const [editingId, setEditingId] = useState(null);
  const [editRole, setEditRole] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [membersRes, rolesRes] = await Promise.all([
        companyAPI.getMembers(),
        companyAPI.getMemberRoles()
      ]);
      setMembers(membersRes.data);
      setAvailableRoles(rolesRes.data);
    } catch (error) {
      console.error('Fehler:', error);
      if (error.response?.status === 403) {
        toast.error('Keine Berechtigung für diese Funktion');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAddMember = async (e) => {
    e.preventDefault();
    if (!newMember.email || !newMember.first_name || !newMember.last_name) {
      toast.error('Bitte füllen Sie alle Pflichtfelder aus');
      return;
    }

    setAdding(true);
    try {
      const response = await companyAPI.addMember(newMember);
      toast.success(response.data.message || 'Benutzer wurde hinzugefügt');
      setShowAddModal(false);
      setNewMember({ email: '', first_name: '', last_name: '', role: 'member' });
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Fehler beim Hinzufügen');
    } finally {
      setAdding(false);
    }
  };

  const handleUpdateRole = async (memberId) => {
    try {
      await companyAPI.updateMember(memberId, { role: editRole });
      toast.success('Rolle aktualisiert');
      setEditingId(null);
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Fehler beim Aktualisieren');
    }
  };

  const handleToggleActive = async (member) => {
    try {
      await companyAPI.updateMember(member.id, { is_active: !member.is_active });
      toast.success(member.is_active ? 'Benutzer deaktiviert' : 'Benutzer aktiviert');
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Fehler beim Ändern');
    }
  };

  const handleRemove = async (memberId) => {
    if (!confirm('Möchten Sie diesen Benutzer wirklich aus dem Team entfernen?')) return;

    try {
      await companyAPI.removeMember(memberId);
      toast.success('Benutzer entfernt');
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Fehler beim Entfernen');
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

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-12 w-12 text-primary-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <Users className="h-8 w-8 text-primary-600" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Team-Mitglieder</h1>
            <p className="text-gray-600">Verwalten Sie die Benutzer Ihrer Firma</p>
          </div>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="btn-primary flex items-center gap-2"
        >
          <UserPlus className="h-5 w-5" />
          Benutzer hinzufügen
        </button>
      </div>

      {/* Rollen-Legende */}
      <div className="card mb-6 bg-gray-50">
        <h3 className="font-semibold text-gray-900 mb-3">Rollen-Übersicht</h3>
        <div className="grid md:grid-cols-3 gap-4">
          <div className="flex items-start gap-3">
            <Crown className="h-5 w-5 text-yellow-600 mt-0.5" />
            <div>
              <p className="font-medium">Inhaber</p>
              <p className="text-sm text-gray-600">Vollzugriff, kann Firma verwalten</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Shield className="h-5 w-5 text-purple-600 mt-0.5" />
            <div>
              <p className="font-medium">Administrator</p>
              <p className="text-sm text-gray-600">Kann Team-Mitglieder verwalten</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <User className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <p className="font-medium">Mitarbeiter</p>
              <p className="text-sm text-gray-600">Kann Stellen & Bewerbungen bearbeiten</p>
            </div>
          </div>
        </div>
      </div>

      {/* Mitglieder-Liste */}
      <div className="card">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Team ({members.length} {members.length === 1 ? 'Mitglied' : 'Mitglieder'})
        </h2>

        {members.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Users className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p>Noch keine Team-Mitglieder</p>
          </div>
        ) : (
          <div className="space-y-3">
            {members.map((member) => {
              const RoleIcon = roleIcons[member.role] || User;
              const isEditing = editingId === member.id;
              
              return (
                <div 
                  key={member.id} 
                  className={`flex items-center justify-between p-4 rounded-xl border ${
                    member.is_active ? 'bg-white border-gray-200' : 'bg-gray-50 border-gray-200 opacity-60'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`p-2 rounded-full ${roleColors[member.role]}`}>
                      <RoleIcon className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-gray-900">
                          {member.first_name} {member.last_name}
                        </p>
                        {!member.is_active && (
                          <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                            Deaktiviert
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {member.email}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        Hinzugefügt am {formatDate(member.invited_at)}
                        {member.invited_by && ` von ${member.invited_by}`}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {/* Rolle */}
                    {isEditing ? (
                      <div className="flex items-center gap-2">
                        <select
                          value={editRole}
                          onChange={(e) => setEditRole(e.target.value)}
                          className="input-styled py-1 text-sm"
                        >
                          {availableRoles.map((role) => (
                            <option key={role.value} value={role.value}>
                              {role.label}
                            </option>
                          ))}
                        </select>
                        <button
                          onClick={() => handleUpdateRole(member.id)}
                          className="p-1 text-green-600 hover:bg-green-50 rounded"
                        >
                          <Check className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="p-1 text-gray-400 hover:bg-gray-100 rounded"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <span className={`px-3 py-1 rounded-full text-sm font-medium border ${roleColors[member.role]}`}>
                        {member.role_label}
                      </span>
                    )}

                    {/* Aktionen - nur wenn nicht Owner */}
                    {member.role !== 'owner' && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setEditingId(member.id);
                            setEditRole(member.role);
                          }}
                          className="p-2 text-gray-400 hover:text-primary-600 hover:bg-gray-100 rounded-lg"
                          title="Rolle ändern"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleToggleActive(member)}
                          className={`p-2 rounded-lg ${
                            member.is_active 
                              ? 'text-gray-400 hover:text-orange-600 hover:bg-orange-50' 
                              : 'text-green-600 hover:bg-green-50'
                          }`}
                          title={member.is_active ? 'Deaktivieren' : 'Aktivieren'}
                        >
                          {member.is_active ? (
                            <AlertTriangle className="h-4 w-4" />
                          ) : (
                            <Check className="h-4 w-4" />
                          )}
                        </button>
                        <button
                          onClick={() => handleRemove(member.id)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                          title="Entfernen"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal: Benutzer hinzufügen */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <UserPlus className="h-5 w-5 text-primary-600" />
                  Benutzer hinzufügen
                </h2>
                <button 
                  onClick={() => setShowAddModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <form onSubmit={handleAddMember} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Vorname *</label>
                  <input
                    type="text"
                    className="input-styled"
                    placeholder="Max"
                    value={newMember.first_name}
                    onChange={(e) => setNewMember({...newMember, first_name: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <label className="label">Nachname *</label>
                  <input
                    type="text"
                    className="input-styled"
                    placeholder="Mustermann"
                    value={newMember.last_name}
                    onChange={(e) => setNewMember({...newMember, last_name: e.target.value})}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="label">E-Mail *</label>
                <input
                  type="email"
                  className="input-styled"
                  placeholder="max@firma.de"
                  value={newMember.email}
                  onChange={(e) => setNewMember({...newMember, email: e.target.value})}
                  required
                />
              </div>

              <div>
                <label className="label">Rolle</label>
                <select
                  className="input-styled"
                  value={newMember.role}
                  onChange={(e) => setNewMember({...newMember, role: e.target.value})}
                >
                  {availableRoles.map((role) => (
                    <option key={role.value} value={role.value}>
                      {role.label} - {role.description}
                    </option>
                  ))}
                </select>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
                <p className="font-medium mb-1">📧 Einladung per E-Mail</p>
                <p>Der neue Benutzer erhält eine E-Mail mit seinen Zugangsdaten und kann sich sofort anmelden.</p>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="btn-secondary"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  disabled={adding}
                  className="btn-primary flex items-center gap-2"
                >
                  {adding ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <UserPlus className="h-4 w-4" />
                  )}
                  Hinzufügen
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default TeamMembers;

