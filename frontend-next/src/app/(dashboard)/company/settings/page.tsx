"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { Settings, Bell, Mail, Lock, Users, Calendar, Loader2, Save, Clock, FileText, ChevronRight, User, Shield, CheckCircle, AlertTriangle, Eye, EyeOff, Trash2, Building2, Filter } from "lucide-react";
import { accountAPI, authAPI } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import toast from "react-hot-toast";
import { useForm } from "react-hook-form";

interface AccountInfo {
  email: string;
  role: string;
  created_at: string;
  profile?: { company_name?: string; first_name?: string; last_name?: string };
  has_password?: boolean;
}

interface NotificationSettings {
  email_notifications: boolean;
  email_job_alerts: boolean;
  email_newsletter: boolean;
}

export default function CompanySettingsPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const { logout } = useAuth();
  const [accountInfo, setAccountInfo] = useState<AccountInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<NotificationSettings>({ email_notifications: true, email_job_alerts: true, email_newsletter: true });
  const [savingNotif, setSavingNotif] = useState(false);

  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [changingEmail, setChangingEmail] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [showPasswords, setShowPasswords] = useState({ current: false, new: false, confirm: false, email: false, delete: false });

  const passwordForm = useForm<{ currentPassword: string; newPassword: string; confirmPassword: string }>();
  const emailForm = useForm<{ newEmail: string; password: string }>();
  const deleteForm = useForm<{ password: string; confirmation: string }>();

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [accountRes, notifRes] = await Promise.all([
        accountAPI.getAccountInfo(),
        authAPI.getEmailPreferences().catch(() => ({ data: { email_notifications: true, email_job_alerts: true, email_newsletter: true } })),
      ]);
      setAccountInfo(accountRes.data);
      setNotifications(notifRes.data);
    } catch { toast.error("Fehler beim Laden"); }
    finally { setLoading(false); }
  };

  const handleNotifChange = async (key: keyof NotificationSettings, value: boolean) => {
    const newNotif = { ...notifications, [key]: value };
    setNotifications(newNotif);
    setSavingNotif(true);
    try { await authAPI.updateEmailPreferences(newNotif); toast.success("Gespeichert"); }
    catch { setNotifications(notifications); toast.error("Fehler"); }
    finally { setSavingNotif(false); }
  };

  const handleChangePassword = async (data: { currentPassword: string; newPassword: string; confirmPassword: string }) => {
    if (data.newPassword !== data.confirmPassword) { toast.error("Passwörter stimmen nicht überein"); return; }
    setChangingPassword(true);
    try { await accountAPI.changePassword(data.currentPassword, data.newPassword); toast.success("Passwort geändert!"); setShowPasswordModal(false); passwordForm.reset(); }
    catch (e: unknown) { const err = e as { response?: { data?: { detail?: string } } }; toast.error(err.response?.data?.detail || "Fehler"); }
    finally { setChangingPassword(false); }
  };

  const handleChangeEmail = async (data: { newEmail: string; password: string }) => {
    setChangingEmail(true);
    try { await accountAPI.changeEmail(data.newEmail, data.password); toast.success("E-Mail geändert!"); setShowEmailModal(false); emailForm.reset(); loadData(); }
    catch (e: unknown) { const err = e as { response?: { data?: { detail?: string } } }; toast.error(err.response?.data?.detail || "Fehler"); }
    finally { setChangingEmail(false); }
  };

  const handleDeleteAccount = async (data: { password: string; confirmation: string }) => {
    if (data.confirmation !== "DELETE") { toast.error("Bitte 'DELETE' eingeben"); return; }
    setDeletingAccount(true);
    try { await accountAPI.deleteAccount(data.password, data.confirmation); toast.success("Konto gelöscht"); logout(); router.push("/"); }
    catch (e: unknown) { const err = e as { response?: { data?: { detail?: string } } }; toast.error(err.response?.data?.detail || "Fehler"); }
    finally { setDeletingAccount(false); }
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-12 w-12 text-primary-600 animate-spin" /></div>;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 bg-primary-100 rounded-xl">
          <Settings className="h-8 w-8 text-primary-600" />
        </div>
        <div><h1 className="text-3xl font-bold text-gray-900">Kontoeinstellungen</h1><p className="text-gray-600">Verwalten Sie Ihr Konto und Ihre Einstellungen</p></div>
      </div>

      <div className="space-y-6">
        {/* Account-Informationen */}
        <div className="card">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Account-Informationen</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
              <div className="flex items-center gap-3"><Mail className="h-5 w-5 text-gray-500" /><div><p className="text-sm text-gray-500">E-Mail-Adresse</p><p className="font-medium text-gray-900">{accountInfo?.email}</p></div></div>
              <button onClick={() => setShowEmailModal(true)} className="btn-secondary text-sm">Ändern</button>
            </div>
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
              <div className="flex items-center gap-3"><Building2 className="h-5 w-5 text-gray-500" /><div><p className="text-sm text-gray-500">Kontotyp</p><span className="inline-block px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">Unternehmen</span></div></div>
            </div>
            {accountInfo?.profile?.company_name && (
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <div className="flex items-center gap-3"><User className="h-5 w-5 text-gray-500" /><div><p className="text-sm text-gray-500">Profil</p><p className="font-medium text-gray-900">{accountInfo.profile.company_name}</p></div></div>
              </div>
            )}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
              <div className="flex items-center gap-3"><CheckCircle className="h-5 w-5 text-green-500" /><div><p className="text-sm text-gray-500">Registriert am</p><p className="font-medium text-gray-900">{accountInfo?.created_at ? new Date(accountInfo.created_at).toLocaleDateString("de-DE", { day: "2-digit", month: "long", year: "numeric" }) : "-"}</p></div></div>
            </div>
          </div>
        </div>

        {/* Sicherheit */}
        <div className="card">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Sicherheit</h2>
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
            <div className="flex items-center gap-3"><Lock className="h-5 w-5 text-gray-500" /><div><p className="font-medium text-gray-900">Passwort</p><p className="text-sm text-gray-500">Ändern Sie Ihr Passwort regelmäßig</p></div></div>
            <button onClick={() => setShowPasswordModal(true)} className="btn-primary text-sm">Passwort ändern</button>
          </div>
        </div>

        {/* E-Mail-Benachrichtigungen */}
        <div className="card">
          <div className="flex items-center gap-2 mb-4"><Bell className="h-6 w-6 text-primary-600" /><h2 className="text-xl font-bold text-gray-900">E-Mail-Benachrichtigungen</h2>{savingNotif && <Loader2 className="h-4 w-4 animate-spin text-gray-400" />}</div>
          <div className="space-y-3">
            {[{ key: "email_newsletter" as const, title: "Newsletter", desc: "Neuigkeiten und Tipps" }, { key: "email_job_alerts" as const, title: "Stellen-Updates", desc: "Updates zu Ihren Stellenanzeigen" }, { key: "email_notifications" as const, title: "Bewerbungen", desc: "Benachrichtigung bei neuen Bewerbungen" }].map((item) => (
              <label key={item.key} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors">
                <div className="flex items-center gap-3"><Mail className="h-5 w-5 text-gray-500" /><div><p className="font-medium text-gray-900">{item.title}</p><p className="text-sm text-gray-500">{item.desc}</p></div></div>
                <div className="relative"><input type="checkbox" checked={notifications[item.key]} onChange={(e) => handleNotifChange(item.key, e.target.checked)} className="sr-only peer" /><div className="w-11 h-6 bg-gray-300 peer-focus:ring-4 peer-focus:ring-primary-100 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div></div>
              </label>
            ))}
          </div>
        </div>

        {/* Firmen E-Mail-Einstellungen */}
        <div className="card">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2"><Mail className="h-6 w-6 text-primary-600" />Firmen E-Mail-Einstellungen</h2>
          <p className="text-gray-600 mb-4">Verwalten Sie Ihre automatischen E-Mail-Benachrichtigungen und Vorlagen.</p>
          <div className="space-y-3">
            <Link href="/company/digest-settings" className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors group">
              <div className="flex items-center gap-3"><Clock className="h-5 w-5 text-primary-600" /><div><p className="font-medium text-gray-900">Bewerber-Digest</p><p className="text-sm text-gray-500">Tägliche Zusammenfassung neuer Bewerbungen per E-Mail</p></div></div>
              <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-primary-600" />
            </Link>
            <Link href="/company/rejection-settings" className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors group">
              <div className="flex items-center gap-3"><FileText className="h-5 w-5 text-primary-600" /><div><p className="font-medium text-gray-900">Absage-E-Mail Vorlage</p><p className="text-sm text-gray-500">Passen Sie Ihre automatische Absage-E-Mail an</p></div></div>
              <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-primary-600" />
            </Link>
            <Link href="/company/auto-reject-settings" className="flex items-center justify-between p-4 bg-primary-50 rounded-xl hover:bg-primary-100 transition-colors group border border-primary-200">
              <div className="flex items-center gap-3"><Filter className="h-5 w-5 text-primary-600" /><div><p className="font-medium text-gray-900">{t('scoreFilter.title')}</p><p className="text-sm text-gray-500">{t('scoreFilter.subtitle')}</p></div></div>
              <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-primary-600" />
            </Link>
          </div>
        </div>

        {/* Gefahrenzone */}
        <div className="card border-2 border-red-200">
          <h2 className="text-xl font-bold text-red-600 mb-4 flex items-center gap-2"><AlertTriangle className="h-6 w-6" />Gefahrenzone</h2>
          <div className="p-4 bg-red-50 rounded-xl flex items-center justify-between">
            <div><p className="font-medium text-gray-900">Konto löschen</p><p className="text-sm text-gray-600">Diese Aktion kann nicht rückgängig gemacht werden</p></div>
            <button onClick={() => setShowDeleteModal(true)} className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 text-sm font-medium">Konto löschen</button>
          </div>
        </div>
      </div>

      {/* Passwort Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="p-6 border-b"><h2 className="text-xl font-bold text-gray-900 flex items-center gap-2"><Lock className="h-6 w-6 text-primary-600" />Passwort ändern</h2></div>
            <form onSubmit={passwordForm.handleSubmit(handleChangePassword)} className="p-6 space-y-4">
              {["currentPassword", "newPassword", "confirmPassword"].map((field, i) => (
                <div key={field}><label className="label">{["Aktuelles Passwort", "Neues Passwort", "Passwort bestätigen"][i]}</label>
                  <div className="relative"><input type={showPasswords[field as keyof typeof showPasswords] ? "text" : "password"} className="input pr-10" {...passwordForm.register(field as "currentPassword" | "newPassword" | "confirmPassword", { required: true, ...(field === "newPassword" ? { minLength: 6 } : {}) })} />
                    <button type="button" onClick={() => setShowPasswords(p => ({ ...p, [field]: !p[field as keyof typeof showPasswords] }))} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">{showPasswords[field as keyof typeof showPasswords] ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}</button>
                  </div>
                </div>
              ))}
              <div className="flex gap-3 pt-4"><button type="button" onClick={() => { setShowPasswordModal(false); passwordForm.reset(); }} className="btn-secondary flex-1">Abbrechen</button><button type="submit" disabled={changingPassword} className="btn-primary flex-1 flex items-center justify-center gap-2">{changingPassword && <Loader2 className="h-5 w-5 animate-spin" />}Speichern</button></div>
            </form>
          </div>
        </div>
      )}

      {/* E-Mail Modal */}
      {showEmailModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="p-6 border-b"><h2 className="text-xl font-bold text-gray-900 flex items-center gap-2"><Mail className="h-6 w-6 text-primary-600" />E-Mail ändern</h2></div>
            <form onSubmit={emailForm.handleSubmit(handleChangeEmail)} className="p-6 space-y-4">
              <div className="bg-gray-50 p-3 rounded-lg text-sm text-gray-600">Aktuelle E-Mail: <strong>{accountInfo?.email}</strong></div>
              <div><label className="label">Neue E-Mail</label><input type="email" className="input" {...emailForm.register("newEmail", { required: true })} /></div>
              <div><label className="label">Passwort zur Bestätigung</label><div className="relative"><input type={showPasswords.email ? "text" : "password"} className="input pr-10" {...emailForm.register("password", { required: true })} /><button type="button" onClick={() => setShowPasswords(p => ({ ...p, email: !p.email }))} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">{showPasswords.email ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}</button></div></div>
              <div className="flex gap-3 pt-4"><button type="button" onClick={() => { setShowEmailModal(false); emailForm.reset(); }} className="btn-secondary flex-1">Abbrechen</button><button type="submit" disabled={changingEmail} className="btn-primary flex-1 flex items-center justify-center gap-2">{changingEmail && <Loader2 className="h-5 w-5 animate-spin" />}E-Mail ändern</button></div>
            </form>
          </div>
        </div>
      )}

      {/* Löschen Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="p-6 border-b bg-red-50"><h2 className="text-xl font-bold text-red-600 flex items-center gap-2"><AlertTriangle className="h-6 w-6" />Konto löschen</h2></div>
            <form onSubmit={deleteForm.handleSubmit(handleDeleteAccount)} className="p-6 space-y-4">
              <div className="bg-red-50 border border-red-200 p-4 rounded-lg"><p className="text-red-800 font-medium mb-2">⚠️ Warnung</p><p className="text-sm text-red-700">Diese Aktion kann nicht rückgängig gemacht werden. Alle Daten werden gelöscht:</p><ul className="text-sm text-red-700 mt-2 list-disc list-inside"><li>Firmenprofil</li><li>Alle Stellenanzeigen</li><li>Alle Bewerbungen</li></ul></div>
              {accountInfo?.has_password !== false && <div><label className="label">Passwort zur Bestätigung</label><div className="relative"><input type={showPasswords.delete ? "text" : "password"} className="input pr-10" {...deleteForm.register("password", { required: true })} /><button type="button" onClick={() => setShowPasswords(p => ({ ...p, delete: !p.delete }))} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">{showPasswords.delete ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}</button></div></div>}
              <div><label className="label">Geben Sie &quot;DELETE&quot; ein zur Bestätigung</label><input type="text" className="input" placeholder="DELETE" {...deleteForm.register("confirmation", { required: true })} /></div>
              <div className="flex gap-3 pt-4"><button type="button" onClick={() => { setShowDeleteModal(false); deleteForm.reset(); }} className="btn-secondary flex-1">Abbrechen</button><button type="submit" disabled={deletingAccount} className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 flex-1 flex items-center justify-center gap-2">{deletingAccount && <Loader2 className="h-5 w-5 animate-spin" />}Konto löschen</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
