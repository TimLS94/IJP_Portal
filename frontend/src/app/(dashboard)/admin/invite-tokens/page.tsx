"use client";

import { useState, useEffect } from "react";
import { Link2, Plus, Trash2, Copy, Check, X, Calendar, Users, Clock, Loader2, Info } from "lucide-react";
import { adminAPI } from "@/lib/api";
import toast from "react-hot-toast";

interface InviteToken {
  id: number;
  token: string;
  name?: string;
  description?: string;
  is_active: boolean;
  max_uses?: number;
  current_uses: number;
  created_at: string;
  expires_at?: string;
  last_used_at?: string;
}

export default function AdminInviteTokensPage() {
  const [tokens, setTokens] = useState<InviteToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newToken, setNewToken] = useState({ 
    name: "", 
    description: "",
    max_uses: "",
    expires_days: ""
  });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadTokens();
  }, []);

  const loadTokens = async () => {
    try {
      const response = await adminAPI.listInviteTokens();
      setTokens(response.data || []);
    } catch (error) {
      toast.error("Fehler beim Laden");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      const data: Record<string, string | number | undefined> = {
        name: newToken.name || undefined,
        description: newToken.description || undefined,
      };
      if (newToken.max_uses) {
        data.max_uses = parseInt(newToken.max_uses);
      }
      if (newToken.expires_days) {
        data.expires_days = parseInt(newToken.expires_days);
      }
      await adminAPI.createInviteToken(data);
      toast.success("Einladungs-Link erstellt!");
      setNewToken({ name: "", description: "", max_uses: "", expires_days: "" });
      setShowCreate(false);
      loadTokens();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { detail?: string } } };
      toast.error(err.response?.data?.detail || "Fehler beim Erstellen");
    } finally {
      setCreating(false);
    }
  };

  const handleToggle = async (id: number) => {
    try {
      await adminAPI.toggleInviteToken(id);
      loadTokens();
      toast.success("Status geändert");
    } catch (error) {
      toast.error("Fehler beim Umschalten");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Einladungs-Link wirklich löschen?")) return;
    try {
      await adminAPI.deleteInviteToken(id);
      toast.success("Link gelöscht");
      loadTokens();
    } catch (error) {
      toast.error("Fehler beim Löschen");
    }
  };

  const copyLink = (token: string) => {
    const baseUrl = typeof window !== "undefined" ? window.location.origin : "https://www.jobon.work";
    navigator.clipboard.writeText(`${baseUrl}/register/company?invite=${token}`);
    toast.success("Link kopiert!");
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const getExpiryLabel = (expiresAt?: string) => {
    if (!expiresAt) return "Unbegrenzt";
    const date = new Date(expiresAt);
    const now = new Date();
    if (date < now) return "Abgelaufen";
    return formatDateTime(expiresAt);
  };

  const getUsageLabel = (token: InviteToken) => {
    if (token.max_uses === null || token.max_uses === undefined) {
      return `${token.current_uses} (unbegrenzt)`;
    }
    return `${token.current_uses} / ${token.max_uses}`;
  };

  const getRegistrationLink = (token: string) => {
    const baseUrl = typeof window !== "undefined" ? window.location.origin : "https://www.jobon.work";
    return `${baseUrl}/register/company?invite=${token}`;
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <Link2 className="h-8 w-8 text-primary-600" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Einladungs-Links</h1>
            <p className="text-gray-600">Erstellen Sie Links, mit denen sich Firmen ohne Admin-Bestätigung registrieren können</p>
          </div>
        </div>
        <button 
          onClick={() => setShowCreate(true)} 
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Neuer Link
        </button>
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 text-blue-600 mt-0.5" />
          <div>
            <h3 className="font-semibold text-blue-900">So funktioniert&apos;s:</h3>
            <ul className="text-sm text-blue-800 mt-1 space-y-1">
              <li>• Erstellen Sie einen Einladungs-Link mit optionalem Ablaufdatum und Nutzungslimit</li>
              <li>• Teilen Sie den Link mit Firmen, die sich registrieren sollen</li>
              <li>• Firmen, die sich über den Link registrieren, sind sofort aktiv (keine Bestätigung nötig)</li>
              <li>• Sie können Links jederzeit deaktivieren</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Link2 className="h-5 w-5 text-primary-600" />
              Neuen Einladungs-Link erstellen
            </h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name / Beschreibung
                </label>
                <input
                  type="text"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="z.B. Kuffler Gruppe"
                  value={newToken.name}
                  onChange={(e) => setNewToken({ ...newToken, name: e.target.value })}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Max. Nutzungen
                  </label>
                  <input
                    type="number"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="Unbegrenzt"
                    min="1"
                    value={newToken.max_uses}
                    onChange={(e) => setNewToken({ ...newToken, max_uses: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Gültig für (Tage)
                  </label>
                  <input
                    type="number"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="Unbegrenzt"
                    min="1"
                    value={newToken.expires_days}
                    onChange={(e) => setNewToken({ ...newToken, expires_days: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button 
                  type="button" 
                  onClick={() => setShowCreate(false)} 
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
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Erstelle...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4" />
                      Erstellen
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Token List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-12 w-12 animate-spin text-primary-600" />
        </div>
      ) : tokens.length === 0 ? (
        <div className="card text-center py-12">
          <Link2 className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">Noch keine Einladungs-Links erstellt</p>
          <button 
            onClick={() => setShowCreate(true)}
            className="btn-primary mt-4"
          >
            Ersten Link erstellen
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {tokens.map((token) => (
            <div 
              key={token.id} 
              className={`card border-l-4 ${
                token.is_active ? "border-l-green-500" : "border-l-gray-300"
              }`}
            >
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                {/* Left: Info */}
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <Link2 className="h-5 w-5 text-gray-400" />
                    <span className="font-semibold text-lg">
                      {token.name || "Einladungs-Link"}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      token.is_active 
                        ? "bg-green-100 text-green-700" 
                        : "bg-gray-100 text-gray-600"
                    }`}>
                      {token.is_active ? "Aktiv" : "Inaktiv"}
                    </span>
                  </div>
                  
                  {/* Meta Info */}
                  <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 mb-3">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      Erstellt: {formatDateTime(token.created_at)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      Gültig bis: {getExpiryLabel(token.expires_at)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      Nutzungen: {getUsageLabel(token)}
                    </span>
                  </div>

                  {/* Registration Link */}
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-1">Registrierungs-Link:</p>
                    <code className="text-sm text-primary-600 break-all">
                      {getRegistrationLink(token.token)}
                    </code>
                  </div>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => copyLink(token.token)}
                    className="btn-secondary text-sm flex items-center gap-1"
                  >
                    <Copy className="h-4 w-4" />
                    Kopieren
                  </button>
                  <button
                    onClick={() => handleToggle(token.id)}
                    className={`p-2 rounded-lg transition-colors ${
                      token.is_active 
                        ? "bg-green-100 text-green-600 hover:bg-green-200" 
                        : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                    }`}
                    title={token.is_active ? "Deaktivieren" : "Aktivieren"}
                  >
                    {token.is_active ? <Check className="h-5 w-5" /> : <X className="h-5 w-5" />}
                  </button>
                  <button
                    onClick={() => handleDelete(token.id)}
                    className="p-2 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-colors"
                    title="Löschen"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
