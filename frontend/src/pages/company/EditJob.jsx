import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { jobsAPI } from '../../lib/api';
import toast from 'react-hot-toast';
import { 
  Briefcase, ArrowLeft, Save, Loader2, MapPin, Calendar, Euro, ChevronDown,
  Languages, Plus, Minus
} from 'lucide-react';

const positionTypes = [
  { value: 'studentenferienjob', label: 'Studentenferienjob' },
  { value: 'saisonjob', label: 'Saisonjob (8 Monate)' },
  { value: 'fachkraft', label: 'Fachkraft' },
  { value: 'ausbildung', label: 'Ausbildung' }
];

const salaryTypes = [
  { value: 'hourly', label: 'Pro Stunde' },
  { value: 'monthly', label: 'Pro Monat' },
  { value: 'yearly', label: 'Pro Jahr' }
];

const languageLevels = [
  { value: 'not_required', label: 'Nicht erforderlich' },
  { value: 'a1', label: 'A1 - Grundkenntnisse' },
  { value: 'a2', label: 'A2 - Grundkenntnisse' },
  { value: 'b1', label: 'B1 - Gute Kenntnisse' },
  { value: 'b2', label: 'B2 - Sehr gute Kenntnisse' },
  { value: 'c1', label: 'C1 - Fließend' },
  { value: 'c2', label: 'C2 - Fließend' }
];

const commonLanguages = [
  'Russisch', 'Ukrainisch', 'Polnisch', 'Türkisch', 'Arabisch',
  'Spanisch', 'Französisch', 'Italienisch', 'Portugiesisch', 'Rumänisch',
  'Bulgarisch', 'Serbisch', 'Kroatisch', 'Ungarisch', 'Tschechisch'
];

// Gesetzlicher Mindestlohn in Deutschland
const MINIMUM_WAGE = 13.90;

function StyledSelect({ options, placeholder, value, onChange, className = '' }) {
  return (
    <div className="relative">
      <select
        className={`appearance-none w-full px-4 py-3 pr-10 bg-white border-2 border-gray-200 rounded-xl 
                 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 focus:outline-none
                 transition-all cursor-pointer text-gray-700 font-medium ${className}`}
        value={value}
        onChange={onChange}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
    </div>
  );
}

