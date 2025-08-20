import axios from 'axios';

// Create axios instance with base configuration
const api = axios.create({
  baseURL: process.env.NODE_ENV === 'production' ? '/api' : 'http://localhost:5000/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle common errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // 디버깅을 위한 상세 로그
    console.log('API Error:', {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      message: error.response?.data?.message,
      data: error.response?.data
    });

    // 401 처리 - 로그인/회원가입 페이지에서는 리다이렉트하지 않음
    if (error.response?.status === 401) {
      const currentPath = window.location.pathname;
      const isAuthPage = currentPath === '/login' || currentPath === '/register';
      
      // 로그인/회원가입 페이지가 아닌 경우에만 리다이렉트
      if (!isAuthPage) {
        console.warn('401 Unauthorized - Redirecting to login after 2 seconds...');
        
        // 오류 메시지 저장 (선택적)
        sessionStorage.setItem('authError', 'Session expired. Please login again.');
        
        // 2초 후 리다이렉트 (디버깅 시간 확보)
        setTimeout(() => {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          window.location.href = '/login';
        }, 2000);
      }
    }
    
    return Promise.reject(error);
  }
);

// Auth API endpoints
export const auth = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (userData) => api.post('/auth/register', userData),
  logout: () => api.post('/auth/logout'),
  refreshToken: () => api.post('/auth/refresh'),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  resetPassword: (token, password) => api.post('/auth/reset-password', { token, password }),
};

// User API endpoints
export const users = {
  getCurrentUser: () => api.get('/users/me'),
  updateProfile: (userData) => api.put('/users/me', userData),
  changePassword: (passwordData) => api.put('/users/me/password', passwordData),
};

// Employee API endpoints
export const employees = {
  getAll: (params = {}) => api.get('/employees', { params }),
  getById: (id) => api.get(`/employees/${id}`),
  create: (employeeData) => api.post('/employees', employeeData),
  update: (id, employeeData) => api.put(`/employees/${id}`, employeeData),
  delete: (id) => api.delete(`/employees/${id}`),
  search: (query) => api.get('/employees/search', { params: { q: query } }),
  // Employee abilities
  getAbility: (employeeId) => api.get(`/abilities/${employeeId}`),
  updateAbility: (employeeId, abilityData) => api.put(`/abilities/${employeeId}`, abilityData),
  // Employee notes
  getNotes: (employeeId) => api.get(`/notes/employee/${employeeId}`),
  addNote: (employeeId, noteData) => api.post(`/notes/employee/${employeeId}`, noteData),
  // Employee schedules
  getSchedules: (id, startDate, endDate) => {
    console.log('[API] Calling getEmployeeSchedules with:', { id, startDate, endDate });
    console.log('[API] URL will be:', `/employees/${id}/schedules`);
    return api.get(`/employees/${id}/schedules`, { params: { startDate, endDate } });
  },
};

// Schedule API endpoints
export const schedules = {
  getAll: (params = {}) => {
    console.log('[API] WARNING: schedules.getAll called with params:', params);
    console.trace('[API] Call stack for schedules.getAll');
    return api.get('/schedules', { params });
  },
  getById: (id) => api.get(`/schedules/${id}`),
  create: (scheduleData) => api.post('/schedules', scheduleData),
  update: (id, scheduleData) => api.put(`/schedules/${id}`, scheduleData),
  delete: (id) => api.delete(`/schedules/${id}`),
  getByDateRange: (startDate, endDate) => 
    api.get('/schedules', { params: { startDate, endDate } }),
  getByEmployee: (employeeId, params = {}) => 
    api.get(`/schedules/employee/${employeeId}`, { params }),
  autoGenerate: (generationData) => api.post('/schedules/auto-generate', generationData),
  bulkUpdate: (updates) => api.put('/schedules/bulk-update', { updates }),
  checkConflicts: (scheduleData) => api.post('/schedules/check-conflicts', scheduleData),
  // New advanced schedule generation endpoints
  calculateRequirements: (data) => api.post('/schedules/calculate-requirements', data),
  validatePatterns: (patterns) => api.post('/schedules/validate-patterns', patterns),
  generateAdvanced: (data) => api.post('/schedules/generate-advanced', data),
  coverageAnalysis: (params) => api.get('/schedules/coverage-analysis', { params }),
};

