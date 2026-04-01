import { create } from 'zustand';

interface ThemeState {
  theme: 'light' | 'dark';
  accentColor: string; // Hex color for primary
  radius: number; // Border radius in rem
  swipeAction: 'right-to-edit' | 'left-to-edit'; // Configure swipe direction for edit vs delete
  setTheme: (theme: 'light' | 'dark') => void;
  setAccentColor: (color: string) => void;
  setRadius: (radius: number) => void;
  setSwipeAction: (action: 'right-to-edit' | 'left-to-edit') => void;
}

const getInitialState = () => {
  if (typeof window === 'undefined') {
    return { theme: 'dark' as const, accentColor: '#6bfe9c', radius: 1, swipeAction: 'right-to-edit' as const };
  }
  const stored = localStorage.getItem('lumina_theme');
  if (stored) return JSON.parse(stored);
  return { theme: 'dark' as const, accentColor: '#6bfe9c', radius: 1, swipeAction: 'right-to-edit' as const };
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
  setSwipeAction: (swipeAction) => set((state) => {
    const newState = { ...state, swipeAction };
    localStorage.setItem('lumina_theme', JSON.stringify(newState));
    return newState;
  }),
}));
