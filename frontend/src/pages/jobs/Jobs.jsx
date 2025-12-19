import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { jobsAPI } from '../../lib/api';
import { MapPin, Calendar, Building2, Search, Filter, Briefcase, ChevronDown, X, Languages } from 'lucide-react';

const positionTypes = [
  { value: '', label: 'Alle Stellenarten' },
  { value: 'studentenferienjob', label: 'Studentenferienjob' },
  { value: 'saisonjob', label: 'Saisonjob (8 Monate)' },
  { value: 'fachkraft', label: 'Fachkraft' },
  { value: 'ausbildung', label: 'Ausbildung' }
];

const positionTypeColors = {
  studentenferienjob: 'bg-blue-100 text-blue-800 border-blue-200',
  saisonjob: 'bg-orange-100 text-orange-800 border-orange-200',
  fachkraft: 'bg-purple-100 text-purple-800 border-purple-200',
  ausbildung: 'bg-green-100 text-green-800 border-green-200'
};

// Sprachniveau Labels (kurz)
const languageLevelLabels = {
  not_required: null,
  basic: 'Grundkenntnisse',
  good: 'Gute Kenntnisse',
  fluent: 'Fließend'
};

const languageLevelColors = {
  basic: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  good: 'bg-blue-50 text-blue-700 border-blue-200',
  fluent: 'bg-green-50 text-green-700 border-green-200'
};

// Sprachfilter-Optionen
const germanLevelFilter = [
  { value: '', label: 'Alle Deutschkenntnisse' },
  { value: 'not_required', label: 'Keine erforderlich' },
  { value: 'basic', label: 'Grundkenntnisse' },
  { value: 'good', label: 'Gute Kenntnisse' },
  { value: 'fluent', label: 'Fließend' }
];

