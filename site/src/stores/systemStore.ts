import { create } from "zustand";
import { persist } from "zustand/middleware";
import { apiGet } from "../lib/api";

interface SystemSettings {
  initialized: boolean;
  defaultLanguage: "en" | "zh";
}

interface SystemStore {
  settings: SystemSettings | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  checkInitialized: () => Promise<boolean>;
  getSettings: () => Promise<void>;
  setSettings: (settings: SystemSettings) => void;
  clearSettings: () => void;
}

export const useSystemStore = create<SystemStore>()(
  persist(
    (set, _get) => ({
      settings: null,
      isLoading: false,
      error: null,

      checkInitialized: async () => {
        set({ isLoading: true, error: null });
        try {
          const response = await apiGet("/api/system/initialized");
          const data = await response.json();

          if (!response.ok) {
            throw new Error(data.error || "Failed to check initialization");
          }

          return data.initialized;
        } catch (error: any) {
          set({ error: error.message });
          return false;
        } finally {
          set({ isLoading: false });
        }
      },

      getSettings: async () => {
        set({ isLoading: true, error: null });
        try {
          const response = await apiGet("/api/system/settings");
          const data = await response.json();

          if (!response.ok) {
            throw new Error(data.error || "Failed to get settings");
          }

          set({
            settings: {
              initialized: data.initialized,
              defaultLanguage: data.general?.defaultLanguage || "en",
            },
          });
        } catch (error: any) {
          set({ error: error.message });
        } finally {
          set({ isLoading: false });
        }
      },

      setSettings: (settings) => {
        set({ settings });
      },

      clearSettings: () => {
        set({ settings: null, error: null });
      },
    }),
    {
      name: "system-storage",
      partialize: (state) => ({ settings: state.settings }),
    }
  )
);
