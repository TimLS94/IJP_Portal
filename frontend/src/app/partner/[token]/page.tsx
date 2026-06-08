"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { partnerAPI } from "@/lib/api";
import {
  CheckCircle2, XCircle, Clock, Users, FileText,
  Filter, Loader2, AlertCircle, ChevronDown, ChevronUp,
  ClipboardList, Shield
} from "lucide-react";

interface DocCheck {
  type: string;
  label: string;
  uploaded: boolean;
}

interface ApplicantEntry {
  applicant_id: number;
  first_name: string;
  last_name: string;
  position_type: string | null;
  position_type_label: string | null;
  registered_at: string | null;
  has_job_request: boolean;
  job_request_id: number | null;
  job_request_created_at: string | null;
  job_request_status: string | null;
  job_request_status_label: string | null;
  job_request_status_color: string | null;
  docs_required_total: number;
  docs_required_uploaded: number;
  docs_complete: boolean;
  doc_checklist_required: DocCheck[];
  doc_checklist_optional: DocCheck[];
  total_docs_uploaded: number;
}

interface PartnerData {
  partner_name: string;
  total_applicants: number;
  commissioned_count: number;
  docs_complete_count: number;
  applicants: ApplicantEntry[];
}

const statusColors: Record<string, string> = {
  yellow: "bg-yellow-100 text-yellow-800 border-yellow-200",
  blue: "bg-blue-100 text-blue-800 border-blue-200",
  green: "bg-green-100 text-green-800 border-green-200",
  red: "bg-red-100 text-red-800 border-red-200",
  purple: "bg-purple-100 text-purple-800 border-purple-200",
  indigo: "bg-indigo-100 text-indigo-800 border-indigo-200",
  orange: "bg-orange-100 text-orange-800 border-orange-200",
  gray: "bg-gray-100 text-gray-800 border-gray-200",
};

function DocBadge({ doc }: { doc: DocCheck }) {
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border ${
        doc.uploaded
          ? "bg-green-50 text-green-700 border-green-200"
          : "bg-red-50 text-red-600 border-red-200"
      }`}
    >
      {doc.uploaded ? (
        <CheckCircle2 className="h-3 w-3" />
      ) : (
        <XCircle className="h-3 w-3" />
      )}
      {doc.label}
    </span>
  );
}

function ApplicantRow({ entry }: { entry: ApplicantEntry }) {
  const [expanded, setExpanded] = useState(false);

  const formatDate = (d: string | null) => {
    if (!d) return "–";
    return new Date(d).toLocaleDateString("de-DE", {
      day: "2-digit", month: "2-digit", year: "numeric",
    });
  };

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      {/* Hauptzeile */}
      <div
        className="flex items-center gap-4 p-4 bg-white hover:bg-gray-50 cursor-pointer transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        {/* Name */}
        <div className="w-40 shrink-0">
          <p className="font-semibold text-gray-900">
            {entry.first_name} {entry.last_name}
          </p>
          {entry.position_type_label && (
            <p className="text-xs text-gray-500">{entry.position_type_label}</p>
          )}
        </div>

        {/* IJP Auftrag */}
        <div className="w-44 shrink-0">
          {entry.has_job_request ? (
            <div>
              <p className="text-xs text-gray-500">IJP beauftragt am</p>
              <p className="text-sm font-medium text-gray-800">
                {formatDate(entry.job_request_created_at)}
              </p>
            </div>
          ) : (
            <span className="inline-flex items-center gap-1 text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-full">
              <Clock className="h-3 w-3" />
              Noch nicht beauftragt
            </span>
          )}
        </div>

        {/* Status */}
        <div className="w-44 shrink-0">
          {entry.job_request_status_label ? (
            <span
              className={`text-xs px-2 py-1 rounded-full border font-medium ${
                statusColors[entry.job_request_status_color ?? "gray"] ?? statusColors.gray
              }`}
            >
              {entry.job_request_status_label}
            </span>
          ) : (
            <span className="text-xs text-gray-400">–</span>
          )}
        </div>

        {/* Dokumente */}
        <div className="flex-1">
          <div className="flex items-center gap-2">
            {entry.docs_required_total === 0 ? (
              <span className="text-xs text-gray-400">Keine Anforderungen</span>
            ) : (
              <>
                <div className="flex-1 max-w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      entry.docs_complete ? "bg-green-500" : "bg-amber-400"
                    }`}
                    style={{
                      width: `${(entry.docs_required_uploaded / entry.docs_required_total) * 100}%`,
                    }}
                  />
                </div>
                <span className="text-xs text-gray-600 whitespace-nowrap">
                  {entry.docs_required_uploaded}/{entry.docs_required_total} Pflicht
                </span>
                {entry.docs_complete ? (
                  <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-400 shrink-0" />
                )}
              </>
            )}
          </div>
        </div>

        {/* Expand Icon */}
        <div className="shrink-0 text-gray-400">
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </div>
      </div>

      {/* Detail-Dokumente */}
      {expanded && (
        <div className="border-t border-gray-100 bg-gray-50 p-4">
          {entry.doc_checklist_required.length > 0 && (
            <div className="mb-3">
              <p className="text-xs font-semibold text-gray-600 mb-2">Pflichtdokumente</p>
              <div className="flex flex-wrap gap-2">
                {entry.doc_checklist_required.map((doc) => (
                  <DocBadge key={doc.type} doc={doc} />
                ))}
              </div>
            </div>
          )}
          {entry.doc_checklist_optional.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-600 mb-2">Optionale Dokumente</p>
              <div className="flex flex-wrap gap-2">
                {entry.doc_checklist_optional.map((doc) => (
                  <DocBadge key={doc.type} doc={doc} />
                ))}
              </div>
            </div>
          )}
          {entry.doc_checklist_required.length === 0 &&
            entry.doc_checklist_optional.length === 0 && (
              <p className="text-sm text-gray-400">
                Keine Dokumentenanforderungen (Stellenart nicht gesetzt)
              </p>
            )}
        </div>
      )}
    </div>
  );
}