function Jobs() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [positionType, setPositionType] = useState(searchParams.get('type') || '');
  const [location, setLocation] = useState(searchParams.get('location') || '');
  const [germanLevel, setGermanLevel] = useState(searchParams.get('german') || '');

  useEffect(() => {
    loadJobs();
  }, [positionType, location, germanLevel]);

  const loadJobs = async () => {
    setLoading(true);
    try {
      const params = {};
      if (positionType) params.position_type = positionType;
      if (location) params.location = location;
      if (search) params.search = search;
      
      const response = await jobsAPI.list(params);
      let filteredJobs = response.data;
      
      // Client-seitige Filterung nach Deutschkenntnissen
      if (germanLevel) {
        filteredJobs = filteredJobs.filter(job => {
          if (germanLevel === 'not_required') {
            return !job.german_required || job.german_required === 'not_required';
          }
          return job.german_required === germanLevel;
        });
      }
      
      setJobs(filteredJobs);
    } catch (error) {
      console.error('Fehler beim Laden der Jobs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    loadJobs();
  };

  const clearFilters = () => {
    setSearch('');
    setPositionType('');
    setLocation('');
    setGermanLevel('');
  };

  const hasFilters = search || positionType || location || germanLevel;

  const formatDate = (dateString) => {
    if (!dateString) return null;
    return new Date(dateString).toLocaleDateString('de-DE');
  };

  // Sprachbadges für ein Job rendern
  const renderLanguageBadges = (job) => {
    const badges = [];
    
    if (job.german_required && job.german_required !== 'not_required') {
      badges.push(
        <span key="de" className={`px-2 py-0.5 rounded-full text-xs font-medium border ${languageLevelColors[job.german_required]}`}>
          🇩🇪 {languageLevelLabels[job.german_required]}
        </span>
      );
    }
    
    if (job.english_required && job.english_required !== 'not_required') {
      badges.push(
        <span key="en" className={`px-2 py-0.5 rounded-full text-xs font-medium border ${languageLevelColors[job.english_required]}`}>
          🇬🇧 {languageLevelLabels[job.english_required]}
        </span>
      );
    }
    
    if (job.other_languages_required?.length > 0) {
      badges.push(
        <span key="other" className="px-2 py-0.5 rounded-full text-xs font-medium border bg-gray-50 text-gray-600 border-gray-200">
          +{job.other_languages_required.length} weitere
        </span>
      );
    }
    
    return badges;
  };

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <Briefcase className="h-8 w-8 text-primary-600" />
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Stellenangebote</h1>
          <p className="text-gray-600">Finden Sie Ihren passenden Job in Deutschland</p>
        </div>
      </div>

      {/* Filter */}
      <div className="card mb-8">
        <form onSubmit={handleSearch} className="space-y-4">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Suchfeld */}
            <div className="lg:col-span-2">
              <label className="label">Suche</label>
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  className="w-full pl-12 pr-4 py-3 bg-white border-2 border-gray-200 rounded-xl 
                           focus:border-primary-500 focus:ring-2 focus:ring-primary-200 focus:outline-none
                           transition-all placeholder-gray-400"
                  placeholder="Job-Titel, Firma, Beschreibung..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
            
            {/* Stellenart Dropdown */}
            <div>
              <label className="label">Stellenart</label>
              <div className="relative">
                <select
                  className="appearance-none w-full px-4 py-3 pr-10 bg-white border-2 border-gray-200 rounded-xl 
                           focus:border-primary-500 focus:ring-2 focus:ring-primary-200 focus:outline-none
                           transition-all cursor-pointer text-gray-700 font-medium"
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
              <label className="label">Ort</label>
              <div className="relative">
                <MapPin className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  className="w-full pl-12 pr-4 py-3 bg-white border-2 border-gray-200 rounded-xl 
                           focus:border-primary-500 focus:ring-2 focus:ring-primary-200 focus:outline-none
                           transition-all placeholder-gray-400"
                  placeholder="Stadt, Region..."
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                />
              </div>
            </div>
          </div>
          
          {/* Zweite Filter-Reihe: Sprache */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="label flex items-center gap-2">
                <Languages className="h-4 w-4 text-blue-600" />
                Deutschkenntnisse
              </label>
              <div className="relative">
                <select
                  className="appearance-none w-full px-4 py-3 pr-10 bg-white border-2 border-gray-200 rounded-xl 
                           focus:border-primary-500 focus:ring-2 focus:ring-primary-200 focus:outline-none
                           transition-all cursor-pointer text-gray-700 font-medium"
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
          
          <div className="flex items-center gap-3">
            <button type="submit" className="btn-primary flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Filter anwenden
            </button>
            {hasFilters && (
              <button 
                type="button" 
                onClick={clearFilters}
                className="btn-secondary flex items-center gap-2 text-sm"
              >
                <X className="h-4 w-4" />
                Filter zurücksetzen
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Ergebnis-Anzahl */}
      {!loading && (
        <div className="mb-4 flex items-center justify-between">
          <p className="text-gray-600">
            <span className="font-semibold text-gray-900">{jobs.length}</span> Stellenangebote gefunden
          </p>
        </div>
      )}

      {/* Job Liste */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      ) : jobs.length === 0 ? (
        <div className="card text-center py-12">
          <Briefcase className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 text-lg mb-2">Keine Stellenangebote gefunden</p>
          <p className="text-gray-400">Versuchen Sie andere Suchkriterien</p>
        </div>
      ) : (
        <div className="space-y-4">
          {jobs.map((job) => (
            <Link
              key={job.id}
              to={`/jobs/${job.id}`}
              className="card block hover:shadow-xl hover:border-primary-200 border-2 border-transparent transition-all group"
            >
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2 flex-wrap">
                    <h2 className="text-xl font-bold text-gray-900 group-hover:text-primary-600 transition-colors">
                      {job.title}
                    </h2>
                    <span className={`px-3 py-1 rounded-full text-sm font-semibold border ${positionTypeColors[job.position_type]}`}>
                      {positionTypes.find(t => t.value === job.position_type)?.label}
                    </span>
                    {job.remote_possible && (
                      <span className="px-3 py-1 rounded-full text-sm font-medium bg-teal-100 text-teal-800 border border-teal-200">
                        Remote möglich
                      </span>
                    )}
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-4 text-gray-600 mb-3">
                    <span className="flex items-center gap-1.5">
                      <Building2 className="h-4 w-4 text-gray-400" />
                      <span className="font-medium">{job.company?.company_name || 'Unbekannt'}</span>
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
                        Ab {formatDate(job.start_date)}
                      </span>
                    )}
                  </div>
                  
                  {/* Sprachanforderungen Badges */}
                  {renderLanguageBadges(job).length > 0 && (
                    <div className="flex flex-wrap items-center gap-2 mb-3">
                      <Languages className="h-4 w-4 text-gray-400" />
                      {renderLanguageBadges(job)}
                    </div>
                  )}
                  
                  {job.description && (
                    <p className="text-gray-600 line-clamp-2">
                      {job.description.substring(0, 200)}...
                    </p>
                  )}
                </div>
                
                <div className="text-right flex-shrink-0">
                  {job.salary_min && job.salary_max && (
                    <p className="text-lg font-bold text-primary-600">
                      {job.salary_min.toLocaleString('de-DE', { minimumFractionDigits: job.salary_min % 1 !== 0 ? 2 : 0, maximumFractionDigits: 2 })}€ - {job.salary_max.toLocaleString('de-DE', { minimumFractionDigits: job.salary_max % 1 !== 0 ? 2 : 0, maximumFractionDigits: 2 })}€
                      <span className="text-sm font-normal text-gray-500 block">
                        /{job.salary_type === 'hourly' ? 'Stunde' : job.salary_type === 'monthly' ? 'Monat' : 'Jahr'}
                      </span>
                    </p>
                  )}
                  <p className="text-sm text-gray-400 mt-2">
                    {new Date(job.created_at).toLocaleDateString('de-DE')}
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

export default Jobs;
