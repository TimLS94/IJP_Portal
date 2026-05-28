"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { companyAPI, jobsAPI, applicationsAPI } from "@/lib/api";
import { Building2, Briefcase, Users, Plus, FileText, Languages, X } from "lucide-react";
import { useTranslation } from "react-i18next";

interface Company {
  company_name: string;
}

interface Job {
  id: number;
  title: string;
  is_active: boolean;
  admin_translated?: boolean;
  admin_translated_at?: string;
}

interface Application {
  id: number;
  status: string;
  applicant_name?: string;
  job_title?: string;
}

export default function CompanyDashboardPage() {
  const { t } = useTranslation();
  
  const statusConfig: Record<string, { label: string; bg: string; text: string }> = {
    pending: { label: t('applicationStatus.pending'), bg: "bg-yellow-100", text: "text-yellow-800" },
    company_review: { label: t('applicationStatus.company_review'), bg: "bg-blue-100", text: "text-blue-800" },
    interview_scheduled: { label: t('applicationStatus.interview_scheduled'), bg: "bg-purple-100", text: "text-purple-800" },
    accepted: { label: t('applicationStatus.accepted'), bg: "bg-green-100", text: "text-green-800" },
    rejected: { label: t('applicationStatus.rejected'), bg: "bg-red-100", text: "text-red-800" },
    withdrawn: { label: t('applicationStatus.withdrawn'), bg: "bg-gray-100", text: "text-gray-800" },
  };
  const [stats, setStats] = useState({ jobs: 0, activeJobs: 0, applications: 0, pendingApplications: 0 });
  const [company, setCompany] = useState<Company | null>(null);
  const [recentApplications, setRecentApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [translatedJobs, setTranslatedJobs] = useState<Job[]>([]);
  const [showTranslationBanner, setShowTranslationBanner] = useState(false);

  useEffect(() => {
    loadDashboard();
  }, []);

  const dismissTranslationBanner = () => {
    const seenTranslationsRaw = localStorage.getItem("seenTranslations");
    const existingSeenTranslations = seenTranslationsRaw ? JSON.parse(seenTranslationsRaw) : [];
    const newSeenData = translatedJobs.map((job) => ({ id: job.id, translatedAt: job.admin_translated_at }));
    const mergedSeenData = [...existingSeenTranslations];
    newSeenData.forEach((newItem) => {
      const existingIndex = mergedSeenData.findIndex((item: { id: number }) => item.id === newItem.id);
      if (existingIndex >= 0) {
        mergedSeenData[existingIndex] = newItem;
      } else {
        mergedSeenData.push(newItem);
      }
    });
    localStorage.setItem("seenTranslations", JSON.stringify(mergedSeenData));
    setShowTranslationBanner(false);
  };

  const loadDashboard = async () => {
    try {
      const [companyRes, jobsRes, appsRes] = await Promise.all([
        companyAPI.getProfile().catch(() => ({ data: null })),
        jobsAPI.getMyJobs().catch(() => ({ data: [] })),
        applicationsAPI.getCompanyApplications().catch(() => ({ data: [] })),
      ]);

      setCompany(companyRes.data);
      const jobs: Job[] = jobsRes.data || [];
      const apps: Application[] = appsRes.data || [];

      setStats({
        jobs: jobs.length,
        activeJobs: jobs.filter((j) => j.is_active).length,
        applications: apps.length,
        pendingApplications: apps.filter((a) => a.status === "pending").length,
      });

      const adminTranslatedJobs = jobs.filter((j) => j.admin_translated);
      const seenTranslationsRaw = localStorage.getItem("seenTranslations");
      const seenTranslations = seenTranslationsRaw ? JSON.parse(seenTranslationsRaw) : [];
      const newTranslations = adminTranslatedJobs.filter((job) => {
        const seen = seenTranslations.find((s: { id: number; translatedAt?: string }) => s.id === job.id);
        if (!seen) return true;
        if (job.admin_translated_at && seen.translatedAt) {
          return new Date(job.admin_translated_at) > new Date(seen.translatedAt);
        }
        return false;
      });

      setTranslatedJobs(newTranslations);
      setShowTranslationBanner(newTranslations.length > 0);
      setRecentApplications(apps.slice(0, 5));
    } catch (error) {
      console.error("Dashboard laden fehlgeschlagen:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <>
      {showTranslationBanner && translatedJobs.length > 0 && (
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-xl p-4 mb-6 relative">
          <button onClick={dismissTranslationBanner} className="absolute top-3 right-3 text-indigo-400 hover:text-indigo-600">
            <X className="h-5 w-5" />
          </button>
          <div className="flex items-start gap-3">
            <div className="bg-indigo-100 p-2 rounded-lg">
              <Languages className="h-6 w-6 text-indigo-600" />
            </div>
            <div>
              <p className="font-semibold text-indigo-800">
                🎉 {translatedJobs.length === 1 ? t('companyDashboard.translationBannerSingle') : t('companyDashboard.translationBannerMultiple', { count: translatedJobs.length })}
              </p>
              <p className="text-sm text-indigo-700 mt-1">
                {t('companyDashboard.translationBannerDesc')}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {translatedJobs.slice(0, 3).map((job) => (
                  <Link key={job.id} href={`/company/jobs/${job.id}/edit`} className="text-xs bg-white px-2 py-1 rounded border border-indigo-200 text-indigo-700 hover:bg-indigo-50">
                    {job.title}
                  </Link>
                ))}
                {translatedJobs.length > 3 && <span className="text-xs text-indigo-600">+{translatedJobs.length - 3} {t('common.more')}</span>}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <Building2 className="h-8 w-8 text-primary-600" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            {company && <p className="text-gray-600">{company.company_name}</p>}
          </div>
        </div>
        <Link href="/company/jobs/new" className="btn-primary flex items-center gap-2">
          <Plus className="h-5 w-5" />
          {t('companyDashboard.createNewJob')}
        </Link>
      </div>

      <div className="grid md:grid-cols-4 gap-6 mb-8">
        <div className="card">
          <div className="flex items-center gap-4">
            <div className="bg-primary-100 p-3 rounded-lg">
              <Briefcase className="h-6 w-6 text-primary-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">{t('companyDashboard.jobOffers')}</p>
              <p className="text-2xl font-bold text-gray-900">{stats.jobs}</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center gap-4">
            <div className="bg-green-100 p-3 rounded-lg">
              <Briefcase className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">{t('companyDashboard.activeJobs')}</p>
              <p className="text-2xl font-bold text-gray-900">{stats.activeJobs}</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center gap-4">
            <div className="bg-blue-100 p-3 rounded-lg">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">{t('companyDashboard.applications')}</p>
              <p className="text-2xl font-bold text-gray-900">{stats.applications}</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center gap-4">
            <div className="bg-yellow-100 p-3 rounded-lg">
              <FileText className="h-6 w-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">{t('companyDashboard.pending')}</p>
              <p className="text-2xl font-bold text-gray-900">{stats.pendingApplications}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">{t('companyDashboard.quickAccess')}</h2>
          <div className="space-y-3">
            <Link href="/company/jobs" className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
              <Briefcase className="h-5 w-5 text-primary-600" />
              <span>{t('companyDashboard.manageJobs')}</span>
            </Link>
            <Link href="/company/applications" className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
              <Users className="h-5 w-5 text-primary-600" />
              <span>{t('companyDashboard.viewApplications')}</span>
            </Link>
            <Link href="/company/jobs/new" className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
              <Plus className="h-5 w-5 text-primary-600" />
              <span>{t('companyDashboard.createNewJob')}</span>
            </Link>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">{t('companyDashboard.newApplications')}</h2>
            <Link href="/company/applications" className="text-primary-600 hover:text-primary-700 text-sm">
              {t('common.viewAll')}
            </Link>
          </div>
          {recentApplications.length === 0 ? (
            <p className="text-gray-500 text-center py-4">{t('companyDashboard.noApplications')}</p>
          ) : (
            <div className="space-y-3">
              {recentApplications.map((app) => (
                <div key={app.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">{app.applicant_name || t('common.applicant')}</p>
                    <p className="text-sm text-gray-600">{app.job_title}</p>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusConfig[app.status]?.bg || "bg-gray-100"} ${statusConfig[app.status]?.text || "text-gray-800"}`}>
                    {statusConfig[app.status]?.label || app.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
