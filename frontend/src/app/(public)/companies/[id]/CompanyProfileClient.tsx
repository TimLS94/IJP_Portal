"use client";

import Link from "next/link";
import { Building2, MapPin, Globe, Mail, Phone, Briefcase, ArrowLeft, ExternalLink } from "lucide-react";
import { useTranslation } from "react-i18next";
import { resolveFileUrl } from "@/lib/api";

interface Company {
  id: number;
  company_name: string;
  logo?: string;
  industry?: string;
  description?: string;
  city?: string;
  country?: string;
  website?: string;
  contact_email?: string;
  contact_phone?: string;
}

interface Job {
  id: number;
  slug?: string;
  title: string;
  location?: string;
  position_type?: string;
  employment_type?: string;
  salary_min?: number;
  salary_max?: number;
  created_at: string;
  is_active: boolean;
}

const positionTypeColors: Record<string, string> = {
  general: "bg-gray-100 text-gray-800",
  studentenferienjob: "bg-blue-100 text-blue-800",
  saisonjob: "bg-orange-100 text-orange-800",
  workandholiday: "bg-pink-100 text-pink-800",
  fachkraft: "bg-purple-100 text-purple-800",
  ausbildung: "bg-green-100 text-green-800",
};

export default function CompanyProfileClient({ company, activeJobs }: { company: Company; activeJobs: Job[] }) {
  const { t } = useTranslation();

  const positionTypeLabels: Record<string, string> = {
    general: t("jobs.positionType.general", "Allgemein"),
    studentenferienjob: t("jobs.positionType.studentenferienjob", "Studentenferienjob"),
    saisonjob: t("jobs.positionType.saisonjob", "Saisonjob"),
    workandholiday: t("jobs.positionType.workandholiday", "Work & Holiday"),
    fachkraft: t("jobs.positionType.fachkraft", "Fachkraft"),
    ausbildung: t("jobs.positionType.ausbildung", "Ausbildung"),
  };

  const jobCount = activeJobs.length;
  const jobLabel = jobCount === 1 ? t("companyProfile.job") : t("companyProfile.jobs");

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Back Button */}
      <div className="max-w-4xl mx-auto px-4 py-4">
        <Link
          href="/jobs"
          className="inline-flex items-center text-gray-600 hover:text-primary-600 transition-colors group"
        >
          <ArrowLeft className="h-4 w-4 mr-2 group-hover:-translate-x-1 transition-transform" />
          {t("jobDetail.backToJobs")}
        </Link>
      </div>

      {/* Company Header */}
      <div className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="flex items-start gap-6">
            {company.logo ? (
              <img
                src={resolveFileUrl(company.logo)}
                alt={company.company_name}
                className="w-24 h-24 rounded-xl object-contain bg-gray-100 p-2"
              />
            ) : (
              <div className="w-24 h-24 rounded-xl bg-primary-100 flex items-center justify-center">
                <Building2 className="h-12 w-12 text-primary-600" />
              </div>
            )}

            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{company.company_name}</h1>
              {company.industry && (
                <p className="text-lg text-primary-600 font-medium mb-3">{company.industry}</p>
              )}
              <div className="flex flex-wrap gap-4 text-gray-600">
                {company.city && (
                  <span className="flex items-center gap-1.5">
                    <MapPin className="h-5 w-5 text-gray-400" />
                    {company.city}{company.country && `, ${company.country}`}
                  </span>
                )}
                {company.website && (
                  <a
                    href={company.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-primary-600 hover:underline"
                  >
                    <Globe className="h-5 w-5" />
                    {t("company.website")}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        {/* About */}
        {company.description && (
          <div className="card">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">{t("jobDetail.aboutCompany")}</h2>
            <p className="text-gray-600 whitespace-pre-line">{company.description}</p>
          </div>
        )}

        {/* Contact */}
        {(company.contact_email || company.contact_phone) && (
          <div className="card">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">{t("common.contact")}</h2>
            <div className="flex flex-wrap gap-6">
              {company.contact_email && (
                <a href={`mailto:${company.contact_email}`} className="flex items-center gap-2 text-gray-600 hover:text-primary-600">
                  <Mail className="h-5 w-5" />
                  {company.contact_email}
                </a>
              )}
              {company.contact_phone && (
                <a href={`tel:${company.contact_phone}`} className="flex items-center gap-2 text-gray-600 hover:text-primary-600">
                  <Phone className="h-5 w-5" />
                  {company.contact_phone}
                </a>
              )}
            </div>
          </div>
        )}

        {/* Jobs */}
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <Briefcase className="h-6 w-6 text-primary-600" />
              {t("companyProfile.currentJobs")}
            </h2>
            <span className="px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-sm font-medium">
              {jobCount} {jobLabel}
            </span>
          </div>

          {activeJobs.length === 0 ? (
            <p className="text-gray-500 text-center py-8">{t("companyProfile.noOpenJobs")}</p>
          ) : (
            <div className="space-y-4">
              {activeJobs.map((job) => (
                <Link
                  key={job.id}
                  href={`/jobs/${job.slug ? `${job.slug}-${job.id}` : job.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors group"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="font-semibold text-gray-900 group-hover:text-primary-600 transition-colors">
                        {job.title}
                      </h3>
                      <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-gray-600">
                        {job.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-4 w-4" />
                            {job.location}
                          </span>
                        )}
                        {job.salary_min && job.salary_max && (
                          <span className="text-green-600 font-medium">
                            {job.salary_min.toLocaleString("de-DE")} - {job.salary_max.toLocaleString("de-DE")} €
                          </span>
                        )}
                      </div>
                    </div>
                    {job.position_type && (
                      <span className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${positionTypeColors[job.position_type] || "bg-gray-100"}`}>
                        {positionTypeLabels[job.position_type] || job.position_type}
                      </span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
