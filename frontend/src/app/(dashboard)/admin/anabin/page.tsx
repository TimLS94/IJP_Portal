"use client";

import { useState, useEffect, useCallback } from "react";
import { 
  GraduationCap, Search, CheckCircle, XCircle, Clock, AlertCircle, HelpCircle, 
  Loader2, ExternalLink, Database, RefreshCw, Play, Square, Globe, X, Save,
  User, MapPin, Flag, BookOpen, Sparkles, FileDown, ChevronDown
} from "lucide-react";
import { adminAPI } from "@/lib/api";
import toast from "react-hot-toast";

interface AnabinStudent {
  id: number;
  name: string;
  university_name?: string;
  university_city?: string;
  university_country?: string;
  field_of_study?: string;
  current_semester?: number;
  nationality?: string;
  anabin_verified: string;
  anabin_match_score?: number;
  anabin_institution_name?: string;
  anabin_institution_id?: string;
  anabin_status?: string;
  anabin_notes?: string;
  anabin_checked_at?: string;
}

interface AnabinStats {
  total: number;
  not_checked: number;
  verified: number;
  not_found: number;
  uncertain: number;
  students: AnabinStudent[];
}

interface DatabaseInfo {
  database: {
    exists: boolean;
    path: string;
    last_updated?: string;
    total_count?: number;
    countries?: Record<string, number>;
    countries_count?: number;
  };
  available_country_groups: Record<string, string[]>;
  default_countries: string[];
}

interface ScrapeProgress {
  status: string;
  current_country: string;
  current_country_index: number;
  total_countries: number;
  universities_found: number;
  countries_completed: string[];
  countries_failed: { country: string; error: string }[];
  progress_percent: number;
  error_message?: string;
}

