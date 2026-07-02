"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useTranslation } from "react-i18next";
import { adminAPI } from "@/lib/api";
import toast from "react-hot-toast";
import { 
  Shield, Users, Briefcase, FileText, TrendingUp,
  UserCheck, Building2, Clock, BookOpen, ClipboardList,
  Archive, CheckCircle, AlertTriangle, FileX, Mail, Send,
  Calendar, LogIn, UserPlus, BarChart3, Flag, Trash2, ExternalLink, Loader2, Activity, Sparkles, Rocket
} from "lucide-react";

// Dynamic import for recharts (client-side only)
const LineChart = dynamic(() => import("recharts").then(mod => mod.LineChart), { ssr: false });
const Line = dynamic(() => import("recharts").then(mod => mod.Line), { ssr: false });
const XAxis = dynamic(() => import("recharts").then(mod => mod.XAxis), { ssr: false });
const YAxis = dynamic(() => import("recharts").then(mod => mod.YAxis), { ssr: false });
const CartesianGrid = dynamic(() => import("recharts").then(mod => mod.CartesianGrid), { ssr: false });
const Tooltip = dynamic(() => import("recharts").then(mod => mod.Tooltip), { ssr: false });
const ResponsiveContainer = dynamic(() => import("recharts").then(mod => mod.ResponsiveContainer), { ssr: false });
const AreaChart = dynamic(() => import("recharts").then(mod => mod.AreaChart), { ssr: false });
const Area = dynamic(() => import("recharts").then(mod => mod.Area), { ssr: false });
const Legend = dynamic(() => import("recharts").then(mod => mod.Legend), { ssr: false });

const positionTypeLabels: Record<string, string> = {
  studentenferienjob: "Studentenferienjob",
  saisonjob: "Saisonjob",
  workandholiday: "Work & Holiday",
  fachkraft: "Fachkräfte",
  ausbildung: "Ausbildung"
};

interface Stats {
  users: {
    total: number;
    applicants: number;
    companies: number;
    logins_in_period?: number;
    logins_today?: number;
    logins_this_week?: number;
    logins_this_month?: number;
    new_in_period?: number;
  };
  jobs: {
    total: number;
    active: number;
    drafts: number;
    expired: number;
    archived: number;
  };
  applications: {
    total: number;
    pending: number;
    accepted: number;
    rejected: number;
    in_review?: number;
    new_in_period?: number;
    accepted_in_period?: number;
    new_this_week?: number;
  };
  position_types: Record<string, number>;
  success_rate?: {
    total_successes: number;
    successes_in_period: number;
    success_percentage: number;
  };
  deletion_reasons?: {
    total_deleted: number;
    filled_via_jobon: number;
    filled_via_other: number;
    position_cancelled: number;
    expired?: number;
    seasonal_end?: number;
    budget_reasons?: number;
    company_closed?: number;
    other?: number;
  };
  period_days: number;
}

interface EmailStats {
  period_days: number;
  total_sent: number;
  total_success: number;
  total_failed: number;
  by_type?: { type: string; label: string; total: number }[];
  recent?: { label: string; recipient: string; success: boolean; created_at: string }[];
}

interface ColdOutreachStats {
  period_days: number;
  total: number;
  success: number;
  failed: number;
  by_user?: { email: string; total: number; success: number }[];
}

interface JobReport {
  id: number;
  job_id: number;
  job_title: string;
  job_company?: string;
  job_is_active: boolean;
  reason_label: string;
  reporter_name: string;
  note?: string;
  created_at: string;
}

interface TimelineData {
  date: string;
  label: string;
  users: number;
  applications: number;
  jobs: number;
  logins: number;
  cumulative_users?: number;
  cumulative_applications?: number;
  cumulative_jobs?: number;
}

interface TimelineStats {
  period_days: number;
  timeline: TimelineData[];
  totals: {
    users: number;
    applications: number;
    jobs: number;
  };
}

