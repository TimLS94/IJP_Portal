import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { authAPI, verifyInviteToken } from '../../lib/api';
import toast from 'react-hot-toast';
import { Mail, Lock, User, Building2, Loader2, CheckCircle, Clock, MapPin, Phone, Eye, EyeOff } from 'lucide-react';
import GoogleLoginButton from '../../components/GoogleLoginButton';

const LEGAL_FORMS = [
  { value: 'gmbh', label: 'GmbH' },
  { value: 'ug', label: 'UG (haftungsbeschränkt)' },
  { value: 'ag', label: 'AG' },
  { value: 'ohg', label: 'OHG' },
  { value: 'kg', label: 'KG' },
  { value: 'gbr', label: 'GbR' },
  { value: 'einzelunternehmen', label: 'Einzelunternehmen' },
  { value: 'ev', label: 'e.V. (eingetragener Verein)' },
  { value: 'sonstige', label: 'Sonstige' },
];

function Register() {
  const { t } = useTranslation();
  const { registerApplicant, login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [userType, setUserType] = useState('applicant');
  const [companyPending, setCompanyPending] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { register, handleSubmit, formState: { errors }, watch } = useForm();
  
  // Einladungs-Token aus URL
  const inviteToken = searchParams.get('invite');
  const [inviteValid, setInviteValid] = useState(null);
  const [inviteName, setInviteName] = useState(null);
  const [inviteChecking, setInviteChecking] = useState(!!inviteToken);

  const password = watch('password');

  // Einladungs-Token prüfen
  useEffect(() => {
    if (inviteToken) {
      setUserType('company'); // Automatisch Firma auswählen
      verifyInviteToken(inviteToken)
        .then(res => {
          setInviteValid(res.data.valid);
          setInviteName(res.data.name);
          if (!res.data.valid) {
            toast.error(res.data.message || 'Ungültiger Einladungs-Link');
          }
        })
        .catch(() => {
          setInviteValid(false);
          toast.error('Einladungs-Link konnte nicht geprüft werden');
        })
        .finally(() => setInviteChecking(false));
    }
  }, [inviteToken]);

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      if (userType === 'applicant') {
        await registerApplicant(data.email, data.password, data.firstName, data.lastName);
        toast.success(t('auth.registerSuccess'));
        navigate('/applicant/profile');
      } else {
        // Firmen-Registrierung
        const response = await authAPI.registerCompany(
          { email: data.email, password: data.password },
          {
            company_name: data.companyName,
            legal_form: data.legalForm,
            street: data.street,
            house_number: data.houseNumber,
            postal_code: data.postalCode,
            city: data.city,
            phone: data.phone,
            contact_person: data.contactPerson || null
          },
          inviteToken // Einladungs-Token mitsenden
        );
        
        // Wenn mit gültigem Token: Sofort einloggen
        if (response.data.status === 'active' && response.data.access_token) {
          localStorage.setItem('token', response.data.access_token);
          localStorage.setItem('user', JSON.stringify(response.data.user));
          toast.success('Registrierung erfolgreich! Sie werden eingeloggt...');
          window.location.href = '/company/dashboard';
        } else {
          // Zeige Pending-Status an
          setCompanyPending(true);
          toast.success('Registrierung erfolgreich!');
        }
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || t('auth.registerFailed'));
    } finally {
      setLoading(false);
    }
  };
  
  // Wenn Firma registriert und auf Freischaltung wartet
  if (companyPending) {
    return (
      <div className="max-w-md mx-auto">
        <div className="card text-center">
          <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Clock className="h-10 w-10 text-amber-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">{t('auth.registrationSuccess')}</h1>
          <div className="bg-amber-50 border-l-4 border-amber-500 p-4 mb-6 text-left">
            <p className="text-amber-800 font-medium mb-2">⏳ {t('auth.waitingForApproval')}</p>
            <p className="text-amber-700 text-sm">
              {t('auth.companyPendingMessage')}
            </p>
          </div>
          <p className="text-gray-600 mb-6">
            {t('auth.approvalDuration')}
          </p>
          <Link to="/" className="btn-primary inline-block">
            {t('auth.backToHome')}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto">
      <div className="card">
        <div className="text-center mb-6">
          <Link to="/" className="inline-block mb-4">
            <img src="/logo.png" alt="IJP" className="h-16 w-auto mx-auto" />
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">{t('auth.register')}</h1>
          <p className="text-gray-600 mt-1">{t('auth.createAccount')}</p>
        </div>

        {/* Einladungs-Token Info */}
        {inviteToken && (
          <div className={`mb-6 p-4 rounded-xl border ${
            inviteChecking ? 'bg-gray-50 border-gray-200' :
            inviteValid ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
          }`}>
            {inviteChecking ? (
              <div className="flex items-center gap-2 text-gray-600">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Einladungs-Link wird geprüft...</span>
              </div>
            ) : inviteValid ? (
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                <div>
                  <p className="font-medium text-green-800">Gültiger Einladungs-Link</p>
                  {inviteName && <p className="text-sm text-green-700">{inviteName}</p>}
                  <p className="text-sm text-green-600 mt-1">
                    Sie können sich direkt registrieren und sofort loslegen - keine Wartezeit!
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-3">
                <Clock className="h-5 w-5 text-red-600 mt-0.5" />
                <div>
                  <p className="font-medium text-red-800">Ungültiger Einladungs-Link</p>
                  <p className="text-sm text-red-600 mt-1">
                    Der Link ist abgelaufen oder wurde bereits verwendet. Sie können sich trotzdem registrieren, 
                    müssen aber auf die Freischaltung durch einen Administrator warten.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
        
        {/* User Type Selector */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <button
            type="button"
            onClick={() => setUserType('applicant')}
            className={`relative p-4 rounded-xl border-2 transition-all ${
              userType === 'applicant' 
                ? 'border-primary-500 bg-primary-50 shadow-md' 
                : 'border-gray-200 bg-white hover:border-gray-300'
            }`}
          >
            <User className={`h-6 w-6 mx-auto mb-2 ${
              userType === 'applicant' ? 'text-primary-600' : 'text-gray-400'
            }`} />
            <span className={`block font-semibold ${
              userType === 'applicant' ? 'text-primary-700' : 'text-gray-600'
            }`}>
              {t('auth.applicant')}
            </span>
            <span className="text-xs text-gray-500">{t('auth.seekingJob')}</span>
            {userType === 'applicant' && (
              <CheckCircle className="absolute top-2 right-2 h-5 w-5 text-primary-600" />
            )}
          </button>
          <button
            type="button"
            onClick={() => setUserType('company')}
            className={`relative p-4 rounded-xl border-2 transition-all ${
              userType === 'company' 
                ? 'border-primary-500 bg-primary-50 shadow-md' 
                : 'border-gray-200 bg-white hover:border-gray-300'
            }`}
          >
            <Building2 className={`h-6 w-6 mx-auto mb-2 ${
              userType === 'company' ? 'text-primary-600' : 'text-gray-400'
            }`} />
            <span className={`block font-semibold ${
              userType === 'company' ? 'text-primary-700' : 'text-gray-600'
            }`}>
              {t('auth.company')}
            </span>
            <span className="text-xs text-gray-500">{t('auth.seekingEmployees')}</span>
            {userType === 'company' && (
              <CheckCircle className="absolute top-2 right-2 h-5 w-5 text-primary-600" />
            )}
          </button>
        </div>

        {/* Google Login für Bewerber */}
        {userType === 'applicant' && (
          <div className="mb-6">
            <GoogleLoginButton buttonText={t('auth.registerWithGoogle')} />
            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">{t('auth.orWithEmail')}</span>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {userType === 'applicant' ? (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">{t('auth.firstName')}</label>
                <input
                  type="text"
                  className="input-styled"
                  placeholder="Max"
                  {...register('firstName', { required: t('auth.firstNameRequired') })}
                />
                {errors.firstName && <p className="text-red-500 text-sm mt-1">{errors.firstName.message}</p>}
              </div>
              <div>
                <label className="label">{t('auth.lastName')}</label>
                <input
                  type="text"
                  className="input-styled"
                  placeholder="Mustermann"
                  {...register('lastName', { required: t('auth.lastNameRequired') })}
                />
                {errors.lastName && <p className="text-red-500 text-sm mt-1">{errors.lastName.message}</p>}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-xs text-gray-500 mb-2">Alle Felder außer Ansprechpartner sind Pflichtfelder.</p>
              
              {/* Firmenname + Rechtsform */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">{t('auth.companyNameLabel')}</label>
                  <div className="relative">
                    <Building2 className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="text"
                      className="input-styled pl-12"
                      placeholder="Musterfirma"
                      {...register('companyName', { required: t('auth.companyNameRequired') })}
                    />
                  </div>
                  {errors.companyName && <p className="text-red-500 text-sm mt-1">{errors.companyName.message}</p>}
                </div>
                <div>
                  <label className="label">Rechtsform</label>
                  <div className="relative">
                    <Building2 className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
                    <select
                      className="input-styled pl-12 appearance-none bg-white cursor-pointer"
                      {...register('legalForm', { required: 'Bitte wählen Sie eine Rechtsform' })}
                    >
                      <option value="">Bitte wählen...</option>
                      {LEGAL_FORMS.map(form => (
                        <option key={form.value} value={form.value}>{form.label}</option>
                      ))}
                    </select>
                    <div className="absolute right-4 top-1/2 transform -translate-y-1/2 pointer-events-none">
                      <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                  {errors.legalForm && <p className="text-red-500 text-sm mt-1">{errors.legalForm.message}</p>}
                </div>
              </div>

              {/* Ansprechpartner (optional) */}
              <div>
                <label className="label">Ansprechpartner <span className="text-gray-400 text-xs">(optional)</span></label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    className="input-styled pl-12"
                    placeholder="Max Mustermann"
                    {...register('contactPerson')}
                  />
                </div>
              </div>

              {/* Adresse */}
              <div className="grid grid-cols-4 gap-3">
                <div className="col-span-3">
                  <label className="label">Straße</label>
                  <div className="relative">
                    <MapPin className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="text"
                      className="input-styled pl-12"
                      placeholder="Musterstraße"
                      {...register('street', { required: 'Straße ist erforderlich' })}
                    />
                  </div>
                  {errors.street && <p className="text-red-500 text-sm mt-1">{errors.street.message}</p>}
                </div>
                <div>
                  <label className="label">Nr.</label>
                  <input
                    type="text"
                    className="input-styled"
                    placeholder="123"
                    {...register('houseNumber', { required: 'Erforderlich' })}
                  />
                  {errors.houseNumber && <p className="text-red-500 text-sm mt-1">{errors.houseNumber.message}</p>}
                </div>
              </div>

              <div className="grid grid-cols-4 gap-3">
                <div>
                  <label className="label">PLZ</label>
                  <input
                    type="text"
                    className="input-styled"
                    placeholder="12345"
                    {...register('postalCode', { required: 'Erforderlich' })}
                  />
                  {errors.postalCode && <p className="text-red-500 text-sm mt-1">{errors.postalCode.message}</p>}
                </div>
                <div className="col-span-3">
                  <label className="label">Stadt</label>
                  <input
                    type="text"
                    className="input-styled"
                    placeholder="Musterstadt"
                    {...register('city', { required: 'Stadt ist erforderlich' })}
                  />
                  {errors.city && <p className="text-red-500 text-sm mt-1">{errors.city.message}</p>}
                </div>
              </div>

              {/* Telefon */}
              <div>
                <label className="label">Telefon</label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="tel"
                    className="input-styled pl-12"
                    placeholder="+49 123 456789"
                    {...register('phone', { required: 'Telefonnummer ist erforderlich' })}
                  />
                </div>
                {errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone.message}</p>}
              </div>
            </div>
          )}

          <div>
            <label className="label">{t('auth.email')}</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="email"
                className="input-styled pl-12"
                placeholder="ihre@email.de"
                autoComplete="email"
                {...register('email', {
                  required: t('auth.emailRequired'),
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: t('auth.emailInvalid')
                  }
                })}
              />
            </div>
            {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>}
          </div>

          <div>
            <label className="label">{t('auth.password')}</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                className="input-styled pl-12 pr-12"
                placeholder="••••••••"
                autoComplete="new-password"
                {...register('password', {
                  required: t('auth.passwordRequired'),
                  minLength: {
                    value: 6,
                    message: t('auth.passwordMinLength')
                  }
                })}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
            {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password.message}</p>}
          </div>

          <div>
            <label className="label">{t('auth.confirmPassword')}</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                className="input-styled pl-12 pr-12"
                placeholder="••••••••"
                autoComplete="new-password"
                {...register('confirmPassword', {
                  required: t('auth.confirmPasswordRequired'),
                  validate: value => value === password || t('auth.passwordsMismatch')
                })}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
            {errors.confirmPassword && <p className="text-red-500 text-sm mt-1">{errors.confirmPassword.message}</p>}
          </div>

          {/* Datenschutz-Checkbox */}
          <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                className="mt-1 h-5 w-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                {...register('privacyAccepted', {
                  required: t('auth.privacyRequired')
                })}
              />
              <span className="text-sm text-gray-700">
                {t('auth.privacyText')}{' '}
                <Link to="/datenschutz" className="text-primary-600 hover:underline font-medium" target="_blank">
                  {t('auth.privacyLink')}
                </Link>
                {' '}{t('auth.privacyText2')}
              </span>
            </label>
            {errors.privacyAccepted && (
              <p className="text-red-500 text-sm mt-2">{errors.privacyAccepted.message}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full py-3 flex items-center justify-center text-lg font-semibold"
          >
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              t('auth.registerButton')
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-gray-600">
            {t('auth.hasAccount')}{' '}
            <Link to="/login" className="text-primary-600 hover:text-primary-700 font-semibold">
              {t('nav.login')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Register;
