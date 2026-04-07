import { useEffect, useState } from 'react';
import { authAPI } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Loader2 } from 'lucide-react';

/**
 * Google Login Button für Bewerber
 * Verwendet Google Identity Services (GSI)
 */
function GoogleLoginButton({ onSuccess, buttonText = "Mit Google anmelden" }) {
  const [googleConfig, setGoogleConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    loadGoogleConfig();
  }, []);

  useEffect(() => {
    if (googleConfig?.enabled && googleConfig?.client_id) {
      initializeGoogle();
    }
  }, [googleConfig]);

  const loadGoogleConfig = async () => {
    try {
      const response = await authAPI.getGoogleConfig();
      setGoogleConfig(response.data);
    } catch (error) {
      console.error('Google Config laden fehlgeschlagen:', error);
      setGoogleConfig({ enabled: false });
    } finally {
      setLoading(false);
    }
  };

  const initializeGoogle = () => {
    // Google Identity Services Script laden
    if (document.getElementById('google-gsi-script')) {
      renderButton();
      return;
    }

    const script = document.createElement('script');
    script.id = 'google-gsi-script';
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = renderButton;
    document.body.appendChild(script);
  };

  const renderButton = () => {
    if (!window.google || !googleConfig?.client_id) return;

    window.google.accounts.id.initialize({
      client_id: googleConfig.client_id,
      callback: handleGoogleResponse,
      auto_select: false,
      cancel_on_tap_outside: true,
    });

    // Custom Button rendern
    const buttonDiv = document.getElementById('google-signin-button');
    if (buttonDiv) {
      window.google.accounts.id.renderButton(buttonDiv, {
        type: 'standard',
        theme: 'outline',
        size: 'large',
        text: 'signin_with',
        shape: 'rectangular',
        logo_alignment: 'left',
        width: '100%',
      });
    }
  };

  const handleGoogleResponse = async (response) => {
    if (!response.credential) {
      toast.error('Google Login fehlgeschlagen');
      return;
    }

    setProcessing(true);
    try {
      const result = await authAPI.googleLogin(response.credential);
      const { access_token, user, is_new_user } = result.data;

      // Token und User speichern
      localStorage.setItem('token', access_token);
      localStorage.setItem('user', JSON.stringify(user));

      // Auth Context aktualisieren
      login(access_token, user);

      if (is_new_user) {
        toast.success('Willkommen! Dein Konto wurde erstellt.');
        navigate('/applicant/profile');
      } else {
        toast.success('Erfolgreich angemeldet!');
        navigate('/applicant/dashboard');
      }

      if (onSuccess) {
        onSuccess(user);
      }
    } catch (error) {
      const message = error.response?.data?.detail || 'Google Login fehlgeschlagen';
      toast.error(message);
    } finally {
      setProcessing(false);
    }
  };

  // Nicht anzeigen wenn Google nicht konfiguriert
  if (loading) {
    return (
      <div className="flex justify-center py-3">
        <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!googleConfig?.enabled) {
    return null;
  }

  return (
    <div className="w-full">
      {processing ? (
        <div className="flex items-center justify-center gap-2 py-3 px-4 border border-gray-300 rounded-lg bg-gray-50">
          <Loader2 className="h-5 w-5 animate-spin text-gray-600" />
          <span className="text-gray-600">Wird angemeldet...</span>
        </div>
      ) : (
        <div id="google-signin-button" className="w-full flex justify-center" />
      )}
    </div>
  );
}

export default GoogleLoginButton;
