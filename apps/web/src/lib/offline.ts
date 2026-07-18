import axios from 'axios';

// Create a raw axios instance for sync requests to avoid loops
const rawApi = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api',
});

rawApi.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = JSON.parse(localStorage.getItem('lumina_user') || '{}')?.token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

export interface OfflineMutation {
  id: string;
  method: 'post' | 'put' | 'delete';
  url: string;
  payload: any;
  tempId?: string;
}

// Map endpoints to cache keys
export const getCacheKey = (url: string): string | null => {
  if (url.startsWith('/transactions/dashboard')) return 'cached_summary';
  if (url.startsWith('/transactions')) return 'cached_transactions';
  if (url.startsWith('/categories')) return 'cached_categories';
  if (url.startsWith('/payment-modes')) return 'cached_payment_modes';
  return null;
};

// Sync offline mutations to server
export const syncOfflineMutations = async () => {
  if (typeof window === 'undefined' || !navigator.onLine) return;
  
  const queue: OfflineMutation[] = JSON.parse(localStorage.getItem('offline_mutations_queue') || '[]');
  if (queue.length === 0) return;

  console.log(`[Offline Sync] Starting sync of ${queue.length} mutations...`);
  const tempIdMap: Record<string, string> = {};

  for (const mutation of queue) {
    try {
      let { url, method, payload } = mutation;

      // Replace temporary ID with real database ID if it was created previously
      if (mutation.tempId && tempIdMap[mutation.tempId]) {
        url = url.replace(mutation.tempId, tempIdMap[mutation.tempId]);
      }
      
      if (payload) {
        let payloadStr = JSON.stringify(payload);
        Object.keys(tempIdMap).forEach(tempId => {
          payloadStr = payloadStr.replaceAll(tempId, tempIdMap[tempId]);
        });
        payload = JSON.parse(payloadStr);
      }

      // Execute request
      const response = await rawApi({ method, url, data: payload });

      // Save real ID mapping for create actions
      if (method === 'post' && response.data) {
        const realId = response.data._id || response.data.transaction?._id || response.data.category?._id;
        if (realId && mutation.tempId) {
          tempIdMap[mutation.tempId] = realId;
        }
      }
    } catch (err) {
      console.error(`[Offline Sync] Sync failed for mutation:`, mutation, err);
    }
  }

  localStorage.removeItem('offline_mutations_queue');
  console.log(`[Offline Sync] Sync complete!`);

  // Clear GET caches so they refresh from server
  localStorage.removeItem('cached_transactions');
  localStorage.removeItem('cached_categories');
  localStorage.removeItem('cached_payment_modes');
  localStorage.removeItem('cached_summary');

  window.dispatchEvent(new CustomEvent('offline-sync-complete'));
};

