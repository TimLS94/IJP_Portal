"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Briefcase, Plus, MapPin, Calendar, Edit, Trash2, Eye, EyeOff, Clock, Archive, RotateCcw, AlertTriangle, FileText, Search, X, LayoutGrid, List, Languages, Lock, Unlock, Copy, Loader2, Heart, Users, ChevronRight, ChevronDown, Building2, Globe, ExternalLink } from "lucide-react";
import { jobsAPI } from "@/lib/api";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";

interface Job {
  id: number;
  title: string;
  slug?: string;
  location?: string;
  is_active: boolean;
  is_draft?: boolean;
  created_at: string;
  deadline?: string;
  archived_at?: string;
  view_count?: number;
  like_count?: number;
  application_count?: number;
  position_type?: string;
  admin_translated?: boolean;
  keep_archived?: boolean;
}

interface Template {
  id: number;
  name: string;
  title?: string;
  location?: string;
  position_type?: string;
  created_at: string;
}


const positionTypeColors: Record<string, string> = {
  general: "bg-gray-100 text-gray-800", studentenferienjob: "bg-blue-100 text-blue-800",
  saisonjob: "bg-orange-100 text-orange-800", workandholiday: "bg-orange-100 text-orange-800",
  fachkraft: "bg-purple-100 text-purple-800", ausbildung: "bg-green-100 text-green-800",
};


