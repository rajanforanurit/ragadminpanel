import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useSettingsStore = create(
  persist(
    (set, get) => ({
      apiKey: '',
      setApiKey: (key) => set({ apiKey: key }),
      getApiKey: () => get().apiKey,
    }),
    { name: 'rag-admin-settings' }
  )
)