// Optimistic Cache Updates for Offline Mutations
export const applyOptimisticUpdate = (method: string, url: string, payload: any, tempId: string) => {
  if (typeof window === 'undefined') return;

  // 1. CREATE TRANSACTION
  if (method === 'post' && url === '/transactions') {
    const cached = JSON.parse(localStorage.getItem('cached_transactions') || '[]');
    // Try to find category details from category cache
    const cats = JSON.parse(localStorage.getItem('cached_categories') || '[]');
    const matchedCat = cats.find((c: any) => c._id === payload.category);
    
    const newTx = {
      _id: tempId,
      ...payload,
      category: matchedCat || { _id: payload.category, name: 'Offline Category', icon: 'wallet', color: '#8e8e93' },
      isOffline: true,
      createdAt: new Date().toISOString()
    };
    localStorage.setItem('cached_transactions', JSON.stringify([newTx, ...cached]));

    // Update summary values
    const summary = JSON.parse(localStorage.getItem('cached_summary') || '{"balance":0,"income":0,"expense":0,"recentTransactions":[]}');
    const amountNum = Number(payload.amount) || 0;
    if (payload.type === 'income') {
      summary.balance += amountNum;
      summary.income += amountNum;
    } else {
      summary.balance -= amountNum;
      summary.expense += amountNum;
    }
    summary.recentTransactions = [newTx, ...(summary.recentTransactions || [])].slice(0, 6);
    localStorage.setItem('cached_summary', JSON.stringify(summary));
  }

  // 2. UPDATE TRANSACTION
  if (method === 'put' && url.startsWith('/transactions/')) {
    const txId = url.split('/').pop() || '';
    const cached = JSON.parse(localStorage.getItem('cached_transactions') || '[]');
    const oldTx = cached.find((t: any) => t._id === txId);
    const updated = cached.map((tx: any) => {
      if (tx._id === txId) {
        return { ...tx, ...payload, isOffline: true };
      }
      return tx;
    });
    localStorage.setItem('cached_transactions', JSON.stringify(updated));

    // Adjust summary balance if amount or type changed!
    if (oldTx) {
      const oldAmount = Number(oldTx.amount) || 0;
      const newAmount = payload.amount !== undefined ? Number(payload.amount) : oldAmount;
      const oldType = oldTx.type;
      const newType = payload.type || oldType;

      const summary = JSON.parse(localStorage.getItem('cached_summary') || '{"balance":0,"income":0,"expense":0,"recentTransactions":[]}');
      
      // Reverse old
      if (oldType === 'income') {
        summary.balance -= oldAmount;
        summary.income -= oldAmount;
      } else {
        summary.balance += oldAmount;
        summary.expense -= oldAmount;
      }

      // Add new
      if (newType === 'income') {
        summary.balance += newAmount;
        summary.income += newAmount;
      } else {
        summary.balance -= newAmount;
        summary.expense += newAmount;
      }
      // Update recent transactions list in summary
      summary.recentTransactions = (summary.recentTransactions || []).map((t: any) => {
        if (t._id === txId) {
          return { ...t, ...payload, isOffline: true };
        }
        return t;
      });
      localStorage.setItem('cached_summary', JSON.stringify(summary));
    }
  }

  // 3. DELETE TRANSACTION
  if (method === 'delete' && url.startsWith('/transactions/')) {
    const txId = url.split('/').pop() || '';
    const cached = JSON.parse(localStorage.getItem('cached_transactions') || '[]');
    const oldTx = cached.find((t: any) => t._id === txId);
    const filtered = cached.filter((tx: any) => tx._id !== txId);
    localStorage.setItem('cached_transactions', JSON.stringify(filtered));

    if (oldTx) {
      const oldAmount = Number(oldTx.amount) || 0;
      const summary = JSON.parse(localStorage.getItem('cached_summary') || '{"balance":0,"income":0,"expense":0,"recentTransactions":[]}');
      if (oldTx.type === 'income') {
        summary.balance -= oldAmount;
        summary.income -= oldAmount;
      } else {
        summary.balance += oldAmount;
        summary.expense -= oldAmount;
      }
      summary.recentTransactions = (summary.recentTransactions || []).filter((t: any) => t._id !== txId);
      localStorage.setItem('cached_summary', JSON.stringify(summary));
    }
  }

  // 4. CREATE CATEGORY
  if (method === 'post' && url === '/categories') {
    const cached = JSON.parse(localStorage.getItem('cached_categories') || '[]');
    const newCat = {
      _id: tempId,
      ...payload,
      isOffline: true,
      subcategories: [],
      createdAt: new Date().toISOString()
    };
    localStorage.setItem('cached_categories', JSON.stringify([newCat, ...cached]));
  }

  // 4b. UPDATE CATEGORY
  if (method === 'put' && url.startsWith('/categories/') && !url.includes('/subcategories')) {
    const catId = url.split('/').pop() || '';
    const cached = JSON.parse(localStorage.getItem('cached_categories') || '[]');
    const updated = cached.map((c: any) => {
      if (c._id === catId) {
        return { ...c, ...payload, isOffline: true };
      }
      return c;
    });
    localStorage.setItem('cached_categories', JSON.stringify(updated));
  }

  // 4c. DELETE CATEGORY
  if (method === 'delete' && url.startsWith('/categories/') && !url.includes('/subcategories')) {
    const catId = url.split('/').pop() || '';
    const cached = JSON.parse(localStorage.getItem('cached_categories') || '[]');
    const filtered = cached.filter((c: any) => c._id !== catId);
    localStorage.setItem('cached_categories', JSON.stringify(filtered));
  }

  // 5. ADD SUBCATEGORY
  if (method === 'post' && url.endsWith('/subcategories')) {
    const parts = url.split('/');
    const catId = parts[2]; // /categories/:id/subcategories
    const cached = JSON.parse(localStorage.getItem('cached_categories') || '[]');
    const updated = cached.map((cat: any) => {
      if (cat._id === catId) {
        const subs = cat.subcategories || [];
        return {
          ...cat,
          subcategories: [...subs, { _id: tempId, name: payload.name, isOffline: true }]
        };
      }
      return cat;
    });
    localStorage.setItem('cached_categories', JSON.stringify(updated));
  }

  // 5b. UPDATE SUBCATEGORY
  if (method === 'put' && url.includes('/subcategories/')) {
    const parts = url.split('/');
    const catId = parts[2]; // /categories/:catId/subcategories/:subId
    const subId = parts[4];
    const cached = JSON.parse(localStorage.getItem('cached_categories') || '[]');
    const updated = cached.map((cat: any) => {
      if (cat._id === catId) {
        const subs = (cat.subcategories || []).map((sub: any) => {
          if (sub._id === subId) {
            return { ...sub, name: payload.name, isOffline: true };
          }
          return sub;
        });
        return { ...cat, subcategories: subs };
      }
      return cat;
    });
    localStorage.setItem('cached_categories', JSON.stringify(updated));
  }

  // 5c. DELETE SUBCATEGORY
  if (method === 'delete' && url.includes('/subcategories/')) {
    const parts = url.split('/');
    const catId = parts[2]; // /categories/:catId/subcategories/:subId
    const subId = parts[4];
    const cached = JSON.parse(localStorage.getItem('cached_categories') || '[]');
    const updated = cached.map((cat: any) => {
      if (cat._id === catId) {
        const subs = (cat.subcategories || []).filter((sub: any) => sub._id !== subId);
        return { ...cat, subcategories: subs };
      }
      return cat;
    });
    localStorage.setItem('cached_categories', JSON.stringify(updated));
  }

  // 6. CREATE PAYMENT MODE
  if (method === 'post' && url === '/payment-modes') {
    const cached = JSON.parse(localStorage.getItem('cached_payment_modes') || '[]');
    const newMode = {
      _id: tempId,
      name: payload.name,
      isOffline: true,
      subPaymentModes: [],
      createdAt: new Date().toISOString()
    };
    localStorage.setItem('cached_payment_modes', JSON.stringify([newMode, ...cached]));
  }

  // 6b. UPDATE PAYMENT MODE
  if (method === 'put' && url.startsWith('/payment-modes/') && !url.includes('/subpaymentmodes')) {
    const modeId = url.split('/').pop() || '';
    const cached = JSON.parse(localStorage.getItem('cached_payment_modes') || '[]');
    const updated = cached.map((m: any) => {
      if (m._id === modeId) {
        return { ...m, name: payload.name, isOffline: true };
      }
      return m;
    });
    localStorage.setItem('cached_payment_modes', JSON.stringify(updated));
  }

  // 6c. DELETE PAYMENT MODE
  if (method === 'delete' && url.startsWith('/payment-modes/') && !url.includes('/subpaymentmodes')) {
    const modeId = url.split('/').pop() || '';
    const cached = JSON.parse(localStorage.getItem('cached_payment_modes') || '[]');
    const filtered = cached.filter((m: any) => m._id !== modeId);
    localStorage.setItem('cached_payment_modes', JSON.stringify(filtered));
  }

  // 7. ADD SUB-PAYMENT MODE
  if (method === 'post' && url.endsWith('/subpaymentmodes')) {
    const parts = url.split('/');
    const modeId = parts[2]; // /payment-modes/:id/subpaymentmodes
    const cached = JSON.parse(localStorage.getItem('cached_payment_modes') || '[]');
    const updated = cached.map((m: any) => {
      if (m._id === modeId) {
        const subs = m.subPaymentModes || [];
        return {
          ...m,
          subPaymentModes: [...subs, { _id: tempId, name: payload.name, isOffline: true }]
        };
      }
      return m;
    });
    localStorage.setItem('cached_payment_modes', JSON.stringify(updated));
  }

  // 7b. UPDATE SUB-PAYMENT MODE
  if (method === 'put' && url.includes('/subpaymentmodes/')) {
    const parts = url.split('/');
    const modeId = parts[2]; // /payment-modes/:modeId/subpaymentmodes/:subId
    const subId = parts[4];
    const cached = JSON.parse(localStorage.getItem('cached_payment_modes') || '[]');
    const updated = cached.map((m: any) => {
      if (m._id === modeId) {
        const subs = (m.subPaymentModes || []).map((sub: any) => {
          if (sub._id === subId) {
            return { ...sub, name: payload.name, isOffline: true };
          }
          return sub;
        });
        return { ...m, subPaymentModes: subs };
      }
      return m;
    });
    localStorage.setItem('cached_payment_modes', JSON.stringify(updated));
  }

  // 7c. DELETE SUB-PAYMENT MODE
  if (method === 'delete' && url.includes('/subpaymentmodes/')) {
    const parts = url.split('/');
    const modeId = parts[2]; // /payment-modes/:modeId/subpaymentmodes/:subId
    const subId = parts[4];
    const cached = JSON.parse(localStorage.getItem('cached_payment_modes') || '[]');
    const updated = cached.map((m: any) => {
      if (m._id === modeId) {
        const subs = (m.subPaymentModes || []).filter((sub: any) => sub._id !== subId);
        return { ...m, subPaymentModes: subs };
      }
      return m;
    });
    localStorage.setItem('cached_payment_modes', JSON.stringify(updated));
  }
};
