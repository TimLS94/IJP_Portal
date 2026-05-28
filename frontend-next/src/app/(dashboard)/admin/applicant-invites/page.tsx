"use client";

import { useState, useEffect } from "react";
import { Users, Plus, Trash2, Copy, Check, X, Calendar, Clock, Loader2, Info, MapPin, Download, Eye } from "lucide-react";
import { adminAPI } from "@/lib/api";
import toast from "react-hot-toast";

interface ApplicantInvite {
  id: number;
  token: string;
  source_name: string;
  source_country?: string;
  description?: string;
  is_active: boolean;
  is_valid: boolean;
  max_uses?: number;
  current_uses: number;
  registered_applicants: number;
  created_at: string;
  expires_at?: string;
  last_used_at?: string;
  registration_url: string;
}

interface InvitedApplicant {
  id: number;
  name: string;
  email: string;
  nationality?: string;
  registered_at: string;
}

export default function AdminApplicantInvitesPage() {
  const [invites, setInvites] = useState<ApplicantInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showApplicants, setShowApplicants] = useState<{ invite: ApplicantInvite; applicants: InvitedApplicant[] } | null>(null);
  const [newInvite, setNewInvite] = useState({ 
    source_name: "", 
    source_country: "",
    description: "",
    max_uses: "",
    expires_days: ""
  });
  const [creating, setCreating] = useState(false);
  const [loadingApplicants, setLoadingApplicants] = useState(false);

  useEffect(() => {
    loadInvites();
  }, []);

  const loadInvites = async () => {
    try {
      const response = await adminAPI.listApplicantInvites();
      setInvites(response.data.invites || []);
    } catch (error) {
      toast.error("Fehler beim Laden");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newInvite.source_name.trim()) {
      toast.error("Quellenname ist erforderlich");
      return;
    }
    setCreating(true);
    try {
      const data: Record<string, string | number | undefined> = {
        source_name: newInvite.source_name.trim(),
        source_country: newInvite.source_country.trim() || undefined,
        description: newInvite.description.trim() || undefined,
      };
      if (newInvite.max_uses) {
        data.max_uses = parseInt(newInvite.max_uses);
      }
      if (newInvite.expires_days) {
        data.expires_in_days = parseInt(newInvite.expires_days);
      }
      await adminAPI.createApplicantInvite(data);
      toast.success("Einladungs-Link erstellt!");
      setNewInvite({ source_name: "", source_country: "", description: "", max_uses: "", expires_days: "" });
      setShowCreate(false);
      loadInvites();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { detail?: string } } };
      toast.error(err.response?.data?.detail || "Fehler beim Erstellen");
    } finally {
      setCreating(false);
    }
  };

  const handleToggle = async (id: number) => {
    try {
      await adminAPI.toggleApplicantInvite(id);
      loadInvites();
      toast.success("Status geändert");
    } catch (error) {
      toast.error("Fehler beim Umschalten");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Einladungs-Link wirklich löschen?")) return;
    try {
      await adminAPI.deleteApplicantInvite(id);
      toast.success("Link gelöscht");
      loadInvites();
    } catch (error) {
      toast.error("Fehler beim Löschen");
    }
  };

  const loadApplicants = async (invite: ApplicantInvite) => {
    setLoadingApplicants(true);
    try {
      const response = await adminAPI.getApplicantInviteApplicants(invite.id);
      setShowApplicants({ invite, applicants: response.data.applicants || [] });
    } catch (error) {
      toast.error("Fehler beim Laden der Bewerber");
    } finally {
      setLoadingApplicants(false);
    }
  };

  const copyLink = (invite: ApplicantInvite) => {
    const baseUrl = typeof window !== "undefined" ? window.location.origin : "https://www.jobon.work";
    navigator.clipboard.writeText(`${baseUrl}/register?source=${invite.token}`);
    toast.success("Link kopiert!");
  };

  const exportCSV = async () => {
    try {
      const response = await adminAPI.exportApplicantsCSV();
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `bewerber_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success("CSV exportiert!");
    } catch (error) {
      toast.error("Fehler beim Export");
    }
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

  const getUsageLabel = (invite: ApplicantInvite) => {
    if (invite.max_uses === null || invite.max_uses === undefined) {
      return `${invite.current_uses} (unbegrenzt)`;
    }
    return `${invite.current_uses} / ${invite.max_uses}`;
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <Users className="h-8 w-8 text-primary-600" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Bewerber-Einladungen</h1>
            <p className="text-gray-600">Erstellen Sie Links für Sprachschulen und Partner zur Bewerber-Registrierung</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={exportCSV}
            className="btn-secondary flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            CSV Export
          </button>
          <button 
            onClick={() => setShowCreate(true)} 
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Neuer Link
          </button>
        </div>
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 text-blue-600 mt-0.5" />
          <div>
            <h3 className="font-semibold text-blue-900">So funktioniert&apos;s:</h3>
            <ul className="text-sm text-blue-800 mt-1 space-y-1">
              <li>• Erstellen Sie einen Einladungs-Link für eine Sprachschule oder einen Partner</li>
              <li>• Geben Sie den Quellennamen an (z.B. &quot;Sprachschule Taschkent&quot;)</li>
              <li>• Bewerber, die sich über diesen Link registrieren, werden automatisch dieser Quelle zugeordnet</li>
              <li>• Sie können jederzeit sehen, welche Bewerber von welcher Quelle kamen</li>
              <li>• Der CSV-Export enthält die Quelleninformationen für alle Bewerber</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Users className="h-5 w-5 text-primary-600" />
              Neuen Bewerber-Einladungslink erstellen
            </h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Quellenname <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="z.B. Sprachschule Taschkent"
                  value={newInvite.source_name}
                  onChange={(e) => setNewInvite({ ...newInvite, source_name: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Land (optional)
                </label>
                <input
                  type="text"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="z.B. Usbekistan"
                  value={newInvite.source_country}
                  onChange={(e) => setNewInvite({ ...newInvite, source_country: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Beschreibung (optional)
                </label>
                <textarea
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Zusätzliche Notizen..."
                  rows={2}
                  value={newInvite.description}
                  onChange={(e) => setNewInvite({ ...newInvite, description: e.target.value })}
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
                    value={newInvite.max_uses}
                    onChange={(e) => setNewInvite({ ...newInvite, max_uses: e.target.value })}
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
                    value={newInvite.expires_days}
                    onChange={(e) => setNewInvite({ ...newInvite, expires_days: e.target.value })}
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

      {/* Applicants Modal */}
      {showApplicants && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full p-6 max-h-[80vh] overflow-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Users className="h-5 w-5 text-primary-600" />
                Bewerber von: {showApplicants.invite.source_name}
                {showApplicants.invite.source_country && (
                  <span className="text-gray-500 font-normal">({showApplicants.invite.source_country})</span>
                )}
              </h3>
              <button onClick={() => setShowApplicants(null)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            {showApplicants.applicants.length === 0 ? (
              <p className="text-gray-500 text-center py-8">Noch keine Bewerber über diesen Link registriert</p>
            ) : (
              <div className="space-y-2">
                {showApplicants.applicants.map((applicant) => (
                  <div key={applicant.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium">{applicant.name}</p>
                      <p className="text-sm text-gray-500">{applicant.email}</p>
                    </div>
                    <div className="text-right text-sm text-gray-500">
                      {applicant.nationality && <p>{applicant.nationality}</p>}
                      <p>{formatDateTime(applicant.registered_at)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            <div className="mt-4 pt-4 border-t flex justify-end">
              <button onClick={() => setShowApplicants(null)} className="btn-secondary">
                Schließen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invite List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-12 w-12 animate-spin text-primary-600" />
        </div>
      ) : invites.length === 0 ? (
        <div className="card text-center py-12">
          <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">Noch keine Bewerber-Einladungen erstellt</p>
          <button 
            onClick={() => setShowCreate(true)}
            className="btn-primary mt-4"
          >
            Ersten Link erstellen
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {invites.map((invite) => (
            <div 
              key={invite.id} 
              className={`card border-l-4 ${
                invite.is_active && invite.is_valid ? "border-l-green-500" : "border-l-gray-300"
              }`}
            >
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                {/* Left: Info */}
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <Users className="h-5 w-5 text-gray-400" />
                    <span className="font-semibold text-lg">
                      {invite.source_name}
                    </span>
                    {invite.source_country && (
                      <span className="flex items-center gap-1 text-sm text-gray-500">
                        <MapPin className="h-3 w-3" />
                        {invite.source_country}
                      </span>
                    )}
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      invite.is_active && invite.is_valid
                        ? "bg-green-100 text-green-700" 
                        : "bg-gray-100 text-gray-600"
                    }`}>
                      {invite.is_active && invite.is_valid ? "Aktiv" : invite.is_active ? "Abgelaufen" : "Inaktiv"}
                    </span>
                  </div>

                  {invite.description && (
                    <p className="text-sm text-gray-600 mb-2">{invite.description}</p>
                  )}
                  
                  {/* Meta Info */}
                  <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 mb-3">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      Erstellt: {formatDateTime(invite.created_at)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      Gültig bis: {getExpiryLabel(invite.expires_at)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      Nutzungen: {getUsageLabel(invite)}
                    </span>
                    <span className="flex items-center gap-1 font-medium text-primary-600">
                      <Users className="h-4 w-4" />
                      {invite.registered_applicants} Bewerber registriert
                    </span>
                  </div>

                  {/* Registration Link */}
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-1">Registrierungs-Link:</p>
                    <code className="text-sm text-primary-600 break-all">
                      {typeof window !== "undefined" ? window.location.origin : "https://www.jobon.work"}/register?source={invite.token}
                    </code>
                  </div>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => loadApplicants(invite)}
                    disabled={loadingApplicants}
                    className="btn-secondary text-sm flex items-center gap-1"
                    title="Bewerber anzeigen"
                  >
                    <Eye className="h-4 w-4" />
                    Bewerber
                  </button>
                  <button
                    onClick={() => copyLink(invite)}
                    className="btn-secondary text-sm flex items-center gap-1"
                  >
                    <Copy className="h-4 w-4" />
                    Kopieren
                  </button>
                  <button
                    onClick={() => handleToggle(invite.id)}
                    className={`p-2 rounded-lg transition-colors ${
                      invite.is_active 
                        ? "bg-green-100 text-green-600 hover:bg-green-200" 
                        : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                    }`}
                    title={invite.is_active ? "Deaktivieren" : "Aktivieren"}
                  >
                    {invite.is_active ? <Check className="h-5 w-5" /> : <X className="h-5 w-5" />}
                  </button>
                  <button
                    onClick={() => handleDelete(invite.id)}
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
