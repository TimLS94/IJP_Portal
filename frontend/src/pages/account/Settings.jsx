import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useAuth } from '../../context/AuthContext';
import { accountAPI } from '../../lib/api';
import toast from 'react-hot-toast';
import { 
  Settings as SettingsIcon, Lock, Mail, Trash2, Eye, EyeOff, 
  Loader2, AlertTriangle, CheckCircle, User, Shield
} from 'lucide-react';

function Settings() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { t } = useTranslation();
  const [accountInfo, setAccountInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Modal States
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  
  // Loading states
  const [changingPassword, setChangingPassword] = useState(false);
  const [changingEmail, setChangingEmail] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  
  // Password visibility
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
    emailPassword: false,
    deletePassword: false
  });

  // Forms
  const passwordForm = useForm();
  const emailForm = useForm();
  const deleteForm = useForm();

  useEffect(() => {
    loadAccountInfo();
  }, []);

  const loadAccountInfo = async () => {
    try {
      const response = await accountAPI.getAccountInfo();
      setAccountInfo(response.data);
    } catch (error) {
      toast.error('Fehler beim Laden der Account-Daten');
    } finally {
      setLoading(false);
    }
  };

  // ========== PASSWORT ÄNDERN ==========
  const handleChangePassword = async (data) => {
    if (data.newPassword !== data.confirmPassword) {
      toast.error('Passwörter stimmen nicht überein');
      return;
    }
    
    setChangingPassword(true);
    try {
      await accountAPI.changePassword(data.currentPassword, data.newPassword);
      toast.success('Passwort erfolgreich geändert');
      setShowPasswordModal(false);
      passwordForm.reset();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Fehler beim Ändern des Passworts');
    } finally {
      setChangingPassword(false);
    }
  };

  // ========== E-MAIL ÄNDERN ==========
  const handleChangeEmail = async (data) => {
    setChangingEmail(true);
    try {
      await accountAPI.changeEmail(data.newEmail, data.password);
      toast.success('E-Mail erfolgreich geändert');
      setShowEmailModal(false);
      emailForm.reset();
      loadAccountInfo();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Fehler beim Ändern der E-Mail');
    } finally {
      setChangingEmail(false);
    }
  };

  // ========== ACCOUNT LÖSCHEN ==========
  const handleDeleteAccount = async (data) => {
    if (data.confirmation !== 'DELETE') {
      toast.error('Bitte geben Sie DELETE zur Bestätigung ein');
      return;
    }
    
    setDeletingAccount(true);
    try {
      await accountAPI.deleteAccount(data.password, data.confirmation);
      toast.success('Account wurde gelöscht');
      logout();
      navigate('/');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Fehler beim Löschen des Accounts');
    } finally {
      setDeletingAccount(false);
    }
  };

  const togglePasswordVisibility = (field) => {
    setShowPasswords(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const getRoleLabel = (role) => {
    const labels = {
      applicant: { text: 'Bewerber', color: 'bg-blue-100 text-blue-800', icon: User },
      company: { text: 'Unternehmen', color: 'bg-green-100 text-green-800', icon: SettingsIcon },
      admin: { text: 'Administrator', color: 'bg-purple-100 text-purple-800', icon: Shield }
    };
    return labels[role] || labels.applicant;
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const roleInfo = getRoleLabel(accountInfo?.role);
  const RoleIcon = roleInfo.icon;

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <SettingsIcon className="h-8 w-8 text-primary-600" />
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{t('settings.title')}</h1>
          <p className="text-gray-600">{t('settings.subtitle')}</p>
        </div>
      </div>

      {/* Account Info */}
      <div className="card mb-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">{t('settings.accountInfo')}</h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
            <div className="flex items-center gap-3">
              <Mail className="h-5 w-5 text-gray-500" />
              <div>
                <p className="text-sm text-gray-500">{t('settings.emailLabel')}</p>
                <p className="font-medium text-gray-900">{accountInfo?.email}</p>
              </div>
            </div>
            <button 
              onClick={() => setShowEmailModal(true)}
              className="btn-secondary text-sm"
            >
              Ändern
            </button>
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
            <div className="flex items-center gap-3">
              <RoleIcon className="h-5 w-5 text-gray-500" />
              <div>
                <p className="text-sm text-gray-500">{t('settings.accountType')}</p>
                <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${roleInfo.color}`}>
                  {roleInfo.text}
                </span>
              </div>
            </div>
          </div>

          {accountInfo?.profile && (
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
              <div className="flex items-center gap-3">
                <User className="h-5 w-5 text-gray-500" />
                <div>
                  <p className="text-sm text-gray-500">Profil</p>
                  <p className="font-medium text-gray-900">
                    {accountInfo.profile.first_name && accountInfo.profile.last_name 
                      ? `${accountInfo.profile.first_name} ${accountInfo.profile.last_name}`
                      : accountInfo.profile.company_name || 'Nicht ausgefüllt'}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm text-gray-500">Registriert am</p>
                <p className="font-medium text-gray-900">
                  {new Date(accountInfo?.created_at).toLocaleDateString('de-DE', {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric'
                  })}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sicherheit */}
      <div className="card mb-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Sicherheit</h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
            <div className="flex items-center gap-3">
              <Lock className="h-5 w-5 text-gray-500" />
              <div>
                <p className="font-medium text-gray-900">Passwort</p>
                <p className="text-sm text-gray-500">Ändern Sie Ihr Passwort regelmäßig</p>
              </div>
            </div>
            <button 
              onClick={() => setShowPasswordModal(true)}
              className="btn-primary text-sm"
            >
              Passwort ändern
            </button>
          </div>
        </div>
      </div>

      {/* Gefahrenzone */}
      <div className="card border-2 border-red-200">
        <h2 className="text-xl font-bold text-red-600 mb-4 flex items-center gap-2">
          <AlertTriangle className="h-6 w-6" />
          Gefahrenzone
        </h2>
        <div className="p-4 bg-red-50 rounded-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">Account löschen</p>
              <p className="text-sm text-gray-600">
                Dies löscht Ihren Account und alle zugehörigen Daten unwiderruflich.
              </p>
            </div>
            <button 
              onClick={() => setShowDeleteModal(true)}
              className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
            >
              Account löschen
            </button>
          </div>
        </div>
      </div>

      {/* ========== MODAL: Passwort ändern ========== */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="p-6 border-b">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Lock className="h-6 w-6 text-primary-600" />
                Passwort ändern
              </h2>
            </div>
            
            <form onSubmit={passwordForm.handleSubmit(handleChangePassword)} className="p-6 space-y-4">
              <div>
                <label className="label">Aktuelles Passwort</label>
                <div className="relative">
                  <input
                    type={showPasswords.current ? 'text' : 'password'}
                    className="input-styled pr-10"
                    {...passwordForm.register('currentPassword', { required: true })}
                  />
                  <button
                    type="button"
                    onClick={() => togglePasswordVisibility('current')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                  >
                    {showPasswords.current ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>
              
              <div>
                <label className="label">Neues Passwort</label>
                <div className="relative">
                  <input
                    type={showPasswords.new ? 'text' : 'password'}
                    className="input-styled pr-10"
                    placeholder="Mindestens 6 Zeichen"
                    {...passwordForm.register('newPassword', { required: true, minLength: 6 })}
                  />
                  <button
                    type="button"
                    onClick={() => togglePasswordVisibility('new')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                  >
                    {showPasswords.new ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>
              
              <div>
                <label className="label">Passwort bestätigen</label>
                <div className="relative">
                  <input
                    type={showPasswords.confirm ? 'text' : 'password'}
                    className="input-styled pr-10"
                    {...passwordForm.register('confirmPassword', { required: true })}
                  />
                  <button
                    type="button"
                    onClick={() => togglePasswordVisibility('confirm')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                  >
                    {showPasswords.confirm ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>
              
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => { setShowPasswordModal(false); passwordForm.reset(); }}
                  className="btn-secondary flex-1"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  disabled={changingPassword}
                  className="btn-primary flex-1 flex items-center justify-center gap-2"
                >
                  {changingPassword && <Loader2 className="h-5 w-5 animate-spin" />}
                  Speichern
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========== MODAL: E-Mail ändern ========== */}
      {showEmailModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="p-6 border-b">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Mail className="h-6 w-6 text-primary-600" />
                E-Mail ändern
              </h2>
            </div>
            
            <form onSubmit={emailForm.handleSubmit(handleChangeEmail)} className="p-6 space-y-4">
              <div className="bg-gray-50 p-3 rounded-lg text-sm text-gray-600">
                Aktuelle E-Mail: <strong>{accountInfo?.email}</strong>
              </div>
              
              <div>
                <label className="label">Neue E-Mail-Adresse</label>
                <input
                  type="email"
                  className="input-styled"
                  placeholder="neue@email.de"
                  {...emailForm.register('newEmail', { required: true })}
                />
              </div>
              
              <div>
                <label className="label">Passwort zur Bestätigung</label>
                <div className="relative">
                  <input
                    type={showPasswords.emailPassword ? 'text' : 'password'}
                    className="input-styled pr-10"
                    {...emailForm.register('password', { required: true })}
                  />
                  <button
                    type="button"
                    onClick={() => togglePasswordVisibility('emailPassword')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                  >
                    {showPasswords.emailPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>
              
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => { setShowEmailModal(false); emailForm.reset(); }}
                  className="btn-secondary flex-1"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  disabled={changingEmail}
                  className="btn-primary flex-1 flex items-center justify-center gap-2"
                >
                  {changingEmail && <Loader2 className="h-5 w-5 animate-spin" />}
                  E-Mail ändern
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========== MODAL: Account löschen ========== */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="p-6 border-b bg-red-50">
              <h2 className="text-xl font-bold text-red-600 flex items-center gap-2">
                <AlertTriangle className="h-6 w-6" />
                Account löschen
              </h2>
            </div>
            
            <form onSubmit={deleteForm.handleSubmit(handleDeleteAccount)} className="p-6 space-y-4">
              <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
                <p className="text-red-800 font-medium mb-2">⚠️ Warnung</p>
                <p className="text-sm text-red-700">
                  Diese Aktion kann nicht rückgängig gemacht werden. Alle Ihre Daten werden dauerhaft gelöscht, einschließlich:
                </p>
                <ul className="text-sm text-red-700 mt-2 list-disc list-inside">
                  <li>Ihr Profil und persönliche Daten</li>
                  <li>Alle hochgeladenen Dokumente</li>
                  <li>Alle Bewerbungen</li>
                  {accountInfo?.role === 'company' && <li>Alle erstellten Stellenangebote</li>}
                </ul>
              </div>
              
              <div>
                <label className="label">Passwort zur Bestätigung</label>
                <div className="relative">
                  <input
                    type={showPasswords.deletePassword ? 'text' : 'password'}
                    className="input-styled pr-10"
                    {...deleteForm.register('password', { required: true })}
                  />
                  <button
                    type="button"
                    onClick={() => togglePasswordVisibility('deletePassword')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                  >
                    {showPasswords.deletePassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>
              
              <div>
                <label className="label">
                  Geben Sie <strong>DELETE</strong> ein zur Bestätigung
                </label>
                <input
                  type="text"
                  className="input-styled"
                  placeholder="DELETE"
                  {...deleteForm.register('confirmation', { required: true })}
                />
              </div>
              
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => { setShowDeleteModal(false); deleteForm.reset(); }}
                  className="btn-secondary flex-1"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  disabled={deletingAccount}
                  className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors flex-1 flex items-center justify-center gap-2"
                >
                  {deletingAccount && <Loader2 className="h-5 w-5 animate-spin" />}
                  Account löschen
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Settings;
