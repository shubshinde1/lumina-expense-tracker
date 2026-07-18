import { create } from 'zustand';

interface ThemeState {
  theme: 'light' | 'dark' | 'system';
  accentColor: string; // Hex color for primary
  radius: number; // Border radius in rem
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  setAccentColor: (color: string) => void;
  setRadius: (radius: number) => void;
}

const getInitialState = () => {
  if (typeof window === 'undefined') {
    return { theme: 'system' as const, accentColor: '#6bfe9c', radius: 1 };
  }
  const stored = localStorage.getItem('lumina_theme');
  if (stored) return JSON.parse(stored);
  return { theme: 'system' as const, accentColor: '#6bfe9c', radius: 1 };
};

export const useThemeStore = create<ThemeState>((set) => ({
  ...getInitialState(),
  setTheme: (theme) => set((state) => {
    const newState = { ...state, theme };
    localStorage.setItem('lumina_theme', JSON.stringify(newState));
    return newState;
  }),
  setAccentColor: (accentColor) => set((state) => {
    const newState = { ...state, accentColor };
    localStorage.setItem('lumina_theme', JSON.stringify(newState));
    return newState;
  }),
  setRadius: (radius) => set((state) => {
    const newState = { ...state, radius };
    localStorage.setItem('lumina_theme', JSON.stringify(newState));
    return newState;
  }),
}));
