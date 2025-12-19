import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { accountAPI } from '../../lib/api';
import toast from 'react-hot-toast';
import { Mail, ArrowLeft, Loader2, CheckCircle } from 'lucide-react';

function ForgotPassword() {
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm();

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      await accountAPI.forgotPassword(data.email);
      setEmailSent(true);
      toast.success('Wenn ein Account existiert, wurde eine E-Mail gesendet');
    } catch (error) {
      // Immer Erfolg anzeigen (Sicherheit)
      setEmailSent(true);
    } finally {
      setLoading(false);
    }
  };

  if (emailSent) {
    return (
      <div className="max-w-md mx-auto mt-12">
        <div className="card text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">E-Mail gesendet!</h1>
          <p className="text-gray-600 mb-6">
            Falls ein Account mit dieser E-Mail-Adresse existiert, haben wir Ihnen 
            einen Link zum Zurücksetzen Ihres Passworts gesendet.
          </p>
          <p className="text-gray-500 text-sm mb-6">
            Der Link ist 1 Stunde gültig. Prüfen Sie auch Ihren Spam-Ordner.
          </p>
          <div className="space-y-3">
            <Link to="/login" className="btn-primary w-full block text-center">
              Zurück zum Login
            </Link>
            <button 
              onClick={() => setEmailSent(false)}
              className="btn-secondary w-full"
            >
              Andere E-Mail versuchen
            </button>
          </div>
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
          <h1 className="text-2xl font-bold text-gray-900">Passwort vergessen?</h1>
          <p className="text-gray-600 mt-1">
            Geben Sie Ihre E-Mail-Adresse ein und wir senden Ihnen einen Link zum Zurücksetzen.
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="label">E-Mail-Adresse</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="email"
                className="input-styled pl-10"
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
            {errors.email && (
              <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>
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
              <Mail className="h-5 w-5" />
            )}
            Reset-Link senden
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

export default ForgotPassword;
