"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { MapPin, Building2, Clock, Search, Filter, Briefcase, ChevronDown, X, Languages, Heart, Loader2, SlidersHorizontal } from "lucide-react";
import { jobsAPI } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";

interface OtherLanguage {
  language: string;
  level: string;
}

interface Job {
  id: number;
  slug?: string;
  title: string;
  description?: string;
  location?: string;
  salary_min?: number;
  salary_max?: number;
  salary_type?: string;
  employment_type?: string;
  position_type?: string;
  german_required?: string;
  english_required?: string;
  other_languages_required?: OtherLanguage[];
  accommodation_provided?: boolean;
  start_date?: string;
  created_at: string;
  is_external?: boolean;
  external_employer_name?: string;
  company?: {
    company_name?: string;
  };
}

const positionTypeColors: Record<string, string> = {
  general: "bg-gray-100 text-gray-800 border-gray-200",
  studentenferienjob: "bg-blue-100 text-blue-800 border-blue-200",
  saisonjob: "bg-orange-100 text-orange-800 border-orange-200",
  workandholiday: "bg-pink-100 text-pink-800 border-pink-200",
  fachkraft: "bg-purple-100 text-purple-800 border-purple-200",
  ausbildung: "bg-green-100 text-green-800 border-green-200",
};


const languageLevelColors: Record<string, string> = {
  a1: "bg-yellow-50 text-yellow-700 border-yellow-200",
  a2: "bg-yellow-50 text-yellow-700 border-yellow-200",
  b1: "bg-blue-50 text-blue-700 border-blue-200",
  b2: "bg-blue-100 text-blue-800 border-blue-300",
  c1: "bg-green-50 text-green-700 border-green-200",
  c2: "bg-green-100 text-green-800 border-green-300",
  basic: "bg-yellow-50 text-yellow-700 border-yellow-200",
  good: "bg-blue-50 text-blue-700 border-blue-200",
  fluent: "bg-green-50 text-green-700 border-green-200",
};

// HTML-Tags entfernen für Plain-Text
const stripHtml = (text: string): string => {
  if (!text) return "";
  return text.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
};

