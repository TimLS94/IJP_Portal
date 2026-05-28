"use client";

import { useState, useEffect } from "react";
import { Mail, Save, RotateCcw, Loader2, Eye, EyeOff, Info, CheckCircle, AlertTriangle, ArrowLeft } from "lucide-react";
import { companyAPI } from "@/lib/api";
import toast from "react-hot-toast";
import Link from "next/link";

interface Placeholder { key: string; description: string; }

export default function RejectionSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [settings, setSettings] = useState({ rejection_email_enabled: true, rejection_email_subject: "", rejection_email_text: "" });
  const [defaults, setDefaults] = useState({ subject: "", text: "" });
  const [placeholders, setPlaceholders] = useState<Placeholder[]>([]);

  useEffect(() => { loadSettings(); }, []);

  const loadSettings = async () => {
    try {
      const response = await companyAPI.getRejectionSettings();
      setSettings({ rejection_email_enabled: response.data.rejection_email_enabled, rejection_email_subject: response.data.rejection_email_subject, rejection_email_text: response.data.rejection_email_text });
      setDefaults({ subject: response.data.default_subject, text: response.data.default_text });
      setPlaceholders(response.data.placeholders || []);
    } catch { /* fallback */ }
    finally { setLoading(false); }
  };

  const handleSave = async () => {
    setSaving(true);
    try { await companyAPI.updateRejectionSettings(settings); toast.success("Einstellungen gespeichert"); }
    catch { toast.error("Fehler beim Speichern"); }
    finally { setSaving(false); }
  };

  const handleReset = async () => {
    if (!confirm("Auf Standard zurücksetzen?")) return;
    setSaving(true);
    try {
      const response = await companyAPI.resetRejectionSettings();
      setSettings({ rejection_email_enabled: response.data.rejection_email_enabled, rejection_email_subject: response.data.rejection_email_subject, rejection_email_text: response.data.rejection_email_text });
      toast.success("Zurückgesetzt");
    } catch { toast.error("Fehler"); }
    finally { setSaving(false); }
  };

  const getPreviewText = (text: string) => text.replace(/{salutation}/g, "Sehr geehrter Herr Mustermann").replace(/{company_name}/g, "Muster GmbH").replace(/{applicant_name}/g, "Max Mustermann").replace(/{job_title}/g, "Softwareentwickler");

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-12 w-12 text-primary-600 animate-spin" /></div>;

  return (
    <div className="max-w-4xl mx-auto">
      <Link href="/company/settings" className="inline-flex items-center text-gray-600 hover:text-primary-600 mb-6 group">
        <ArrowLeft className="h-4 w-4 mr-2 group-hover:-translate-x-1 transition-transform" />Zurück zu Einstellungen
      </Link>
      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 bg-primary-100 rounded-xl">
          <Mail className="h-8 w-8 text-primary-600" />
        </div>
        <div><h1 className="text-3xl font-bold text-gray-900">Absage-E-Mail Einstellungen</h1><p className="text-gray-600">Passen Sie die E-Mail an, die bei Absagen versendet wird</p></div>
      </div>

      <div className="space-y-6">
        {/* Aktivierung */}
        <div className="card">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {settings.rejection_email_enabled ? <CheckCircle className="h-6 w-6 text-green-600" /> : <AlertTriangle className="h-6 w-6 text-yellow-600" />}
              <div><h3 className="font-semibold text-gray-900">Absage-E-Mail aktiviert</h3><p className="text-sm text-gray-600">{settings.rejection_email_enabled ? "Bewerber erhalten automatisch eine E-Mail bei Absage" : "Keine E-Mail wird bei Absage versendet"}</p></div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" checked={settings.rejection_email_enabled} onChange={(e) => setSettings({ ...settings, rejection_email_enabled: e.target.checked })} className="sr-only peer" />
              <div className="w-11 h-6 bg-gray-200 peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
            </label>
          </div>
        </div>

        {settings.rejection_email_enabled && (
          <>
            {/* Platzhalter Info */}
            <div className="card bg-blue-50 border-blue-200">
              <div className="flex items-start gap-3">
                <Info className="h-5 w-5 text-blue-600 mt-0.5" />
                <div><h4 className="font-medium text-blue-800 mb-2">Verfügbare Platzhalter</h4>
                  <div className="flex flex-wrap gap-2">
                    {placeholders.map((p) => (<span key={p.key} className="bg-white px-3 py-1 rounded-full text-sm border border-blue-200"><code className="text-blue-700 font-mono">{p.key}</code><span className="text-gray-500 ml-2">= {p.description}</span></span>))}
                  </div>
                </div>
              </div>
            </div>

            {/* Betreff */}
            <div className="card">
              <label className="label">E-Mail Betreff</label>
              <input type="text" className="input-styled" value={settings.rejection_email_subject} onChange={(e) => setSettings({ ...settings, rejection_email_subject: e.target.value })} placeholder="z.B. Ihre Bewerbung bei {company_name}" />
            </div>

            {/* Text */}
            <div className="card">
              <div className="flex items-center justify-between mb-2">
                <label className="label mb-0">E-Mail Text</label>
                <button onClick={() => setShowPreview(!showPreview)} className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1">
                  {showPreview ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  {showPreview ? "Bearbeiten" : "Vorschau"}
                </button>
              </div>
              
              {showPreview ? (
                <div className="bg-gray-100 rounded-lg p-6 border">
                  <div className="text-center text-sm text-gray-500 mb-4 flex items-center justify-center gap-2"><Eye className="h-4 w-4" /><span>Vorschau mit Beispieldaten</span></div>
                  <div className="bg-white rounded-xl shadow-lg overflow-hidden max-w-lg mx-auto">
                    <div className="bg-gradient-to-r from-red-500 to-red-600 text-white p-4">
                      <div className="flex items-center gap-2 text-sm opacity-80 mb-1"><Mail className="h-4 w-4" />Absage-E-Mail</div>
                      <div className="font-semibold">{getPreviewText(settings.rejection_email_subject || defaults.subject)}</div>
                    </div>
                    <div className="p-6">
                      <div className="text-sm text-gray-500 mb-4 flex items-center gap-2"><span className="font-medium">An:</span><span className="bg-gray-100 px-2 py-0.5 rounded">max.mustermann@email.de</span></div>
                      <div className="whitespace-pre-line text-gray-800 leading-relaxed">{getPreviewText(settings.rejection_email_text || defaults.text)}</div>
                    </div>
                    <div className="bg-gray-50 px-6 py-3 border-t text-xs text-gray-500">Diese E-Mail wird automatisch versendet wenn Sie einen Bewerber absagen.</div>
                  </div>
                  <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-sm text-green-700 flex items-center gap-2"><CheckCircle className="h-4 w-4" /><span>Die Platzhalter werden automatisch durch die echten Daten ersetzt.</span></p>
                  </div>
                </div>
              ) : (
                <textarea className="input-styled font-mono text-sm" rows={12} value={settings.rejection_email_text} onChange={(e) => setSettings({ ...settings, rejection_email_text: e.target.value })} placeholder="Geben Sie hier den E-Mail Text ein..." />
              )}
            </div>
          </>
        )}

        {/* Aktionen */}
        <div className="flex items-center justify-between">
          <button onClick={handleReset} disabled={saving} className="btn-secondary flex items-center gap-2"><RotateCcw className="h-4 w-4" />Auf Standard zurücksetzen</button>
          <button onClick={handleSave} disabled={saving} className="btn-primary flex items-center gap-2">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}Speichern</button>
        </div>
      </div>
    </div>
  );
}
