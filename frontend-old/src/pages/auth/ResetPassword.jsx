import { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { accountAPI } from '../../lib/api';
import toast from 'react-hot-toast';
import { Lock, Eye, EyeOff, Loader2, CheckCircle, XCircle, ArrowLeft } from 'lucide-react';

function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');
  
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [success, setSuccess] = useState(false);
  
  const { register, handleSubmit, watch, formState: { errors } } = useForm();
  const password = watch('password');

  useEffect(() => {
    if (token) {
      verifyToken();
    } else {
      setVerifying(false);
    }
  }, [token]);

  const verifyToken = async () => {
    try {
      await accountAPI.verifyResetToken(token);
      setTokenValid(true);
    } catch (error) {
      setTokenValid(false);
    } finally {
      setVerifying(false);
    }
  };

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      await accountAPI.resetPassword(token, data.password);
      setSuccess(true);
      toast.success('Passwort erfolgreich geändert');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Fehler beim Zurücksetzen');
    } finally {
      setLoading(false);
    }
  };

  // Loading state
  if (verifying) {
    return (
      <div className="max-w-md mx-auto mt-12">
        <div className="card text-center py-12">
          <Loader2 className="h-12 w-12 text-primary-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Token wird überprüft...</p>
        </div>
      </div>
    );
  }

  // Kein Token oder ungültiger Token
  if (!token || !tokenValid) {
    return (
      <div className="max-w-md mx-auto mt-12">
        <div className="card text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <XCircle className="h-8 w-8 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Link ungültig</h1>
          <p className="text-gray-600 mb-6">
            Dieser Link ist ungültig oder abgelaufen. Bitte fordern Sie einen neuen Link an.
          </p>
          <div className="space-y-3">
            <Link to="/forgot-password" className="btn-primary w-full block text-center">
              Neuen Link anfordern
            </Link>
            <Link to="/login" className="btn-secondary w-full block text-center">
              Zurück zum Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Erfolg
  if (success) {
    return (
      <div className="max-w-md mx-auto mt-12">
        <div className="card text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Passwort geändert!</h1>
          <p className="text-gray-600 mb-6">
            Ihr Passwort wurde erfolgreich geändert. Sie können sich jetzt mit Ihrem neuen Passwort anmelden.
          </p>
          <Link to="/login" className="btn-primary w-full block text-center">
            Zum Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto mt-12">
      <div className="card">
        <div className="text-center mb-6">
          <Link to="/" className="inline-block mb-4">
            <img src="/logo.png" alt="IJP" className="h-16 w-auto mx-auto" />
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Neues Passwort wählen</h1>
          <p className="text-gray-600 mt-1">
            Geben Sie Ihr neues Passwort ein
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="label">Neues Passwort</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                className="input-styled pl-10 pr-10"
                placeholder="Mindestens 6 Zeichen"
                {...register('password', {
                  required: 'Passwort ist erforderlich',
                  minLength: {
                    value: 6,
                    message: 'Mindestens 6 Zeichen'
                  }
                })}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
            {errors.password && (
              <p className="text-red-500 text-sm mt-1">{errors.password.message}</p>
            )}
          </div>

          <div>
            <label className="label">Passwort bestätigen</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                className="input-styled pl-10 pr-10"
                placeholder="Passwort wiederholen"
                {...register('confirmPassword', {
                  required: 'Bitte bestätigen Sie das Passwort',
                  validate: value => value === password || 'Passwörter stimmen nicht überein'
                })}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
            {errors.confirmPassword && (
              <p className="text-red-500 text-sm mt-1">{errors.confirmPassword.message}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Lock className="h-5 w-5" />
            )}
            Passwort ändern
          </button>
        </form>

        <div className="mt-6 pt-6 border-t text-center">
          <Link 
            to="/login" 
            className="text-primary-600 hover:text-primary-700 font-medium inline-flex items-center gap-1"
          >
            <ArrowLeft className="h-4 w-4" />
            Zurück zum Login
          </Link>
        </div>
      </div>
    </div>
  );
}

export default ResetPassword;