function EditJob() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [otherLanguages, setOtherLanguages] = useState([]);
  const { register, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm();

  const germanRequired = watch('german_required') || 'not_required';
  const englishRequired = watch('english_required') || 'not_required';

  useEffect(() => {
    loadJob();
  }, [id]);

  const loadJob = async () => {
    try {
      const response = await jobsAPI.get(id);
      const job = response.data;
      
      // Formular mit bestehenden Daten füllen
      reset({
        title: job.title || '',
        position_type: job.position_type || '',
        description: job.description || '',
        requirements: job.requirements || '',
        benefits: job.benefits || '',
        location: job.location || '',
        remote_possible: job.remote_possible || false,
        start_date: job.start_date || '',
        end_date: job.end_date || '',
        salary_min: job.salary_min ? String(job.salary_min).replace('.', ',') : '',
        salary_max: job.salary_max ? String(job.salary_max).replace('.', ',') : '',
        salary_type: job.salary_type || '',
        german_required: job.german_required || 'not_required',
        english_required: job.english_required || 'not_required',
        is_active: job.is_active
      });
      
      // Weitere Sprachen setzen
      if (job.other_languages_required && job.other_languages_required.length > 0) {
        setOtherLanguages(job.other_languages_required);
      }
    } catch (error) {
      toast.error('Stellenangebot nicht gefunden');
      navigate('/company/jobs');
    } finally {
      setLoading(false);
    }
  };

  const addOtherLanguage = () => {
    setOtherLanguages([...otherLanguages, { language: '', level: 'basic' }]);
  };

  const removeOtherLanguage = (index) => {
    setOtherLanguages(otherLanguages.filter((_, i) => i !== index));
  };

  const updateOtherLanguage = (index, field, value) => {
    const updated = [...otherLanguages];
    updated[index][field] = value;
    setOtherLanguages(updated);
  };

  // Konvertiert deutsche Zahlenformate (Komma) zu Float
  const parseGermanNumber = (value) => {
    if (!value) return null;
    const normalized = String(value).replace(',', '.');
    const parsed = parseFloat(normalized);
    return isNaN(parsed) ? null : parsed;
  };

  const onSubmit = async (data) => {
    setSaving(true);
    try {
      // Leere Strings zu null konvertieren
      const cleanData = Object.fromEntries(
        Object.entries(data).map(([key, value]) => [
          key,
          value === '' ? null : value
        ])
      );
      
      // Gehalt konvertieren mit Mindestlohn-Validierung
      if (cleanData.salary_min) {
        cleanData.salary_min = parseGermanNumber(cleanData.salary_min);
        if (cleanData.salary_min < MINIMUM_WAGE) {
          toast.error(`Der Mindestlohn darf nicht unter ${MINIMUM_WAGE.toFixed(2).replace('.', ',')}€ liegen`);
          setSaving(false);
          return;
        }
      }
      if (cleanData.salary_max) {
        cleanData.salary_max = parseGermanNumber(cleanData.salary_max);
        if (cleanData.salary_max < MINIMUM_WAGE) {
          toast.error(`Der Lohn darf nicht unter ${MINIMUM_WAGE.toFixed(2).replace('.', ',')}€ liegen`);
          setSaving(false);
          return;
        }
      }
      
      // Sprachanforderungen hinzufügen
      cleanData.other_languages_required = otherLanguages.filter(l => l.language);
      
      await jobsAPI.update(id, cleanData);
      toast.success('Stellenangebot aktualisiert!');
      navigate('/company/jobs');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Fehler beim Speichern');
    } finally {
      setSaving(false);
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
    <div className="max-w-3xl mx-auto">
      <Link to="/company/jobs" className="inline-flex items-center text-gray-600 hover:text-primary-600 mb-6 group">
        <ArrowLeft className="h-4 w-4 mr-2 group-hover:-translate-x-1 transition-transform" />
        Zurück zu meinen Stellen
      </Link>

      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 bg-primary-100 rounded-xl">
          <Briefcase className="h-8 w-8 text-primary-600" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Stelle bearbeiten</h1>
          <p className="text-gray-600">Ändern Sie die Details Ihres Stellenangebots</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        {/* Status */}
        <div className="card bg-gradient-to-r from-gray-50 to-white border-l-4 border-l-primary-500">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-gray-900">Sichtbarkeit</h3>
              <p className="text-sm text-gray-600">Ist die Stelle öffentlich sichtbar?</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                {...register('is_active')}
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:ring-4 peer-focus:ring-primary-100 
                            rounded-full peer peer-checked:after:translate-x-full 
                            after:content-[''] after:absolute after:top-[2px] after:left-[2px] 
                            after:bg-white after:border after:rounded-full after:h-5 after:w-5 
                            after:transition-all peer-checked:bg-green-500"></div>
              <span className="ml-3 text-gray-700 font-medium">
                {watch('is_active') ? 'Aktiv' : 'Inaktiv'}
              </span>
            </label>
          </div>
        </div>

        {/* Grundinformationen */}
        <div className="card">
          <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-primary-600" />
            Grundinformationen
          </h2>
          <div className="space-y-4">
            <div>
              <label className="label">Stellentitel *</label>
              <input
                type="text"
                className="input-styled"
                placeholder="z.B. Erntehelfer für Obstbau"
                {...register('title', { required: 'Titel ist erforderlich' })}
              />
              {errors.title && <p className="text-red-500 text-sm mt-1">{errors.title.message}</p>}
            </div>
            
            <div>
              <label className="label">Stellenart *</label>
              <div className="relative">
                <select
                  className="appearance-none w-full px-4 py-3 pr-10 bg-white border-2 border-gray-200 rounded-xl 
                           focus:border-primary-500 focus:ring-2 focus:ring-primary-200 focus:outline-none
                           transition-all cursor-pointer text-gray-700 font-medium"
                  {...register('position_type', { required: 'Stellenart ist erforderlich' })}
                >
                  <option value="">Stellenart wählen</option>
                  {positionTypes.map((type) => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
              </div>
              {errors.position_type && <p className="text-red-500 text-sm mt-1">{errors.position_type.message}</p>}
            </div>
            
            <div>
              <label className="label">Beschreibung *</label>
              <textarea
                className="input-styled"
                rows={6}
                placeholder="Beschreiben Sie die Stelle und die Aufgaben..."
                {...register('description', { required: 'Beschreibung ist erforderlich' })}
              />
              {errors.description && <p className="text-red-500 text-sm mt-1">{errors.description.message}</p>}
            </div>
          </div>
        </div>

        {/* Sprachanforderungen */}
        <div className="card border-l-4 border-l-blue-500">
          <h2 className="text-xl font-semibold text-gray-900 mb-2 flex items-center gap-2">
            <Languages className="h-5 w-5 text-blue-600" />
            Sprachanforderungen
          </h2>
          <p className="text-gray-600 mb-6 text-sm">
            Geben Sie an, welche Sprachkenntnisse für diese Stelle erforderlich sind.
          </p>
          
          <div className="grid md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="label">Deutschkenntnisse</label>
              <StyledSelect
                options={languageLevels}
                value={germanRequired}
                onChange={(e) => setValue('german_required', e.target.value)}
              />
            </div>
            <div>
              <label className="label">Englischkenntnisse</label>
              <StyledSelect
                options={languageLevels}
                value={englishRequired}
                onChange={(e) => setValue('english_required', e.target.value)}
              />
            </div>
          </div>
          
          <div className="border-t pt-4">
            <div className="flex items-center justify-between mb-4">
              <label className="label mb-0">Weitere Sprachanforderungen</label>
              <button
                type="button"
                onClick={addOtherLanguage}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-blue-600 
                         bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
              >
                <Plus className="h-4 w-4" />
                Sprache hinzufügen
              </button>
            </div>
            
            {otherLanguages.length === 0 ? (
              <p className="text-gray-500 text-sm italic">
                Keine weiteren Sprachanforderungen.
              </p>
            ) : (
              <div className="space-y-3">
                {otherLanguages.map((lang, index) => (
                  <div key={index} className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl">
                    <div className="flex-1">
                      <StyledSelect
                        options={commonLanguages.map(l => ({ value: l, label: l }))}
                        placeholder="Sprache wählen..."
                        value={lang.language}
                        onChange={(e) => updateOtherLanguage(index, 'language', e.target.value)}
                        className="bg-white"
                      />
                    </div>
                    <div className="flex-1">
                      <StyledSelect
                        options={languageLevels.filter(l => l.value !== 'not_required')}
                        value={lang.level}
                        onChange={(e) => updateOtherLanguage(index, 'level', e.target.value)}
                        className="bg-white"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeOtherLanguage(index)}
                      className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Minus className="h-5 w-5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Anforderungen & Benefits */}
        <div className="card">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Anforderungen & Benefits</h2>
          <div className="space-y-4">
            <div>
              <label className="label">Sonstige Anforderungen</label>
              <textarea
                className="input-styled"
                rows={4}
                placeholder="Welche weiteren Qualifikationen werden benötigt?"
                {...register('requirements')}
              />
            </div>
            
            <div>
              <label className="label">Wir bieten</label>
              <textarea
                className="input-styled"
                rows={4}
                placeholder="Was bieten Sie den Bewerbern?"
                {...register('benefits')}
              />
            </div>
          </div>
        </div>

        {/* Ort & Zeit */}
        <div className="card">
          <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary-600" />
            Ort & Zeitraum
          </h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="label">Arbeitsort</label>
              <div className="relative">
                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  className="input-styled pl-12"
                  placeholder="z.B. München, Bayern"
                  {...register('location')}
                />
              </div>
            </div>
            
            <div className="flex items-center pt-8">
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  {...register('remote_possible')}
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:ring-4 peer-focus:ring-primary-100 
                              rounded-full peer peer-checked:after:translate-x-full 
                              after:content-[''] after:absolute after:top-[2px] after:left-[2px] 
                              after:bg-white after:border after:rounded-full after:h-5 after:w-5 
                              after:transition-all peer-checked:bg-primary-600"></div>
                <span className="ml-3 text-gray-700 font-medium">Remote-Arbeit möglich</span>
              </label>
            </div>
            
            <div>
              <label className="label">Startdatum</label>
              <div className="relative">
                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="date"
                  className="input-styled pl-12"
                  {...register('start_date')}
                />
              </div>
            </div>
            
            <div>
              <label className="label">Enddatum (optional)</label>
              <div className="relative">
                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="date"
                  className="input-styled pl-12"
                  {...register('end_date')}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Vergütung */}
        <div className="card">
          <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
            <Euro className="h-5 w-5 text-primary-600" />
            Vergütung
          </h2>
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="label">Minimum (€)</label>
              <div className="relative">
                <Euro className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  inputMode="decimal"
                  className="input-styled pl-12"
                  placeholder="z.B. 12,50"
                  {...register('salary_min')}
                />
              </div>
            </div>
            
            <div>
              <label className="label">Maximum (€)</label>
              <div className="relative">
                <Euro className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  inputMode="decimal"
                  className="input-styled pl-12"
                  placeholder="z.B. 15,00"
                  {...register('salary_max')}
                />
              </div>
            </div>
            
            <div>
              <label className="label">Zeitraum</label>
              <div className="relative">
                <select
                  className="appearance-none w-full px-4 py-3 pr-10 bg-white border-2 border-gray-200 rounded-xl 
                           focus:border-primary-500 focus:ring-2 focus:ring-primary-200 focus:outline-none
                           transition-all cursor-pointer text-gray-700 font-medium"
                  {...register('salary_type')}
                >
                  <option value="">Zeitraum wählen</option>
                  {salaryTypes.map((type) => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
              </div>
            </div>
          </div>
        </div>

        {/* Speichern Button */}
        <div className="flex justify-end gap-4 sticky bottom-4 bg-white/80 backdrop-blur-sm p-4 rounded-xl shadow-lg border">
          <Link to="/company/jobs" className="btn-secondary">
            Abbrechen
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="btn-primary flex items-center gap-2 px-8"
          >
            {saving ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Save className="h-5 w-5" />
            )}
            Änderungen speichern
          </button>
        </div>
      </form>
    </div>
  );
}

export default EditJob;
