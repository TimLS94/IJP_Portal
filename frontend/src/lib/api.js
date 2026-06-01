import axios from 'axios';

// API URL - für Server und Client
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://ijp-portal.onrender.com/api/v1';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor - Token hinzufügen
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor - Fehlerbehandlung
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Bei 401 nur umleiten wenn es NICHT der Login-Endpoint ist
    // (Login-Fehler sollen als Toast angezeigt werden, nicht umleiten)
    const isLoginRequest = error.config?.url?.includes('/auth/login');
    
    if (error.response?.status === 401 && !isLoginRequest) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  registerApplicant: (data, firstName, lastName) => 
    api.post(`/auth/register/applicant?first_name=${firstName}&last_name=${lastName}`, data),
  registerCompany: (userData, companyData, inviteToken = null) => 
    api.post('/auth/register/company', { user_data: userData, company_data: companyData, invite_token: inviteToken }),
  login: (email, password) => {
    const formData = new FormData();
    formData.append('username', email);
    formData.append('password', password);
    return api.post('/auth/login', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  getMe: () => api.get('/auth/me'),
  // E-Mail-Präferenzen
  getEmailPreferences: () => api.get('/auth/email-preferences'),
  updateEmailPreferences: (data) => api.put('/auth/email-preferences', data),
  // Google OAuth
  getGoogleConfig: () => api.get('/auth/google/config'),
  googleLogin: (credential) => api.post('/auth/google/login', { credential }),
};

// Applicant API
export const applicantAPI = {
  getProfile: () => api.get('/applicants/me'),
  createProfile: (data) => api.post('/applicants/me', data),
  updateProfile: (data) => api.put('/applicants/me', data),
  getApplicant: (id) => api.get(`/applicants/${id}`),
  // CV Parsing - extrahiert Daten aus Lebenslauf
  parseCV: (formData) => api.post('/applicants/parse-cv', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
};

// Company API
export const companyAPI = {
  getProfile: () => api.get('/companies/me'),
  createProfile: (data) => api.post('/companies/me', data),
  updateProfile: (data) => api.put('/companies/me', data),
  getCompany: (id) => api.get(`/companies/${id}`),
  // Mitglieder-Verwaltung
  getMembers: () => api.get('/company/members'),
  addMember: (data) => api.post('/company/members', data),
  updateMember: (id, data) => api.put(`/company/members/${id}`, data),
  removeMember: (id) => api.delete(`/company/members/${id}`),
  getMemberRoles: () => api.get('/company/members/roles'),
  // Absage-E-Mail Einstellungen
  getRejectionSettings: () => api.get('/companies/me/rejection-settings'),
  updateRejectionSettings: (data) => api.put('/companies/me/rejection-settings', data),
  resetRejectionSettings: () => api.post('/companies/me/rejection-settings/reset'),
  // Bewerber-Digest Einstellungen
  getDigestSettings: () => api.get('/companies/me/digest-settings'),
  updateDigestSettings: (data) => api.put('/companies/me/digest-settings', data),
  // Score-Filter Einstellungen (ersetzt Auto-Ablehnung)
  getScoreFilterSettings: () => api.get('/companies/me/score-filter-settings'),
  updateScoreFilterSettings: (data) => api.put('/companies/me/score-filter-settings', data),
  // Legacy (für Abwärtskompatibilität)
  getAutoRejectSettings: () => api.get('/companies/me/auto-reject-settings'),
  updateAutoRejectSettings: (data) => api.put('/companies/me/auto-reject-settings', data),
  // Logo
  uploadLogo: (formData) => api.post('/companies/me/logo', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  deleteLogo: () => api.delete('/companies/me/logo'),
};

// Jobs API
export const jobsAPI = {
  list: (params) => api.get('/jobs', { params }),
  get: (id) => api.get(`/jobs/${id}`),
  getBySlug: (slugWithId) => api.get(`/jobs/by-slug/${slugWithId}`),  // SEO: Neuer Endpoint
  create: (data) => api.post('/jobs', data),
  update: (id, data) => api.put(`/jobs/${id}`, data),
  delete: (id, permanent = false, deletionReason = null, deletionReasonNote = null) => {
    const params = { permanent };
    if (deletionReason) params.deletion_reason = deletionReason;
    if (deletionReasonNote) params.deletion_reason_note = deletionReasonNote;
    return api.delete(`/jobs/${id}`, { params });
  },
  deletePermanent: (id) => api.delete(`/jobs/${id}/permanent`), // Löscht endgültig
  getMyJobs: () => api.get('/jobs/my/jobs'),
  getArchivedJobs: () => api.get('/jobs/my/jobs/archived'), // Archivierte Stellen
  reactivate: (id) => api.post(`/jobs/${id}/reactivate`), // Stelle reaktivieren
  // Matching Score für eine Stelle (für Bewerber)
  getMatchScore: (id) => api.get(`/jobs/${id}/match`),
  // Öffentliche Einstellungen (max_deadline_days etc.)
  getPublicSettings: () => api.get('/jobs/settings/public'),
  // SEO: Sitemap URLs
  getSitemapUrls: () => api.get('/jobs/sitemap/urls'),
  // Templates
  getTemplates: () => api.get('/jobs/templates'),
  getTemplate: (id) => api.get(`/jobs/templates/${id}`),
  createTemplate: (data) => api.post('/jobs/templates', data),
  updateTemplate: (id, data) => api.put(`/jobs/templates/${id}`, data),
  deleteTemplate: (id) => api.delete(`/jobs/templates/${id}`),
  // Keep Archived Flag
  setKeepArchived: (id, keepArchived) => api.put(`/jobs/${id}`, { keep_archived: keepArchived }),
  // Übersetzung (für Firmen)
  translate: (id, languages) => api.post(`/jobs/${id}/translate`, { languages }),
  translateText: (data) => api.post('/jobs/translate-text', data),
  // Job Interactions (für Bewerber)
  likeJob: (id) => api.post(`/jobs/${id}/like`),
  reportJob: (id, reason, note) => api.post(`/jobs/${id}/report`, { reason, note }),
  getLikedJobs: () => api.get('/jobs/my/liked'),
  getJobInteraction: (id) => api.get(`/jobs/${id}/interaction`),
  trackExternalClick: (id) => api.post(`/jobs/${id}/external-click`),
  // Google Indexing
  reindexAll: () => api.post('/jobs/admin/reindex-all'),
};

// Applications API
export const applicationsAPI = {
  create: (data) => api.post('/applications', data),
  getMyApplications: () => api.get('/applications/my'),
  getCompanyApplications: (includeFiltered = false) => api.get('/applications/company', { params: { include_filtered: includeFiltered } }),
  getFilteredApplications: () => api.get('/applications/company', { params: { include_filtered: true } }),
  update: (id, data) => api.put(`/applications/${id}`, data),
  withdraw: (id) => api.delete(`/applications/${id}`),
  // Neu: Voraussetzungen prüfen
  checkRequirements: (jobId) => api.get(`/applications/check-requirements/${jobId}`),
  getStatusOptions: () => api.get('/applications/status-options'),
  // Firma: Bewerber-Details
  getApplicantDetails: (applicationId) => api.get(`/applications/company/${applicationId}/applicant-details`),
  // Firma: Matching Score für Bewerbung
  getMatchScore: (applicationId) => api.get(`/applications/company/${applicationId}/match`),
  // Firma: Dokumente anfordern
  requestDocuments: (applicationId, data) => api.post(`/applications/company/${applicationId}/request-documents`, data),
  // Bewerber: Angeforderte Dokumente abrufen
  getMyRequestedDocuments: () => api.get('/applications/my/requested-documents'),
  // Bewerber: Dokumente für Bewerbung freigeben
  shareDocuments: (applicationId, documentIds) => api.post(`/applications/my/${applicationId}/share-documents`, { document_ids: documentIds }),
  // Bewerber: Freigegebene Dokumente für Bewerbung abrufen
  getSharedDocuments: (applicationId) => api.get(`/applications/my/${applicationId}/shared-documents`),
  // Firma: Notizen bei Bewerbern
  getCompanyNotes: (applicationId) => api.get(`/applications/company/${applicationId}/notes`),
  updateCompanyNotes: (applicationId, notes) => api.put(`/applications/company/${applicationId}/notes`, { notes }),
};

// Documents API
export const documentsAPI = {
  upload: (file, documentType, description) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('document_type', documentType);
    if (description) formData.append('description', description);
    return api.post('/documents', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  list: () => api.get('/documents'),
  download: (id) => api.get(`/documents/${id}/download`, { responseType: 'blob' }),
  delete: (id) => api.delete(`/documents/${id}`),
  getRequirements: (positionType) => api.get(`/documents/requirements/${positionType}`),
  getAllRequirements: () => api.get('/documents/requirements'),
  getStatus: () => api.get('/documents/status'),
};

// Helper zum Downloaden von Blobs
export const downloadBlob = (blob, filename) => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

// Blog API
export const blogAPI = {
  // Öffentlich
  getCategories: () => api.get('/blog/categories'),
  getPosts: (params) => api.get('/blog/posts', { params }),
  getPost: (slug) => api.get(`/blog/posts/${slug}`),
  getFeaturedPosts: (limit = 3) => api.get('/blog/featured', { params: { limit } }),

  // Admin
  adminGetPosts: (params) => api.get('/blog/admin/posts', { params }),
  adminGetPost: (id) => api.get(`/blog/admin/posts/${id}`),
  adminCreatePost: (data) => api.post('/blog/admin/posts', data),
  adminUpdatePost: (id, data) => api.put(`/blog/admin/posts/${id}`, data),
  adminDeletePost: (id) => api.delete(`/blog/admin/posts/${id}`),
  adminTogglePublish: (id) => api.post(`/blog/admin/posts/${id}/toggle-publish`),
  adminAiGenerate: (language = 'de', category = '') => {
    const params = { language };
    if (category) params.category = category;
    return api.post('/blog/admin/ai-generate', null, { params });
  },
  
  // Bild-Upload
  uploadImage: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/blog/admin/upload-image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
};

// Notifications API
export const notificationsAPI = {
  getCount: () => api.get('/notifications/count'),
  getAll: (unreadOnly = false, limit = 50) => api.get('/notifications', { params: { unread_only: unreadOnly, limit } }),
  markAsRead: (id) => api.post(`/notifications/${id}/read`),
  markAllAsRead: () => api.post('/notifications/read-all'),
  delete: (id) => api.delete(`/notifications/${id}`),
};

// Account API
export const accountAPI = {
  forgotPassword: (email) => api.post('/account/forgot-password', { email }),
  resetPassword: (token, new_password) => api.post('/account/reset-password', { token, new_password }),
  verifyResetToken: (token) => api.get(`/account/verify-reset-token/${token}`),
  changePassword: (current_password, new_password) => api.post('/account/change-password', { current_password, new_password }),
  changeEmail: (new_email, password) => api.post('/account/change-email', { new_email, password }),
  deleteAccount: (password, confirmation) => api.post('/account/delete-account', { password, confirmation }),
  getAccountInfo: () => api.get('/account/me'),
  // Benachrichtigungseinstellungen
  getNotificationSettings: () => api.get('/auth/email-preferences'),
  updateNotificationSettings: (data) => api.put('/auth/email-preferences', data),
};

// Admin API
// IJP-Aufträge API
export const jobRequestsAPI = {
  // Bewerber
  getMyRequests: () => api.get('/job-requests/my'),
  getPrivacyText: () => api.get('/job-requests/privacy-text'),
  createRequests: (data) => api.post('/job-requests', data),
  cancelRequest: (id) => api.delete(`/job-requests/my/${id}`),
  // Admin
  getStatusOptions: () => api.get('/job-requests/admin/status-options'),
  listRequests: (params) => api.get('/job-requests/admin', { params }),
  getRequestDetails: (id) => api.get(`/job-requests/admin/${id}`),
  updateStatus: (id, data) => api.put(`/job-requests/admin/${id}/status`, data),
  exportCSV: (params) => api.get('/job-requests/admin/export/csv', { params, responseType: 'blob' }),
  downloadDocuments: (id) => api.get(`/job-requests/admin/${id}/documents/download-all`, { responseType: 'blob' }),
};

// Firmen-Aufträge API
export const companyRequestsAPI = {
  getMyRequests: () => api.get('/company-requests/my'),
  create: (data) => api.post('/company-requests', data),
  get: (id) => api.get(`/company-requests/${id}`),
  update: (id, data) => api.put(`/company-requests/${id}`, data),
  cancel: (id) => api.delete(`/company-requests/${id}`),
  deletePermanent: (id) => api.delete(`/company-requests/${id}/permanent`),
  getTypes: () => api.get('/company-requests/options/types'),
  getStatuses: () => api.get('/company-requests/options/statuses'),
  // Admin
  adminGetAll: (params) => api.get('/company-requests/admin/all', { params }),
  adminGet: (id) => api.get(`/company-requests/admin/${id}`),
  adminUpdateStatus: (id, data) => api.put(`/company-requests/admin/${id}/status`, data),
};

// Interview/Termin API
export const interviewAPI = {
  // Firma: Termine vorschlagen (send_email=false um keine separate Email zu senden)
  propose: (data, sendEmail = true) => api.post('/interviews/propose', { ...data, send_email: sendEmail }),
  // Bewerber: Termin bestätigen
  confirm: (interviewId, selectedDate) => api.post(`/interviews/${interviewId}/confirm`, { selected_date: selectedDate }),
  // Bewerber: Termine ablehnen (neue Termine anfordern)
  decline: (interviewId, reason) => api.post(`/interviews/${interviewId}/decline`, { reason }),
  // Termin absagen (für Firma UND Bewerber)
  cancel: (interviewId, reason) => api.post(`/interviews/${interviewId}/cancel`, { reason }),
  // Interviews für eine Bewerbung abrufen
  getForApplication: (applicationId) => api.get(`/interviews/application/${applicationId}`),
  // Offene Interviews abrufen (für Dashboard)
  getPending: () => api.get('/interviews/pending'),
  // Kombinierte Update-Email senden
  sendUpdateEmail: (data) => api.post('/interviews/send-update-email', data),
  // Kalender-Ansicht für Firma
  getCompanyCalendar: () => api.get('/interviews/company/calendar'),
  // ICS-Download für einen Termin
  downloadICS: (interviewId) => api.get(`/interviews/${interviewId}/calendar.ics`, { responseType: 'text' }),
};

// Alias für Kalender-Seite
export const interviewsAPI = interviewAPI;

export const adminAPI = {
  getStats: (days = 7) => api.get('/admin/stats', { params: { days } }),
  getEmailStats: (days = 30) => api.get('/admin/email-stats', { params: { days } }),
  getColdOutreachStats: (days = 30) => api.get('/admin/cold-outreach-stats', { params: { days } }),
  getTimeline: (days = 30) => api.get('/admin/timeline', { params: { days } }),
  // Feature Flags & Einstellungen
  getFeatureFlags: () => api.get('/admin/settings/feature-flags'),
  setSetting: (key, value) => api.put(`/admin/settings/${key}`, { value }),
  setFeatureFlag: (key, value) => api.put(`/admin/settings/${key}`, { value }),
  getArchiveDeletionPreview: (days) => api.get('/admin/settings/archive-deletion-preview', { params: { days } }),
  // E-Mail Benachrichtigungen
  triggerDigest: () => api.post('/admin/email/trigger-digest'),
  getEmailTemplates: () => api.get('/admin/email/templates'),
  listUsers: (params) => api.get('/admin/users', { params }),
  toggleUserActive: (id) => api.put(`/admin/users/${id}/toggle-active`),
  createAdmin: (data) => api.post('/admin/users/create-admin', data),
  deleteUser: (id) => api.delete(`/admin/users/${id}`),
  listJobs: (params) => api.get('/admin/jobs', { params }),
  deleteJob: (id) => api.delete(`/admin/jobs/${id}`),
  // Erweiterte Bewerbungsverwaltung
  listApplications: (params) => api.get('/admin/applications', { params }),
  getApplicationDetails: (id) => api.get(`/admin/applications/${id}`),
  updateApplicationStatus: (id, data) => api.put(`/admin/applications/${id}/status`, data),
  exportApplicationsCSV: (params) => api.get('/admin/applications/export/csv', { params, responseType: 'blob' }),
  getInviteSources: () => api.get('/admin/applications/invite-sources'),
  // Bewerber
  listApplicants: (params) => api.get('/admin/applicants', { params }),
  getApplicantDocuments: (id) => api.get(`/admin/applicants/${id}/documents`),
  downloadAllDocuments: (id) => api.get(`/admin/applicants/${id}/documents/download-all`, { responseType: 'blob' }),
  
  // DSGVO / Datenschutz
  gdprExportData: (userId) => api.get(`/admin/gdpr/export/${userId}`),
  gdprDeleteData: (userId, deleteDocuments = true) => api.delete(`/admin/gdpr/data/${userId}`, { params: { delete_documents: deleteDocuments } }),
  gdprGetDocuments: (userId) => api.get(`/admin/gdpr/documents/${userId}`),
  
  // Vertrieb / Sales
  parseEmailCSV: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/sales/parse-csv', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  sendSalesEmails: (data) => api.post('/sales/send', data),
  sendTestEmail: (data) => api.post('/sales/send-test', data),
  gdprDeleteDocument: (documentId) => api.delete(`/admin/gdpr/documents/${documentId}`),
  
  // Anabin Uni-Verifizierung
  getAnabinStudents: () => api.get('/anabin/students-to-verify'),
  searchAnabin: (applicantId) => api.get(`/anabin/search/${applicantId}`),
  autoVerifyAnabin: (applicantId) => api.post(`/anabin/auto-verify/${applicantId}`),
  verifyAnabin: (data) => api.post('/anabin/verify', data),
  // Anabin PDF-Abruf
  getAnabinPdfStatus: (applicantId) => api.get(`/anabin/pdf-status/${applicantId}`),
  getAnabinPdf: (applicantId, refresh = false) => api.get(`/anabin/pdf/${applicantId}${refresh ? '?refresh=true' : ''}`, { responseType: 'blob' }),
  fetchAnabinPdfDirect: (universityName, country = "Usbekistan") => api.post(`/anabin/fetch-pdf?university_name=${encodeURIComponent(universityName)}&country=${encodeURIComponent(country)}`, {}, { responseType: 'blob' }),
  getCachedPdfs: () => api.get('/anabin/cached-pdfs'),
  // Anabin Datenbank-Scraper
  getAnabinDatabaseInfo: () => api.get('/anabin/database/info'),
  getAnabinScrapeStatus: () => api.get('/anabin/database/scrape-status'),
  startAnabinScrape: (data) => api.post('/anabin/database/scrape', data),
  cancelAnabinScrape: () => api.post('/anabin/database/scrape-cancel'),
  reloadAnabinDatabase: () => api.post('/anabin/database/reload'),
  
  // Job Translation & Editing
  translateJob: (jobId, languages) => api.post(`/admin/jobs/${jobId}/translate`, { languages }),
  getJobTranslationStatus: (jobId) => api.get(`/admin/jobs/${jobId}/translation-status`),
  updateJob: (jobId, data) => api.put(`/admin/jobs/${jobId}`, data),
  
  // Einladungs-Tokens für Firmen
  listInviteTokens: () => api.get('/admin/invite-tokens'),
  createInviteToken: (data) => api.post('/admin/invite-tokens', data),
  deleteInviteToken: (id) => api.delete(`/admin/invite-tokens/${id}`),
  toggleInviteToken: (id) => api.put(`/admin/invite-tokens/${id}/toggle`),
  
  // Bewerber-Einladungen (mit Quellen-Tracking)
  listApplicantInvites: () => api.get('/admin/applicant-invites'),
  createApplicantInvite: (data) => api.post('/admin/applicant-invites', data),
  deleteApplicantInvite: (id) => api.delete(`/admin/applicant-invites/${id}`),
  toggleApplicantInvite: (id) => api.put(`/admin/applicant-invites/${id}/toggle`),
  getApplicantInviteApplicants: (id) => api.get(`/admin/applicant-invites/${id}/applicants`),
  exportApplicantsCSV: () => api.get('/admin/applicants/export/csv', { responseType: 'blob' }),
  
  // Gemeldete Stellen (Job Reports)
  getJobReports: () => api.get('/admin/job-reports'),
  dismissJobReport: (id) => api.delete(`/admin/job-reports/${id}`),
  
  // Cold Outreach E-Mails
  sendColdOutreachEmail: (data) => api.post('/admin/cold-outreach/send', data),

  // Facebook Gruppen & Posts
  getFacebookGroups: (cluster) => api.get('/facebook/groups', { params: cluster ? { cluster } : {} }),
  getFacebookGroupClusters: () => api.get('/facebook/groups/clusters'),
  createFacebookGroup: (data) => api.post('/facebook/groups', data),
  updateFacebookGroup: (id, data) => api.put(`/facebook/groups/${id}`, data),
  deleteFacebookGroup: (id) => api.delete(`/facebook/groups/${id}`),
  
  getFacebookTemplates: (category) => api.get('/facebook/templates', { params: category ? { category } : {} }),
  createFacebookTemplate: (data) => api.post('/facebook/templates', data),
  updateFacebookTemplate: (id, data) => api.put(`/facebook/templates/${id}`, data),
  deleteFacebookTemplate: (id) => api.delete(`/facebook/templates/${id}`),
  
  getFacebookPosts: (favoritesOnly) => api.get('/facebook/posts', { params: { favorites_only: favoritesOnly || false } }),
  createFacebookPost: (data) => api.post('/facebook/posts', data),
  updateFacebookPost: (id, data) => api.put(`/facebook/posts/${id}`, data),
  deleteFacebookPost: (id) => api.delete(`/facebook/posts/${id}`),
  markFacebookPostUsed: (id) => api.post(`/facebook/posts/${id}/use`),
  
  getFacebookLogs: (limit) => api.get('/facebook/logs', { params: { limit: limit || 100 } }),
  createFacebookLog: (data) => api.post('/facebook/logs', data),
  getFacebookStats: () => api.get('/facebook/stats'),
  
  // Facebook Page API (direkt über offizielle API posten)
  getFacebookPageStatus: () => api.get('/facebook/page/status'),
  getFacebookPageInfo: () => api.get('/facebook/page/info'),
  postToFacebookPage: (message, comments = [], link = null) => 
    api.post('/facebook/page/post', { message, comments, link }),
};

// BA-Scraper API (Admin)
export const baScraperAPI = {
  getConfig: () => api.get('/admin/ba-scraper/config'),
  updateConfig: (data) => api.put('/admin/ba-scraper/config', data),
  run: () => api.post('/admin/ba-scraper/run'),
  getStats: () => api.get('/admin/ba-scraper/stats'),
  check: () => api.get('/admin/ba-scraper/check'),
  deleteAll: () => api.delete('/admin/ba-scraper/jobs'),
  // Review-Workflow
  getPending: () => api.get('/admin/ba-scraper/pending'),
  approveJob: (id) => api.post(`/admin/ba-scraper/approve/${id}`),
  approveAll: () => api.post('/admin/ba-scraper/approve-all'),
  deletePending: (id) => api.delete(`/admin/ba-scraper/pending/${id}`),
};

// IJP Dokumentenservice (Admin)
export const ijpAPI = {
  // Betriebe
  getBetriebe: () => api.get('/ijp/betriebe'),
  createBetrieb: (data) => api.post('/ijp/betriebe', data),
  updateBetrieb: (id, data) => api.put(`/ijp/betriebe/${id}`, data),
  deleteBetrieb: (id) => api.delete(`/ijp/betriebe/${id}`),
  // Bewerber
  getApplicants: (search = '') => api.get('/ijp/applicants', { params: search ? { search } : {} }),
  // Templates (CRUD)
  getTemplates: () => api.get('/ijp/templates'),
  getTemplate: (docType) => api.get(`/ijp/templates/${docType}`),
  createTemplate: (data) => api.post('/ijp/templates', data),
  updateTemplate: (docType, data) => api.put(`/ijp/templates/${docType}`, data),
  deleteTemplate: (docType) => api.delete(`/ijp/templates/${docType}`),
  // Dokumente
  generateDocument: (data) =>
    api.post('/ijp/documents/generate', data, { responseType: 'blob' }),
};

// CRM (Admin)
export const crmAPI = {
  getCompanies: (params = {}) => api.get('/ijp/crm/companies', { params }),
  createCompany: (data) => api.post('/ijp/crm/companies', data),
  getCompany: (id) => api.get(`/ijp/crm/companies/${id}`),
  updateCompany: (id, data) => api.put(`/ijp/crm/companies/${id}`, data),
  deleteCompany: (id) => api.delete(`/ijp/crm/companies/${id}`),
  createContact: (companyId, data) => api.post(`/ijp/crm/companies/${companyId}/contacts`, data),
  updateContact: (contactId, data) => api.put(`/ijp/crm/contacts/${contactId}`, data),
  deleteContact: (contactId) => api.delete(`/ijp/crm/contacts/${contactId}`),
  getMeta: () => api.get('/ijp/crm/meta'),
  getDocuments: (companyId) => api.get(`/ijp/crm/companies/${companyId}/documents`),
  uploadDocument: (companyId, formData) => api.post(`/ijp/crm/companies/${companyId}/documents`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  deleteDocument: (companyId, docId) => api.delete(`/ijp/crm/companies/${companyId}/documents/${docId}`),
  fillDocument: (companyId, docId, applicantId) => api.post(`/ijp/crm/companies/${companyId}/documents/${docId}/fill`, null, { params: { applicant_id: applicantId }, responseType: 'blob' }),
};

// Auth API Erweiterung für Einladungs-Token-Prüfung
export const verifyInviteToken = (token) => api.get(`/auth/verify-invite/${token}`);

export default api;
