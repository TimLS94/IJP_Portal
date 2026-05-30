"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Flag, CheckCircle, ExternalLink, Loader2, AlertTriangle,
  User, Building2, Calendar, MessageSquare, Eye, EyeOff
} from "lucide-react";
import { adminAPI } from "@/lib/api";
import toast from "react-hot-toast";

interface JobReport {
  id: number;
  job_id: number | null;
  job_title: string;
  job_company: string | null;
  job_is_active: boolean;
  reporter_name: string;
  reporter_email: string | null;
  reason: string | null;
  reason_label: string;
  note: string | null;
  created_at: string;
}

const REASON_COLORS: Record<string, string> = {
  not_relevant: "bg-gray-100 text-gray-700",
  misleading: "bg-yellow-100 text-yellow-800",
  duplicate: "bg-blue-100 text-blue-800",
  spam: "bg-red-100 text-red-800",
  inappropriate: "bg-purple-100 text-purple-800",
  other: "bg-gray-100 text-gray-700",
};

export default function AdminReportsPage() {
  const [reports, setReports] = useState<JobReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [dismissing, setDismissing] = useState<number | null>(null);
  const [toggling, setToggling] = useState<number | null>(null);

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    setLoading(true);
    try {
      const response = await adminAPI.getJobReports();
      setReports(response.data.reports || []);
    } catch {
      toast.error("Fehler beim Laden der Meldungen");
    } finally {
      setLoading(false);
    }
  };

  const handleDismiss = async (reportId: number) => {
    setDismissing(reportId);
    try {
      await adminAPI.dismissJobReport(reportId);
      setReports(prev => prev.filter(r => r.id !== reportId));
      toast.success("Meldung verworfen");
    } catch {
      toast.error("Fehler beim Verwerfen");
    } finally {
      setDismissing(null);
    }
  };

  const handleToggleJob = async (report: JobReport) => {
    if (!report.job_id) return;
    setToggling(report.job_id);
    try {
      await adminAPI.updateJob(report.job_id, { is_active: !report.job_is_active });
      toast.success(report.job_is_active ? "Stelle deaktiviert" : "Stelle aktiviert");
      setReports(prev =>
        prev.map(r =>
          r.job_id === report.job_id ? { ...r, job_is_active: !report.job_is_active } : r
        )
      );
    } catch {
      toast.error("Fehler beim Ändern des Status");
    } finally {
      setToggling(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("de-DE", {
      day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit"
    });
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-2 bg-red-100 rounded-xl">
          <Flag className="h-7 w-7 text-red-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gemeldete Stellen</h1>
          <p className="text-sm text-gray-500">
            {loading ? "Laden..." : `${reports.length} offene Meldung${reports.length !== 1 ? "en" : ""}`}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-10 w-10 animate-spin text-primary-600" />
        </div>
      ) : reports.length === 0 ? (
        <div className="card text-center py-16">
          <CheckCircle className="h-16 w-16 text-green-400 mx-auto mb-4" />
          <p className="text-lg font-medium text-gray-700">Keine offenen Meldungen</p>
          <p className="text-sm text-gray-500 mt-1">Alle Stellen sind in Ordnung.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {reports.map((report) => (
            <div
              key={report.id}
              className="card border-l-4 border-l-red-400"
            >
              {/* Job title + status */}
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-gray-900">{report.job_title}</span>
                    {!report.job_is_active && (
                      <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">Inaktiv</span>
                    )}
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${REASON_COLORS[report.reason || "other"]}`}>
                      {report.reason_label}
                    </span>
                  </div>
                  {report.job_company && (
                    <div className="flex items-center gap-1 text-sm text-gray-500 mt-0.5">
                      <Building2 className="h-3.5 w-3.5" />
                      {report.job_company}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {report.job_id && (
                    <>
                      <button
                        onClick={() => handleToggleJob(report)}
                        disabled={toggling === report.job_id}
                        className={`p-2 rounded-lg transition-colors ${
                          report.job_is_active
                            ? "text-green-600 hover:bg-green-50 hover:text-green-700"
                            : "text-gray-400 hover:bg-gray-50 hover:text-gray-600"
                        }`}
                        title={report.job_is_active ? "Stelle deaktivieren" : "Stelle aktivieren"}
                      >
                        {toggling === report.job_id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : report.job_is_active ? (
                          <Eye className="h-4 w-4" />
                        ) : (
                          <EyeOff className="h-4 w-4" />
                        )}
                      </button>
                      <Link
                        href={`/admin/jobs/${report.job_id}/edit`}
                        className="p-2 rounded-lg text-gray-500 hover:bg-gray-50 hover:text-primary-600 transition-colors"
                        title="Stelle bearbeiten"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Link>
                    </>
                  )}
                  <button
                    onClick={() => handleDismiss(report.id)}
                    disabled={dismissing === report.id}
                    className="p-2 rounded-lg text-gray-500 hover:bg-green-50 hover:text-green-600 transition-colors"
                    title="Meldung als bearbeitet markieren"
                  >
                    {dismissing === report.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Reporter + date */}
              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 mb-2">
                <span className="flex items-center gap-1">
                  <User className="h-3.5 w-3.5" />
                  {report.reporter_name}
                  {report.reporter_email && (
                    <a href={`mailto:${report.reporter_email}`} className="text-primary-600 hover:underline ml-1">
                      ({report.reporter_email})
                    </a>
                  )}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  {formatDate(report.created_at)}
                </span>
              </div>

              {/* Note */}
              {report.note && (
                <div className="flex items-start gap-2 mt-2 bg-gray-50 rounded-lg px-3 py-2">
                  <MessageSquare className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-gray-600 italic">&quot;{report.note}&quot;</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {reports.length > 0 && (
        <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-xl">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
            <p className="text-sm text-amber-800">
              <strong>Hinweis:</strong> Meldung verwerfen entfernt nur die Meldung aus dieser Liste.
              Die Stelle bleibt bestehen. Wenn die Stelle problematisch ist, deaktivieren oder löschen Sie sie zusätzlich.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
