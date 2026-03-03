import { useState, useEffect } from 'react';
import { adminAPI } from '../../lib/api';
import toast from 'react-hot-toast';
import {
  Link2, Plus, Copy, Trash2, ToggleLeft, ToggleRight, Loader2,
  Calendar, Users, CheckCircle, XCircle, Clock, ExternalLink
} from 'lucide-react';

function InviteTokens() {
  const [tokens, setTokens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  
  const [newToken, setNewToken] = useState({
    name: '',
    description: '',
    expires_in_days: '',
    max_uses: ''
  });

  useEffect(() => {
    loadTokens();
  }, []);

  const loadTokens = async () => {
    try {
      const response = await adminAPI.listInviteTokens();
      setTokens(response.data);
    } catch (error) {
      console.error('Fehler beim Laden der Tokens:', error);
      toast.error('Tokens konnten nicht geladen werden');
    } finally {
      setLoading(false);
    }
  };

  const createToken = async (e) => {
    e.preventDefault();
    setCreating(true);
    
    try {
      const data = {
        name: newToken.name || null,
        description: newToken.description || null,
        expires_in_days: newToken.expires_in_days ? parseInt(newToken.expires_in_days) : null,
        max_uses: newToken.max_uses ? parseInt(newToken.max_uses) : null
      };
      
      const response = await adminAPI.createInviteToken(data);
      setTokens([response.data, ...tokens]);
      setShowCreateModal(false);
      setNewToken({ name: '', description: '', expires_in_days: '', max_uses: '' });
      toast.success('Einladungs-Link erstellt!');
      
      // URL in Zwischenablage kopieren
      const url = `${window.location.origin}/register/company?invite=${response.data.token}`;
      navigator.clipboard.writeText(url);
      toast.success('Link wurde in die Zwischenablage kopiert!');
    } catch (error) {
      console.error('Fehler beim Erstellen:', error);
      toast.error('Token konnte nicht erstellt werden');
    } finally {
      setCreating(false);
    }
  };

  const copyLink = (token) => {
    const url = `${window.location.origin}/register/company?invite=${token}`;
    navigator.clipboard.writeText(url);
    toast.success('Link kopiert!');
  };

  const toggleToken = async (id) => {
    try {
      const response = await adminAPI.toggleInviteToken(id);
      setTokens(tokens.map(t => t.id === id ? { ...t, is_active: response.data.is_active } : t));
      toast.success(response.data.message);
    } catch (error) {
      toast.error('Fehler beim Ändern des Status');
    }
  };

  const deleteToken = async (id) => {
    if (!confirm('Token wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.')) return;
    
    try {
      await adminAPI.deleteInviteToken(id);
      setTokens(tokens.filter(t => t.id !== id));
      toast.success('Token gelöscht');
    } catch (error) {
      toast.error('Fehler beim Löschen');
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'Unbegrenzt';
    return new Date(dateStr).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Einladungs-Links</h1>
          <p className="text-gray-600 mt-1">
            Erstellen Sie Links, mit denen sich Firmen ohne Admin-Bestätigung registrieren können
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="h-5 w-5" />
          Neuer Link
        </button>
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <h3 className="font-medium text-blue-900 mb-2">So funktioniert's:</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Erstellen Sie einen Einladungs-Link mit optionalem Ablaufdatum und Nutzungslimit</li>
          <li>• Teilen Sie den Link mit Firmen, die sich registrieren sollen</li>
          <li>• Firmen, die sich über den Link registrieren, sind sofort aktiv (keine Bestätigung nötig)</li>
          <li>• Sie können Links jederzeit deaktivieren</li>
        </ul>
      </div>

      {/* Token Liste */}
      {tokens.length === 0 ? (
        <div className="card text-center py-12">
          <Link2 className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Keine Einladungs-Links</h2>
          <p className="text-gray-600 mb-4">
            Erstellen Sie Ihren ersten Einladungs-Link für Firmen.
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn-primary inline-flex items-center gap-2"
          >
            <Plus className="h-5 w-5" />
            Ersten Link erstellen
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {tokens.map(token => (
            <div 
              key={token.id} 
              className={`card ${!token.is_active ? 'opacity-60 bg-gray-50' : ''}`}
            >
              <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                {/* Info */}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Link2 className="h-5 w-5 text-primary-600" />
                    <span className="font-semibold text-gray-900">
                      {token.name || 'Einladungs-Link'}
                    </span>
                    {token.is_valid ? (
                      <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-medium flex items-center gap-1">
                        <CheckCircle className="h-3 w-3" />
                        Aktiv
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs font-medium flex items-center gap-1">
                        <XCircle className="h-3 w-3" />
                        Inaktiv
                      </span>
                    )}
                  </div>
                  
                  {token.description && (
                    <p className="text-sm text-gray-600 mb-2">{token.description}</p>
                  )}
                  
                  <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      Erstellt: {formatDate(token.created_at)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      Gültig bis: {formatDate(token.expires_at)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      Nutzungen: {token.current_uses}{token.max_uses ? ` / ${token.max_uses}` : ' (unbegrenzt)'}
                    </span>
                  </div>
                  
                  {token.last_used_at && (
                    <p className="text-xs text-gray-400 mt-1">
                      Zuletzt verwendet: {formatDate(token.last_used_at)}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => copyLink(token.token)}
                    className="btn-secondary text-sm flex items-center gap-1"
                    title="Link kopieren"
                  >
                    <Copy className="h-4 w-4" />
                    Kopieren
                  </button>
                  <button
                    onClick={() => toggleToken(token.id)}
                    className={`p-2 rounded-lg ${token.is_active ? 'text-green-600 hover:bg-green-50' : 'text-gray-400 hover:bg-gray-100'}`}
                    title={token.is_active ? 'Deaktivieren' : 'Aktivieren'}
                  >
                    {token.is_active ? (
                      <ToggleRight className="h-6 w-6" />
                    ) : (
                      <ToggleLeft className="h-6 w-6" />
                    )}
                  </button>
                  <button
                    onClick={() => deleteToken(token.id)}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                    title="Löschen"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
              </div>
              
              {/* Token URL */}
              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500 mb-1">Registrierungs-Link:</p>
                <code className="text-sm text-primary-600 break-all">
                  {window.location.origin}/register/company?invite={token.token}
                </code>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
            <div className="p-6 border-b">
              <h2 className="text-xl font-bold text-gray-900">Neuen Einladungs-Link erstellen</h2>
              <p className="text-sm text-gray-600 mt-1">
                Firmen können sich über diesen Link ohne Bestätigung registrieren
              </p>
            </div>
            
            <form onSubmit={createToken} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name (optional)
                </label>
                <input
                  type="text"
                  value={newToken.name}
                  onChange={(e) => setNewToken({ ...newToken, name: e.target.value })}
                  placeholder="z.B. Messe-Kontakte März 2026"
                  className="input"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Beschreibung (optional)
                </label>
                <textarea
                  value={newToken.description}
                  onChange={(e) => setNewToken({ ...newToken, description: e.target.value })}
                  placeholder="Interne Notiz zum Verwendungszweck"
                  className="input"
                  rows={2}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Gültig für (Tage)
                  </label>
                  <input
                    type="number"
                    value={newToken.expires_in_days}
                    onChange={(e) => setNewToken({ ...newToken, expires_in_days: e.target.value })}
                    placeholder="Unbegrenzt"
                    min="1"
                    className="input"
                  />
                  <p className="text-xs text-gray-500 mt-1">Leer = unbegrenzt</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Max. Nutzungen
                  </label>
                  <input
                    type="number"
                    value={newToken.max_uses}
                    onChange={(e) => setNewToken({ ...newToken, max_uses: e.target.value })}
                    placeholder="Unbegrenzt"
                    min="1"
                    className="input"
                  />
                  <p className="text-xs text-gray-500 mt-1">Leer = unbegrenzt</p>
                </div>
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
                    <>
                      <Plus className="h-5 w-5" />
                      Erstellen
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default InviteTokens;
