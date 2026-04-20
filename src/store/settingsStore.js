import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const ENV_KEY = import.meta.env.VITE_RAG_API_KEY || ''

export const useSettingsStore = create(
  persist(
    (set, get) => ({
      apiKey: ENV_KEY,
      setApiKey: (key) => set({ apiKey: key }),
      getApiKey: () => get().apiKey,
    }),
    {
      name: 'rag-admin-settings',
      onRehydrateStorage: () => (state) => {
        if (state && !state.apiKey && ENV_KEY) {
          state.apiKey = ENV_KEY
        }
      },
    }
  )
)

export function getApiKey() {
  return useSettingsStore.getState().apiKey || ENV_KEY
}