// Datum formatieren
const formatDate = (dateString: string): string => {
  if (!dateString) return "";
  return new Date(dateString).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

interface JobsClientProps {
  initialJobs?: Job[];
}

export default function JobsClient({ initialJobs = [] }: JobsClientProps) {
  const { isApplicant } = useAuth();
  const { t } = useTranslation();

  const positionTypes = [
    { value: "", label: t("jobs.allTypes") },
    { value: "studentenferienjob", label: t("positionTypes.studentenferienjob") },
    { value: "saisonjob", label: t("positionTypes.saisonjob") },
    { value: "workandholiday", label: t("positionTypes.workandholiday") },
    { value: "fachkraft", label: t("positionTypes.fachkraft") },
    { value: "ausbildung", label: t("positionTypes.ausbildung") },
  ];

  const germanLevelFilter = [
    { value: "", label: t("common.all") },
    { value: "not_required", label: t("languageLevelOptions.not_required") },
    { value: "a1", label: t("languageLevelOptions.a1") },
    { value: "a2", label: t("languageLevelOptions.a2") },
    { value: "b1", label: t("languageLevelOptions.b1") },
    { value: "b2", label: t("languageLevelOptions.b2") },
    { value: "c1", label: t("languageLevelOptions.c1") },
    { value: "c2", label: t("languageLevelOptions.c2") },
  ];

  const getLangLevel = (level: string) => {
    const aliases: Record<string, string> = { basic: "a2", good: "b1", fluent: "c1" };
    return t(`languageLevelOptions.${aliases[level] || level}`, "");
  };
  const [jobs, setJobs] = useState<Job[]>(initialJobs);
  const [loading, setLoading] = useState(initialJobs.length === 0);
  const [search, setSearch] = useState("");
  const [positionType, setPositionType] = useState("");
  const [location, setLocation] = useState("");
  const [germanLevel, setGermanLevel] = useState("");
  const [accommodationOnly, setAccommodationOnly] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [likedJobs, setLikedJobs] = useState<Set<number>>(new Set());
  const [likingJob, setLikingJob] = useState<number | null>(null);

  useEffect(() => {
    loadJobs();
  }, [positionType, location, germanLevel, accommodationOnly]);

  useEffect(() => {
    if (isApplicant) {
      loadLikedJobs();
    }
  }, [isApplicant]);

  const loadLikedJobs = async () => {
    try {
      const response = await jobsAPI.getLikedJobs();
      const likedIds = new Set<number>((response.data.jobs || []).map((j: Job) => j.id));
      setLikedJobs(likedIds);
    } catch {
      // Ignorieren
    }
  };

  const handleLike = async (e: React.MouseEvent, jobId: number) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isApplicant) {
      toast.error(t("jobs.loginToSave"));
      return;
    }

    setLikingJob(jobId);
    try {
      const response = await jobsAPI.likeJob(jobId);
      if (response.data.liked) {
        setLikedJobs((prev) => new Set([...prev, jobId]));
      } else {
        setLikedJobs((prev) => {
          const newSet = new Set(prev);
          newSet.delete(jobId);
          return newSet;
        });
      }
      toast.success(response.data.message);
    } catch {
      toast.error(t("jobs.likeError"));
    } finally {
      setLikingJob(null);
    }
  };

  const loadJobs = async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { limit: "200" };
      if (positionType) params.position_type = positionType;
      if (location) params.location = location;
      if (search) params.search = search;

      const response = await jobsAPI.list(params);
      let filteredJobs = response.data || [];

      // Client-seitige Filterung nach Deutschkenntnissen
      if (germanLevel) {
        filteredJobs = filteredJobs.filter((job: Job) => {
          if (germanLevel === "not_required") {
            return !job.german_required || job.german_required === "not_required";
          }
          return job.german_required === germanLevel;
        });
      }

      // Client-seitige Filterung nach Unterkunft
      if (accommodationOnly) {
        filteredJobs = filteredJobs.filter((job: Job) => job.accommodation_provided);
      }

      setJobs(filteredJobs);
    } catch {
      toast.error(t("common.error"));
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadJobs();
  };

  const clearFilters = () => {
    setSearch("");
    setPositionType("");
    setLocation("");
    setGermanLevel("");
    setAccommodationOnly(false);
  };

  const hasFilters = search || positionType || location || germanLevel || accommodationOnly;
  const activeFilterCount = [positionType, location, germanLevel, accommodationOnly].filter(Boolean).length;

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <Briefcase className="h-8 w-8 text-primary-600" />
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{t("jobs.title")}</h1>
          <p className="text-gray-600">{t("jobs.subtitle")}</p>
        </div>
      </div>

      {/* Filter Card */}
      <div className="card mb-8">
        <form onSubmit={handleSearch} className="space-y-4">
          {/* Suchfeld - immer sichtbar */}
          <div>
            <label className="label">{t("jobs.search")}</label>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                className="input-styled pl-12"
                placeholder={t("jobs.searchPlaceholder")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          {/* Mobile: Filter Toggle Button */}
          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className="md:hidden w-full flex items-center justify-between px-4 py-3 bg-gray-50 rounded-xl border-2 border-gray-200 text-gray-700 font-medium"
          >
            <span className="flex items-center gap-2">
              <SlidersHorizontal className="h-5 w-5" />
              {t("common.filter")} {activeFilterCount > 0 && `(${activeFilterCount})`}
            </span>
            <ChevronDown className={`h-5 w-5 transition-transform ${showFilters ? "rotate-180" : ""}`} />
          </button>

          {/* Filter - auf Desktop immer sichtbar, auf Mobile einklappbar */}
          <div className={`space-y-4 ${showFilters ? "block" : "hidden md:block"}`}>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Stellenart */}
              <div>
                <label className="label">{t("jobs.positionType")}</label>
                <div className="relative">
                  <select
                    className="input-styled appearance-none pr-10"
                    value={positionType}
                    onChange={(e) => setPositionType(e.target.value)}
                  >
                    {positionTypes.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
                </div>
              </div>

              {/* Ort */}
              <div>
                <label className="label">{t("jobs.location")}</label>
                <div className="relative">
                  <MapPin className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    className="input-styled pl-12"
                    placeholder={t("jobs.locationPlaceholder")}
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                  />
                </div>
              </div>

              {/* Deutschkenntnisse */}
              <div>
                <label className="label flex items-center gap-2">
                  <Languages className="h-4 w-4 text-blue-600" />
                  {t("jobs.germanLevel")}
                </label>
                <div className="relative">
                  <select
                    className="input-styled appearance-none pr-10"
                    value={germanLevel}
                    onChange={(e) => setGermanLevel(e.target.value)}
                  >
                    {germanLevelFilter.map((level) => (
                      <option key={level.value} value={level.value}>
                        {level.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Unterkunft Toggle */}
            <div className="flex items-center">
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={accommodationOnly}
                  onChange={(e) => setAccommodationOnly(e.target.checked)}
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:ring-4 peer-focus:ring-primary-100 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                <span className="ml-3 text-gray-700 font-medium">{t("jobs.accommodationOnly")}</span>
              </label>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex items-center gap-3">
            <button type="submit" className="btn-primary flex items-center gap-2">
              <Filter className="h-4 w-4" />
              {t("jobs.applyFilter")}
            </button>
            {hasFilters && (
              <button type="button" onClick={clearFilters} className="btn-secondary flex items-center gap-2 text-sm">
                <X className="h-4 w-4" />
                {t("common.reset")}
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Ergebnis-Anzahl */}
      {!loading && (
        <div className="mb-4">
          <p className="text-gray-600">
            <span className="font-semibold text-gray-900">{jobs.length}</span> {t("jobs.resultsFound")}
          </p>
        </div>
      )}

      {/* Job Liste */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-12 w-12 text-primary-600 animate-spin" />
        </div>
      ) : jobs.length === 0 ? (
        <div className="card text-center py-12">
          <Briefcase className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-700 mb-2">{t("jobs.noResults")}</h2>
          <p className="text-gray-500 mb-4">{t("jobs.tryOtherCriteria")}</p>
          <button onClick={clearFilters} className="btn-primary">
            {t("common.reset")}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {jobs.map((job) => (
            <Link
              key={job.id}
              href={`/jobs/${job.slug ? `${job.slug}-${job.id}` : job.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="card block hover:shadow-xl hover:border-primary-200 border-2 border-transparent transition-all group"
            >
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2 flex-wrap">
                    <h2 className="text-xl font-bold text-gray-900 group-hover:text-primary-600 transition-colors">
                      {job.title}
                    </h2>
                    {job.position_type && (
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-semibold border ${
                          positionTypeColors[job.position_type] || positionTypeColors.general
                        }`}
                      >
                        {t(`positionTypes.${job.position_type}`, job.position_type || "")}
                      </span>
                    )}
                    {job.is_external && (
                      <span className="px-3 py-1 rounded-full text-sm font-semibold bg-orange-100 text-orange-700 border border-orange-200">
                        {t("jobs.external")}
                      </span>
                    )}
                    {job.accommodation_provided && (
                      <span className="px-3 py-1 rounded-full text-sm font-medium bg-amber-100 text-amber-800 border border-amber-200">
                        🏠 {t("jobs.accommodation")}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-gray-600 mb-3">
                    <span className="flex items-center gap-1.5">
                      <Building2 className="h-4 w-4 text-gray-400" />
                      <span className="font-medium">
                        {job.is_external && job.external_employer_name
                          ? job.external_employer_name
                          : (job.company?.company_name || t("common.unknown"))}
                      </span>
                    </span>
                    {job.location && (
                      <span className="flex items-center gap-1.5">
                        <MapPin className="h-4 w-4 text-gray-400" />
                        {job.location}
                      </span>
                    )}
                    {job.start_date && (
                      <span className="flex items-center gap-1.5">
                        <Clock className="h-4 w-4 text-gray-400" />
                        {t("jobs.from")} {formatDate(job.start_date)}
                      </span>
                    )}
                  </div>

                  {/* Sprachanforderungen */}
                  {((job.german_required && job.german_required !== "not_required") || (job.english_required && job.english_required !== "not_required") || (job.other_languages_required && job.other_languages_required.length > 0)) && (
                    <div className="flex flex-wrap items-center gap-2 mb-3">
                      <Languages className="h-4 w-4 text-gray-400" />
                      {job.german_required && job.german_required !== "not_required" && (
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${languageLevelColors[job.german_required] || "bg-gray-50 text-gray-600 border-gray-200"}`}>
                          🇩🇪 {getLangLevel(job.german_required)}
                        </span>
                      )}
                      {job.english_required && job.english_required !== "not_required" && (
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${languageLevelColors[job.english_required] || "bg-gray-50 text-gray-600 border-gray-200"}`}>
                          🇬🇧 {getLangLevel(job.english_required)}
                        </span>
                      )}
                      {job.other_languages_required && job.other_languages_required.length > 0 && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium border bg-gray-50 text-gray-600 border-gray-200">
                          +{job.other_languages_required.length} {t("common.more")}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Beschreibungsvorschau */}
                  {job.description && (
                    <p className="text-gray-600 text-sm line-clamp-2">
                      {stripHtml(job.description).substring(0, 200)}...
                    </p>
                  )}
                </div>

                <div className="text-right flex-shrink-0 flex flex-col items-end gap-2">
                  {isApplicant && (
                    <button
                      onClick={(e) => handleLike(e, job.id)}
                      disabled={likingJob === job.id}
                      className={`p-2 rounded-full transition-all ${
                        likedJobs.has(job.id)
                          ? "bg-red-100 text-red-600 hover:bg-red-200"
                          : "bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-red-500"
                      }`}
                      title={likedJobs.has(job.id) ? t("jobs.saved") : t("jobs.save")}
                    >
                      {likingJob === job.id ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <Heart className={`h-5 w-5 ${likedJobs.has(job.id) ? "fill-red-500" : ""}`} />
                      )}
                    </button>
                  )}

                  {(job.salary_min || job.salary_max) && (
                    <p className="text-lg font-bold text-primary-600">
                      {job.salary_min && job.salary_max ? (
                        <>
                          {job.salary_min.toLocaleString("de-DE")}€ - {job.salary_max.toLocaleString("de-DE")}€
                        </>
                      ) : (
                        <>{(job.salary_min || job.salary_max)?.toLocaleString("de-DE")}€</>
                      )}
                      <span className="text-sm font-normal text-gray-500 block">
                        /{job.salary_type === "hourly" ? t("common.hour") : job.salary_type === "monthly" ? t("common.month") : t("common.year")}
                      </span>
                    </p>
                  )}
                  <p className="text-sm text-gray-400">
                    {new Date(job.created_at).toLocaleDateString("de-DE", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                    })}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
