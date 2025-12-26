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
};

// Jobs API
export const jobsAPI = {
  list: (params) => api.get('/jobs', { params }),
  get: (id) => api.get(`/jobs/${id}`),
  create: (data) => api.post('/jobs', data),
  update: (id, data) => api.put(`/jobs/${id}`, data),
  delete: (id) => api.delete(`/jobs/${id}`),
  getMyJobs: () => api.get('/jobs/my/jobs'),
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

export const adminAPI = {
  getStats: () => api.get('/admin/stats'),
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
};

export default api;
