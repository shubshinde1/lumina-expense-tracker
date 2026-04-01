import { create } from 'zustand';

interface User {
  _id: string;
  name: string;
  email: string;
  plan: string;
  role: string;
  token: string;
}

interface AuthState {
  user: User | null;
  setUser: (user: User) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('lumina_user') || 'null') : null,
  setUser: (user) => {
    localStorage.setItem('lumina_user', JSON.stringify(user));
    set({ user });
  },
  logout: () => {
    localStorage.removeItem('lumina_user');
    set({ user: null });
  },
}));