// Leave Request API endpoints
export const leaveRequests = {
  getAll: (params = {}) => api.get('/leaves', { params }),
  getById: (id) => api.get(`/leaves/${id}`),
  create: (requestData) => api.post('/leaves', requestData),
  update: (id, requestData) => api.put(`/leaves/${id}`, requestData),
  delete: (id) => api.delete(`/leaves/${id}`),
  approve: (id, comment = '') => api.put(`/leaves/${id}/approve`, { comment }),
  reject: (id, comment = '') => api.put(`/leaves/${id}/reject`, { comment }),
  getMyRequests: () => api.get('/leaves/my'),
  getPendingApprovals: () => api.get('/leaves/pending'),
};

// Dashboard API endpoints
export const dashboard = {
  getStats: () => api.get('/dashboard/stats'),
  getRecentActivity: () => api.get('/dashboard/recent-activity'),
  getUpcomingSchedules: (limit = 10) => 
    api.get('/dashboard/upcoming-schedules', { params: { limit } }),
  getScheduleSummary: (period = 'week') => 
    api.get('/dashboard/schedule-summary', { params: { period } }),
  getAlerts: () => api.get('/dashboard/alerts'),
};

// Reports API endpoints
export const reports = {
  getScheduleReport: (params = {}) => api.get('/reports/schedules', { params }),
  getEmployeeReport: (params = {}) => api.get('/reports/employees', { params }),
  getLeaveReport: (params = {}) => api.get('/reports/leave', { params }),
  getAttendanceReport: (params = {}) => api.get('/reports/attendance', { params }),
  exportSchedule: (format, params = {}) => 
    api.get(`/reports/schedules/export/${format}`, { 
      params,
      responseType: 'blob' 
    }),
};

// Settings API endpoints
export const settings = {
  getAll: () => api.get('/settings'),
  update: (settingsData) => api.put('/settings', settingsData),
  getScheduleTemplates: () => api.get('/settings/schedule-templates'),
  createScheduleTemplate: (templateData) => api.post('/settings/schedule-templates', templateData),
  updateScheduleTemplate: (id, templateData) => api.put(`/settings/schedule-templates/${id}`, templateData),
  deleteScheduleTemplate: (id) => api.delete(`/settings/schedule-templates/${id}`),
};

// Company API endpoints
export const company = {
  getSettings: () => api.get('/company/settings'),
  updateSettings: (settings) => api.put('/company/settings', settings),
  getWorkTypes: () => api.get('/company/work-types')
};

// Notifications API endpoints
export const notifications = {
  getAll: () => api.get('/notifications'),
  markAsRead: (id) => api.put(`/notifications/${id}/read`),
  markAllAsRead: () => api.put('/notifications/read-all'),
  delete: (id) => api.delete(`/notifications/${id}`),
  getUnreadCount: () => api.get('/notifications/unread-count'),
};

// Chemistry API endpoints
export const chemistry = {
  getAll: () => api.get('/chemistry'),
  getByEmployee: (employeeId) => api.get(`/chemistry/employee/${employeeId}`),
  update: (chemistryData) => api.put('/chemistry', chemistryData),
};

// Notes API endpoints
export const notes = {
  getByEmployee: (employeeId) => api.get(`/notes/employee/${employeeId}`),
  addNote: (employeeId, noteData) => api.post(`/notes/employee/${employeeId}`, noteData),
  delete: (id) => api.delete(`/notes/${id}`),
  update: (id, noteData) => api.put(`/notes/${id}`, noteData),
};

// Notices API endpoints
export const notices = {
  getAll: () => api.get('/notices'),
  getById: (id) => api.get(`/notices/${id}`),
  markAsRead: (id) => api.put(`/notices/${id}/read`),
  markAllAsRead: () => api.put('/notices/read-all'),
  getUnreadCount: () => api.get('/notices/unread-count'),
};

// Convenience functions that match the old API structure
export const login = auth.login;
export const register = auth.register;
export const logout = auth.logout;

