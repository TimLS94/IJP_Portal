"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { notificationsAPI } from "@/lib/api";
import { useTranslation } from "react-i18next";
import {
  Briefcase,
  User,
  Building2,
  LogOut,
  Menu,
  X,
  FileText,
  Shield,
  BookOpen,
  Settings,
  ClipboardList,
  Users,
  ChevronDown,
  LayoutDashboard,
  FolderOpen,
  GraduationCap,
  Info,
  Calendar,
  Link2,
  Rocket,
  Heart,
  Globe,
  Bell,
} from "lucide-react";
import { useState, useRef, useEffect } from "react";

const languages = [
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'ru', name: 'Русский', flag: '🇷🇺' }
];

interface MenuItem {
  to?: string;
  icon?: React.ElementType;
  label?: string;
  divider?: boolean;
  highlight?: boolean;
}

export default function Navbar() {
  const { user, isAuthenticated, isApplicant, isCompany, isAdmin, logout } = useAuth();
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const [notifMenuOpen, setNotifMenuOpen] = useState(false);
  const [currentLangCode, setCurrentLangCode] = useState("de");
  const [isClient, setIsClient] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<any[]>([]);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const langMenuRef = useRef<HTMLDivElement>(null);
  const langMenuMobileRef = useRef<HTMLDivElement>(null);
  const notifMenuRef = useRef<HTMLDivElement>(null);
  
  const currentLang = languages.find(l => l.code === currentLangCode) || languages[0];
  
  // Mark as client-side after mount
  useEffect(() => {
    setIsClient(true);
    const savedLang = localStorage.getItem("i18nextLng") || "de";
    const langCode = savedLang.split("-")[0];
    setCurrentLangCode(langCode);
    if (i18n.language !== langCode) {
      i18n.changeLanguage(langCode);
    }
    
    const handleLanguageChange = (lng: string) => {
      setCurrentLangCode(lng.split("-")[0]);
    };
    
    i18n.on("languageChanged", handleLanguageChange);
    return () => {
      i18n.off("languageChanged", handleLanguageChange);
    };
  }, [i18n]);
  
  
  // Load notification count for applicants
  useEffect(() => {
    if (isAuthenticated && isApplicant) {
      loadNotificationCount();
      // Refresh every 60 seconds
      const interval = setInterval(loadNotificationCount, 60000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated, isApplicant]);

  const loadNotificationCount = async () => {
    try {
      const response = await notificationsAPI.getCount();
      setUnreadCount(response.data.unread_count || 0);
    } catch (error) {
      console.error("Error loading notifications:", error);
    }
  };

  const loadNotifications = async () => {
    try {
      const response = await notificationsAPI.getAll(false, 10);
      setNotifications(response.data || []);
    } catch (error) {
      console.error("Error loading notifications:", error);
    }
  };

  const handleNotifClick = async () => {
    if (!notifMenuOpen) {
      await loadNotifications();
    }
    setNotifMenuOpen(!notifMenuOpen);
  };

  const handleMarkAsRead = async (id: number) => {
    try {
      await notificationsAPI.markAsRead(id);
      setNotifications(notifications.map(n => n.id === id ? { ...n, is_read: true } : n));
      setUnreadCount(Math.max(0, unreadCount - 1));
    } catch (error) {
      console.error("Error marking as read:", error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationsAPI.markAllAsRead();
      setNotifications(notifications.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error("Error marking all as read:", error);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
      if (langMenuRef.current && !langMenuRef.current.contains(event.target as Node) &&
          langMenuMobileRef.current && !langMenuMobileRef.current.contains(event.target as Node)) {
        setLangMenuOpen(false);
      }
      if (notifMenuRef.current && !notifMenuRef.current.contains(event.target as Node)) {
        setNotifMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const changeLanguage = (lang: typeof languages[0]) => {
    i18n.changeLanguage(lang.code);
    localStorage.setItem("i18nextLng", lang.code);
    setCurrentLangCode(lang.code);
    setLangMenuOpen(false);
  };

  const handleLogout = () => {
    logout();
    router.push("/");
    setUserMenuOpen(false);
  };

  const getMenuItems = (): MenuItem[] => {
    if (isApplicant) {
      return [
        { to: "/applicant/profile", icon: User, label: t("nav.profile") },
        { to: "/applicant/applications", icon: FileText, label: t("nav.applications") },
        { to: "/applicant/documents", icon: FolderOpen, label: t("nav.documents") },
        { to: "/applicant/liked-jobs", icon: Heart, label: t("nav.likedJobs") },
        { divider: true },
        { to: "/applicant/ijp-auftrag", icon: ClipboardList, label: t("nav.ijpRequest") },
        { to: "/applicant/settings", icon: Settings, label: t("nav.settings") },
      ];
    }
    if (isCompany) {
      return [
        { to: "/company/dashboard", icon: LayoutDashboard, label: t("nav.dashboard") },
        { to: "/company/profile", icon: Building2, label: t("nav.companyProfile") },
        { to: "/company/jobs", icon: Briefcase, label: t("nav.myJobs") },
        { to: "/company/applications", icon: FileText, label: t("nav.companyApplications") },
        { to: "/company/calendar", icon: Calendar, label: t("nav.calendar") },
        { to: "/company/team", icon: Users, label: t("nav.team") },
        { to: "/company/ijp-auftrag", icon: Briefcase, label: t("nav.ijpRequest") },
        { divider: true },
        { to: "/company/settings", icon: Settings, label: t("nav.settings") },
      ];
    }
    if (isAdmin) {
      return [
        { to: "/admin/dashboard", icon: LayoutDashboard, label: t("nav.adminDashboard") },
        { to: "/admin/job-requests", icon: ClipboardList, label: t("nav.adminJobRequests") },
        { to: "/admin/company-requests", icon: Building2, label: t("nav.companyRequests") },
        { to: "/admin/anabin", icon: GraduationCap, label: t("nav.anabin") },
        { to: "/admin/applications", icon: FileText, label: t("nav.adminApplications") },
        { to: "/admin/users", icon: Users, label: t("nav.adminUsers") },
        { to: "/admin/jobs", icon: Briefcase, label: t("nav.adminJobs") },
        { to: "/admin/blog", icon: BookOpen, label: t("nav.adminBlog") },
        { to: "/admin/invite-tokens", icon: Link2, label: t("nav.inviteTokens") },
        { to: "/admin/applicant-invites", icon: Users, label: t("nav.applicantInvites") },
        { to: "/admin/sales", icon: Rocket, label: t("nav.sales") },
        { divider: true },
        { to: "/admin/settings", icon: Settings, label: t("nav.systemSettings") },
      ];
    }
    return [];
  };

  const menuItems = getMenuItems();

  const getUserLabel = () => {
    if (isAdmin) return t("auth.admin");
    if (isCompany) return t("auth.company");
    return t("auth.applicant");
  };

  const getUserIcon = () => {
    if (isAdmin) return Shield;
    if (isCompany) return Building2;
    return User;
  };

  const UserIcon = getUserIcon();

  // Don't render translated content until client is ready to avoid hydration mismatch
  if (!isClient) {
    return (
      <nav className="bg-white shadow-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="flex items-center">
              <img src="/logo.png" alt="JobOn" className="h-16 w-auto" />
            </Link>
            <div className="hidden md:flex items-center space-x-4">
              <div className="h-8 w-24 bg-gray-100 rounded animate-pulse"></div>
              <div className="h-8 w-24 bg-gray-100 rounded animate-pulse"></div>
              <div className="h-8 w-16 bg-gray-100 rounded animate-pulse"></div>
            </div>
          </div>
        </div>
      </nav>
    );
  }

  return (
    <nav className="bg-white shadow-lg sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center">
            <img 
              src="/logo.png" 
              alt="JobOn - Internationale Jobvermittlung" 
              className="h-16 w-auto"
            />
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-4">
            <Link
              href="/jobs"
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition-all ${
                pathname === "/jobs"
                  ? "text-primary-600 bg-primary-50"
                  : "text-gray-600 hover:text-primary-600 hover:bg-primary-50"
              }`}
            >
              <Briefcase className="h-4 w-4" />
              <span>{t("nav.jobs")}</span>
            </Link>

            <Link
              href="/stellenarten"
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition-all ${
                pathname === "/stellenarten"
                  ? "text-primary-600 bg-primary-50"
                  : "text-gray-600 hover:text-primary-600 hover:bg-primary-50"
              }`}
            >
              <Info className="h-4 w-4" />
              <span>{t("nav.jobTypes")}</span>
            </Link>

            <Link
              href="/blog"
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition-all ${
                pathname.startsWith("/blog")
                  ? "text-primary-600 bg-primary-50"
                  : "text-gray-600 hover:text-primary-600 hover:bg-primary-50"
              }`}
            >
              <BookOpen className="h-4 w-4" />
              <span>{t("nav.blog")}</span>
            </Link>

            {/* Language Switcher */}
            <div className="relative" ref={langMenuRef}>
              <button
                onClick={() => setLangMenuOpen(!langMenuOpen)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors text-sm font-medium"
                title="Sprache ändern"
              >
                <Globe className="h-4 w-4 text-gray-600" />
                <span>{currentLang.flag}</span>
                <span className="hidden sm:inline">{currentLang.name}</span>
                <ChevronDown className={`h-4 w-4 text-gray-500 transition-transform ${langMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {langMenuOpen && (
                <div className="absolute right-0 mt-2 w-40 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                  {languages.map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => changeLanguage(lang)}
                      className={`w-full px-4 py-2 text-left text-sm flex items-center gap-3 hover:bg-gray-100 transition-colors ${
                        currentLang.code === lang.code ? 'bg-primary-50 text-primary-700' : 'text-gray-700'
                      }`}
                    >
                      <span className="text-lg">{lang.flag}</span>
                      <span>{lang.name}</span>
                      {currentLang.code === lang.code && (
                        <span className="ml-auto text-primary-600">✓</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {!isAuthenticated ? (
              <>
                <div className="h-6 w-px bg-gray-200 mx-2"></div>
                <Link
                  href="/login"
                  className="px-4 py-2 text-gray-600 hover:text-primary-600 transition-colors"
                >
                  {t("nav.login")}
                </Link>
                <Link href="/register" className="btn-primary">
                  {t("nav.register")}
                </Link>
              </>
            ) : (
              <>
                <div className="h-6 w-px bg-gray-200 mx-2"></div>

                {/* Notification Bell - nur für Bewerber */}
                {isApplicant && (
                  <div className="relative" ref={notifMenuRef}>
                    <button
                      onClick={handleNotifClick}
                      className="relative p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                      title="Benachrichtigungen"
                    >
                      <Bell className="h-5 w-5" />
                      {unreadCount > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center bg-red-500 text-white text-xs font-bold rounded-full px-1">
                          {unreadCount > 99 ? "99+" : unreadCount}
                        </span>
                      )}
                    </button>

                    {/* Notification Dropdown */}
                    {notifMenuOpen && (
                      <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-50">
                        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                          <h3 className="font-semibold text-gray-900">{t("nav.notifications")}</h3>
                          {unreadCount > 0 && (
                            <button
                              onClick={handleMarkAllAsRead}
                              className="text-xs text-primary-600 hover:underline"
                            >
                              {t("nav.markAllAsRead")}
                            </button>
                          )}
                        </div>
                        <div className="max-h-80 overflow-y-auto">
                          {notifications.length === 0 ? (
                            <div className="px-4 py-8 text-center text-gray-500">
                              <Bell className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                              <p className="text-sm">{t("nav.noNotifications")}</p>
                            </div>
                          ) : (
                            notifications.map((notif) => (
                              <div
                                key={notif.id}
                                onClick={() => {
                                  if (!notif.is_read) handleMarkAsRead(notif.id);
                                  if (notif.reference_type === "job" && notif.reference_id) {
                                    router.push(`/jobs/${notif.reference_id}`);
                                    setNotifMenuOpen(false);
                                  }
                                }}
                                className={`px-4 py-3 border-b border-gray-50 cursor-pointer hover:bg-gray-50 transition-colors ${
                                  !notif.is_read ? "bg-primary-50/50" : ""
                                }`}
                              >
                                <div className="flex items-start gap-3">
                                  <div className={`p-1.5 rounded-full ${!notif.is_read ? "bg-primary-100" : "bg-gray-100"}`}>
                                    <Briefcase className={`h-4 w-4 ${!notif.is_read ? "text-primary-600" : "text-gray-400"}`} />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className={`text-sm ${!notif.is_read ? "font-medium text-gray-900" : "text-gray-700"}`}>
                                      {notif.title}
                                    </p>
                                    {notif.message && (
                                      <p className="text-xs text-gray-500 mt-0.5 truncate">{notif.message}</p>
                                    )}
                                    <p className="text-xs text-gray-400 mt-1">
                                      {new Date(notif.created_at).toLocaleDateString("de-DE", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                                    </p>
                                  </div>
                                  {!notif.is_read && (
                                    <span className="w-2 h-2 bg-primary-500 rounded-full flex-shrink-0 mt-2"></span>
                                  )}
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* User Dropdown */}
                <div className="relative" ref={userMenuRef}>
                  <button
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${
                      userMenuOpen
                        ? "bg-primary-100 text-primary-700"
                        : "text-gray-600 hover:bg-gray-100"
                    }`}
                  >
                    <div
                      className={`p-1.5 rounded-full ${
                        isAdmin
                          ? "bg-purple-100"
                          : isCompany
                          ? "bg-blue-100"
                          : "bg-green-100"
                      }`}
                    >
                      <UserIcon
                        className={`h-4 w-4 ${
                          isAdmin
                            ? "text-purple-600"
                            : isCompany
                            ? "text-blue-600"
                            : "text-green-600"
                        }`}
                      />
                    </div>
                    <span className="font-medium">{getUserLabel()}</span>
                    <ChevronDown
                      className={`h-4 w-4 transition-transform ${
                        userMenuOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  {/* Dropdown Menu */}
                  {userMenuOpen && (
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-100 py-2">
                      {/* User Info Header */}
                      <div className="px-4 py-3 border-b border-gray-100">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {user?.email}
                        </p>
                        <p className="text-xs text-gray-500">{getUserLabel()}</p>
                      </div>

                      {/* Menu Items */}
                      <div className="py-1">
                        {menuItems.map((item, index) =>
                          item.divider ? (
                            <div
                              key={index}
                              className="my-1 border-t border-gray-100"
                            ></div>
                          ) : (
                            <Link
                              key={item.to}
                              href={item.to || "#"}
                              onClick={() => setUserMenuOpen(false)}
                              className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                                item.highlight
                                  ? "text-primary-600 bg-primary-50 hover:bg-primary-100 font-medium"
                                  : "text-gray-700 hover:bg-gray-50"
                              }`}
                            >
                              {item.icon && <item.icon className="h-4 w-4" />}
                              <span>{item.label}</span>
                            </Link>
                          )
                        )}
                      </div>

                      {/* Logout */}
                      <div className="border-t border-gray-100 pt-1">
                        <button
                          onClick={handleLogout}
                          className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                        >
                          <LogOut className="h-4 w-4" />
                          <span>{t("nav.logout")}</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Mobile: Language + Notification + Menu Button */}
          <div className="md:hidden flex items-center gap-1">
            {/* Mobile Language Switcher - Compact */}
            <div className="relative" ref={langMenuMobileRef}>
              <button
                onClick={() => setLangMenuOpen(!langMenuOpen)}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg flex items-center gap-1"
                title="Sprache ändern"
              >
                <span className="text-lg">{currentLang.flag}</span>
              </button>

              {langMenuOpen && (
                <div className="absolute right-0 mt-2 w-36 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                  {languages.map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => changeLanguage(lang)}
                      className={`w-full px-3 py-2 text-left text-sm flex items-center gap-2 hover:bg-gray-100 transition-colors ${
                        currentLang.code === lang.code ? 'bg-primary-50 text-primary-700' : 'text-gray-700'
                      }`}
                    >
                      <span className="text-base">{lang.flag}</span>
                      <span>{lang.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Mobile Notification Bell */}
            {isApplicant && (
              <button
                onClick={handleNotifClick}
                className="relative p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-[16px] flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full px-0.5">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>
            )}
            
            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              {mobileMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-gray-100 max-h-[calc(100vh-4rem)] overflow-y-auto">
            <div className="space-y-1 mb-4">
              <Link
                href="/jobs"
                className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-50 rounded-lg"
                onClick={() => setMobileMenuOpen(false)}
              >
                <Briefcase className="h-5 w-5 text-gray-400" />
                <span>{t("nav.jobs")}</span>
              </Link>
              <Link
                href="/stellenarten"
                className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-50 rounded-lg"
                onClick={() => setMobileMenuOpen(false)}
              >
                <Info className="h-5 w-5 text-gray-400" />
                <span>{t("nav.jobTypes")}</span>
              </Link>
              <Link
                href="/blog"
                className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-50 rounded-lg"
                onClick={() => setMobileMenuOpen(false)}
              >
                <BookOpen className="h-5 w-5 text-gray-400" />
                <span>{t("nav.blog")}</span>
              </Link>
            </div>

            {!isAuthenticated ? (
              <div className="space-y-2 pt-4 border-t border-gray-100">
                <Link
                  href="/login"
                  className="block px-4 py-3 text-gray-700 hover:bg-gray-50 rounded-lg"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {t("nav.login")}
                </Link>
                <Link
                  href="/register"
                  className="block px-4 py-3 text-center bg-primary-600 text-white rounded-lg font-medium"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {t("nav.register")}
                </Link>
              </div>
            ) : (
              <>
                <div className="px-4 py-3 mb-2 bg-gray-50 rounded-lg mx-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={`p-2 rounded-full ${
                          isAdmin
                            ? "bg-purple-100"
                            : isCompany
                            ? "bg-blue-100"
                            : "bg-green-100"
                        }`}
                      >
                        <UserIcon
                          className={`h-5 w-5 ${
                            isAdmin
                              ? "text-purple-600"
                              : isCompany
                              ? "text-blue-600"
                              : "text-green-600"
                          }`}
                        />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {getUserLabel()}
                        </p>
                        <p className="text-xs text-gray-500 truncate max-w-[150px]">
                          {user?.email}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        handleLogout();
                        setMobileMenuOpen(false);
                      }}
                      className="flex items-center gap-2 px-3 py-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                    >
                      <LogOut className="h-5 w-5" />
                      <span className="text-sm font-medium">{t("nav.logout")}</span>
                    </button>
                  </div>
                </div>

                <div className="space-y-1 border-t border-gray-100 pt-2">
                  {menuItems.map((item, index) =>
                    item.divider ? (
                      <div
                        key={index}
                        className="my-2 border-t border-gray-100"
                      ></div>
                    ) : (
                      <Link
                        key={item.to}
                        href={item.to || "#"}
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        {item.icon && (
                          <item.icon className="h-5 w-5 text-gray-400" />
                        )}
                        <span>{item.label}</span>
                      </Link>
                    )
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
