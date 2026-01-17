import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Theme = 'light' | 'dark' | 'system';

interface SettingsState {
  theme: Theme;
  fontSizeScale: number; // 0.75 to 2.0
  setTheme: (theme: Theme) => void;
  setFontSizeScale: (scale: number) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      theme: 'system',
      fontSizeScale: 1.0,
      setTheme: (theme) => set({ theme }),
      setFontSizeScale: (scale) => set({ fontSizeScale: scale }),
    }),
    {
      name: 'flowforge-settings',
    },
  ),
);