export default function PartnerViewPage() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<PartnerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [filtering, setFiltering] = useState(false);

  const fetchData = useCallback(
    async (from?: string, to?: string) => {
      try {
        const params: Record<string, string> = {};
        if (from) params.date_from = from;
        if (to) params.date_to = to;
        const res = await partnerAPI.getView(token, params);
        setData(res.data);
        setError(null);
      } catch (err: unknown) {
        const status = (err as { response?: { status?: number } })?.response?.status;
        if (status === 404) setError("Dieser Link existiert nicht.");
        else if (status === 403) setError("Dieser Link wurde deaktiviert. Bitte wende dich an IJP.");
        else setError("Fehler beim Laden der Daten.");
      } finally {
        setLoading(false);
        setFiltering(false);
      }
    },
    [token]
  );

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleFilter = (e: React.FormEvent) => {
    e.preventDefault();
    setFiltering(true);
    fetchData(dateFrom || undefined, dateTo || undefined);
  };

  const resetFilter = () => {
    setDateFrom("");
    setDateTo("");
    setFiltering(true);
    fetchData();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-12 w-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Lade Bewerberdaten…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md px-4">
          <AlertCircle className="h-16 w-16 text-red-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Zugriff nicht möglich</h1>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Shield className="h-5 w-5 text-blue-600" />
                <span className="text-sm text-blue-600 font-medium">Partner-Ansicht</span>
              </div>
              <h1 className="text-3xl font-bold text-gray-900">{data.partner_name}</h1>
              <p className="text-gray-500 mt-1">
                Übersicht Ihrer Bewerber bei IJP International Job Placement
              </p>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-xs text-gray-400">
                Stand: {new Date().toLocaleDateString("de-DE")}
              </p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mt-6">
            <div className="bg-gray-50 rounded-xl p-4 text-center border border-gray-100">
              <div className="flex items-center justify-center gap-2 mb-1">
                <Users className="h-5 w-5 text-gray-400" />
              </div>
              <p className="text-3xl font-bold text-gray-900">{data.total_applicants}</p>
              <p className="text-sm text-gray-500 mt-0.5">Bewerber gesamt</p>
            </div>
            <div className="bg-blue-50 rounded-xl p-4 text-center border border-blue-100">
              <div className="flex items-center justify-center gap-2 mb-1">
                <ClipboardList className="h-5 w-5 text-blue-400" />
              </div>
              <p className="text-3xl font-bold text-blue-700">{data.commissioned_count}</p>
              <p className="text-sm text-blue-600 mt-0.5">IJP beauftragt</p>
            </div>
            <div className="bg-green-50 rounded-xl p-4 text-center border border-green-100">
              <div className="flex items-center justify-center gap-2 mb-1">
                <FileText className="h-5 w-5 text-green-400" />
              </div>
              <p className="text-3xl font-bold text-green-700">{data.docs_complete_count}</p>
              <p className="text-sm text-green-600 mt-0.5">Dokumente vollständig</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Datumsfilter */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
          <form onSubmit={handleFilter} className="flex items-end gap-4 flex-wrap">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-700 shrink-0">
              <Filter className="h-4 w-4" />
              IJP-Auftrag Datum:
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Von</label>
              <input
                type="date"
                className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Bis</label>
              <input
                type="date"
                className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
            <button
              type="submit"
              disabled={filtering}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {filtering ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Filter className="h-3.5 w-3.5" />}
              Filtern
            </button>
            {(dateFrom || dateTo) && (
              <button
                type="button"
                onClick={resetFilter}
                className="text-sm text-gray-500 hover:text-gray-700 underline"
              >
                Filter zurücksetzen
              </button>
            )}
          </form>
        </div>

        {/* Tabelle */}
        {data.applicants.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <Users className="h-16 w-16 text-gray-200 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">
              {dateFrom || dateTo
                ? "Keine Bewerber im gewählten Zeitraum"
                : "Noch keine Bewerber"}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {/* Spaltenüberschriften */}
            <div className="hidden md:flex items-center gap-4 px-4 pb-1 text-xs font-semibold text-gray-400 uppercase tracking-wide">
              <div className="w-40 shrink-0">Name</div>
              <div className="w-44 shrink-0">IJP beauftragt</div>
              <div className="w-44 shrink-0">Status</div>
              <div className="flex-1">Dokumente</div>
              <div className="w-4 shrink-0" />
            </div>

            {data.applicants.map((entry) => (
              <ApplicantRow key={entry.applicant_id} entry={entry} />
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="mt-12 text-center text-xs text-gray-400 border-t border-gray-100 pt-6">
          <p>IJP International Job Placement UG (haftungsbeschränkt)</p>
          <p className="mt-0.5">
            Diese Seite ist vertraulich und nur für autorisierte Partner bestimmt.
          </p>
        </div>
      </div>
    </div>
  );
}
