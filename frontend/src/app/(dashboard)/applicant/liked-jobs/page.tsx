"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { jobsAPI } from "@/lib/api";
import { Loader2, Heart, MapPin, Building2, Calendar, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";

interface Job {
  id: number;
  slug: string;
  title: string;
  location: string;
  company_name?: string;
  position_type?: string;
  salary_min?: number;
  salary_max?: number;
  salary_type?: string;
  start_date?: string;
}

const positionTypeColors: Record<string, string> = {
  general: 'bg-gray-100 text-gray-800 border-gray-200',
  studentenferienjob: 'bg-blue-100 text-blue-800 border-blue-200',
  saisonjob: 'bg-orange-100 text-orange-800 border-orange-200',
  workandholiday: 'bg-pink-100 text-pink-800 border-pink-200',
  fachkraft: 'bg-purple-100 text-purple-800 border-purple-200',
  ausbildung: 'bg-green-100 text-green-800 border-green-200'
};

export default function ApplicantLikedJobsPage() {
  const { t } = useTranslation();
  const [jobs, setJobs] = useState<Job[]>([]);

  const positionTypeLabels: Record<string, string> = {
    general: t('positionTypes.general'),
    studentenferienjob: t('positionTypes.studentenferienjob'),
    saisonjob: t('positionTypes.saisonjob'),
    workandholiday: t('positionTypes.workandholiday'),
    fachkraft: t('positionTypes.fachkraft'),
    ausbildung: t('positionTypes.ausbildung')
  };
  const [loading, setLoading] = useState(true);
  const [removingJob, setRemovingJob] = useState<number | null>(null);

  useEffect(() => {
    loadLikedJobs();
  }, []);

  const loadLikedJobs = async () => {
    try {
      const response = await jobsAPI.getLikedJobs();
      // API gibt {jobs: [...], total: ...} zurück
      setJobs(response.data.jobs || response.data || []);
    } catch (error) {
      toast.error(t('likedJobs.loadError'));
      setJobs([]);
    } finally {
      setLoading(false);
    }
  };

  const handleUnlike = async (e: React.MouseEvent, jobId: number) => {
    e.preventDefault();
    e.stopPropagation();
    
    setRemovingJob(jobId);
    try {
      await jobsAPI.likeJob(jobId); // Toggle - entfernt den Like
      setJobs(prev => prev.filter(j => j.id !== jobId));
      toast.success(t('likedJobs.removed'));
    } catch (error) {
      toast.error(t('likedJobs.removeError'));
    } finally {
      setRemovingJob(null);
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return null;
    return new Date(dateString).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <Heart className="h-8 w-8 text-red-500 fill-red-500" />
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{t('likedJobs.title')}</h1>
          <p className="text-gray-600">{t('likedJobs.subtitle')}</p>
        </div>
      </div>

      {jobs.length === 0 ? (
        <div className="card py-12 text-center">
          <Heart className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-700 mb-2">{t('likedJobs.noJobs')}</h2>
          <p className="text-gray-500 mb-6">
            {t('likedJobs.noJobsHint')}
          </p>
          <Link href="/jobs" className="btn-primary">
            {t('likedJobs.browseJobs')}
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-gray-600 mb-4">
            {t('likedJobs.count', { count: jobs.length })}
          </p>
          
          {jobs.map((job) => (
            <Link
              key={job.id}
              href={`/jobs/${job.slug ? `${job.slug}-${job.id}` : job.id}`}
              className="card block hover:shadow-xl hover:border-primary-200 border-2 border-transparent transition-all group"
            >
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2 flex-wrap">
                    <h2 className="text-xl font-bold text-gray-900 group-hover:text-primary-600 transition-colors">
                      {job.title}
                    </h2>
                    {job.position_type && (
                      <span className={`px-3 py-1 rounded-full text-sm font-semibold border ${positionTypeColors[job.position_type] || positionTypeColors.general}`}>
                        {positionTypeLabels[job.position_type] || job.position_type}
                      </span>
                    )}
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-4 text-gray-600 mb-3">
                    <span className="flex items-center gap-1.5">
                      <Building2 className="h-4 w-4 text-gray-400" />
                      <span className="font-medium">{job.company_name || t('common.unknown')}</span>
                    </span>
                    {job.location && (
                      <span className="flex items-center gap-1.5">
                        <MapPin className="h-4 w-4 text-gray-400" />
                        {job.location}
                      </span>
                    )}
                    {job.start_date && (
                      <span className="flex items-center gap-1.5">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        {t('likedJobs.from')} {formatDate(job.start_date)}
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  {(job.salary_min || job.salary_max) && (
                    <div className="text-right">
                      <p className="text-lg font-bold text-primary-600">
                        {job.salary_min && job.salary_max ? (
                          <>{job.salary_min.toLocaleString('de-DE')}€ - {job.salary_max.toLocaleString('de-DE')}€</>
                        ) : (
                          <>{(job.salary_min || job.salary_max)?.toLocaleString('de-DE')}€</>
                        )}
                      </p>
                      <p className="text-xs text-gray-500">
                        /{job.salary_type === 'hourly' ? t('common.hour') : job.salary_type === 'monthly' ? t('common.month') : t('common.year')}
                      </p>
                    </div>
                  )}
                  
                  <button
                    onClick={(e) => handleUnlike(e, job.id)}
                    disabled={removingJob === job.id}
                    className="p-2 rounded-full bg-red-100 text-red-600 hover:bg-red-200 transition-all"
                    title={t('likedJobs.removeFromList')}
                  >
                    {removingJob === job.id ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <Trash2 className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