export default function AnabinVerificationPage() {
  const [data, setData] = useState<AnabinStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [verifying, setVerifying] = useState<number | null>(null);
  
  // Scraper State
  const [dbInfo, setDbInfo] = useState<DatabaseInfo | null>(null);
  const [scrapeProgress, setScrapeProgress] = useState<ScrapeProgress | null>(null);
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [customCountries, setCustomCountries] = useState("");
  const [showScraper, setShowScraper] = useState(false);
  
  // Verifizierungs-Modal State
  const [selectedStudent, setSelectedStudent] = useState<AnabinStudent | null>(null);
  const [searchResult, setSearchResult] = useState<any>(null);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadingPdf, setLoadingPdf] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState("");
  
  // Manuelle Verifizierungsfelder
  const [manualData, setManualData] = useState({
    anabin_verified: "verified",
    anabin_match_score: 100,
    anabin_institution_name: "",
    anabin_status: "H+",
    anabin_notes: "",
  });

  useEffect(() => {
    loadStudents();
    loadDatabaseInfo();
  }, []);

  const loadStudents = async () => {
    try {
      const response = await adminAPI.getAnabinStudents();
      setData(response.data);
    } catch (error) {
      console.error("Fehler beim Laden:", error);
      toast.error("Fehler beim Laden der Studenten");
    } finally {
      setLoading(false);
    }
  };

  const loadDatabaseInfo = async () => {
    try {
      const response = await adminAPI.getAnabinDatabaseInfo();
      setDbInfo(response.data);
    } catch (error) {
      console.error("Fehler beim Laden der DB-Info:", error);
    }
  };

  const loadScrapeStatus = useCallback(async () => {
    try {
      const response = await adminAPI.getAnabinScrapeStatus();
      setScrapeProgress(response.data);
      return response.data;
    } catch (error) {
      console.error("Fehler beim Laden des Scrape-Status:", error);
      return null;
    }
  }, []);

  // Polling für Scrape-Status wenn aktiv
  useEffect(() => {
    if (scrapeProgress?.status === "running") {
      const interval = setInterval(async () => {
        const status = await loadScrapeStatus();
        if (status?.status !== "running") {
          clearInterval(interval);
          loadDatabaseInfo();
          if (status?.status === "completed") {
            toast.success(`Scrape abgeschlossen: ${status.universities_found} Universitäten`);
          }
        }
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [scrapeProgress?.status, loadScrapeStatus]);

  const handleStartScrape = async () => {
    try {
      const data: { countries?: string[]; country_groups?: string[]; merge_with_existing: boolean } = {
        merge_with_existing: true
      };
      
      // Manuelle Länder haben Priorität
      if (customCountries.trim()) {
        data.countries = customCountries.split(",").map(c => c.trim()).filter(c => c);
      } else if (selectedGroups.length > 0) {
        data.country_groups = selectedGroups;
      }
      
      await adminAPI.startAnabinScrape(data);
      toast.success("Scrape gestartet");
      loadScrapeStatus();
    } catch (error) {
      toast.error("Fehler beim Starten des Scrapes");
    }
  };

  const handleCancelScrape = async () => {
    try {
      await adminAPI.cancelAnabinScrape();
      toast.success("Abbruch angefordert");
      loadScrapeStatus();
    } catch (error) {
      toast.error("Fehler beim Abbrechen");
    }
  };

  const handleReloadDatabase = async () => {
    try {
      const response = await adminAPI.reloadAnabinDatabase();
      toast.success(response.data.message);
      loadDatabaseInfo();
    } catch (error) {
      toast.error("Fehler beim Neuladen");
    }
  };

  const toggleGroup = (group: string) => {
    setSelectedGroups(prev => 
      prev.includes(group) 
        ? prev.filter(g => g !== group)
        : [...prev, group]
    );
  };

  const handleAutoVerify = async (applicantId: number) => {
    setVerifying(applicantId);
    try {
      const response = await adminAPI.autoVerifyAnabin(applicantId);
      if (response.data.result?.status === "verified") {
        toast.success("✅ Universität verifiziert!");
      } else if (response.data.result?.status === "uncertain") {
        toast.success("⚠️ Mögliche Übereinstimmung - bitte prüfen");
      } else {
        toast.error("❌ Keine Übereinstimmung gefunden");
      }
      loadStudents();
    } catch (error) {
      toast.error("Fehler bei der Verifizierung");
    } finally {
      setVerifying(null);
    }
  };

  const openVerifyModal = async (student: AnabinStudent) => {
    setSelectedStudent(student);
    setSearchResult(null);
    setManualData({
      anabin_verified: student.anabin_verified || "verified",
      anabin_match_score: student.anabin_match_score || 100,
      anabin_institution_name: student.anabin_institution_name || student.university_name || "",
      anabin_status: student.anabin_status || "H+",
      anabin_notes: student.anabin_notes || "",
    });
    
    if (student.university_name) {
      await searchAnabin(student.id);
    }
  };

  const searchAnabin = async (studentId: number) => {
    setSearching(true);
    try {
      const response = await adminAPI.searchAnabin(studentId);
      setSearchResult(response.data);
      
      if (response.data.result?.best_match) {
        const match = response.data.result.best_match;
        setManualData(prev => ({
          ...prev,
          anabin_institution_name: match.display_name || match.name_german || match.name_original,
          anabin_match_score: Math.round(match.match_score),
          anabin_status: match.status || "H+",
          anabin_verified: match.match_score >= 85 ? "verified" : match.match_score >= 60 ? "uncertain" : "not_found",
        }));
      }
    } catch (error: any) {
      const statusCode = error.response?.status;
      if (statusCode === 404) {
        toast.error("📚 Keine passende Universität gefunden", { duration: 5000 });
      } else {
        toast.error("Suche fehlgeschlagen");
      }
      setSearchResult({ result: { status: "not_found", message: "Keine Übereinstimmung gefunden.", all_matches: [] } });
    } finally {
      setSearching(false);
    }
  };

  const handleSaveVerification = async () => {
    if (!selectedStudent) return;
    setSaving(true);
    try {
      await adminAPI.verifyAnabin({ applicant_id: selectedStudent.id, ...manualData });
      toast.success("Verifizierung gespeichert!");
      loadStudents();
      setSelectedStudent(null);
      setSearchResult(null);
    } catch (error) {
      toast.error("Fehler beim Speichern");
    } finally {
      setSaving(false);
    }
  };

  const selectMatch = (match: any) => {
    setManualData(prev => ({
      ...prev,
      anabin_institution_name: match.display_name || match.name_german || match.name_original,
      anabin_match_score: Math.round(match.match_score),
      anabin_status: match.status || "",
      anabin_verified: match.match_score >= 85 ? "verified" : "uncertain",
    }));
    toast.success("Daten übernommen!");
  };

  const handleDownloadPdf = async (student: AnabinStudent, forceRefresh = false) => {
    if (!student.university_name && !student.anabin_institution_name) {
      toast.error("Keine Universität hinterlegt");
      return;
    }
    setLoadingPdf(student.id);
    const toastId = toast.loading(forceRefresh ? "Lade PDF neu..." : "Lade PDF...");
    try {
      const response = await adminAPI.getAnabinPdf(student.id, forceRefresh);
      const blob = new Blob([response.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      window.open(url, "_blank");
      toast.success("PDF geladen!", { id: toastId });
    } catch (error) {
      toast.error("PDF konnte nicht geladen werden", { id: toastId });
    } finally {
      setLoadingPdf(null);
    }
  };

  // PDF für einen bestimmten Uni-Namen laden (für Modal-Treffer)
  const [loadingMatchPdf, setLoadingMatchPdf] = useState<number | null>(null);
  
  const handleDownloadMatchPdf = async (uniName: string, country: string, matchIdx: number) => {
    setLoadingMatchPdf(matchIdx);
    const toastId = toast.loading(`Lade PDF für ${uniName}...`);
    try {
      const response = await adminAPI.fetchAnabinPdfDirect(uniName, country);
      const blob = new Blob([response.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      window.open(url, "_blank");
      toast.success("PDF geladen!", { id: toastId });
    } catch (error) {
      toast.error("PDF konnte nicht geladen werden", { id: toastId });
    } finally {
      setLoadingMatchPdf(null);
    }
  };

  const students = data?.students || [];
  const filteredStudents = students.filter(s => {
    if (statusFilter && s.anabin_verified !== statusFilter) return false;
    if (search) {
      const searchLower = search.toLowerCase();
      return s.name?.toLowerCase().includes(searchLower) ||
        s.university_name?.toLowerCase().includes(searchLower) ||
        s.university_country?.toLowerCase().includes(searchLower) ||
        s.anabin_institution_name?.toLowerCase().includes(searchLower);
    }
    return true;
  });

  const MatchScoreBadge = ({ score }: { score: number }) => {
    const color = score >= 85 ? "text-green-600" : score >= 60 ? "text-yellow-600" : "text-red-600";
    return <span className={`font-bold ${color}`}>{score}%</span>;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "verified":
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case "not_found":
        return <XCircle className="h-5 w-5 text-red-500" />;
      case "uncertain":
        return <HelpCircle className="h-5 w-5 text-yellow-500" />;
      default:
        return <Clock className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "verified": return "Verifiziert";
      case "not_found": return "Nicht gefunden";
      case "uncertain": return "Unsicher";
      default: return "Nicht geprüft";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "verified": return "bg-green-100 text-green-800";
      case "not_found": return "bg-red-100 text-red-800";
      case "uncertain": return "bg-yellow-100 text-yellow-800";
      default: return "bg-gray-100 text-gray-600";
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-8">
        <GraduationCap className="h-8 w-8 text-primary-600" />
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Anabin-Verifizierung</h1>
          <p className="text-gray-600">Universitäten von Studenten in anabin prüfen</p>
        </div>
      </div>

      {/* Database Info & Scraper Toggle */}
      <div className="card mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-4">
              <Database className="h-8 w-8 text-blue-600" />
              <div>
                <p className="font-semibold">Anabin-Datenbank</p>
                {dbInfo?.database.exists ? (
                  <p className="text-sm text-gray-500">
                    {dbInfo.database.total_count} Universitäten aus {dbInfo.database.countries_count} Ländern
                    {dbInfo.database.last_updated && ` • Aktualisiert: ${dbInfo.database.last_updated}`}
                  </p>
                ) : (
                  <p className="text-sm text-red-500">Keine Datenbank vorhanden</p>
                )}
              </div>
            </div>
            {/* Enthaltene Länder */}
            {dbInfo?.database.exists && dbInfo.database.countries && (
              <div className="mt-3 pt-3 border-t">
                <p className="text-xs text-gray-500 mb-2">Enthaltene Länder:</p>
                <div className="flex flex-wrap gap-1">
                  {Object.entries(dbInfo.database.countries)
                    .sort((a, b) => (b[1] as number) - (a[1] as number))
                    .map(([country, count]) => (
                      <span 
                        key={country} 
                        className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs"
                        title={`${count} Universitäten`}
                      >
                        {country} ({count as number})
                      </span>
                    ))
                  }
                </div>
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <button onClick={handleReloadDatabase} className="btn-secondary text-sm flex items-center gap-2">
              <RefreshCw className="h-4 w-4" /> Neu laden
            </button>
            <button 
              onClick={() => { setShowScraper(!showScraper); if (!scrapeProgress) loadScrapeStatus(); }}
              className="btn-primary text-sm flex items-center gap-2"
            >
              <Globe className="h-4 w-4" /> {showScraper ? "Scraper ausblenden" : "Datenbank aktualisieren"}
            </button>
          </div>
        </div>

        {/* Scraper Panel */}
        {showScraper && (
          <div className="mt-6 pt-6 border-t">
            <h3 className="font-semibold mb-4">Anabin-Scraper</h3>
            
            {/* Scrape Progress */}
            {scrapeProgress?.status === "running" && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-blue-800">
                    Scrape läuft: {scrapeProgress.current_country}
                  </span>
                  <button onClick={handleCancelScrape} className="text-red-600 hover:text-red-800 flex items-center gap-1 text-sm">
                    <Square className="h-4 w-4" /> Abbrechen
                  </button>
                </div>
                <div className="w-full bg-blue-200 rounded-full h-2 mb-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all" 
                    style={{ width: `${scrapeProgress.progress_percent}%` }}
                  />
                </div>
                <p className="text-sm text-blue-700">
                  Land {scrapeProgress.current_country_index}/{scrapeProgress.total_countries} • 
                  {scrapeProgress.universities_found} Unis gefunden
                </p>
              </div>
            )}

            {scrapeProgress?.status === "completed" && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                <p className="text-green-800">
                  ✓ Scrape abgeschlossen: {scrapeProgress.universities_found} Universitäten aus {scrapeProgress.countries_completed.length} Ländern
                </p>
              </div>
            )}

            {scrapeProgress?.status === "error" && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                <p className="text-red-800">✗ Fehler: {scrapeProgress.error_message}</p>
              </div>
            )}

            {/* Country Input */}
            {scrapeProgress?.status !== "running" && (
              <div className="space-y-4">
                {/* Manuelle Länder-Eingabe */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Länder manuell eingeben (kommagetrennt)
                  </label>
                  <input
                    type="text"
                    className="input-styled"
                    placeholder="z.B. Türkei, Indien, China"
                    value={customCountries}
                    onChange={(e) => setCustomCountries(e.target.value)}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Leer lassen um Ländergruppen oder Standard-Länder zu verwenden
                  </p>
                </div>

                {/* Ländergruppen */}
                {!customCountries.trim() && dbInfo?.available_country_groups && (
                  <div>
                    <p className="text-sm text-gray-600 mb-2">Oder Ländergruppen auswählen:</p>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(dbInfo.available_country_groups).map(([key, countries]) => (
                        <button
                          key={key}
                          onClick={() => toggleGroup(key)}
                          className={`px-3 py-1 rounded-full text-sm border transition-colors ${
                            selectedGroups.includes(key)
                              ? "bg-primary-100 border-primary-500 text-primary-700"
                              : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100"
                          }`}
                        >
                          {key} ({countries.length})
                        </button>
                      ))}
                    </div>
                    {selectedGroups.length > 0 && (
                      <p className="text-xs text-gray-500 mt-2">
                        Ausgewählt: {selectedGroups.map(g => dbInfo.available_country_groups[g]?.length || 0).reduce((a, b) => a + b, 0)} Länder
                      </p>
                    )}
                  </div>
                )}

                {/* Start Button */}
                <button onClick={handleStartScrape} className="btn-primary flex items-center gap-2">
                  <Play className="h-4 w-4" /> Scrape starten
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Stats */}
      {data && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <div className="card text-center">
            <p className="text-2xl font-bold text-gray-900">{data.total}</p>
            <p className="text-sm text-gray-500">Gesamt</p>
          </div>
          <div className="card text-center bg-gray-50">
            <p className="text-2xl font-bold text-gray-600">{data.not_checked}</p>
            <p className="text-sm text-gray-500">Nicht geprüft</p>
          </div>
          <div className="card text-center bg-green-50">
            <p className="text-2xl font-bold text-green-600">{data.verified}</p>
            <p className="text-sm text-gray-500">Verifiziert</p>
          </div>
          <div className="card text-center bg-red-50">
            <p className="text-2xl font-bold text-red-600">{data.not_found}</p>
            <p className="text-sm text-gray-500">Nicht gefunden</p>
          </div>
          <div className="card text-center bg-yellow-50">
            <p className="text-2xl font-bold text-yellow-600">{data.uncertain}</p>
            <p className="text-sm text-gray-500">Unsicher</p>
          </div>
        </div>
      )}

      {/* Filter */}
      <div className="card mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Suche nach Name, Universität oder Land..."
              className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="relative w-full md:w-48">
            <select
              className="input-styled appearance-none pr-10"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">Alle Status</option>
              <option value="not_checked">Nicht geprüft</option>
              <option value="verified">Verifiziert</option>
              <option value="uncertain">Unsicher</option>
              <option value="not_found">Nicht gefunden</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Studenten-Tabelle */}
      <div className="card">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-12 w-12 animate-spin text-primary-600" />
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="text-center py-12">
            <GraduationCap className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Keine Studenten gefunden</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Student</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Universität</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Land/Stadt</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Status</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Match</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900">Aktionen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredStudents.map((student) => (
                  <tr key={student.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-gray-400" />
                        <span className="font-medium">{student.name}</span>
                      </div>
                      <div className="text-xs text-gray-500 ml-6">{student.nationality}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <GraduationCap className="h-4 w-4 text-gray-400" />
                        <span className="text-sm max-w-[250px] truncate" title={student.university_name}>
                          {student.university_name || "-"}
                        </span>
                      </div>
                      {student.field_of_study && (
                        <div className="text-xs text-gray-500 ml-6">
                          <BookOpen className="h-3 w-3 inline mr-1" />
                          {student.field_of_study}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {student.university_country && (
                        <div className="flex items-center gap-1">
                          <Flag className="h-3 w-3 text-gray-400" />
                          {student.university_country}
                        </div>
                      )}
                      {student.university_city && (
                        <div className="flex items-center gap-1 text-gray-500">
                          <MapPin className="h-3 w-3 text-gray-400" />
                          {student.university_city}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(student.anabin_verified)}`}>
                        {getStatusIcon(student.anabin_verified)}
                        {getStatusLabel(student.anabin_verified)}
                      </span>
                      {student.anabin_institution_name && student.anabin_institution_name !== student.university_name && (
                        <div className="text-xs text-gray-500 mt-1 max-w-[200px] truncate" title={student.anabin_institution_name}>
                          → {student.anabin_institution_name}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {student.anabin_match_score ? (
                        <MatchScoreBadge score={student.anabin_match_score} />
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openVerifyModal(student)}
                          className="px-3 py-1 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-1"
                        >
                          <Search className="h-3 w-3" />
                          Prüfen
                        </button>
                        <button
                          onClick={() => handleAutoVerify(student.id)}
                          disabled={verifying === student.id}
                          className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded-lg hover:bg-green-200 flex items-center gap-1"
                          title="Automatisch verifizieren"
                        >
                          {verifying === student.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Sparkles className="h-3 w-3" />
                          )}
                          Auto
                        </button>
                        <div className="flex gap-0.5">
                          <button
                            onClick={() => handleDownloadPdf(student, false)}
                            disabled={loadingPdf === student.id || (!student.university_name && !student.anabin_institution_name)}
                            className="px-2 py-1 text-sm bg-blue-100 text-blue-700 rounded-l-lg hover:bg-blue-200 flex items-center gap-1 disabled:opacity-50"
                            title="PDF laden"
                          >
                            {loadingPdf === student.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <FileDown className="h-3 w-3" />
                            )}
                            PDF
                          </button>
                          <button
                            onClick={() => handleDownloadPdf(student, true)}
                            disabled={loadingPdf === student.id || (!student.university_name && !student.anabin_institution_name)}
                            className="px-2 py-1 text-sm bg-orange-100 text-orange-700 rounded-r-lg hover:bg-orange-200 disabled:opacity-50"
                            title="PDF neu laden"
                          >
                            <RefreshCw className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Verifizierungs-Modal */}
      {selectedStudent && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold">Uni-Verifizierung: {selectedStudent.name}</h2>
                <button onClick={() => { setSelectedStudent(null); setSearchResult(null); }} className="p-2 hover:bg-gray-100 rounded-lg">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="mt-2 text-sm text-gray-600">
                <p><strong>Universität:</strong> {selectedStudent.university_name || "Nicht angegeben"}</p>
                <p><strong>Land:</strong> {selectedStudent.university_country || selectedStudent.nationality || "-"}</p>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Suchergebnis */}
              {searching ? (
                <div className="flex flex-col items-center py-8">
                  <Loader2 className="h-10 w-10 text-primary-600 animate-spin mb-3" />
                  <p className="text-gray-600">Suche in Anabin-Datenbank...</p>
                </div>
              ) : searchResult?.result ? (
                <div className="space-y-4">
                  <div className={`p-4 rounded-xl ${
                    searchResult.result.status === "verified" ? "bg-green-50 border border-green-200" :
                    searchResult.result.status === "uncertain" ? "bg-yellow-50 border border-yellow-200" :
                    "bg-red-50 border border-red-200"
                  }`}>
                    <p className="font-medium">{searchResult.result.message}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Datenbank: {searchResult.result.database_count || 0} Universitäten
                    </p>
                  </div>

                  {searchResult.result.all_matches?.length > 0 && (
                    <div>
                      <h3 className="font-bold mb-2 flex items-center gap-2">
                        <Database className="h-4 w-4" />
                        Gefundene Übereinstimmungen
                      </h3>
                      <div className="space-y-2 max-h-[250px] overflow-y-auto">
                        {searchResult.result.all_matches.map((match: any, idx: number) => (
                          <div 
                            key={idx} 
                            className="p-3 bg-gray-50 rounded-lg text-sm border border-transparent hover:border-primary-300"
                          >
                            <div className="flex justify-between items-start gap-2">
                              <div 
                                className="flex-1 cursor-pointer hover:bg-gray-100 rounded p-1 -m-1"
                                onClick={() => selectMatch(match)}
                              >
                                <span className="font-medium">{match.display_name}</span>
                                {match.name_original !== match.display_name && (
                                  <div className="text-xs text-gray-500 mt-0.5">{match.name_original}</div>
                                )}
                                <div className="text-xs text-gray-500 mt-1">
                                  {match.city}, {match.country} • {match.status}
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <MatchScoreBadge score={match.match_score} />
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDownloadMatchPdf(
                                      match.name_original || match.display_name,
                                      match.country,
                                      idx
                                    );
                                  }}
                                  disabled={loadingMatchPdf === idx}
                                  className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 flex items-center gap-1 disabled:opacity-50"
                                  title="PDF für diese Uni laden"
                                >
                                  {loadingMatchPdf === idx ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  ) : (
                                    <FileDown className="h-3 w-3" />
                                  )}
                                  PDF
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                      <p className="text-xs text-gray-500 mt-2">Klicken Sie auf den Namen um Daten zu übernehmen, oder auf PDF um das Dokument zu laden</p>
                    </div>
                  )}
                </div>
              ) : null}

              {/* Manuelle Eingabe */}
              <div className="border-t pt-4">
                <h3 className="font-bold mb-4">Verifizierungsdaten</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                    <select
                      className="input-styled"
                      value={manualData.anabin_verified}
                      onChange={(e) => setManualData({...manualData, anabin_verified: e.target.value})}
                    >
                      <option value="verified">✅ Verifiziert</option>
                      <option value="uncertain">⚠️ Unsicher</option>
                      <option value="not_found">❌ Nicht gefunden</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Universitätsname (Anabin)</label>
                    <input
                      type="text"
                      className="input-styled"
                      value={manualData.anabin_institution_name}
                      onChange={(e) => setManualData({...manualData, anabin_institution_name: e.target.value})}
                      placeholder="Name wie in Anabin gefunden"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Übereinstimmung (%)</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        className="input-styled"
                        value={manualData.anabin_match_score}
                        onChange={(e) => setManualData({...manualData, anabin_match_score: parseInt(e.target.value) || 0})}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Anabin-Status</label>
                      <select
                        className="input-styled"
                        value={manualData.anabin_status}
                        onChange={(e) => setManualData({...manualData, anabin_status: e.target.value})}
                      >
                        <option value="H+">H+ (Anerkannt)</option>
                        <option value="H +/-">H+/- (Eingeschränkt)</option>
                        <option value="H -">H- (Nicht anerkannt)</option>
                        <option value="">Unbekannt</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Notizen (optional)</label>
                    <textarea
                      className="input-styled"
                      rows={2}
                      value={manualData.anabin_notes}
                      onChange={(e) => setManualData({...manualData, anabin_notes: e.target.value})}
                      placeholder="Weitere Informationen..."
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t bg-gray-50 flex justify-between items-center">
              <a
                href="https://anabin.kmk.org/no_cache/filter/institutionen.html"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary-600 hover:underline flex items-center gap-1"
              >
                <ExternalLink className="h-4 w-4" />
                Anabin manuell öffnen
              </a>
              <div className="flex gap-2">
                <button
                  onClick={() => { setSelectedStudent(null); setSearchResult(null); }}
                  className="btn-secondary"
                >
                  Abbrechen
                </button>
                <button
                  onClick={handleSaveVerification}
                  disabled={saving}
                  className="btn-primary flex items-center gap-2"
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  Speichern
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
