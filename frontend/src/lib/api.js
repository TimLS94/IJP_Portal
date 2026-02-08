import axios from 'axios';

// In Produktion: VITE_API_URL aus Environment Variable
// In Entwicklung: /api/v1 (wird durch Vite Proxy gehandhabt)
const API_URL = import.meta.env.VITE_API_URL || '/api/v1';

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
  registerCompany: (data, companyName) => 
    api.post(`/auth/register/company?company_name=${encodeURIComponent(companyName)}`, data),
  login: (email, password) => {
    const formData = new FormData();
    formData.append('username', email);
    formData.append('password', password);
    return api.post('/auth/login', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  getMe: () => api.get('/auth/me'),
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
};

// Jobs API
export const jobsAPI = {
  list: (params) => api.get('/jobs', { params }),
  get: (id) => api.get(`/jobs/${id}`),
  getBySlug: (slugWithId) => api.get(`/jobs/by-slug/${slugWithId}`),  // SEO: Neuer Endpoint
  create: (data) => api.post('/jobs', data),
  update: (id, data) => api.put(`/jobs/${id}`, data),
  delete: (id) => api.delete(`/jobs/${id}`), // Archiviert die Stelle
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
  // Übersetzung (DeepL)
  translate: (data) => api.post('/jobs/translate', data),
  getTranslationStatus: () => api.get('/jobs/translate/status'),
  // Statistik: View zählen (anonym)
  trackView: (id) => api.post(`/jobs/${id}/view`),
};

// Applications API
export const applicationsAPI = {
  create: (data) => api.post('/applications', data),
  getMyApplications: () => api.get('/applications/my'),
  getCompanyApplications: () => api.get('/applications/company'),
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
  
  // Bild-Upload
  uploadImage: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/blog/admin/upload-image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
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
  getNotificationSettings: () => api.get('/account/notification-settings'),
  updateNotificationSettings: (settings) => api.put('/account/notification-settings', settings),
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
};

export const adminAPI = {
  getStats: () => api.get('/admin/stats'),
  // Feature Flags & Einstellungen
  getFeatureFlags: () => api.get('/admin/settings/feature-flags'),
  setSetting: (key, value) => api.put(`/admin/settings/${key}`, { value }),
  setFeatureFlag: (key, value) => api.put(`/admin/settings/${key}`, { value }),
  getArchiveDeletionPreview: (days) => api.get('/admin/settings/archive-deletion-preview', { params: { days } }),
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
  // Bewerber
  listApplicants: (params) => api.get('/admin/applicants', { params }),
  getApplicantDocuments: (id) => api.get(`/admin/applicants/${id}/documents`),
  downloadAllDocuments: (id) => api.get(`/admin/applicants/${id}/documents/download-all`, { responseType: 'blob' }),
  
  // DSGVO / Datenschutz
  gdprExportData: (userId) => api.get(`/admin/gdpr/export/${userId}`),
  gdprDeleteData: (userId, deleteDocuments = true) => api.delete(`/admin/gdpr/data/${userId}`, { params: { delete_documents: deleteDocuments } }),
  gdprGetDocuments: (userId) => api.get(`/admin/gdpr/documents/${userId}`),
  gdprDeleteDocument: (documentId) => api.delete(`/admin/gdpr/documents/${documentId}`),
  
  // Anabin Uni-Verifizierung
  getAnabinStudents: () => api.get('/anabin/students-to-verify'),
  searchAnabin: (applicantId) => api.get(`/anabin/search/${applicantId}`),
  autoVerifyAnabin: (applicantId) => api.post(`/anabin/auto-verify/${applicantId}`),
  verifyAnabin: (data) => api.post('/anabin/verify', data),
  // Anabin PDF-Abruf
  getAnabinPdfStatus: (applicantId) => api.get(`/anabin/pdf-status/${applicantId}`),
  getAnabinPdf: (applicantId, refresh = false) => api.get(`/anabin/pdf/${applicantId}${refresh ? '?refresh=true' : ''}`, { responseType: 'blob' }),
  getCachedPdfs: () => api.get('/anabin/cached-pdfs'),
  
  // Account Lockout Management
  getLockedAccounts: () => api.get('/admin/locked-accounts'),
  unlockAccount: (email) => api.post(`/admin/unlock-account/${encodeURIComponent(email)}`),
};

export default api;
