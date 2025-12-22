import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { authAPI } from '../../lib/api';
import toast from 'react-hot-toast';
import { Mail, Lock, User, Building2, Loader2, CheckCircle, Clock } from 'lucide-react';

function Register() {
  const { t } = useTranslation();
  const { registerApplicant } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [userType, setUserType] = useState('applicant');
  const [companyPending, setCompanyPending] = useState(false);
  const { register, handleSubmit, formState: { errors }, watch } = useForm();

  const password = watch('password');

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      if (userType === 'applicant') {
        await registerApplicant(data.email, data.password, data.firstName, data.lastName);
        toast.success(t('auth.registerSuccess'));
        navigate('/applicant/profile');
      } else {
        // Firmen-Registrierung: Konto wird erst nach Admin-Freischaltung aktiviert
        await authAPI.registerCompany(
          { email: data.email, password: data.password },
          data.companyName
        );
        // Zeige Pending-Status an
        setCompanyPending(true);
        toast.success('Registrierung erfolgreich!');
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
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Registrierung erfolgreich!</h1>
          <div className="bg-amber-50 border-l-4 border-amber-500 p-4 mb-6 text-left">
            <p className="text-amber-800 font-medium mb-2">⏳ Warten auf Freischaltung</p>
            <p className="text-amber-700 text-sm">
              Ihr Unternehmenskonto wird derzeit von unserem Team geprüft. 
              Sie erhalten eine E-Mail-Benachrichtigung, sobald Ihr Konto freigeschaltet wurde.
            </p>
          </div>
          <p className="text-gray-600 mb-6">
            Dieser Prozess dauert in der Regel 1-2 Werktage.
          </p>
          <Link to="/" className="btn-primary inline-block">
            Zurück zur Startseite
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
          <p className="text-gray-600 mt-1">Erstellen Sie Ihr Konto</p>
        </div>
        
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
            <span className="text-xs text-gray-500">Ich suche Arbeit</span>
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
            <span className="text-xs text-gray-500">Ich suche Mitarbeiter</span>
            {userType === 'company' && (
              <CheckCircle className="absolute top-2 right-2 h-5 w-5 text-primary-600" />
            )}
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {userType === 'applicant' ? (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Vorname</label>
                <input
                  type="text"
                  className="input-styled"
                  placeholder="Max"
                  {...register('firstName', { required: 'Vorname ist erforderlich' })}
                />
                {errors.firstName && <p className="text-red-500 text-sm mt-1">{errors.firstName.message}</p>}
              </div>
              <div>
                <label className="label">Nachname</label>
                <input
                  type="text"
                  className="input-styled"
                  placeholder="Mustermann"
                  {...register('lastName', { required: 'Nachname ist erforderlich' })}
                />
                {errors.lastName && <p className="text-red-500 text-sm mt-1">{errors.lastName.message}</p>}
              </div>
            </div>
          ) : (
            <div>
              <label className="label">Firmenname</label>
              <div className="relative">
                <Building2 className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  className="input-styled pl-12"
                  placeholder="Musterfirma GmbH"
                  {...register('companyName', { required: 'Firmenname ist erforderlich' })}
                />
              </div>
              {errors.companyName && <p className="text-red-500 text-sm mt-1">{errors.companyName.message}</p>}
            </div>
          )}

          <div>
            <label className="label">E-Mail</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="email"
                className="input-styled pl-12"
                placeholder="ihre@email.de"
                {...register('email', {
                  required: 'E-Mail ist erforderlich',
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: 'Ungültige E-Mail-Adresse'
                  }
                })}
              />
            </div>
            {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>}
          </div>

          <div>
            <label className="label">Passwort</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="password"
                className="input-styled pl-12"
                placeholder="••••••••"
                {...register('password', {
                  required: 'Passwort ist erforderlich',
                  minLength: {
                    value: 6,
                    message: 'Passwort muss mindestens 6 Zeichen haben'
                  }
                })}
              />
            </div>
            {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password.message}</p>}
          </div>

          <div>
            <label className="label">Passwort bestätigen</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="password"
                className="input-styled pl-12"
                placeholder="••••••••"
                {...register('confirmPassword', {
                  required: 'Bitte Passwort bestätigen',
                  validate: value => value === password || 'Passwörter stimmen nicht überein'
                })}
              />
            </div>
            {errors.confirmPassword && <p className="text-red-500 text-sm mt-1">{errors.confirmPassword.message}</p>}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full py-3 flex items-center justify-center text-lg font-semibold"
          >
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              'Registrieren'
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
