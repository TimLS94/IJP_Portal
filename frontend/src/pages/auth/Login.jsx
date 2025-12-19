import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { Mail, Lock, Loader2, LogIn } from 'lucide-react';

function Login() {
  const { t } = useTranslation();
  const { login } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm();

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      const user = await login(data.email, data.password);
      toast.success(t('auth.loginSuccess'));
      
      // Weiterleitung basierend auf Rolle
      if (user.role === 'applicant') {
        navigate('/applicant/profile');
      } else if (user.role === 'company') {
        navigate('/company/dashboard');
      } else {
        navigate('/');
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || t('auth.loginFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto">
      <div className="card">
        <div className="text-center mb-6">
          <Link to="/" className="inline-block mb-4">
            <img src="/logo.png" alt="IJP" className="h-16 w-auto mx-auto" />
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">{t('auth.login')}</h1>
          <p className="text-gray-600 mt-1">Willkommen zurück!</p>
        </div>
        
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="label">{t('auth.email')}</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="email"
                className="input-styled pl-12"
                placeholder="ihre@email.de"
                {...register('email', {
                  required: t('auth.emailRequired'),
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: t('auth.invalidEmail')
                  }
                })}
              />
            </div>
            {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>}
          </div>

          <div>
            <div className="flex justify-between items-center">
              <label className="label">{t('auth.password')}</label>
              <Link to="/forgot-password" className="text-sm text-primary-600 hover:text-primary-700">
                Passwort vergessen?
              </Link>
            </div>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="password"
                className="input-styled pl-12"
                placeholder="••••••••"
                {...register('password', {
                  required: t('auth.passwordRequired'),
                  minLength: {
                    value: 6,
                    message: t('auth.passwordMinLength')
                  }
                })}
              />
            </div>
            {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password.message}</p>}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full py-3 flex items-center justify-center text-lg font-semibold"
          >
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              t('auth.login')
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-gray-600">
            {t('auth.noAccount')}{' '}
            <Link to="/register" className="text-primary-600 hover:text-primary-700 font-semibold">
              {t('nav.register')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Login;
