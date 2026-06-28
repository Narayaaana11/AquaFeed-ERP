import axios from 'axios';

// In production (Vercel), VITE_API_URL points to the Render backend.
// In development, Vite's proxy forwards /api → localhost:5000.
const API_BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : '/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token and activeCompanyId on every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  
  const activeCompanyId = localStorage.getItem('activeCompanyId');
  if (activeCompanyId) {
    config.params = { ...config.params, companyId: activeCompanyId };
  }
  
  return config;
});

// Handle 401 — redirect to login
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
