"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Mail, Loader2, ArrowLeft, Building2, MapPin, ExternalLink, CheckCircle2, Send, Search, X
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
  boost_emails_sent_at: string | null;
  boost_emails_count: number;
}

type TabKey = "boosted" | "other";

export default function BoostEmailsPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("boosted");
  const [boostedJobs, setBoostedJobs] = useState<BoostedJob[]>([]);
  const [otherJobs, setOtherJobs] = useState<BoostedJob[]>([]);
  const [loadingBoosted, setLoadingBoosted] = useState(true);
  const [loadingOther, setLoadingOther] = useState(false);
  const [sending, setSending] = useState<number | null>(null);
  const [search, setSearch] = useState("");

  const loadBoosted = async () => {
    setLoadingBoosted(true);
    try {
      const r = await adminAPI.getBoostedJobPosts();
      setBoostedJobs(r.data?.jobs || []);
    } catch {
      toast.error("Konnte geboostete Stellen nicht laden");
    } finally {
      setLoadingBoosted(false);
    }
  };

  const loadOther = useCallback(async (q: string) => {
    setLoadingOther(true);
    try {
      const r = await adminAPI.getOtherJobsForBoost(q ? { search: q } : {});
      setOtherJobs(r.data?.jobs || []);
    } catch {
      toast.error("Konnte weitere Stellen nicht laden");
    } finally {
      setLoadingOther(false);
    }
  }, []);

  useEffect(() => { loadBoosted(); }, []);

  // Zweiten Tab beim ersten Öffnen / bei Suchänderung laden (mit kleinem Debounce)
  useEffect(() => {
    if (activeTab !== "other") return;
    const t = setTimeout(() => loadOther(search), 300);
    return () => clearTimeout(t);
  }, [activeTab, search, loadOther]);

  const sendEmails = async (jobId: number, isOther: boolean) => {
    if (!confirm("Boost-E-Mail jetzt an alle passenden Bewerber senden?")) return;
    setSending(jobId);
    try {
      const r = await adminAPI.sendBoostEmails(jobId);
      toast.success(`${r.data?.sent ?? 0} Boost-E-Mails gesendet (${r.data?.matched ?? 0} passende Bewerber)`);
      if (isOther) loadOther(search); else loadBoosted();
    } catch (e: unknown) {
      const detail = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      toast.error(detail || "E-Mail-Versand fehlgeschlagen");
    } finally {
      setSending(null);
    }
  };

  const fmt = (iso: string) =>
    new Date(iso).toLocaleString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });

  const renderJob = (job: BoostedJob, isOther: boolean) => (
    <div key={job.job_id} className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
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
          onClick={() => sendEmails(job.job_id, isOther)}
          disabled={sending === job.job_id}
          className="btn-primary inline-flex items-center gap-2 text-sm"
        >
          {sending === job.job_id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          {job.boost_emails_sent_at ? "Erneut senden" : "Boost-E-Mails senden"}
        </button>
      </div>

      <div className="mt-3 text-sm">
        {job.boost_emails_sent_at ? (
          <span className="inline-flex items-center gap-1.5 text-green-700 bg-green-50 border border-green-200 px-2.5 py-1 rounded-full">
            <CheckCircle2 className="h-4 w-4" />
            Versendet am {fmt(job.boost_emails_sent_at)} · {job.boost_emails_count} E-Mail{job.boost_emails_count === 1 ? "" : "s"}
          </span>
        ) : (
          <span className="text-gray-500">Noch keine Boost-E-Mails versendet</span>
        )}
      </div>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto">
      <Link href="/admin/sales" className="inline-flex items-center gap-2 text-gray-600 hover:text-primary-600 mb-6">
        <ArrowLeft className="h-4 w-4" /> Zurück
      </Link>

      <div className="flex items-center gap-3 mb-2">
        <div className="p-2 bg-emerald-100 rounded-lg">
          <Mail className="h-6 w-6 text-emerald-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Boost-E-Mails</h1>
      </div>
      <p className="text-gray-600 mb-6">
        Mit einem Klick geht eine „Passende Stelle für dich"-E-Mail (mit Match-Score und Link) an alle
        passenden Bewerber raus – unabhängig von den Facebook-Posts.
      </p>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-gray-200">
        {[
          { key: "boosted" as TabKey, label: "Geboostet & Hervorgehoben" },
          { key: "other" as TabKey, label: "Weitere Stellen" },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${activeTab === tab.key ? "border-primary-600 text-primary-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "boosted" ? (
        loadingBoosted ? (
          <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-primary-600" /></div>
        ) : boostedJobs.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 p-10 text-center">
            <Mail className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-600">Aktuell sind keine Stellen geboostet/hervorgehoben.</p>
          </div>
        ) : (
          <div className="space-y-4">{boostedJobs.map((job) => renderJob(job, false))}</div>
        )
      ) : (
        <>
          <p className="text-gray-600 text-sm mb-4">
            Aktive Stellen, die <strong>keinen</strong> Booster gekauft haben. Hier kannst du die Boost-E-Mail
            bei Bedarf manuell antriggern.
          </p>
          <div className="relative max-w-md mb-5">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Stelle, Ort oder Arbeitgeber suchen…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-9 py-2.5 bg-white border-2 border-gray-200 rounded-xl focus:border-primary-500 focus:ring-2 focus:ring-primary-200 focus:outline-none transition-all text-gray-700 text-sm"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded">
                <X className="h-4 w-4 text-gray-400" />
              </button>
            )}
          </div>

          {loadingOther ? (
            <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-primary-600" /></div>
          ) : otherJobs.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-100 p-10 text-center">
              <Mail className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-600">{search ? "Keine passenden Stellen gefunden." : "Keine weiteren aktiven Stellen vorhanden."}</p>
            </div>
          ) : (
            <div className="space-y-4">{otherJobs.map((job) => renderJob(job, true))}</div>
          )}
        </>
      )}
    </div>
  );
}
