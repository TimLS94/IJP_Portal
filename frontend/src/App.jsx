import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuth } from './context/AuthContext';

// Layout
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import ScrollToTop from './components/ScrollToTop';

// Öffentliche Seiten
import Home from './pages/Home';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import Jobs from './pages/jobs/Jobs';
import JobDetail from './pages/jobs/JobDetail';
import JobCategories from './pages/JobCategories';

// Bewerber-Seiten
import ApplicantProfile from './pages/applicant/Profile';
import ApplicantApplications from './pages/applicant/Applications';
import ApplicantDocuments from './pages/applicant/Documents';
import ApplicantJobRequest from './pages/applicant/JobRequest';

// Firmen-Seiten
import CompanyDashboard from './pages/company/Dashboard';
import CompanyProfile from './pages/company/Profile';
import CompanyJobs from './pages/company/Jobs';
import CompanyApplications from './pages/company/Applications';
import CreateJob from './pages/company/CreateJob';
import EditJob from './pages/company/EditJob';
import TeamMembers from './pages/company/TeamMembers';
import CompanyIJPRequest from './pages/company/IJPRequest';
import RejectionSettings from './pages/company/RejectionSettings';

// Admin-Seiten
import AdminDashboard from './pages/admin/Dashboard';
import AdminUsers from './pages/admin/Users';
import AdminJobs from './pages/admin/Jobs';
import AdminApplications from './pages/admin/Applications';
import AdminJobRequests from './pages/admin/JobRequests';
import AdminCompanyRequests from './pages/admin/CompanyRequests';
import BlogManager from './pages/admin/BlogManager';
import BlogEditor from './pages/admin/BlogEditor';
import AnabinVerification from './pages/admin/AnabinVerification';
import AdminSettings from './pages/admin/Settings';

// Blog
import BlogList from './pages/blog/BlogList';
import BlogDetail from './pages/blog/BlogDetail';

// Auth / Account
import ForgotPassword from './pages/auth/ForgotPassword';
import ResetPassword from './pages/auth/ResetPassword';
import AccountSettings from './pages/account/Settings';

// Statische Seiten
import About from './pages/About';
import Contact from './pages/Contact';
import FAQ from './pages/FAQ';
import Impressum from './pages/Impressum';
import Datenschutz from './pages/Datenschutz';
import AGB from './pages/AGB';

function App() {
  const { loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <>
      <ScrollToTop />
      <Toaster position="top-right" />
      <Routes>
        {/* Öffentliche Routen */}
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="login" element={<Login />} />
          <Route path="register" element={<Register />} />
          <Route path="forgot-password" element={<ForgotPassword />} />
          <Route path="reset-password" element={<ResetPassword />} />
          <Route path="jobs" element={<Jobs />} />
          <Route path="jobs/:slug" element={<JobDetail />} />
          <Route path="stellenarten" element={<JobCategories />} />
          <Route path="blog" element={<BlogList />} />
          <Route path="blog/:slug" element={<BlogDetail />} />
          
          {/* Statische Seiten */}
          <Route path="about" element={<About />} />
          <Route path="contact" element={<Contact />} />
          <Route path="faq" element={<FAQ />} />
          <Route path="impressum" element={<Impressum />} />
          <Route path="datenschutz" element={<Datenschutz />} />
          <Route path="agb" element={<AGB />} />
          
          {/* Bewerber-Routen */}
          <Route path="applicant" element={<ProtectedRoute role="applicant" />}>
            <Route path="profile" element={<ApplicantProfile />} />
            <Route path="applications" element={<ApplicantApplications />} />
            <Route path="documents" element={<ApplicantDocuments />} />
            <Route path="ijp-auftrag" element={<ApplicantJobRequest />} />
            <Route path="settings" element={<AccountSettings />} />
          </Route>
          
          {/* Firmen-Routen */}
          <Route path="company" element={<ProtectedRoute role="company" />}>
            <Route path="dashboard" element={<CompanyDashboard />} />
            <Route path="profile" element={<CompanyProfile />} />
            <Route path="jobs" element={<CompanyJobs />} />
            <Route path="jobs/new" element={<CreateJob />} />
            <Route path="jobs/:id/edit" element={<EditJob />} />
            <Route path="applications" element={<CompanyApplications />} />
            <Route path="team" element={<TeamMembers />} />
            <Route path="ijp-auftrag" element={<CompanyIJPRequest />} />
            <Route path="rejection-settings" element={<RejectionSettings />} />
            <Route path="settings" element={<AccountSettings />} />
          </Route>
          
          {/* Admin-Routen */}
          <Route path="admin" element={<ProtectedRoute role="admin" />}>
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="jobs" element={<AdminJobs />} />
            <Route path="applications" element={<AdminApplications />} />
            <Route path="job-requests" element={<AdminJobRequests />} />
            <Route path="company-requests" element={<AdminCompanyRequests />} />
            <Route path="anabin" element={<AnabinVerification />} />
            <Route path="blog" element={<BlogManager />} />
            <Route path="blog/new" element={<BlogEditor />} />
            <Route path="blog/edit/:id" element={<BlogEditor />} />
            <Route path="feature-flags" element={<AdminSettings />} />
            <Route path="settings" element={<AccountSettings />} />
          </Route>
        </Route>
        
        {/* 404 */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

export default App;