export default function AdminDashboardPage() {
  const { t } = useTranslation();
  const [stats, setStats] = useState<Stats | null>(null);
  const [emailStats, setEmailStats] = useState<EmailStats | null>(null);
  const [coldOutreachStats, setColdOutreachStats] = useState<ColdOutreachStats | null>(null);
  const [aiUsage, setAiUsage] = useState<{ generations: number; total_tokens: number; estimated_cost_usd: number; console_url: string } | null>(null);
  const [boosts, setBoosts] = useState<{ id: number; created_at: string; job_title: string; job_slug: string | null; company_name: string }[]>([]);
  const [features, setFeatures] = useState<{ job_id: number; job_title: string; job_slug: string | null; company_name: string; by_admin: boolean; featured_until: string | null }[]>([]);
  const [timelineStats, setTimelineStats] = useState<TimelineStats | null>(null);
  const [jobReports, setJobReports] = useState<JobReport[]>([]);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [cancellations, setCancellations] = useState<{ id: number; company_name: string | null; feedback_label: string | null; comment: string | null; created_at: string | null }[]>([]);
  const [subStats, setSubStats] = useState<{ total_companies: number; premium_total: number; active: number; trialing: number; trial_canceled: number; cancellations_total: number } | null>(null);
  const [dismissingReport, setDismissingReport] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [periodDays, setPeriodDays] = useState(30);
  const [customRange, setCustomRange] = useState({ from: "", to: "" });
  const [showCustomRange, setShowCustomRange] = useState(false);
  const [chartType, setChartType] = useState<"daily" | "cumulative">("daily");
  const [timelineDays, setTimelineDays] = useState(30);
  const [timelineLoading, setTimelineLoading] = useState(false);

  useEffect(() => {
    loadStats(periodDays, !stats);
    loadJobReports();
  }, [periodDays]);

  useEffect(() => {
    adminAPI.getPremiumCancellations()
      .then(r => setCancellations(r.data?.cancellations || []))
      .catch(() => {});
    adminAPI.getSubscriptionStats()
      .then(r => setSubStats(r.data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    loadTimeline(timelineDays);
  }, [timelineDays]);

  const loadStats = async (days: number, isInitial = false) => {
    if (isInitial) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }
    try {
      const [statsRes, emailRes, coldOutreachRes, aiUsageRes] = await Promise.all([
        adminAPI.getStats(days),
        adminAPI.getEmailStats(days).catch(() => ({ data: null })),
        adminAPI.getColdOutreachStats(days).catch(() => ({ data: null })),
        adminAPI.getAiUsage().catch(() => ({ data: null }))
      ]);
      setStats(statsRes.data);
      setEmailStats(emailRes.data);
      setColdOutreachStats(coldOutreachRes.data);
      setAiUsage(aiUsageRes.data);
      adminAPI.getPromotions({ kind: "boost", days: 30 }).then(r => setBoosts(r.data?.promotions || [])).catch(() => {});
      adminAPI.getFeaturedJobs().then(r => setFeatures(r.data?.featured || [])).catch(() => {});
    } catch {
      toast.error(t("common.error"));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadTimeline = async (days: number) => {
    setTimelineLoading(true);
    try {
      const response = await adminAPI.getTimeline(days);
      setTimelineStats(response.data);
    } catch {
      console.error("Timeline konnte nicht geladen werden");
    } finally {
      setTimelineLoading(false);
    }
  };

  const loadJobReports = async () => {
    setReportsLoading(true);
    try {
      const response = await adminAPI.getJobReports();
      setJobReports(response.data.reports || []);
    } catch {
      console.error("Fehler beim Laden der Meldungen");
    } finally {
      setReportsLoading(false);
    }
  };

  const handleDismissReport = async (reportId: number) => {
    setDismissingReport(reportId);
    try {
      await adminAPI.dismissJobReport(reportId);
      setJobReports(prev => prev.filter(r => r.id !== reportId));
      toast.success(t("adminDashboard.reportDismissed"));
    } catch {
      toast.error(t("common.error"));
    } finally {
      setDismissingReport(null);
    }
  };

  const handleCustomRangeApply = () => {
    if (customRange.from && customRange.to) {
      const fromDate = new Date(customRange.from);
      const toDate = new Date(customRange.to);
      const diffDays = Math.ceil((toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      if (diffDays > 0 && diffDays <= 365) {
        setPeriodDays(diffDays);
        setShowCustomRange(false);
      } else {
        toast.error(t("adminDashboard.invalidPeriod"));
      }
    }
  };

  const getPeriodLabel = () => {
    switch(periodDays) {
      case 1: return t("adminDashboard.today");
      case 7: return t("adminDashboard.last7Days");
      case 14: return t("adminDashboard.last14Days");
      case 30: return t("adminDashboard.last30Days");
      case 90: return t("adminDashboard.last90Days");
      case 365: return t("adminDashboard.lastYear");
      default: return t("adminDashboard.lastXDays", { days: periodDays });
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-12 w-12 text-primary-600 animate-spin" />
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <Shield className="h-8 w-8 text-primary-600" />
        <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
      </div>

      {/* ==================== STATISCHE STATISTIKEN (Gesamtzahlen) ==================== */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="h-5 w-5 text-gray-500" />
          <h2 className="text-lg font-semibold text-gray-700">Gesamtübersicht</h2>
          <span className="text-sm text-gray-400">(alle Zeiten)</span>
        </div>
      </div>

      {/* Hauptstatistiken */}
      <div className="grid md:grid-cols-4 gap-6 mb-8">
        <div className="card">
          <div className="flex items-center gap-4">
            <div className="bg-blue-100 p-3 rounded-lg">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Benutzer gesamt</p>
              <p className="text-2xl font-bold text-gray-900">{stats.users.total}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center gap-4">
            <div className="bg-green-100 p-3 rounded-lg">
              <Briefcase className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Stellenangebote</p>
              <p className="text-2xl font-bold text-gray-900">{stats.jobs.total}</p>
              <p className="text-xs text-green-600">{stats.jobs.active} aktiv</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center gap-4">
            <div className="bg-purple-100 p-3 rounded-lg">
              <FileText className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Bewerbungen</p>
              <p className="text-2xl font-bold text-gray-900">{stats.applications.total}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center gap-4">
            <div className="bg-orange-100 p-3 rounded-lg">
              <TrendingUp className="h-6 w-6 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Vermittlungen</p>
              <p className="text-2xl font-bold text-gray-900">
                {stats.success_rate?.total_successes || 0}
              </p>
              <p className="text-xs text-green-600">
                {stats.success_rate?.success_percentage || 0}% Erfolgsquote
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* KI-Nutzung (Stellengenerator) */}
      {aiUsage && (
        <div className="card mb-8 border border-primary-200 bg-gradient-to-br from-primary-50 to-indigo-50">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary-600" />
              KI-Stellengenerator – Verbrauch
            </h2>
            <a href={aiUsage.console_url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary-600 hover:underline">
              Anthropic Guthaben ansehen →
            </a>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <p className="text-3xl font-bold text-gray-900">{aiUsage.generations.toLocaleString("de-DE")}</p>
              <p className="text-sm text-gray-500">Generierungen gesamt</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-gray-900">{aiUsage.total_tokens.toLocaleString("de-DE")}</p>
              <p className="text-sm text-gray-500">Tokens verbraucht</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-gray-900">${aiUsage.estimated_cost_usd.toFixed(2)}</p>
              <p className="text-sm text-gray-500">geschätzte Kosten</p>
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-3">
            Selbst gezählter Verbrauch (Schätzung). Das tatsächliche Restguthaben siehst du nur in der Anthropic Console.
          </p>
        </div>
      )}

      {/* Booster-Anfragen (manuell in Gruppen posten) */}
      {boosts.length > 0 && (
        <div className="card mb-8 border border-purple-200">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-4">
            <Rocket className="h-5 w-5 text-purple-600" />
            Booster-Anfragen (letzte 30 Tage) – manuell in Gruppen posten
          </h2>
          <div className="divide-y divide-gray-100">
            {boosts.map((b) => (
              <div key={b.id} className="flex items-center justify-between py-2 gap-4">
                <div className="min-w-0">
                  <p className="font-medium text-gray-900 truncate">{b.job_title}</p>
                  <p className="text-sm text-gray-500">{b.company_name} · {new Date(b.created_at).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" })}</p>
                </div>
                {b.job_slug && (
                  <a href={`/jobs/${b.job_slug}`} target="_blank" rel="noopener noreferrer" className="text-sm text-primary-600 hover:underline whitespace-nowrap">Stelle öffnen →</a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Aktuell hervorgehobene Stellen */}
      {features.length > 0 && (
        <div className="card mb-8 border border-amber-200">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-4">
            <Sparkles className="h-5 w-5 text-amber-500" />
            Aktuell hervorgehobene Stellen ({features.length})
          </h2>
          <div className="divide-y divide-gray-100">
            {features.map((f) => (
              <div key={f.job_id} className="flex items-center justify-between py-2 gap-4">
                <div className="min-w-0">
                  <p className="font-medium text-gray-900 truncate flex items-center gap-2">
                    {f.job_title}
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${f.by_admin ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-700"}`}>{f.by_admin ? "von IJP" : "von Firma"}</span>
                  </p>
                  <p className="text-sm text-gray-500">
                    {f.company_name}
                    {f.featured_until && ` · bis ${new Date(f.featured_until).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" })}`}
                  </p>
                </div>
                {f.job_slug && (
                  <a href={`/jobs/${f.job_slug}`} target="_blank" rel="noopener noreferrer" className="text-sm text-primary-600 hover:underline whitespace-nowrap">Stelle öffnen →</a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Timeline Charts */}
      <div className="card mb-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-r from-indigo-500 to-purple-500 p-2 rounded-lg">
              <Activity className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Aktivitätsverlauf</h2>
              <p className="text-sm text-gray-600">
                {timelineLoading ? "Laden..." : timelineStats ? `Letzte ${timelineStats.period_days} Tage` : "Keine Daten"}
              </p>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-2">
            {/* Zeitraum-Auswahl */}
            <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
              {[
                { value: 7, label: "7T" },
                { value: 14, label: "14T" },
                { value: 30, label: "30T" },
                { value: 90, label: "90T" },
                { value: 180, label: "6M" },
                { value: 365, label: "1J" },
              ].map((period) => (
                <button
                  key={period.value}
                  onClick={() => setTimelineDays(period.value)}
                  disabled={timelineLoading}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                    timelineDays === period.value
                      ? "bg-white text-indigo-600 shadow-sm"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  {period.label}
                </button>
              ))}
            </div>
            
            {/* Chart-Typ */}
            <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
              <button
                onClick={() => setChartType("daily")}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                  chartType === "daily"
                    ? "bg-indigo-600 text-white"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Täglich
              </button>
              <button
                onClick={() => setChartType("cumulative")}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                  chartType === "cumulative"
                    ? "bg-indigo-600 text-white"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Kumulativ
              </button>
            </div>
          </div>
        </div>
        
        {timelineLoading ? (
          <div className="h-80 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
          </div>
        ) : !timelineStats || timelineStats.timeline.length === 0 ? (
          <div className="h-80 flex items-center justify-center text-gray-500">
            Keine Daten für diesen Zeitraum
          </div>
        ) : (
          <>

          {/* Chart */}
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              {chartType === "daily" ? (
                <AreaChart data={timelineStats.timeline}>
                  <defs>
                    <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorApps" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorJobs" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorLogins" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#F59E0B" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis 
                    dataKey="label" 
                    tick={{ fontSize: 12, fill: '#6B7280' }}
                    tickLine={false}
                    axisLine={{ stroke: '#E5E7EB' }}
                  />
                  <YAxis 
                    tick={{ fontSize: 12, fill: '#6B7280' }}
                    tickLine={false}
                    axisLine={{ stroke: '#E5E7EB' }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'white', 
                      border: '1px solid #E5E7EB',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }}
                    labelFormatter={(label) => `Datum: ${label}`}
                  />
                  <Legend />
                  <Area 
                    type="monotone" 
                    dataKey="users" 
                    name="Neue Benutzer"
                    stroke="#3B82F6" 
                    fillOpacity={1}
                    fill="url(#colorUsers)"
                    strokeWidth={2}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="applications" 
                    name="Bewerbungen"
                    stroke="#8B5CF6" 
                    fillOpacity={1}
                    fill="url(#colorApps)"
                    strokeWidth={2}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="jobs" 
                    name="Neue Stellen"
                    stroke="#10B981" 
                    fillOpacity={1}
                    fill="url(#colorJobs)"
                    strokeWidth={2}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="logins" 
                    name="Logins"
                    stroke="#F59E0B" 
                    fillOpacity={1}
                    fill="url(#colorLogins)"
                    strokeWidth={2}
                  />
                </AreaChart>
              ) : (
                <LineChart data={timelineStats.timeline}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis 
                    dataKey="label" 
                    tick={{ fontSize: 12, fill: '#6B7280' }}
                    tickLine={false}
                    axisLine={{ stroke: '#E5E7EB' }}
                  />
                  <YAxis 
                    tick={{ fontSize: 12, fill: '#6B7280' }}
                    tickLine={false}
                    axisLine={{ stroke: '#E5E7EB' }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'white', 
                      border: '1px solid #E5E7EB',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }}
                    labelFormatter={(label) => `Datum: ${label}`}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="cumulative_users" 
                    name="Benutzer (kumulativ)"
                    stroke="#3B82F6" 
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="cumulative_applications" 
                    name="Bewerbungen (kumulativ)"
                    stroke="#8B5CF6" 
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="cumulative_jobs" 
                    name="Stellen (kumulativ)"
                    stroke="#10B981" 
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              )}
            </ResponsiveContainer>
          </div>

          {/* Summary below chart */}
          <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t">
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">{timelineStats.totals.users}</p>
              <p className="text-sm text-gray-600">Neue Benutzer</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-purple-600">{timelineStats.totals.applications}</p>
              <p className="text-sm text-gray-600">Bewerbungen</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">{timelineStats.totals.jobs}</p>
              <p className="text-sm text-gray-600">Neue Stellen</p>
            </div>
          </div>
          </>
        )}
      </div>

      {/* Stellen-Metriken */}
      <div className="grid md:grid-cols-4 gap-4 mb-8">
        <div className="card bg-green-50 border border-green-200">
          <div className="flex items-center gap-3">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <div>
              <p className="text-xs text-green-700">Aktive Stellen</p>
              <p className="text-xl font-bold text-green-800">{stats.jobs.active}</p>
            </div>
          </div>
        </div>
        <div className="card bg-blue-50 border border-blue-200">
          <div className="flex items-center gap-3">
            <FileX className="h-5 w-5 text-blue-600" />
            <div>
              <p className="text-xs text-blue-700">Entwürfe</p>
              <p className="text-xl font-bold text-blue-800">{stats.jobs.drafts}</p>
            </div>
          </div>
        </div>
        <div className="card bg-yellow-50 border border-yellow-200">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
            <div>
              <p className="text-xs text-yellow-700">Abgelaufen</p>
              <p className="text-xl font-bold text-yellow-800">{stats.jobs.expired}</p>
            </div>
          </div>
        </div>
        <div className="card bg-gray-50 border border-gray-200">
          <div className="flex items-center gap-3">
            <Archive className="h-5 w-5 text-gray-600" />
            <div>
              <p className="text-xs text-gray-700">Archiviert</p>
              <p className="text-xl font-bold text-gray-800">{stats.jobs.archived}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Erfolgsstatistik - Vermittlungen über JobOn */}
      {stats.success_rate && (
        <div className="card mb-8 border-2 border-green-200 bg-gradient-to-r from-green-50 to-emerald-50">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-green-500 p-2 rounded-lg">
              <CheckCircle className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Erfolgreiche Vermittlungen</h2>
              <p className="text-sm text-gray-600">Angenommene Bewerbungen + über JobOn besetzte Stellen</p>
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="text-center p-4 bg-white rounded-lg shadow-sm">
              <p className="text-4xl font-bold text-green-600">{stats.success_rate.total_successes}</p>
              <p className="text-sm text-gray-600">Gesamt</p>
            </div>
            <div className="text-center p-4 bg-white rounded-lg shadow-sm">
              <p className="text-4xl font-bold text-green-600">{stats.success_rate.successes_in_period}</p>
              <p className="text-sm text-gray-600">Letzte {stats.period_days} Tage</p>
            </div>
            <div className="text-center p-4 bg-white rounded-lg shadow-sm">
              <p className="text-4xl font-bold text-green-600">{stats.success_rate.success_percentage}%</p>
              <p className="text-sm text-gray-600">Erfolgsquote</p>
            </div>
          </div>

          {/* Löschgründe Aufschlüsselung */}
          {stats.deletion_reasons && stats.deletion_reasons.total_deleted > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3">Archivierungsgründe (alle Zeiten)</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="flex items-center justify-between p-3 bg-green-100 rounded-lg">
                  <span className="text-sm text-green-800">✅ Über JobOn</span>
                  <span className="font-bold text-green-700">{stats.deletion_reasons.filled_via_jobon}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-100 rounded-lg">
                  <span className="text-sm text-gray-700">Andere Plattform</span>
                  <span className="font-bold text-gray-600">{stats.deletion_reasons.filled_via_other}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-100 rounded-lg">
                  <span className="text-sm text-gray-700">Nicht besetzt</span>
                  <span className="font-bold text-gray-600">{stats.deletion_reasons.position_cancelled}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-amber-100 rounded-lg">
                  <span className="text-sm text-amber-800">⏰ Abgelaufen</span>
                  <span className="font-bold text-amber-700">{stats.deletion_reasons.expired || 0}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Detailstatistiken */}
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        {/* Benutzer nach Typ */}
        <div className="card">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Benutzer nach Typ</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <UserCheck className="h-5 w-5 text-blue-600" />
                <span>Bewerber</span>
              </div>
              <span className="font-semibold">{stats.users.applicants}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <Building2 className="h-5 w-5 text-green-600" />
                <span>Unternehmen</span>
              </div>
              <span className="font-semibold">{stats.users.companies}</span>
            </div>
          </div>
        </div>

        {/* Stellen nach Typ */}
        <div className="card">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Stellen nach Typ</h2>
          <div className="space-y-3">
            {Object.entries(stats.position_types || {}).map(([type, count]) => (
              <div key={type} className="flex items-center justify-between">
                <span className="text-gray-600">{positionTypeLabels[type] || type}</span>
                <div className="flex items-center gap-2">
                  <div className="w-32 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-primary-600 h-2 rounded-full" 
                      style={{ 
                        width: `${stats.jobs.total > 0 ? (count / stats.jobs.total) * 100 : 0}%` 
                      }}
                    />
                  </div>
                  <span className="font-semibold w-8 text-right">{count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bewerbungsstatus (statisch - Gesamtzahlen) */}
      <div className="card mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Bewerbungsstatus (Gesamt)</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-yellow-50 rounded-lg">
            <p className="text-3xl font-bold text-yellow-600">{stats.applications.pending}</p>
            <p className="text-sm text-gray-600">Ausstehend</p>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <p className="text-3xl font-bold text-green-600">{stats.applications.accepted}</p>
            <p className="text-sm text-gray-600">Angenommen</p>
          </div>
          <div className="text-center p-4 bg-red-50 rounded-lg">
            <p className="text-3xl font-bold text-red-600">{stats.applications.rejected}</p>
            <p className="text-sm text-gray-600">Abgelehnt</p>
          </div>
          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <p className="text-3xl font-bold text-purple-600">{stats.applications.in_review || 0}</p>
            <p className="text-sm text-gray-600">In Prüfung</p>
          </div>
        </div>
      </div>

      {/* ==================== ZEITBASIERTE AUSWERTUNGEN ==================== */}
      <div className="mb-6 mt-12">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl border border-indigo-200">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-500 p-2 rounded-lg">
              <Calendar className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Zeitbasierte Auswertungen</h2>
              <p className="text-sm text-gray-600">Aktivitäten im gewählten Zeitraum</p>
            </div>
          </div>
          
          {/* Zeitraum-Auswahl */}
          <div className="flex flex-wrap items-center gap-2">
            {[
              { value: 1, label: "Heute" },
              { value: 7, label: "7 Tage" },
              { value: 14, label: "14 Tage" },
              { value: 30, label: "30 Tage" },
              { value: 90, label: "90 Tage" },
            ].map(({ value, label }) => (
              <button
                key={value}
                onClick={() => { setPeriodDays(value); setShowCustomRange(false); }}
                disabled={refreshing}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  periodDays === value && !showCustomRange
                    ? "bg-indigo-600 text-white shadow-md"
                    : "bg-white text-gray-700 hover:bg-indigo-100 border border-gray-200"
                } ${refreshing ? "opacity-50 cursor-wait" : ""}`}
              >
                {label}
              </button>
            ))}
            {refreshing && (
              <Loader2 className="h-5 w-5 animate-spin text-indigo-600" />
            )}
            <button
              onClick={() => setShowCustomRange(!showCustomRange)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1 ${
                showCustomRange
                  ? "bg-indigo-600 text-white shadow-md"
                  : "bg-white text-gray-700 hover:bg-indigo-100 border border-gray-200"
              }`}
            >
              <Calendar className="h-4 w-4" />
              Zeitraum
            </button>
          </div>
        </div>
        
        {/* Benutzerdefinierter Zeitraum */}
        {showCustomRange && (
          <div className="mt-3 p-4 bg-white rounded-lg border border-indigo-200 shadow-sm">
            <div className="flex flex-wrap items-end gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Von</label>
                <input
                  type="date"
                  value={customRange.from}
                  onChange={(e) => setCustomRange({ ...customRange, from: e.target.value })}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bis</label>
                <input
                  type="date"
                  value={customRange.to}
                  onChange={(e) => setCustomRange({ ...customRange, to: e.target.value })}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <button
                onClick={handleCustomRangeApply}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
              >
                Anwenden
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Zeitraum-Anzeige */}
      <div className="text-center mb-6">
        <span className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-100 text-indigo-800 rounded-full text-sm font-medium">
          <Clock className="h-4 w-4" />
          Zeitraum: {getPeriodLabel()}
        </span>
      </div>

      {/* Zeitbasierte Statistiken Grid */}
      <div className="grid md:grid-cols-3 gap-6 mb-8">
        {/* Aktive Logins */}
        <div className="card border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-blue-500 p-2 rounded-lg">
              <LogIn className="h-5 w-5 text-white" />
            </div>
            <h3 className="font-semibold text-gray-900">Aktive Logins</h3>
          </div>
          <p className="text-4xl font-bold text-blue-600 mb-1">{stats.users.logins_in_period || 0}</p>
          <p className="text-sm text-gray-600">Benutzer eingeloggt</p>
        </div>

        {/* Neue Bewerbungen */}
        <div className="card border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-purple-100">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-purple-500 p-2 rounded-lg">
              <FileText className="h-5 w-5 text-white" />
            </div>
            <h3 className="font-semibold text-gray-900">Neue Bewerbungen</h3>
          </div>
          <p className="text-4xl font-bold text-purple-600 mb-1">{stats.applications.new_in_period || 0}</p>
          <p className="text-sm text-gray-600">eingegangen</p>
        </div>

        {/* Neue Registrierungen */}
        <div className="card border-2 border-green-200 bg-gradient-to-br from-green-50 to-green-100">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-green-500 p-2 rounded-lg">
              <UserPlus className="h-5 w-5 text-white" />
            </div>
            <h3 className="font-semibold text-gray-900">Neue Registrierungen</h3>
          </div>
          <p className="text-4xl font-bold text-green-600 mb-1">{stats.users.new_in_period || 0}</p>
          <p className="text-sm text-gray-600">neue Benutzer</p>
        </div>
      </div>

      {/* Detaillierte zeitbasierte Statistiken */}
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        {/* Login-Details */}
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <LogIn className="h-5 w-5 text-blue-600" />
            Login-Übersicht
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <span className="text-gray-600">Heute</span>
              <span className="font-bold text-blue-600">{stats.users.logins_today || 0}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <span className="text-gray-600">Diese Woche</span>
              <span className="font-bold text-blue-600">{stats.users.logins_this_week || 0}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <span className="text-gray-600">Diesen Monat</span>
              <span className="font-bold text-blue-600">{stats.users.logins_this_month || 0}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-indigo-50 rounded-lg border border-indigo-200">
              <span className="text-indigo-700 font-medium">{getPeriodLabel()}</span>
              <span className="font-bold text-indigo-600">{stats.users.logins_in_period || 0}</span>
            </div>
          </div>
        </div>

        {/* Bewerbungen im Zeitraum */}
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <FileText className="h-5 w-5 text-purple-600" />
            Bewerbungen im Zeitraum
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <span className="text-gray-600">Neue Bewerbungen</span>
              <span className="font-bold text-purple-600">{stats.applications.new_in_period || 0}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <span className="text-gray-600">Angenommen</span>
              <span className="font-bold text-green-600">{stats.applications.accepted_in_period || 0}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <span className="text-gray-600">Diese Woche (neu)</span>
              <span className="font-bold text-blue-600">{stats.applications.new_this_week || 0}</span>
            </div>
          </div>
        </div>
      </div>

      {/* E-Mail-Statistiken */}
      {emailStats && (
        <div className="card mb-8">
          <div className="flex items-center gap-3 mb-4">
            <Mail className="h-6 w-6 text-primary-600" />
            <h2 className="text-xl font-semibold text-gray-900">E-Mail-Statistiken</h2>
            <span className="text-sm text-gray-500">(letzte {emailStats.period_days} Tage)</span>
          </div>
          
          {/* Übersicht */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <p className="text-3xl font-bold text-blue-600">{emailStats.total_sent}</p>
              <p className="text-sm text-gray-600">Gesendet</p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <p className="text-3xl font-bold text-green-600">{emailStats.total_success}</p>
              <p className="text-sm text-gray-600">Erfolgreich</p>
            </div>
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <p className="text-3xl font-bold text-red-600">{emailStats.total_failed}</p>
              <p className="text-sm text-gray-600">Fehlgeschlagen</p>
            </div>
          </div>
          
          {/* Nach Typ */}
          {emailStats.by_type && emailStats.by_type.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-700 mb-3">Nach Typ</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {emailStats.by_type.map((item) => (
                  <div key={item.type} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm text-gray-700">{item.label}</span>
                    <span className="font-semibold text-gray-900">{item.total}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Letzte E-Mails */}
          {emailStats.recent && emailStats.recent.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3">Letzte E-Mails</h3>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {emailStats.recent.slice(0, 5).map((email, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-2 bg-gray-50 rounded text-sm">
                    <Send className={`h-4 w-4 ${email.success ? "text-green-500" : "text-red-500"}`} />
                    <span className="text-gray-500 w-24 truncate">{email.label}</span>
                    <span className="text-gray-700 flex-1 truncate">{email.recipient}</span>
                    <span className="text-gray-400 text-xs">
                      {email.created_at ? new Date(email.created_at).toLocaleString("de-DE", { 
                        day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
                        timeZone: "Europe/Berlin"
                      }) : ""}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Kaltakquise-Statistiken */}
      {coldOutreachStats && (
        <div className="card mb-8 border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-blue-500 p-2 rounded-lg">
              <Send className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Kaltakquise E-Mails</h2>
              <p className="text-sm text-gray-600">Letzte {coldOutreachStats.period_days} Tage</p>
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="text-center p-4 bg-white rounded-lg shadow-sm">
              <p className="text-4xl font-bold text-blue-600">{coldOutreachStats.total}</p>
              <p className="text-sm text-gray-600">Gesendet</p>
            </div>
            <div className="text-center p-4 bg-white rounded-lg shadow-sm">
              <p className="text-4xl font-bold text-green-600">{coldOutreachStats.success}</p>
              <p className="text-sm text-gray-600">Erfolgreich</p>
            </div>
            <div className="text-center p-4 bg-white rounded-lg shadow-sm">
              <p className="text-4xl font-bold text-red-600">{coldOutreachStats.failed}</p>
              <p className="text-sm text-gray-600">Fehlgeschlagen</p>
            </div>
          </div>

          {/* Pro Mitarbeiter */}
          {coldOutreachStats.by_user && coldOutreachStats.by_user.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3">Pro Mitarbeiter</h3>
              <div className="space-y-2">
                {coldOutreachStats.by_user.map((user, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-white rounded-lg shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-semibold text-sm">
                        {idx + 1}
                      </div>
                      <span className="font-medium text-gray-800">{user.email}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-sm text-gray-500">{user.success} erfolgreich</span>
                      <span className="text-xl font-bold text-blue-600">{user.total}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Gemeldete Stellen */}
      {jobReports.length > 0 && (
        <div className="card border-2 border-red-200 bg-red-50 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-red-800 flex items-center gap-2">
              <Flag className="h-6 w-6" />
              Gemeldete Stellen ({jobReports.length})
            </h2>
          </div>
          <div className="space-y-3">
            {jobReports.slice(0, 5).map((report) => (
              <div key={report.id} className="bg-white rounded-lg p-4 border border-red-200">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-gray-900">{report.job_title}</span>
                      {!report.job_is_active && (
                        <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded">Inaktiv</span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mb-2">
                      Firma: {report.job_company || "Unbekannt"}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded font-medium">
                        {report.reason_label}
                      </span>
                      <span className="text-gray-500">
                        von {report.reporter_name}
                      </span>
                      <span className="text-gray-400">
                        {new Date(report.created_at).toLocaleDateString("de-DE")}
                      </span>
                    </div>
                    {report.note && (
                      <p className="text-sm text-gray-600 mt-2 italic">&quot;{report.note}&quot;</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {report.job_id && (
                      <Link
                        href="/admin/jobs"
                        className="p-2 text-gray-500 hover:text-primary-600 hover:bg-gray-100 rounded-lg transition-colors"
                        title="Stelle ansehen"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Link>
                    )}
                    <button
                      onClick={() => handleDismissReport(report.id)}
                      disabled={dismissingReport === report.id}
                      className="p-2 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                      title="Meldung verwerfen (bearbeitet)"
                    >
                      {dismissingReport === report.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <CheckCircle className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {jobReports.length > 5 && (
              <Link href="/admin/reports" className="block text-sm text-red-600 text-center hover:underline">
                + {jobReports.length - 5} weitere Meldungen ansehen →
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Schnellzugriff */}
      <div className="card">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Verwaltung</h2>
        <div className="grid md:grid-cols-3 gap-4">
          <Link 
            href="/admin/users"
            className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <Users className="h-6 w-6 text-primary-600" />
            <div>
              <p className="font-medium">Benutzer verwalten</p>
              <p className="text-sm text-gray-500">{stats.users.total} Benutzer</p>
            </div>
          </Link>
          <Link 
            href="/admin/jobs"
            className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <Briefcase className="h-6 w-6 text-primary-600" />
            <div>
              <p className="font-medium">Stellen verwalten</p>
              <p className="text-sm text-gray-500">{stats.jobs.total} Stellen</p>
            </div>
          </Link>
          <Link 
            href="/admin/job-requests"
            className="flex items-center gap-3 p-4 bg-primary-50 border-2 border-primary-200 rounded-lg hover:bg-primary-100 transition-colors"
          >
            <ClipboardList className="h-6 w-6 text-primary-600" />
            <div>
              <p className="font-medium text-primary-900">IJP-Aufträge</p>
              <p className="text-sm text-primary-600">Vermittlungsaufträge</p>
            </div>
          </Link>
          <Link 
            href="/admin/applications"
            className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <FileText className="h-6 w-6 text-primary-600" />
            <div>
              <p className="font-medium">Bewerbungen ansehen</p>
              <p className="text-sm text-gray-500">{stats.applications.total} Bewerbungen</p>
            </div>
          </Link>
          <Link
            href="/admin/blog"
            className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <BookOpen className="h-6 w-6 text-primary-600" />
            <div>
              <p className="font-medium">Blog verwalten</p>
              <p className="text-sm text-gray-500">Artikel & SEO</p>
            </div>
          </Link>
          <Link
            href="/admin/ba-scraper"
            className="flex items-center gap-3 p-4 bg-orange-50 border border-orange-200 rounded-lg hover:bg-orange-100 transition-colors"
          >
            <ExternalLink className="h-6 w-6 text-orange-600" />
            <div>
              <p className="font-medium text-orange-900">BA-Stellenscraper</p>
              <p className="text-sm text-orange-600">Externe Jobs importieren</p>
            </div>
          </Link>
        </div>
      </div>

      {/* Abo-Übersicht (Premium) */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="h-5 w-5 text-primary-600" />
          <h2 className="text-lg font-bold text-gray-900">Premium-Abos</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-gray-50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-gray-900">{subStats?.total_companies ?? "–"}</div>
            <div className="text-xs text-gray-500 mt-1">Firmen gesamt</div>
          </div>
          <div className="bg-green-50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{subStats?.active ?? "–"}</div>
            <div className="text-xs text-gray-500 mt-1">Zahlende Abos</div>
          </div>
          <div className="bg-blue-50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{subStats?.trialing ?? "–"}</div>
            <div className="text-xs text-gray-500 mt-1">Im Testzeitraum</div>
          </div>
          <div className="bg-amber-50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-amber-600">{subStats?.trial_canceled ?? "–"}</div>
            <div className="text-xs text-gray-500 mt-1">Im Test gekündigt</div>
          </div>
          <div className="bg-rose-50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-rose-600">{subStats?.cancellations_total ?? "–"}</div>
            <div className="text-xs text-gray-500 mt-1">Kündigungen gesamt</div>
          </div>
        </div>
        <p className="text-xs text-gray-400 mt-3">
          „Zahlende Abos" = aktive, bezahlte Abos. „Im Testzeitraum" = laufende 7-Tage-Testphase.
          „Im Test gekündigt" = Testphase läuft, wurde aber bereits gekündigt.
        </p>
      </div>

      {/* Premium-Kündigungen */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center gap-2 mb-4">
          <FileX className="h-5 w-5 text-rose-500" />
          <h2 className="text-lg font-bold text-gray-900">Premium-Kündigungen</h2>
          {cancellations.length > 0 && (
            <span className="ml-1 text-xs font-medium text-gray-500">({cancellations.length})</span>
          )}
        </div>
        {cancellations.length === 0 ? (
          <p className="text-sm text-gray-500">
            Noch keine Kündigungen mit Begründung. Der Kündigungsgrund wird erfasst, sobald er
            im Stripe-Kundenportal aktiviert ist und ein Kunde kündigt.
          </p>
        ) : (
          <div className="space-y-3">
            {cancellations.map((c) => (
              <div key={c.id} className="flex flex-col gap-1 p-3 bg-gray-50 rounded-lg sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="font-medium text-gray-900 truncate">{c.company_name || "Unbekannte Firma"}</p>
                  {c.feedback_label && (
                    <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium bg-rose-100 text-rose-700 border border-rose-200">
                      {c.feedback_label}
                    </span>
                  )}
                  {c.comment && (
                    <p className="text-sm text-gray-600 mt-1 break-words">„{c.comment}"</p>
                  )}
                </div>
                {c.created_at && (
                  <span className="text-xs text-gray-400 whitespace-nowrap sm:ml-4">
                    {new Date(c.created_at).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" })}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
