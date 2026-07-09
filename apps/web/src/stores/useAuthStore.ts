import { create } from 'zustand';

interface User {
  _id: string;
  name: string;
  email: string;
  plan: string;
  role: string;
  settings?: {
    autoOpenKeyboard: boolean;
  };
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
    
    // Sync session to native Android SharedPreferences
    (async () => {
      try {
        const { Capacitor, registerPlugin } = await import("@capacitor/core");
        if (Capacitor.isNativePlatform() && user) {
          const LuminaBridge = registerPlugin<any>('LuminaBridge');
          
          const getBaseURL = () => {
            if (process.env.NEXT_PUBLIC_API_URL) return process.env.NEXT_PUBLIC_API_URL;
            return 'https://lumina-expense-tracker-85ym.vercel.app/api';
          };
          
          await LuminaBridge.saveUserSession({
            token: user.token,
            email: user.email,
            apiUrl: getBaseURL()
          });
          console.log("✅ Synchronized auth session to native storage");
        }
      } catch (err) {
        console.warn("⚠️ Failed to sync session to native:", err);
      }
    })();

    set({ user });
  },
  logout: () => {
    localStorage.removeItem('lumina_user');
    
    // Clear session from native Android SharedPreferences
    (async () => {
      try {
        const { Capacitor, registerPlugin } = await import("@capacitor/core");
        if (Capacitor.isNativePlatform()) {
          const LuminaBridge = registerPlugin<any>('LuminaBridge');
          await LuminaBridge.clearUserSession();
          console.log("🧹 Cleared native auth session");
        }
      } catch (err) {
        console.warn("⚠️ Failed to clear native session:", err);
      }
    })();

    set({ user: null });
  },
}));
