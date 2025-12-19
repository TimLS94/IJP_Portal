import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { companyAPI } from '../../lib/api';
import toast from 'react-hot-toast';
import { Building2, Save, Loader2 } from 'lucide-react';

const companySizes = [
  { value: '1-10', label: '1-10 Mitarbeiter' },
  { value: '11-50', label: '11-50 Mitarbeiter' },
  { value: '51-200', label: '51-200 Mitarbeiter' },
  { value: '201-500', label: '201-500 Mitarbeiter' },
  { value: '501-1000', label: '501-1000 Mitarbeiter' },
  { value: '1000+', label: 'Über 1000 Mitarbeiter' }
];

const industries = [
  'Landwirtschaft',
  'Gastronomie & Hotellerie',
  'Bau & Handwerk',
  'Produktion & Fertigung',
  'Logistik & Transport',
  'Einzelhandel',
  'IT & Technologie',
  'Gesundheitswesen',
  'Pflege',
  'Sonstiges'
];

function CompanyProfile() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { register, handleSubmit, reset, formState: { errors } } = useForm();

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const response = await companyAPI.getProfile();
      reset(response.data);
    } catch (error) {
      if (error.response?.status !== 404) {
        toast.error('Fehler beim Laden des Profils');
      }
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data) => {
    setSaving(true);
    try {
      await companyAPI.updateProfile(data);
      toast.success('Profil erfolgreich gespeichert!');
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
      <div className="flex items-center gap-3 mb-8">
        <Building2 className="h-8 w-8 text-primary-600" />
        <h1 className="text-3xl font-bold text-gray-900">Firmenprofil</h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        {/* Firmendaten */}
        <div className="card">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Firmendaten</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="label">Firmenname *</label>
              <input
                type="text"
                className="input"
                placeholder="Musterfirma GmbH"
                {...register('company_name', { required: 'Firmenname ist erforderlich' })}
              />
              {errors.company_name && <p className="text-red-500 text-sm mt-1">{errors.company_name.message}</p>}
            </div>
            <div>
              <label className="label">Ansprechpartner</label>
              <input
                type="text"
                className="input"
                placeholder="Max Mustermann"
                {...register('contact_person')}
              />
            </div>
            <div>
              <label className="label">Telefon</label>
              <input
                type="tel"
                className="input"
                placeholder="+49 123 456789"
                {...register('phone')}
              />
            </div>
            <div>
              <label className="label">Website</label>
              <input
                type="url"
                className="input"
                placeholder="https://www.beispiel.de"
                {...register('website')}
              />
            </div>
            <div>
              <label className="label">Branche</label>
              <select className="input" {...register('industry')}>
                <option value="">Bitte wählen</option>
                {industries.map((industry) => (
                  <option key={industry} value={industry}>{industry}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Unternehmensgröße</label>
              <select className="input" {...register('company_size')}>
                <option value="">Bitte wählen</option>
                {companySizes.map((size) => (
                  <option key={size.value} value={size.value}>{size.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Adresse */}
        <div className="card">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Adresse</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="md:col-span-2 grid grid-cols-3 gap-4">
              <div className="col-span-2">
                <label className="label">Straße</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Musterstraße"
                  {...register('street')}
                />
              </div>
              <div>
                <label className="label">Hausnummer</label>
                <input
                  type="text"
                  className="input"
                  placeholder="123"
                  {...register('house_number')}
                />
              </div>
            </div>
            <div>
              <label className="label">PLZ</label>
              <input
                type="text"
                className="input"
                placeholder="12345"
                {...register('postal_code')}
              />
            </div>
            <div>
              <label className="label">Stadt</label>
              <input
                type="text"
                className="input"
                placeholder="Berlin"
                {...register('city')}
              />
            </div>
            <div className="md:col-span-2">
              <label className="label">Land</label>
              <input
                type="text"
                className="input"
                placeholder="Deutschland"
                {...register('country')}
              />
            </div>
          </div>
        </div>

        {/* Beschreibung */}
        <div className="card">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Unternehmensbeschreibung</h2>
          <div>
            <label className="label">Über uns</label>
            <textarea
              className="input"
              rows={6}
              placeholder="Beschreiben Sie Ihr Unternehmen, Ihre Werte und was Sie als Arbeitgeber auszeichnet..."
              {...register('description')}
            />
            <p className="text-sm text-gray-500 mt-1">
              Diese Beschreibung wird auf Ihren Stellenangeboten angezeigt.
            </p>
          </div>
        </div>

        {/* Speichern Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="btn-primary flex items-center gap-2"
          >
            {saving ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Save className="h-5 w-5" />
            )}
            Profil speichern
          </button>
        </div>
      </form>
    </div>
  );
}

export default CompanyProfile;
