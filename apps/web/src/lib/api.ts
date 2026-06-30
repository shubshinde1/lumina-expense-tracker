import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api',
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
