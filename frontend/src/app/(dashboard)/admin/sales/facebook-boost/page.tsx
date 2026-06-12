"use client";

import { useState, useEffect } from "react";
import {
  Rocket, Copy, Loader2, ArrowLeft, Sparkles, Building2, MapPin, ExternalLink, MessageSquare
} from "lucide-react";
import Link from "next/link";
import { adminAPI } from "@/lib/api";
import toast from "react-hot-toast";

interface BoostedJob {
  job_id: number;
  title: string | null;
  employer: string;
  location: string | null;
  url: string;
  content_de: string | null;
  content_es: string | null;
  comment_text: string;
  generated: boolean;
  boost_emails_sent_at: string | null;
  boost_emails_count: number;
}

export default function FacebookBoostPage() {
  const [jobs, setJobs] = useState<BoostedJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState<number | null>(null);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const r = await adminAPI.getBoostedJobPosts();
      setJobs(r.data?.jobs || []);
    } catch {
      toast.error("Konnte geboostete Stellen nicht laden");
    } finally {
      setLoading(false);
    }
  };

  const generate = async (jobId: number) => {
    setGenerating(jobId);
    try {
      const r = await adminAPI.generateBoostedJobPost(jobId);
      setJobs((prev) => prev.map((j) => (j.job_id === jobId ? r.data : j)));
      toast.success("Post generiert");
    } catch (e: unknown) {
      const detail = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      toast.error(detail || "Generierung fehlgeschlagen");
    } finally {
      setGenerating(null);
    }
  };

  const copy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} kopiert`);
  };

  return (
    <div className="max-w-5xl mx-auto">
      <Link href="/admin/sales" className="inline-flex items-center gap-2 text-gray-600 hover:text-primary-600 mb-6">
        <ArrowLeft className="h-4 w-4" /> Zurück
      </Link>

      <div className="flex items-center gap-3 mb-2">
        <div className="p-2 bg-primary-100 rounded-lg">
          <Rocket className="h-6 w-6 text-primary-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Boost → Facebook-Posts</h1>
      </div>
      <p className="text-gray-600 mb-8">
        Geboostete Stellen mit fertigem Post-Text (DE/ES) für deine Facebook-Gruppen.
        Der Link zur Stelle kommt in den Kommentar.
      </p>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-primary-600" /></div>
      ) : jobs.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 p-10 text-center">
          <Rocket className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-600">Aktuell sind keine Stellen geboostet/hervorgehoben.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {jobs.map((job) => (
            <div key={job.job_id} className="bg-white rounded-xl border border-gray-200 p-5">
              {/* Kopf: Stelle + Arbeitgeber */}
              <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                <div className="min-w-0">
                  <h2 className="text-lg font-bold text-gray-900">{job.title || "Stelle"}</h2>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-600 mt-1">
                    <span className="flex items-center gap-1.5"><Building2 className="h-4 w-4 text-gray-400" />{job.employer}</span>
                    {job.location && <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4 text-gray-400" />{job.location}</span>}
                    <a href={job.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-primary-600 hover:underline">
                      <ExternalLink className="h-4 w-4" />Stelle ansehen
                    </a>
                  </div>
                </div>
                <button
                  onClick={() => generate(job.job_id)}
                  disabled={generating === job.job_id}
                  className="btn-primary inline-flex items-center gap-2 text-sm"
                >
                  {generating === job.job_id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  {job.generated ? "Neu generieren" : "Post generieren"}
                </button>
              </div>

              {job.generated ? (
                <div className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    {/* Deutsch */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold text-gray-500">🇩🇪 Deutsch</span>
                        <button onClick={() => copy(job.content_de || "", "Deutscher Post")} className="text-primary-600 hover:text-primary-700 inline-flex items-center gap-1 text-xs">
                          <Copy className="h-3.5 w-3.5" /> Kopieren
                        </button>
                      </div>
                      <textarea readOnly value={job.content_de || ""} rows={14} className="input-styled w-full text-sm font-mono leading-relaxed" />
                    </div>
                    {/* Spanisch */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold text-gray-500">🇪🇸 Español</span>
                        <button onClick={() => copy(job.content_es || "", "Spanischer Post")} className="text-primary-600 hover:text-primary-700 inline-flex items-center gap-1 text-xs">
                          <Copy className="h-3.5 w-3.5" /> Kopieren
                        </button>
                      </div>
                      <textarea readOnly value={job.content_es || ""} rows={14} className="input-styled w-full text-sm font-mono leading-relaxed" />
                    </div>
                  </div>
                  {/* Kommentar */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <MessageSquare className="h-4 w-4 text-blue-600 shrink-0" />
                      <span className="text-sm text-blue-900 truncate">{job.comment_text}</span>
                    </div>
                    <button onClick={() => copy(job.comment_text, "Kommentar")} className="text-blue-700 hover:text-blue-900 inline-flex items-center gap-1 text-xs shrink-0">
                      <Copy className="h-3.5 w-3.5" /> Kommentar kopieren
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-500">
                  Noch kein Post generiert. Klick auf „Post generieren", um DE/ES-Texte zu erstellen.
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
