import { create } from 'zustand';

interface HeaderStore {
  extraTitle: string;
  setExtraTitle: (title: string) => void;
}

export const useHeaderStore = create<HeaderStore>((set) => ({
  extraTitle: '',
  setExtraTitle: (extraTitle) => set({ extraTitle }),
}));
