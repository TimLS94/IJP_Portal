"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { accountAPI, authAPI } from "@/lib/api";
import toast from "react-hot-toast";
import { 
  Settings as SettingsIcon, Lock, Mail, Trash2, Eye, EyeOff, 
  Loader2, AlertTriangle, CheckCircle, User, Shield, Bell, X
} from "lucide-react";
import { useTranslation } from "react-i18next";

export default function ApplicantSettingsPage() {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const router = useRouter();
  const [accountInfo, setAccountInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // E-Mail-Präferenzen
  const [emailPreferences, setEmailPreferences] = useState({
    email_newsletter: true,
    email_job_alerts: true,
    email_notifications: true
  });
  const [savingEmailPrefs, setSavingEmailPrefs] = useState(false);
  
  // Modal States
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  
  // Loading states
  const [changingPassword, setChangingPassword] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  
  // Password visibility
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
    deletePassword: false
  });

  // Password form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // Delete form
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteConfirmation, setDeleteConfirmation] = useState('');

  useEffect(() => {
    loadAccountInfo();
    loadEmailPreferences();
  }, []);

  const loadAccountInfo = async () => {
    try {
      const response = await accountAPI.getAccountInfo();
      setAccountInfo(response.data);
    } catch (error) {
      console.error('Fehler beim Laden der Kontodaten');
    } finally {
      setLoading(false);
    }
  };

  const loadEmailPreferences = async () => {
    try {
      const response = await authAPI.getEmailPreferences();
      setEmailPreferences(response.data);
    } catch (error) {
      console.error('Fehler beim Laden der E-Mail-Einstellungen:', error);
    }
  };

  const handleEmailPreferenceChange = async (key: string, value: boolean) => {
    const newPrefs = { ...emailPreferences, [key]: value };
    setEmailPreferences(newPrefs);
    setSavingEmailPrefs(true);
    
    try {
      await authAPI.updateEmailPreferences(newPrefs);
      toast.success(t('settings.saved'));
    } catch (error) {
      setEmailPreferences(emailPreferences);
      toast.error(t('settings.saveError'));
    } finally {
      setSavingEmailPrefs(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error(t('settings.passwordMismatch'));
      return;
    }
    
    setChangingPassword(true);
    try {
      await accountAPI.changePassword(currentPassword, newPassword);
      toast.success(t('settings.passwordChanged'));
      setShowPasswordModal(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      toast.error(error.response?.data?.detail || t('settings.passwordChangeError'));
    } finally {
      setChangingPassword(false);
    }
  };

  const handleDeleteAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (deleteConfirmation !== 'DELETE') {
      toast.error(t('settings.deleteConfirmError'));
      return;
    }
    
    setDeletingAccount(true);
    try {
      await accountAPI.deleteAccount(deletePassword, deleteConfirmation);
      toast.success(t('settings.accountDeleting'));
      logout();
      router.push('/');
    } catch (error: any) {
      toast.error(error.response?.data?.detail || t('settings.deleteError'));
    } finally {
      setDeletingAccount(false);
    }
  };

  const togglePasswordVisibility = (field: string) => {
    setShowPasswords(prev => ({ ...prev, [field]: !prev[field as keyof typeof prev] }));
  };

  const getRoleLabel = (role: string) => {
    const labels: Record<string, { text: string; color: string }> = {
      applicant: { text: t('settings.roleApplicant'), color: 'bg-blue-100 text-blue-800' },
      company: { text: t('settings.roleCompany'), color: 'bg-green-100 text-green-800' },
      admin: { text: t('settings.roleAdmin'), color: 'bg-purple-100 text-purple-800' }
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
                <p className="text-sm text-gray-500">{t('settings.email')}</p>
                <p className="font-medium text-gray-900">{accountInfo?.email || user?.email}</p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
            <div className="flex items-center gap-3">
              <User className="h-5 w-5 text-gray-500" />
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
                  <p className="text-sm text-gray-500">{t('settings.profile')}</p>
                  <p className="font-medium text-gray-900">
                    {accountInfo.profile.first_name && accountInfo.profile.last_name 
                      ? `${accountInfo.profile.first_name} ${accountInfo.profile.last_name}`
                      : t('settings.notFilled')}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm text-gray-500">{t('settings.registeredAt')}</p>
                <p className="font-medium text-gray-900">
                  {accountInfo?.created_at ? new Date(accountInfo.created_at).toLocaleDateString('de-DE', {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric'
                  }) : '-'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sicherheit */}
      <div className="card mb-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">{t('settings.security')}</h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
            <div className="flex items-center gap-3">
              <Lock className="h-5 w-5 text-gray-500" />
              <div>
                <p className="font-medium text-gray-900">{t('settings.password')}</p>
                <p className="text-sm text-gray-500">{t('settings.passwordHint')}</p>
              </div>
            </div>
            <button 
              onClick={() => setShowPasswordModal(true)}
              className="btn-primary text-sm"
            >
              {t('settings.changePassword')}
            </button>
          </div>
        </div>
      </div>

      {/* E-Mail-Benachrichtigungen */}
      <div className="card mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Bell className="h-6 w-6 text-primary-600" />
          <h2 className="text-xl font-bold text-gray-900">{t('settings.emailNotifications.title')}</h2>
          {savingEmailPrefs && <Loader2 className="h-4 w-4 animate-spin text-gray-400" />}
        </div>
        <p className="text-gray-600 text-sm mb-4">
          {t('settings.emailNotifications.description')}
        </p>
        <div className="space-y-3">
          {/* Newsletter */}
          <label className="flex items-center justify-between p-4 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors">
            <div className="flex items-center gap-3">
              <Mail className="h-5 w-5 text-gray-500" />
              <div>
                <p className="font-medium text-gray-900">{t('settings.newsletter')}</p>
                <p className="text-sm text-gray-500">{t('settings.newsletterDesc')}</p>
              </div>
            </div>
            <div className="relative">
              <input
                type="checkbox"
                checked={emailPreferences.email_newsletter}
                onChange={(e) => handleEmailPreferenceChange('email_newsletter', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-100 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
            </div>
          </label>

          {/* Stellenbenachrichtigungen */}
          <label className="flex items-center justify-between p-4 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors">
            <div className="flex items-center gap-3">
              <Bell className="h-5 w-5 text-gray-500" />
              <div>
                <p className="font-medium text-gray-900">{t('settings.jobAlerts')}</p>
                <p className="text-sm text-gray-500">{t('settings.jobAlertsDesc')}</p>
              </div>
            </div>
            <div className="relative">
              <input
                type="checkbox"
                checked={emailPreferences.email_job_alerts}
                onChange={(e) => handleEmailPreferenceChange('email_job_alerts', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-100 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
            </div>
          </label>

          {/* Allgemeine Benachrichtigungen */}
          <label className="flex items-center justify-between p-4 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-gray-500" />
              <div>
                <p className="font-medium text-gray-900">{t('settings.applicationUpdates')}</p>
                <p className="text-sm text-gray-500">{t('settings.applicationUpdatesDesc')}</p>
              </div>
            </div>
            <div className="relative">
              <input
                type="checkbox"
                checked={emailPreferences.email_notifications}
                onChange={(e) => handleEmailPreferenceChange('email_notifications', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-100 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
            </div>
          </label>
        </div>
      </div>

      {/* Gefahrenzone */}
      <div className="card border-2 border-red-200">
        <h2 className="text-xl font-bold text-red-600 mb-4 flex items-center gap-2">
          <AlertTriangle className="h-6 w-6" />
          {t('settings.dangerZone')}
        </h2>
        <div className="p-4 bg-red-50 rounded-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">{t('settings.deleteAccount')}</p>
              <p className="text-sm text-gray-600">
                {t('settings.deleteAccountDesc')}
              </p>
            </div>
            <button 
              onClick={() => setShowDeleteModal(true)}
              className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
            >
              {t('settings.deleteAccount')}
            </button>
          </div>
        </div>
      </div>

      {/* Modal: Passwort ändern */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="p-6 border-b">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Lock className="h-6 w-6 text-primary-600" />
                {t('settings.changePassword')}
              </h2>
            </div>
            
            <form onSubmit={handleChangePassword} className="p-6 space-y-4">
              <div>
                <label className="label">{t('settings.currentPassword')}</label>
                <div className="relative">
                  <input
                    type={showPasswords.current ? 'text' : 'password'}
                    className="input-styled pr-10"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
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
                <label className="label">{t('settings.newPassword')}</label>
                <div className="relative">
                  <input
                    type={showPasswords.new ? 'text' : 'password'}
                    className="input-styled pr-10"
                    placeholder={t('settings.minChars')}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={6}
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
                <label className="label">{t('settings.confirmPassword')}</label>
                <div className="relative">
                  <input
                    type={showPasswords.confirm ? 'text' : 'password'}
                    className="input-styled pr-10"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
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
                  onClick={() => { setShowPasswordModal(false); setCurrentPassword(''); setNewPassword(''); setConfirmPassword(''); }}
                  className="btn-secondary flex-1"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={changingPassword}
                  className="btn-primary flex-1 flex items-center justify-center gap-2"
                >
                  {changingPassword && <Loader2 className="h-5 w-5 animate-spin" />}
                  {t('common.save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Account löschen */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="p-6 border-b bg-red-50">
              <h2 className="text-xl font-bold text-red-600 flex items-center gap-2">
                <AlertTriangle className="h-6 w-6" />
                {t('settings.deleteAccount')}
              </h2>
            </div>
            
            <form onSubmit={handleDeleteAccount} className="p-6 space-y-4">
              <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
                <p className="text-red-800 font-medium mb-2">⚠️ {t('settings.warning')}</p>
                <p className="text-sm text-red-700">
                  {t('settings.deleteWarning')}
                </p>
                <ul className="text-sm text-red-700 mt-2 list-disc list-inside">
                  <li>{t('settings.deleteItem1')}</li>
                  <li>{t('settings.deleteItem2')}</li>
                  <li>{t('settings.deleteItem3')}</li>
                </ul>
              </div>
              
              {/* Passwortfeld nur für Konten MIT Passwort (Google-Nutzer haben keins) */}
              {accountInfo?.has_password && (
                <div>
                  <label className="label">{t('settings.passwordConfirm')}</label>
                  <div className="relative">
                    <input
                      type={showPasswords.deletePassword ? 'text' : 'password'}
                      className="input-styled pr-10"
                      value={deletePassword}
                      onChange={(e) => setDeletePassword(e.target.value)}
                      required
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
              )}

              <div>
                <label className="label">
                  {t('settings.typeDelete')}
                </label>
                <input
                  type="text"
                  className="input-styled"
                  placeholder="DELETE"
                  value={deleteConfirmation}
                  onChange={(e) => setDeleteConfirmation(e.target.value)}
                  required
                />
              </div>
              
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => { setShowDeleteModal(false); setDeletePassword(''); setDeleteConfirmation(''); }}
                  className="btn-secondary flex-1"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={deletingAccount}
                  className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors flex-1 flex items-center justify-center gap-2"
                >
                  {deletingAccount && <Loader2 className="h-5 w-5 animate-spin" />}
                  {t('settings.deleteAccount')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
