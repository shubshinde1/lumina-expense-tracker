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

// Offline Mode Integration Interceptors
import { getCacheKey, applyOptimisticUpdate, syncOfflineMutations } from './offline';

const originalGet = api.get;
const originalPost = api.post;
const originalPut = api.put;
const originalDelete = api.delete;

const triggerOfflineEvent = () => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('offline-interaction'));
  }
};

api.get = async function(url: string, config?: any) {
  const isSingleTxFetch = url.match(/^\/transactions\/([a-f0-9]{24}|temp_\d+)$/i);

  if (typeof window !== 'undefined' && !navigator.onLine) {
    triggerOfflineEvent();
    const key = getCacheKey(url);
    if (key) {
      const cached = localStorage.getItem(key);
      if (cached) {
        let parsed = JSON.parse(cached);
        if (isSingleTxFetch && Array.isArray(parsed)) {
          const txId = isSingleTxFetch[1];
          const singleTx = parsed.find((tx: any) => tx._id === txId);
          if (singleTx) {
            return { data: singleTx, status: 200, statusText: 'OK', headers: {}, config: {} as any };
          }
        }
        return { data: parsed, status: 200, statusText: 'OK', headers: {}, config: {} as any };
      }
    }
  }
  
  try {
    const res: any = await originalGet.call(api, url, config);
    if (typeof window !== 'undefined') {
      const key = getCacheKey(url);
      const isIndexEndpoint = url === '/transactions' || 
                              url.startsWith('/transactions?') ||
                              url === '/categories' || 
                              url === '/payment-modes' || 
                              url === '/transactions/dashboard';

      if (key && res.data && isIndexEndpoint) {
        localStorage.setItem(key, JSON.stringify(res.data));
      }
    }
    return res;
  } catch (err: any) {
    if (typeof window !== 'undefined' && (!navigator.onLine || !err.response)) {
      triggerOfflineEvent();
      const key = getCacheKey(url);
      if (key) {
        const cached = localStorage.getItem(key);
        if (cached) {
          let parsed = JSON.parse(cached);
          if (isSingleTxFetch && Array.isArray(parsed)) {
            const txId = isSingleTxFetch[1];
            const singleTx = parsed.find((tx: any) => tx._id === txId);
            if (singleTx) {
              return { data: singleTx, status: 200, statusText: 'OK', headers: {}, config: {} as any };
            }
          }
          return { data: parsed, status: 200, statusText: 'OK', headers: {}, config: {} as any };
        }
      }
    }
    throw err;
  }
} as any;

api.post = async function(url: string, data?: any, config?: any) {
  if (typeof window !== 'undefined' && !navigator.onLine) {
    triggerOfflineEvent();
    const tempId = 'temp_' + Date.now();
    const queue = JSON.parse(localStorage.getItem('offline_mutations_queue') || '[]');
    queue.push({
      id: 'mut_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
      method: 'post',
      url,
      payload: data,
      tempId
    });
    localStorage.setItem('offline_mutations_queue', JSON.stringify(queue));
    applyOptimisticUpdate('post', url, data, tempId);
    return { data: { _id: tempId, ...data, isOffline: true }, status: 201, statusText: 'Created', headers: {}, config: {} as any };
  }
  
  try {
    return await originalPost.call(api, url, data, config);
  } catch (err: any) {
    if (typeof window !== 'undefined' && !err.response) {
      triggerOfflineEvent();
      const tempId = 'temp_' + Date.now();
      const queue = JSON.parse(localStorage.getItem('offline_mutations_queue') || '[]');
      queue.push({
        id: 'mut_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
        method: 'post',
        url,
        payload: data,
        tempId
      });
      localStorage.setItem('offline_mutations_queue', JSON.stringify(queue));
      applyOptimisticUpdate('post', url, data, tempId);
      return { data: { _id: tempId, ...data, isOffline: true }, status: 201, statusText: 'Created', headers: {}, config: {} as any };
    }
    throw err;
  }
} as any;

api.put = async function(url: string, data?: any, config?: any) {
  if (typeof window !== 'undefined' && !navigator.onLine) {
    triggerOfflineEvent();
    const queue = JSON.parse(localStorage.getItem('offline_mutations_queue') || '[]');
    queue.push({
      id: 'mut_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
      method: 'put',
      url,
      payload: data
    });
    localStorage.setItem('offline_mutations_queue', JSON.stringify(queue));
    applyOptimisticUpdate('put', url, data, '');
    return { data: { ...data, isOffline: true }, status: 200, statusText: 'OK', headers: {}, config: {} as any };
  }
  
  try {
    return await originalPut.call(api, url, data, config);
  } catch (err: any) {
    if (typeof window !== 'undefined' && !err.response) {
      triggerOfflineEvent();
      const queue = JSON.parse(localStorage.getItem('offline_mutations_queue') || '[]');
      queue.push({
        id: 'mut_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
        method: 'put',
        url,
        payload: data
      });
      localStorage.setItem('offline_mutations_queue', JSON.stringify(queue));
      applyOptimisticUpdate('put', url, data, '');
      return { data: { ...data, isOffline: true }, status: 200, statusText: 'OK', headers: {}, config: {} as any };
    }
    throw err;
  }
} as any;

api.delete = async function(url: string, config?: any) {
  if (typeof window !== 'undefined' && !navigator.onLine) {
    triggerOfflineEvent();
    const queue = JSON.parse(localStorage.getItem('offline_mutations_queue') || '[]');
    queue.push({
      id: 'mut_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
      method: 'delete',
      url,
      payload: null
    });
    localStorage.setItem('offline_mutations_queue', JSON.stringify(queue));
    applyOptimisticUpdate('delete', url, null, '');
    return { data: { message: "Item deleted offline" }, status: 200, statusText: 'OK', headers: {}, config: {} as any };
  }
  
  try {
    return await originalDelete.call(api, url, config);
  } catch (err: any) {
    if (typeof window !== 'undefined' && !err.response) {
      triggerOfflineEvent();
      const queue = JSON.parse(localStorage.getItem('offline_mutations_queue') || '[]');
      queue.push({
        id: 'mut_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
        method: 'delete',
        url,
        payload: null
      });
      localStorage.setItem('offline_mutations_queue', JSON.stringify(queue));
      applyOptimisticUpdate('delete', url, null, '');
      return { data: { message: "Item deleted offline" }, status: 200, statusText: 'OK', headers: {}, config: {} as any };
    }
    throw err;
  }
} as any;

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    syncOfflineMutations();
  });
  if (navigator.onLine) {
    syncOfflineMutations();
  }
}

export default api;