const getDaysRemaining = (deadline: string) => {
  if (!deadline) return null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const deadlineDate = new Date(deadline); deadlineDate.setHours(0, 0, 0, 0);
  return Math.ceil((deadlineDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
};

const DeadlineBadge = ({ deadline }: { deadline: string }) => {
  const days = getDaysRemaining(deadline);
  if (days === null) return null;
  if (days < 0) return <span className="flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium"><AlertTriangle className="h-3 w-3" />Abgelaufen</span>;
  if (days === 0) return <span className="flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium animate-pulse"><Clock className="h-3 w-3" />Läuft heute ab!</span>;
  if (days <= 3) return <span className="flex items-center gap-1 px-2 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-medium"><Clock className="h-3 w-3" />Noch {days} Tag{days > 1 ? "e" : ""}</span>;
  if (days <= 7) return <span className="flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium"><Clock className="h-3 w-3" />Noch {days} Tage</span>;
  return <span className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium"><Clock className="h-3 w-3" />Noch {days} Tage</span>;
};

export default function CompanyJobsPage() {
  const { t } = useTranslation();
  const searchParams = useSearchParams();

  const positionTypeLabels: Record<string, string> = {
    general: t('positionTypes.general'),
    studentenferienjob: t('positionTypes.studentenferienjob'),
    saisonjob: t('positionTypes.saisonjob'),
    workandholiday: t('positionTypes.saisonjob'),
    fachkraft: t('positionTypes.fachkraft'),
    ausbildung: t('positionTypes.ausbildung'),
  };

  const deletionReasons = [
    { value: "filled_via_jobon", label: `✅ ${t('companyJobs.filledViaJobon')}`, highlight: true },
    { value: "filled_via_other", label: t('companyJobs.filledViaOther'), highlight: false },
    { value: "position_cancelled", label: t('companyJobs.positionCancelled'), highlight: false },
    { value: "seasonal_end", label: t('companyJobs.seasonalEnd'), highlight: false },
    { value: "budget_reasons", label: t('companyJobs.budgetReasons'), highlight: false },
    { value: "other", label: t('common.other'), highlight: false },
  ];
  const [jobs, setJobs] = useState<Job[]>([]);
  const [archivedJobs, setArchivedJobs] = useState<Job[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(searchParams.get("tab") || "active");
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");
  const [filterStatus, setFilterStatus] = useState("all");
  const [sortBy, setSortBy] = useState("created_desc");
  const [searchQuery, setSearchQuery] = useState("");
  const [archiveDeletionDays] = useState(90);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteJobId, setDeleteJobId] = useState<number | null>(null);
  const [deleteReason, setDeleteReason] = useState("");
  const [deleteReasonNote, setDeleteReasonNote] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Slide Panel State
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null);
  const [jobDetails, setJobDetails] = useState<Job & { description?: string; requirements?: string; benefits?: string; contact_email?: string; company_name?: string } | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const router = useRouter();
  
  // Check if mobile
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    try {
      const jobsRes = await jobsAPI.getMyJobs().catch((e) => { 
        console.error("getMyJobs error:", e.response?.data || e); 
        if (e.response?.status === 404) {
          toast.error(t('companyJobs.createProfileFirst'));
        } else if (e.response?.status === 403) {
          toast.error(t('companyJobs.noPermission'));
        } else {
          toast.error(t('companyJobs.loadError') + ": " + (e.response?.data?.detail || e.message));
        }
        return { data: [] }; 
      });
      
      const [archivedRes, templatesRes] = await Promise.all([
        jobsAPI.getArchivedJobs().catch(() => ({ data: [] })),
        jobsAPI.getTemplates().catch(() => ({ data: [] })),
      ]);
      
      console.log("Jobs loaded:", jobsRes.data?.length || 0, "jobs");
      setJobs(jobsRes.data || []);
      setArchivedJobs(archivedRes.data || []);
      setTemplates(templatesRes.data || []);
    } catch (e) { 
      console.error("loadAll error:", e);
      toast.error(t('common.error')); 
    }
    finally { setLoading(false); }
  };

  const formatDate = (d: string) => d ? new Date(d).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" }) : "-";

  const getFilteredJobs = () => {
    let filtered = [...jobs];
    if (searchQuery) { const q = searchQuery.toLowerCase(); filtered = filtered.filter((j) => j.title?.toLowerCase().includes(q) || j.location?.toLowerCase().includes(q)); }
    if (filterStatus === "active") filtered = filtered.filter((j) => j.is_active && !j.is_draft);
    else if (filterStatus === "inactive") filtered = filtered.filter((j) => !j.is_active && !j.is_draft);
    else if (filterStatus === "draft") filtered = filtered.filter((j) => j.is_draft);
    if (sortBy === "created_desc") filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    else if (sortBy === "created_asc") filtered.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    else if (sortBy === "deadline") filtered.sort((a, b) => { if (!a.deadline) return 1; if (!b.deadline) return -1; return new Date(a.deadline).getTime() - new Date(b.deadline).getTime(); });
    else if (sortBy === "views") filtered.sort((a, b) => (b.view_count || 0) - (a.view_count || 0));
    else if (sortBy === "likes") filtered.sort((a, b) => (b.like_count || 0) - (a.like_count || 0));
    else if (sortBy === "applications") filtered.sort((a, b) => (b.application_count || 0) - (a.application_count || 0));
    return filtered;
  };

  const toggleActive = async (job: Job) => {
    try { await jobsAPI.update(job.id, { is_active: !job.is_active }); toast.success(job.is_active ? t('companyJobs.deactivated') : t('companyJobs.activated')); loadAll(); }
    catch { toast.error(t('common.error')); }
  };

  const openDeleteModal = (id: number) => { setDeleteJobId(id); setDeleteReason(""); setDeleteReasonNote(""); setShowDeleteModal(true); };

  const handleArchiveWithReason = async () => {
    if (!deleteReason) { toast.error(t('companyJobs.selectReason')); return; }
    setIsDeleting(true);
    try {
      // @ts-expect-error - API accepts string for deletionReason
      await jobsAPI.delete(deleteJobId!, false, deleteReason, deleteReasonNote || null);
      toast.success(deleteReason === "filled_via_jobon" ? `🎉 ${t('companyJobs.filledViaJobonSuccess')}` : t('companyJobs.archived'));
      setShowDeleteModal(false); loadAll();
    } catch { toast.error(t('common.error')); } finally { setIsDeleting(false); }
  };

  const handlePermanentDelete = async (id: number) => {
    if (!confirm(t('companyJobs.confirmPermanentDelete'))) return;
    try { await jobsAPI.deletePermanent(id); toast.success(t('common.deleted')); loadAll(); } catch { toast.error(t('common.error')); }
  };

  const handleReactivate = async (id: number) => {
    try { await jobsAPI.reactivate(id); toast.success(t('companyJobs.reactivated')); loadAll(); }
    catch (e: unknown) { const err = e as { response?: { data?: { detail?: string } } }; toast.error(err.response?.data?.detail || t('common.error')); }
  };

  const toggleKeepArchived = async (job: Job) => {
    try { await jobsAPI.setKeepArchived(job.id, !job.keep_archived); toast.success(job.keep_archived ? t('companyJobs.autoDeleteEnabled') : t('companyJobs.permanentlyKept')); loadAll(); }
    catch { toast.error(t('common.error')); }
  };

  const deleteTemplate = async (id: number) => {
    if (!confirm(t('companyJobs.confirmDeleteTemplate'))) return;
    try { await jobsAPI.deleteTemplate(id); toast.success(t('common.deleted')); loadAll(); } catch { toast.error(t('common.error')); }
  };

  const useTemplate = (template: Template) => {
    sessionStorage.setItem("jobTemplate", JSON.stringify(template));
    window.location.href = "/company/jobs/new?fromTemplate=true";
  };

  const getDaysUntilDeletion = (archivedAt: string) => {
    if (!archivedAt) return null;
    const deleteDate = new Date(new Date(archivedAt).getTime() + archiveDeletionDays * 24 * 60 * 60 * 1000);
    return Math.max(0, Math.ceil((deleteDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
  };
  
  const openJobDetails = useCallback(async (job: Job) => {
    if (isMobile) {
      // Mobile: Navigate to detail page
      router.push(`/jobs/${job.slug ? `${job.slug}-${job.id}` : job.id}`);
      return;
    }
    
    // Desktop: Open slide panel
    setSelectedJobId(job.id);
    setLoadingDetails(true);
    try {
      const response = await jobsAPI.get(job.id);
      setJobDetails(response.data);
    } catch (error) {
      console.error("Error loading job details:", error);
      toast.error(t('companyJobs.loadDetailsError'));
    } finally {
      setLoadingDetails(false);
    }
  }, [isMobile, router]);
  
  const closeJobDetails = () => {
    setSelectedJobId(null);
    setJobDetails(null);
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-12 w-12 text-primary-600 animate-spin" /></div>;

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Briefcase className="h-8 w-8 text-primary-600" />
          <h1 className="text-3xl font-bold text-gray-900">{t('companyJobs.title')}</h1>
        </div>
        <Link href="/company/jobs/new" className="btn-primary flex items-center gap-2"><Plus className="h-5 w-5" />{t('companyJobs.newJob')}</Link>
      </div>

      <div className="flex gap-2 mb-6 border-b border-gray-200">
        {[{ key: "active", label: t('companyJobs.jobs'), icon: Briefcase, count: jobs.length }, { key: "templates", label: t('companyJobs.templates'), icon: FileText, count: templates.length }, { key: "archived", label: t('companyJobs.archive'), icon: Archive, count: archivedJobs.length }].map((tab) => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)} className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors flex items-center gap-2 ${activeTab === tab.key ? "border-primary-600 text-primary-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
            <tab.icon className="h-4 w-4" />{tab.label} ({tab.count})
          </button>
        ))}
      </div>

      {activeTab === "active" && jobs.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input type="text" placeholder={t('common.search') + '...'} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-9 py-2.5 bg-white border-2 border-gray-200 rounded-xl focus:border-primary-500 focus:ring-2 focus:ring-primary-200 focus:outline-none transition-all placeholder-gray-400 text-gray-700 text-sm" />
            {searchQuery && <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded"><X className="h-4 w-4 text-gray-400" /></button>}
          </div>
          <div className="relative">
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="appearance-none pl-4 pr-10 py-2.5 bg-white border-2 border-gray-200 rounded-xl focus:border-primary-500 focus:ring-2 focus:ring-primary-200 focus:outline-none transition-all text-gray-700 text-sm font-medium cursor-pointer hover:border-gray-300">
              <option value="all">{t('companyJobs.allStatus')}</option>
              <option value="active">{t('companyJobs.active')}</option>
              <option value="inactive">{t('companyJobs.inactive')}</option>
              <option value="draft">{t('companyJobs.drafts')}</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          </div>
          <div className="relative">
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="appearance-none pl-4 pr-10 py-2.5 bg-white border-2 border-gray-200 rounded-xl focus:border-primary-500 focus:ring-2 focus:ring-primary-200 focus:outline-none transition-all text-gray-700 text-sm font-medium cursor-pointer hover:border-gray-300">
              <option value="created_desc">{t('companyJobs.newestFirst')}</option>
              <option value="created_asc">{t('companyJobs.oldestFirst')}</option>
              <option value="deadline">{t('companyJobs.byDeadline')}</option>
              <option value="views">{t('companyJobs.byViews')}</option>
              <option value="likes">{t('companyJobs.byLikes')}</option>
              <option value="applications">{t('companyJobs.byApplications')}</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          </div>
          <div className="flex gap-1 bg-gray-100 rounded-xl p-1 border-2 border-gray-200">
            <button onClick={() => setViewMode("cards")} className={`p-2.5 rounded-lg transition-all ${viewMode === "cards" ? "bg-white shadow-sm text-primary-600" : "text-gray-500 hover:text-gray-700"}`} title={t('companyJobs.cardView')}><LayoutGrid className="h-4 w-4" /></button>
            <button onClick={() => setViewMode("table")} className={`p-2.5 rounded-lg transition-all ${viewMode === "table" ? "bg-white shadow-sm text-primary-600" : "text-gray-500 hover:text-gray-700"}`} title={t('companyJobs.listView')}><List className="h-4 w-4" /></button>
          </div>
        </div>
      )}

      {activeTab === "active" && (jobs.length === 0 ? (
        <div className="card text-center py-12"><Briefcase className="h-16 w-16 text-gray-300 mx-auto mb-4" /><h2 className="text-xl font-semibold mb-2">{t('companyJobs.noJobs')}</h2><p className="text-gray-600 mb-4">{t('companyJobs.createFirstJob')}</p><Link href="/company/jobs/new" className="btn-primary">{t('companyJobs.createFirstJobBtn')}</Link></div>
      ) : viewMode === "table" ? (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b text-left"><th className="pb-3 font-semibold">Titel</th><th className="pb-3 font-semibold">Status</th><th className="pb-3 font-semibold">Ort</th><th className="pb-3 font-semibold">Erstellt</th><th className="pb-3 font-semibold">Deadline</th><th className="pb-3 font-semibold text-center">Aufrufe</th><th className="pb-3 font-semibold text-center">Gemerkt</th><th className="pb-3 font-semibold text-center">Bewerbungen</th><th className="pb-3 font-semibold text-right">Aktionen</th></tr></thead>
            <tbody>
              {getFilteredJobs().map((job) => (
                <tr key={job.id} className={`border-b last:border-0 hover:bg-gray-50 ${!job.is_active && !job.is_draft ? "opacity-60" : ""}`}>
                  <td className="py-3 pr-4"><button onClick={() => openJobDetails(job)} className="font-medium text-gray-900 hover:text-primary-600 text-left flex items-center gap-1 group">{job.title}<ChevronRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" /></button>{job.is_draft && <span className="ml-2 text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded">Entwurf</span>}</td>
                  <td className="py-3">{job.is_draft ? <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">Entwurf</span> : job.is_active ? <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">Aktiv</span> : <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">Inaktiv</span>}</td>
                  <td className="py-3 text-gray-600">{job.location || "-"}</td>
                  <td className="py-3 text-gray-600">{formatDate(job.created_at)}</td>
                  <td className="py-3">{job.deadline ? <DeadlineBadge deadline={job.deadline} /> : "-"}</td>
                  <td className="py-3 text-center"><span className="inline-flex items-center gap-1 font-medium text-indigo-600"><Eye className="h-3.5 w-3.5" />{job.view_count || 0}</span></td>
                  <td className="py-3 text-center"><span className="inline-flex items-center gap-1 font-medium text-red-500"><Heart className="h-3.5 w-3.5" />{job.like_count || 0}</span></td>
                  <td className="py-3 text-center"><span className="inline-flex items-center gap-1 font-medium text-green-600"><Users className="h-3.5 w-3.5" />{job.application_count || 0}</span></td>
                  <td className="py-3 text-right">
                    <div className="flex justify-end gap-0.5">
                      <Link href={`/company/jobs/${job.id}/edit`} className="p-2 text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded-lg"><Edit className="h-4 w-4" /></Link>
                      <button onClick={() => toggleActive(job)} className={`p-2 rounded-lg ${job.is_active ? "text-gray-500 hover:text-orange-600 hover:bg-orange-50" : "text-gray-500 hover:text-green-600 hover:bg-green-50"}`}>{job.is_active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
                      <button onClick={() => openDeleteModal(job.id)} className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {getFilteredJobs().length === 0 && <p className="text-center text-gray-500 py-8">Keine Stellen gefunden</p>}
        </div>
      ) : (
        <div className="space-y-4">
          {getFilteredJobs().map((job) => (
            <div key={job.id} className={`card ${!job.is_active ? "opacity-60" : ""}`}>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2 flex-wrap">
                    <button onClick={() => openJobDetails(job)} className="text-xl font-semibold text-gray-900 hover:text-primary-600 text-left flex items-center gap-1 group">{job.title}<ChevronRight className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity" /></button>
                    {job.position_type && <span className={`px-3 py-1 rounded-full text-sm font-medium ${positionTypeColors[job.position_type] || "bg-gray-100"}`}>{positionTypeLabels[job.position_type] || job.position_type}</span>}
                    {job.is_draft && <span className="px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-700">{t('companyJobs.draft')}</span>}
                    {!job.is_active && !job.is_draft && <span className="px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-600">{t('companyJobs.inactive')}</span>}
                    {job.admin_translated && <span className="flex items-center gap-1 px-2 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs font-medium"><Languages className="h-3 w-3" />{t('companyJobs.translated')}</span>}
                    {job.deadline && <DeadlineBadge deadline={job.deadline} />}
                  </div>
                  <div className="flex flex-wrap items-center gap-4 text-gray-600 text-sm">
                    {job.location && <span className="flex items-center gap-1"><MapPin className="h-4 w-4" />{job.location}</span>}
                    <span className="flex items-center gap-1"><Calendar className="h-4 w-4" />{t('common.created')}: {formatDate(job.created_at)}</span>
                    <span className="flex items-center gap-1 text-indigo-600 font-medium"><Eye className="h-4 w-4" />{job.view_count || 0} {t('companyJobs.views')}</span>
                    <span className="flex items-center gap-1 text-red-500 font-medium"><Heart className="h-4 w-4" />{job.like_count || 0} {t('companyJobs.saved')}</span>
                    <span className="flex items-center gap-1 text-green-600 font-medium"><Users className="h-4 w-4" />{job.application_count || 0} {t('companyJobs.applications')}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <button onClick={() => toggleActive(job)} className="btn-secondary text-sm flex items-center gap-1">{job.is_active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}<span className="hidden sm:inline">{job.is_active ? t('companyJobs.deactivate') : t('companyJobs.activate')}</span></button>
                  <Link href={`/company/jobs/${job.id}/edit`} className="btn-primary text-sm flex items-center gap-1"><Edit className="h-4 w-4" /><span className="hidden sm:inline">{t('common.edit')}</span></Link>
                  <button onClick={() => openDeleteModal(job.id)} className="btn-danger text-sm flex items-center gap-1"><Archive className="h-4 w-4" /><span className="hidden sm:inline">{t('companyJobs.archiveBtn')}</span></button>
                </div>
              </div>
            </div>
          ))}
          {getFilteredJobs().length === 0 && <p className="text-center text-gray-500 py-8">Keine Stellen gefunden</p>}
        </div>
      ))}

      {activeTab === "templates" && (templates.length === 0 ? (
        <div className="card text-center py-12"><FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" /><h2 className="text-xl font-semibold mb-2">Keine Vorlagen</h2><p className="text-gray-600 mb-4">Erstellen Sie eine Stelle und speichern Sie diese als Vorlage.</p><Link href="/company/jobs/new?saveAsTemplate=true" className="btn-primary inline-flex items-center gap-2"><Plus className="h-5 w-5" />Vorlage erstellen</Link></div>
      ) : (
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4"><p className="text-blue-800 text-sm flex items-center gap-2"><FileText className="h-5 w-5" />Vorlagen sind wiederverwendbare Stellenbeschreibungen.</p></div>
          {templates.map((template) => (
            <div key={template.id} className="card hover:shadow-lg transition-shadow">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2"><span className="text-lg font-semibold text-gray-900">{template.name}</span>{template.title && <span className="text-gray-500">→ {template.title}</span>}</div>
                  <div className="flex flex-wrap items-center gap-4 text-gray-600 text-sm">
                    {template.location && <span className="flex items-center gap-1"><MapPin className="h-4 w-4" />{template.location}</span>}
                    {template.position_type && <span className="flex items-center gap-1"><Briefcase className="h-4 w-4" />{positionTypeLabels[template.position_type] || template.position_type}</span>}
                    <span className="flex items-center gap-1"><Calendar className="h-4 w-4" />Erstellt: {formatDate(template.created_at)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => useTemplate(template)} className="btn-primary text-sm flex items-center gap-1"><Copy className="h-4 w-4" />Verwenden</button>
                  <button onClick={() => deleteTemplate(template.id)} className="btn-danger text-sm flex items-center gap-1"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ))}

      {activeTab === "archived" && (archivedJobs.length === 0 ? (
        <div className="card text-center py-12"><Archive className="h-16 w-16 text-gray-300 mx-auto mb-4" /><h2 className="text-xl font-semibold mb-2">Kein Archiv</h2><p className="text-gray-600">Archivierte Stellen werden hier für {archiveDeletionDays} Tage aufbewahrt.</p></div>
      ) : (
        <div className="space-y-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-4"><p className="text-yellow-800 text-sm flex items-center gap-2"><AlertTriangle className="h-5 w-5" />Archivierte Stellen werden nach {archiveDeletionDays} Tagen automatisch gelöscht.</p></div>
          {archivedJobs.map((job) => {
            const daysLeft = getDaysUntilDeletion(job.archived_at || "");
            return (
              <div key={job.id} className="card border-l-4 border-l-gray-400 bg-gray-50">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <span className="text-xl font-semibold text-gray-700">{job.title}</span>
                      <span className="px-3 py-1 rounded-full text-sm font-medium bg-gray-200 text-gray-600">Archiviert</span>
                      {job.keep_archived ? <span className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700"><Lock className="h-3 w-3" />Dauerhaft</span> : daysLeft !== null && <span className={`px-2 py-1 rounded-full text-xs font-medium ${daysLeft <= 7 ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-600"}`}>Wird in {daysLeft} Tag{daysLeft !== 1 ? "en" : ""} gelöscht</span>}
                    </div>
                    <div className="flex flex-wrap items-center gap-4 text-gray-500 text-sm">
                      {job.location && <span className="flex items-center gap-1"><MapPin className="h-4 w-4" />{job.location}</span>}
                      {job.archived_at && <span className="flex items-center gap-1"><Archive className="h-4 w-4" />Archiviert: {formatDate(job.archived_at)}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Link href={`/company/jobs/${job.id}/edit`} className="btn-secondary text-sm flex items-center gap-1"><Edit className="h-4 w-4" />Bearbeiten</Link>
                    <button onClick={() => toggleKeepArchived(job)} className={`text-sm flex items-center gap-1 px-3 py-1.5 rounded-lg border ${job.keep_archived ? "bg-green-50 border-green-300 text-green-700" : "bg-gray-50 border-gray-300 text-gray-700"}`}>{job.keep_archived ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}<span className="hidden sm:inline">{job.keep_archived ? "Freigeben" : "Behalten"}</span></button>
                    <button onClick={() => handleReactivate(job.id)} className="btn-primary text-sm flex items-center gap-1"><RotateCcw className="h-4 w-4" />Reaktivieren</button>
                    <button onClick={() => handlePermanentDelete(job.id)} className="btn-danger text-sm flex items-center gap-1"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ))}

      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full">
            <div className="p-6 border-b"><h2 className="text-xl font-semibold text-gray-900">Stelle archivieren</h2><p className="text-gray-600 text-sm mt-1">Warum möchten Sie diese Stelle archivieren?</p></div>
            <div className="p-6 space-y-3">
              {deletionReasons.map((reason) => (
                <label key={reason.value} className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${deleteReason === reason.value ? (reason.highlight ? "border-green-500 bg-green-50" : "border-primary-500 bg-primary-50") : "border-gray-200 hover:border-gray-300"}`}>
                  <input type="radio" name="deleteReason" value={reason.value} checked={deleteReason === reason.value} onChange={(e) => setDeleteReason(e.target.value)} className="sr-only" />
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${deleteReason === reason.value ? (reason.highlight ? "border-green-500" : "border-primary-500") : "border-gray-300"}`}>
                    {deleteReason === reason.value && <div className={`w-3 h-3 rounded-full ${reason.highlight ? "bg-green-500" : "bg-primary-500"}`} />}
                  </div>
                  <span className={`font-medium ${reason.highlight ? "text-green-700" : "text-gray-700"}`}>{reason.label}</span>
                </label>
              ))}
              {deleteReason === "other" && <textarea value={deleteReasonNote} onChange={(e) => setDeleteReasonNote(e.target.value)} placeholder="Bitte beschreiben..." className="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-primary-500 focus:outline-none" rows={3} />}
            </div>
            <div className="p-6 border-t bg-gray-50 rounded-b-2xl flex justify-end gap-3">
              <button onClick={() => setShowDeleteModal(false)} className="btn-secondary" disabled={isDeleting}>Abbrechen</button>
              <button onClick={handleArchiveWithReason} disabled={!deleteReason || isDeleting} className={`btn-primary flex items-center gap-2 ${!deleteReason ? "opacity-50 cursor-not-allowed" : ""}`}>
                {isDeleting ? <><Loader2 className="h-4 w-4 animate-spin" />Archiviere...</> : <><Archive className="h-4 w-4" />Archivieren</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Job Details Slide Panel (Desktop only) */}
      {selectedJobId && (
        <div className="fixed inset-0 z-50 hidden md:flex">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/30" onClick={closeJobDetails} />
          
          {/* Slide Panel */}
          <div className="absolute right-0 top-0 h-full w-full max-w-2xl bg-white shadow-2xl overflow-hidden flex flex-col animate-slide-in-right">
            {/* Header */}
            <div className="p-6 border-b bg-gradient-to-r from-primary-50 to-white flex items-start justify-between">
              <div className="flex-1 pr-4">
                {loadingDetails ? (
                  <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
                ) : (
                  <>
                    <h2 className="text-2xl font-bold text-gray-900">{jobDetails?.title}</h2>
                    <div className="flex items-center gap-3 mt-2 text-gray-600">
                      {jobDetails?.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-4 w-4" />
                          {jobDetails.location}
                        </span>
                      )}
                      {jobDetails?.position_type && (
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${positionTypeColors[jobDetails.position_type] || "bg-gray-100"}`}>
                          {positionTypeLabels[jobDetails.position_type] || jobDetails.position_type}
                        </span>
                      )}
                    </div>
                  </>
                )}
              </div>
              <button
                onClick={closeJobDetails}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="h-6 w-6 text-gray-500" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {loadingDetails ? (
                <div className="space-y-4">
                  <div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse" />
                  <div className="h-4 bg-gray-200 rounded w-full animate-pulse" />
                  <div className="h-4 bg-gray-200 rounded w-5/6 animate-pulse" />
                  <div className="h-32 bg-gray-200 rounded animate-pulse mt-6" />
                </div>
              ) : jobDetails ? (
                <div className="space-y-6">
                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-indigo-50 rounded-xl p-4 text-center">
                      <Eye className="h-6 w-6 text-indigo-600 mx-auto mb-1" />
                      <p className="text-2xl font-bold text-indigo-700">{jobDetails.view_count || 0}</p>
                      <p className="text-xs text-indigo-600">Aufrufe</p>
                    </div>
                    <div className="bg-red-50 rounded-xl p-4 text-center">
                      <Heart className="h-6 w-6 text-red-500 mx-auto mb-1" />
                      <p className="text-2xl font-bold text-red-600">{jobDetails.like_count || 0}</p>
                      <p className="text-xs text-red-500">Gemerkt</p>
                    </div>
                    <div className="bg-green-50 rounded-xl p-4 text-center">
                      <Users className="h-6 w-6 text-green-600 mx-auto mb-1" />
                      <p className="text-2xl font-bold text-green-700">{jobDetails.application_count || 0}</p>
                      <p className="text-xs text-green-600">Bewerbungen</p>
                    </div>
                  </div>

                  {/* Status & Deadline */}
                  <div className="flex items-center gap-3 flex-wrap">
                    {jobDetails.is_draft ? (
                      <span className="px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-700">{t('companyJobs.draft')}</span>
                    ) : jobDetails.is_active ? (
                      <span className="px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-700">{t('companyJobs.active')}</span>
                    ) : (
                      <span className="px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-600">{t('companyJobs.inactive')}</span>
                    )}
                    {jobDetails.deadline && <DeadlineBadge deadline={jobDetails.deadline} />}
                    {jobDetails.admin_translated && (
                      <span className="flex items-center gap-1 px-2 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs font-medium">
                        <Languages className="h-3 w-3" />{t('companyJobs.translated')}
                      </span>
                    )}
                  </div>

                  {/* Description */}
                  {jobDetails.description && (
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                        <FileText className="h-5 w-5 text-primary-600" />
                        {t('common.description')}
                      </h3>
                      <div className="prose prose-sm max-w-none text-gray-600" dangerouslySetInnerHTML={{ __html: jobDetails.description }} />
                    </div>
                  )}

                  {/* Requirements */}
                  {jobDetails.requirements && (
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                        <Briefcase className="h-5 w-5 text-primary-600" />
                        {t('common.requirements')}
                      </h3>
                      <div className="prose prose-sm max-w-none text-gray-600" dangerouslySetInnerHTML={{ __html: jobDetails.requirements }} />
                    </div>
                  )}

                  {/* Benefits */}
                  {jobDetails.benefits && (
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                        <Heart className="h-5 w-5 text-primary-600" />
                        Benefits
                      </h3>
                      <div className="prose prose-sm max-w-none text-gray-600" dangerouslySetInnerHTML={{ __html: jobDetails.benefits }} />
                    </div>
                  )}

                  {/* Meta Info */}
                  <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-gray-600">
                      <Calendar className="h-4 w-4" />
                      <span>{t('common.created')}: {formatDate(jobDetails.created_at)}</span>
                    </div>
                    {jobDetails.deadline && (
                      <div className="flex items-center gap-2 text-gray-600">
                        <Clock className="h-4 w-4" />
                        <span>{t('common.deadline')}: {formatDate(jobDetails.deadline)}</span>
                      </div>
                    )}
                    {jobDetails.contact_email && (
                      <div className="flex items-center gap-2 text-gray-600">
                        <Building2 className="h-4 w-4" />
                        <span>{t('common.contact')}: {jobDetails.contact_email}</span>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">{t('common.noDetailsAvailable')}</p>
              )}
            </div>

            {/* Footer Actions */}
            <div className="p-4 border-t bg-gray-50 flex items-center justify-between gap-3">
              <Link
                href={`/jobs/${jobDetails?.slug ? `${jobDetails.slug}-${jobDetails.id}` : jobDetails?.id}`}
                target="_blank"
                className="btn-secondary flex items-center gap-2"
              >
                <ExternalLink className="h-4 w-4" />
                {t('companyJobs.publicView')}
              </Link>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => jobDetails && toggleActive(jobDetails)}
                  className="btn-secondary flex items-center gap-2"
                >
                  {jobDetails?.is_active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  {jobDetails?.is_active ? t('companyJobs.deactivate') : t('companyJobs.activate')}
                </button>
                <Link
                  href={`/company/jobs/${jobDetails?.id}/edit`}
                  className="btn-primary flex items-center gap-2"
                >
                  <Edit className="h-4 w-4" />
                  {t('common.edit')}
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes slide-in-right {
          from {
            transform: translateX(100%);
          }
          to {
            transform: translateX(0);
          }
        }
        .animate-slide-in-right {
          animation: slide-in-right 0.3s ease-out;
        }
      `}</style>
    </>
  );
}
