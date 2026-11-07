"use client";

import { useState, useEffect } from "react";
import {
  Calendar, Plus, Trash2, Loader2, CheckCircle2, Clock,
  Pencil, X, Save, Users,
} from "lucide-react";
import { adminInterviewCandidatesAPI } from "@/lib/api";
import toast from "react-hot-toast";

interface Candidate {
  id: number;
  first_name: string;
  last_name: string;
  german_level?: string | null;
  english_level?: string | null;
  notes?: string | null;
  interview_done: boolean;
  interview_date?: string | null;
  partner_source?: string | null;
  partner_name?: string | null;
  created_at: string;
  updated_at?: string;
}

const LANG_LEVELS = ["", "A1", "A2", "B1", "B2", "C1", "C2", "Muttersprache"];

const EMPTY_FORM = {
  first_name: "",
  last_name: "",
  german_level: "",
  english_level: "",
  notes: "",
  interview_done: false,
  interview_date: "",
};

export default function AdminInterviewCandidatesPage() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [editId, setEditId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ ...EMPTY_FORM });

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    try {
      const res = await adminInterviewCandidatesAPI.list();
      setCandidates(res.data.candidates || []);
    } catch {
      toast.error("Fehler beim Laden der Kandidaten");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.first_name.trim() || !form.last_name.trim()) {
      toast.error("Vor- und Nachname sind Pflichtfelder");
      return;
    }
    setSaving(true);
    try {
      await adminInterviewCandidatesAPI.create({
        ...form,
        interview_date: form.interview_date || null,
      });
      toast.success("Kandidat angelegt");
      setForm({ ...EMPTY_FORM });
      setShowCreate(false);
      load();
    } catch {
      toast.error("Fehler beim Anlegen");
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (c: Candidate) => {
    setEditId(c.id);
    setEditForm({
      first_name: c.first_name,
      last_name: c.last_name,
      german_level: c.german_level || "",
      english_level: c.english_level || "",
      notes: c.notes || "",
      interview_done: c.interview_done,
      interview_date: c.interview_date || "",
    });
  };

  const saveEdit = async (id: number) => {
    if (!editForm.first_name.trim() || !editForm.last_name.trim()) {
      toast.error("Vor- und Nachname sind Pflichtfelder");
      return;
    }
    setSaving(true);
    try {
      await adminInterviewCandidatesAPI.update(id, {
        ...editForm,
        interview_date: editForm.interview_date || "",
      });
      toast.success("Gespeichert");
      setEditId(null);
      load();
    } catch {
      toast.error("Fehler beim Speichern");
    } finally {
      setSaving(false);
    }
  };

  const toggleDone = async (c: Candidate) => {
    const next = !c.interview_done;
    try {
      await adminInterviewCandidatesAPI.update(c.id, {
        interview_done: next,
        // Beim Abhaken ohne Datum automatisch heute setzen
        interview_date: next && !c.interview_date ? new Date().toISOString().slice(0, 10) : (c.interview_date || ""),
      });
      load();
    } catch {
      toast.error("Fehler beim Aktualisieren");
    }
  };

  const handleDelete = async (c: Candidate) => {
    if (!confirm(`Kandidat "${c.first_name} ${c.last_name}" wirklich löschen?`)) return;
    try {
      await adminInterviewCandidatesAPI.delete(c.id);
      toast.success("Gelöscht");
      load();
    } catch {
      toast.error("Fehler beim Löschen");
    }
  };

  const formatDate = (d?: string | null) => {
    if (!d) return "–";
    return new Date(d).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
  };

  const openCount = candidates.filter((c) => !c.interview_done).length;
  const doneCount = candidates.filter((c) => c.interview_done).length;

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8 gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Calendar className="h-8 w-8 text-primary-600" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Gesprächs-Kandidaten</h1>
            <p className="text-gray-600">Kandidaten für Bewerbungsgespräche – intern oder von Partnern angelegt</p>
          </div>
        </div>
        <button onClick={() => setShowCreate(!showCreate)} className="btn-primary flex items-center gap-2">
          <Plus className="h-5 w-5" />
          Kandidat anlegen
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="card text-center py-4">
          <p className="text-3xl font-bold text-gray-900">{candidates.length}</p>
          <p className="text-sm text-gray-500">Gesamt</p>
        </div>
        <div className="card text-center py-4 bg-amber-50 border border-amber-100">
          <p className="text-3xl font-bold text-amber-700">{openCount}</p>
          <p className="text-sm text-amber-600">Offen</p>
        </div>
        <div className="card text-center py-4 bg-green-50 border border-green-100">
          <p className="text-3xl font-bold text-green-700">{doneCount}</p>
          <p className="text-sm text-green-600">Gespräch durchgeführt</p>
        </div>
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="card mb-6 border-2 border-primary-200 bg-primary-50">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Plus className="h-5 w-5 text-primary-600" />
            Neuen Kandidaten anlegen
          </h2>
          <form onSubmit={handleCreate} className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="label">Vorname *</label>
              <input className="input-styled" value={form.first_name}
                onChange={(e) => setForm({ ...form, first_name: e.target.value })} required />
            </div>
            <div>
              <label className="label">Name *</label>
              <input className="input-styled" value={form.last_name}
                onChange={(e) => setForm({ ...form, last_name: e.target.value })} required />
            </div>
            <div>
              <label className="label">Deutsch</label>
              <select className="input-styled" value={form.german_level}
                onChange={(e) => setForm({ ...form, german_level: e.target.value })}>
                {LANG_LEVELS.map((l) => <option key={l} value={l}>{l || "— keine Angabe —"}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Englisch</label>
              <select className="input-styled" value={form.english_level}
                onChange={(e) => setForm({ ...form, english_level: e.target.value })}>
                {LANG_LEVELS.map((l) => <option key={l} value={l}>{l || "— keine Angabe —"}</option>)}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="label">Notizen</label>
              <textarea className="input-styled" rows={3} value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="done-new" className="accent-primary-600 h-4 w-4"
                checked={form.interview_done}
                onChange={(e) => setForm({ ...form, interview_done: e.target.checked })} />
              <label htmlFor="done-new" className="text-sm text-gray-700">Gespräch durchgeführt</label>
            </div>
            <div>
              <label className="label">Datum des Gesprächs</label>
              <input type="date" className="input-styled" value={form.interview_date}
                onChange={(e) => setForm({ ...form, interview_date: e.target.value })} />
            </div>
            <div className="md:col-span-2 flex gap-3">
              <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Anlegen
              </button>
              <button type="button" onClick={() => setShowCreate(false)} className="btn-secondary">Abbrechen</button>
            </div>
          </form>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-10 w-10 text-primary-600 animate-spin" /></div>
      ) : candidates.length === 0 ? (
        <div className="card text-center py-16">
          <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 text-lg">Noch keine Kandidaten</p>
        </div>
      ) : (
        <div className="space-y-3">
          {candidates.map((c) => (
            <div key={c.id} className="card border border-gray-200">
              {editId === c.id ? (
                /* ---- Edit mode ---- */
                <div className="grid md:grid-cols-2 gap-3">
                  <input className="input-styled" placeholder="Vorname" value={editForm.first_name}
                    onChange={(e) => setEditForm({ ...editForm, first_name: e.target.value })} />
                  <input className="input-styled" placeholder="Name" value={editForm.last_name}
                    onChange={(e) => setEditForm({ ...editForm, last_name: e.target.value })} />
                  <select className="input-styled" value={editForm.german_level}
                    onChange={(e) => setEditForm({ ...editForm, german_level: e.target.value })}>
                    {LANG_LEVELS.map((l) => <option key={l} value={l}>{l ? `Deutsch: ${l}` : "Deutsch: — keine —"}</option>)}
                  </select>
                  <select className="input-styled" value={editForm.english_level}
                    onChange={(e) => setEditForm({ ...editForm, english_level: e.target.value })}>
                    {LANG_LEVELS.map((l) => <option key={l} value={l}>{l ? `Englisch: ${l}` : "Englisch: — keine —"}</option>)}
                  </select>
                  <textarea className="input-styled md:col-span-2" rows={2} placeholder="Notizen" value={editForm.notes}
                    onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} />
                  <label className="flex items-center gap-2 text-sm text-gray-700">
                    <input type="checkbox" className="accent-primary-600 h-4 w-4" checked={editForm.interview_done}
                      onChange={(e) => setEditForm({ ...editForm, interview_done: e.target.checked })} />
                    Gespräch durchgeführt
                  </label>
                  <input type="date" className="input-styled" value={editForm.interview_date}
                    onChange={(e) => setEditForm({ ...editForm, interview_date: e.target.value })} />
                  <div className="md:col-span-2 flex gap-2">
                    <button onClick={() => saveEdit(c.id)} disabled={saving}
                      className="btn-primary flex items-center gap-2">
                      {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Speichern
                    </button>
                    <button onClick={() => setEditId(null)} className="btn-secondary flex items-center gap-2">
                      <X className="h-4 w-4" /> Abbrechen
                    </button>
                  </div>
                </div>
              ) : (
                /* ---- View mode ---- */
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap">
                      <h3 className="font-bold text-gray-900 text-lg">{c.first_name} {c.last_name}</h3>
                      {c.interview_done ? (
                        <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Durchgeführt {c.interview_date ? `am ${formatDate(c.interview_date)}` : ""}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">
                          <Clock className="h-3.5 w-3.5" /> Offen
                        </span>
                      )}
                      <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                        {c.partner_name ? `Partner: ${c.partner_name}` : "IJP intern"}
                      </span>
                    </div>
                    <div className="flex gap-4 mt-1 text-sm text-gray-600">
                      <span>Deutsch: <strong>{c.german_level || "–"}</strong></span>
                      <span>Englisch: <strong>{c.english_level || "–"}</strong></span>
                    </div>
                    {c.notes && <p className="text-sm text-gray-500 mt-1 whitespace-pre-wrap">{c.notes}</p>}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => toggleDone(c)}
                      className={`p-2 rounded-lg transition-colors ${c.interview_done ? "text-green-600 hover:bg-green-50" : "text-gray-400 hover:bg-gray-100"}`}
                      title={c.interview_done ? "Als offen markieren" : "Als durchgeführt markieren"}>
                      <CheckCircle2 className="h-5 w-5" />
                    </button>
                    <button onClick={() => startEdit(c)} className="p-2 rounded-lg text-gray-500 hover:bg-gray-100" title="Bearbeiten">
                      <Pencil className="h-5 w-5" />
                    </button>
                    <button onClick={() => handleDelete(c)} className="p-2 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50" title="Löschen">
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