export const getEmployees = employees.getAll;
export const getEmployee = employees.getById;
export const createEmployee = employees.create;
export const updateEmployee = employees.update;
export const deleteEmployee = employees.delete;
export const getEmployeeAbility = employees.getAbility;
export const updateEmployeeAbility = employees.updateAbility;
export const getEmployeeNotes = employees.getNotes;
export const addEmployeeNote = employees.addNote;
export const getEmployeeSchedules = employees.getSchedules;
export const getEmployeeChemistry = chemistry.getByEmployee;
export const updateChemistry = chemistry.update;
export const getAllChemistry = chemistry.getAll;
export const deleteNote = notes.delete;

export const getSchedules = schedules.getAll;
export const getSchedule = schedules.getById;
export const createSchedule = schedules.create;
export const updateSchedule = schedules.update;
export const deleteSchedule = schedules.delete;
export const generateSchedule = schedules.autoGenerate;

export const getLeaveRequests = leaveRequests.getAll;
export const getLeaveRequest = leaveRequests.getById;
export const createLeaveRequest = leaveRequests.create;
export const updateLeaveRequest = leaveRequests.update;
export const deleteLeaveRequest = leaveRequests.delete;

export const getDashboardStats = dashboard.getStats;
export const getRecentSchedules = dashboard.getUpcomingSchedules;
export const getDashboardAlerts = dashboard.getAlerts;

export const getNotices = notices.getAll;
export const markNoticeAsRead = notices.markAsRead;
export const getUnreadCount = notices.getUnreadCount;

export const getScheduleTemplates = settings.getScheduleTemplates;

// Error handler utility
export const handleApiError = (error) => {
  if (error.response) {
    // Server responded with error status
    const { status, data } = error.response;
    switch (status) {
      case 400:
        return data.message || 'Bad request';
      case 401:
        return 'Unauthorized access';
      case 403:
        return 'Forbidden access';
      case 404:
        return 'Resource not found';
      case 422:
        return data.message || 'Validation error';
      case 500:
        return 'Internal server error';
      default:
        return data.message || 'An error occurred';
    }
  } else if (error.request) {
    // Network error
    return 'Network error. Please check your connection.';
  } else {
    // Other error
    return error.message || 'An unexpected error occurred';
  }
};

// Request retry utility
export const retryRequest = async (requestFn, maxRetries = 3, delay = 1000) => {
  let lastError;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await requestFn();
    } catch (error) {
      lastError = error;
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
      }
    }
  }
  
  throw lastError;
};

// Upload utility for file uploads
export const uploadFile = async (file, endpoint, onProgress) => {
  const formData = new FormData();
  formData.append('file', file);
  
  const config = {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  };
  
  if (onProgress) {
    config.onUploadProgress = (progressEvent) => {
      const percentCompleted = Math.round(
        (progressEvent.loaded * 100) / progressEvent.total
      );
      onProgress(percentCompleted);
    };
  }
  
  return api.post(endpoint, formData, config);
};

// Batch request utility
export const batchRequests = async (requests) => {
  try {
    const responses = await Promise.allSettled(requests);
    return responses.map((result, index) => ({
      index,
      success: result.status === 'fulfilled',
      data: result.status === 'fulfilled' ? result.value.data : null,
      error: result.status === 'rejected' ? result.reason : null,
    }));
  } catch (error) {
    throw new Error('Batch request failed');
  }
};

// Cache utility for GET requests
const cache = new Map();
const CACHE_EXPIRY = 5 * 60 * 1000; // 5 minutes

export const getCached = async (key, requestFn) => {
  const cached = cache.get(key);
  
  if (cached && Date.now() - cached.timestamp < CACHE_EXPIRY) {
    return cached.data;
  }
  
  try {
    const response = await requestFn();
    cache.set(key, {
      data: response,
      timestamp: Date.now(),
    });
    return response;
  } catch (error) {
    // If request fails and we have cached data, return it
    if (cached) {
      return cached.data;
    }
    throw error;
  }
};

// Clear cache utility
export const clearCache = (key) => {
  if (key) {
    cache.delete(key);
  } else {
    cache.clear();
  }
};

export default api;