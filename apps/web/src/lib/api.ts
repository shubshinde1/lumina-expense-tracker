import axios from 'axios';

const getBaseURL = () => {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  if (typeof window !== 'undefined') {
    // In Capacitor (Android/iOS APKs), origin is capacitor://localhost or http://localhost (no port)
    const isCapacitor = window.location.origin.startsWith('capacitor://') ||
      (window.location.hostname === 'localhost' && !window.location.port);
    if (isCapacitor) {
      return 'https://lumina-expense-tracker-85ym.vercel.app/api';
    }
  }
  return 'http://localhost:5001/api';
};

const api = axios.create({
  baseURL: getBaseURL(),
});

api.interceptors.request.use((config) => {
  const token = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('lumina_user') || '{}')?.token : null;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Redirect to login page if token is invalid or expired (401 Unauthorized)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('lumina_user');
        window.location.href = '/';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
