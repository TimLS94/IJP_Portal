import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { 
  Briefcase, User, Building2, LogOut, Menu, X, FileText, Shield, 
  BookOpen, Settings, ClipboardList, Users, ChevronDown, Home,
  LayoutDashboard, FolderOpen
} from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import LanguageSwitcher from './LanguageSwitcher';

function Navbar() {
  const { t } = useTranslation();
  const { user, isAuthenticated, isApplicant, isCompany, isAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef(null);

  // Schließe Dropdown wenn außerhalb geklickt wird
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/');
    setUserMenuOpen(false);
  };

  // Menü-Items je nach Rolle
  const getMenuItems = () => {
    if (isApplicant) {
      return [
        { to: '/applicant/profile', icon: User, label: t('nav.profile') },
        { to: '/applicant/documents', icon: FolderOpen, label: t('nav.documents') },
        { to: '/applicant/applications', icon: FileText, label: t('nav.applications') },
        { to: '/applicant/ijp-auftrag', icon: ClipboardList, label: t('nav.ijpRequest'), highlight: true },
        { divider: true },
        { to: '/applicant/settings', icon: Settings, label: t('nav.settings') },
      ];
    }
    if (isCompany) {
      return [
        { to: '/company/dashboard', icon: LayoutDashboard, label: t('nav.dashboard') },
        { to: '/company/profile', icon: Building2, label: t('nav.companyProfile') },
        { to: '/company/jobs', icon: Briefcase, label: t('nav.jobs') },
        { to: '/company/applications', icon: FileText, label: t('nav.companyApplications') },
        { divider: true },
        { to: '/company/settings', icon: Settings, label: t('nav.settings') },
      ];
    }
    if (isAdmin) {
      return [
        { to: '/admin/dashboard', icon: LayoutDashboard, label: t('nav.adminDashboard') },
        { to: '/admin/job-requests', icon: ClipboardList, label: t('nav.adminJobRequests') },
        { to: '/admin/applications', icon: FileText, label: t('nav.adminApplications') },
        { to: '/admin/users', icon: Users, label: t('nav.adminUsers') },
        { to: '/admin/jobs', icon: Briefcase, label: t('nav.adminJobs') },
        { to: '/admin/blog', icon: BookOpen, label: t('nav.adminBlog') },
        { divider: true },
        { to: '/admin/settings', icon: Settings, label: t('nav.settings') },
      ];
    }
    return [];
  };

  const menuItems = getMenuItems();

  // Benutzer-Label
  const getUserLabel = () => {
    if (isAdmin) return t('admin.admins');
    if (isCompany) return t('auth.company');
    return t('auth.applicant');
  };

  const getUserIcon = () => {
    if (isAdmin) return Shield;
    if (isCompany) return Building2;
    return User;
  };

  const UserIcon = getUserIcon();

  return (
    <nav className="bg-white shadow-lg sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center">
            <img 
              src="/logo.png" 
              alt="IJP - International Job Placement" 
              className="h-10 w-auto"
            />
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-4">
            {/* Hauptlinks - immer sichtbar */}
            <Link 
              to="/jobs" 
              className="flex items-center gap-1.5 px-3 py-2 text-gray-600 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-all"
            >
              <Briefcase className="h-4 w-4" />
              <span>{t('nav.jobs')}</span>
            </Link>
            
            <Link 
              to="/blog" 
              className="flex items-center gap-1.5 px-3 py-2 text-gray-600 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-all"
            >
              <BookOpen className="h-4 w-4" />
              <span>Blog</span>
            </Link>

            {!isAuthenticated ? (
              <>
                <div className="h-6 w-px bg-gray-200 mx-2"></div>
                <Link 
                  to="/login" 
                  className="px-4 py-2 text-gray-600 hover:text-primary-600 transition-colors"
                >
                  {t('nav.login')}
                </Link>
                <Link to="/register" className="btn-primary">
                  {t('nav.register')}
                </Link>
                <LanguageSwitcher />
              </>
            ) : (
              <>
                <div className="h-6 w-px bg-gray-200 mx-2"></div>
                
                {/* User Dropdown */}
                <div className="relative" ref={userMenuRef}>
                  <button
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${
                      userMenuOpen 
                        ? 'bg-primary-100 text-primary-700' 
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <div className={`p-1.5 rounded-full ${
                      isAdmin ? 'bg-purple-100' : isCompany ? 'bg-blue-100' : 'bg-green-100'
                    }`}>
                      <UserIcon className={`h-4 w-4 ${
                        isAdmin ? 'text-purple-600' : isCompany ? 'text-blue-600' : 'text-green-600'
                      }`} />
                    </div>
                    <span className="font-medium">{getUserLabel()}</span>
                    <ChevronDown className={`h-4 w-4 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {/* Dropdown Menu */}
                  {userMenuOpen && (
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-100 py-2 animate-in fade-in slide-in-from-top-2 duration-200">
                      {/* User Info Header */}
                      <div className="px-4 py-3 border-b border-gray-100">
                        <p className="text-sm font-medium text-gray-900 truncate">{user?.email}</p>
                        <p className="text-xs text-gray-500">{getUserLabel()}</p>
                      </div>

                      {/* Menu Items */}
                      <div className="py-1">
                        {menuItems.map((item, index) => 
                          item.divider ? (
                            <div key={index} className="my-1 border-t border-gray-100"></div>
                          ) : (
                            <Link
                              key={item.to}
                              to={item.to}
                              onClick={() => setUserMenuOpen(false)}
                              className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                                item.highlight 
                                  ? 'text-primary-600 bg-primary-50 hover:bg-primary-100 font-medium' 
                                  : 'text-gray-700 hover:bg-gray-50'
                              }`}
                            >
                              <item.icon className="h-4 w-4" />
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
                          <span>{t('nav.logout')}</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <LanguageSwitcher />
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-gray-100">
            {/* Hauptlinks */}
            <div className="space-y-1 mb-4">
              <Link
                to="/jobs"
                className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-50 rounded-lg"
                onClick={() => setMobileMenuOpen(false)}
              >
                <Briefcase className="h-5 w-5 text-gray-400" />
                <span>{t('nav.jobs')}</span>
              </Link>
              <Link
                to="/blog"
                className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-50 rounded-lg"
                onClick={() => setMobileMenuOpen(false)}
              >
                <BookOpen className="h-5 w-5 text-gray-400" />
                <span>Blog</span>
              </Link>
            </div>

            {!isAuthenticated ? (
              <div className="space-y-2 pt-4 border-t border-gray-100">
                <Link
                  to="/login"
                  className="block px-4 py-3 text-gray-700 hover:bg-gray-50 rounded-lg"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {t('nav.login')}
                </Link>
                <Link
                  to="/register"
                  className="block px-4 py-3 text-center bg-primary-600 text-white rounded-lg font-medium"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {t('nav.register')}
                </Link>
              </div>
            ) : (
              <>
                {/* User Header */}
                <div className="px-4 py-3 mb-2 bg-gray-50 rounded-lg mx-2">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full ${
                      isAdmin ? 'bg-purple-100' : isCompany ? 'bg-blue-100' : 'bg-green-100'
                    }`}>
                      <UserIcon className={`h-5 w-5 ${
                        isAdmin ? 'text-purple-600' : isCompany ? 'text-blue-600' : 'text-green-600'
                      }`} />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{getUserLabel()}</p>
                      <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                    </div>
                  </div>
                </div>

                {/* Menu Items */}
                <div className="space-y-1 border-t border-gray-100 pt-2">
                  {menuItems.map((item, index) => 
                    item.divider ? (
                      <div key={index} className="my-2 border-t border-gray-100"></div>
                    ) : (
                      <Link
                        key={item.to}
                        to={item.to}
                        onClick={() => setMobileMenuOpen(false)}
                        className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                          item.highlight 
                            ? 'text-primary-600 bg-primary-50 font-medium' 
                            : 'text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        <item.icon className={`h-5 w-5 ${item.highlight ? 'text-primary-600' : 'text-gray-400'}`} />
                        <span>{item.label}</span>
                      </Link>
                    )
                  )}
                </div>

                {/* Logout */}
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <button
                    onClick={() => {
                      handleLogout();
                      setMobileMenuOpen(false);
                    }}
                    className="flex items-center gap-3 w-full px-4 py-3 text-red-600 hover:bg-red-50 rounded-lg"
                  >
                    <LogOut className="h-5 w-5" />
                    <span>{t('nav.logout')}</span>
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}

export default Navbar;
