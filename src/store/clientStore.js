import { create } from 'zustand'
import {
  mongoCreateClient,
  mongoGetAllClients,
  mongoGetClientWithKey,
  mongoPatchClient,
  mongoDeleteClient,
} from '../services/mongoApi'

export const useClientStore = create((set, get) => ({
  clients: [],
  loading: false,
  error: null,

  fetchClients: async () => {
    set({ loading: true, error: null })
    try {
      const res = await mongoGetAllClients()
      set({ clients: res.data.clients || [], loading: false })
    } catch (err) {
      set({ loading: false, error: err.message })
      throw err
    }
  },

  addClient: async ({ name, clientId, apiKey }) => {
    const res = await mongoCreateClient({ name, clientId, apiKey })
    // Backend returns full doc including apiKey on creation
    const client = { ...res.data, apiKey }
    set((state) => ({ clients: [client, ...state.clients] }))
    return client
  },

  // Fetch a single client's full record including apiKey (for detail page)
  fetchClientWithKey: async (clientId) => {
    try {
      const res = await mongoGetClientWithKey(clientId)
      const updated = res.data
      set((state) => ({
        clients: state.clients.map((c) =>
          c.clientId === clientId ? { ...c, ...updated } : c
        ),
      }))
      return updated
    } catch (err) {
      console.warn('[fetchClientWithKey] failed:', err.message)
      return null
    }
  },

  regenerateApiKey: async (clientId, newApiKey) => {
    // PATCH sends new key to backend, which evicts old key from cache
    await mongoPatchClient(clientId, { apiKey: newApiKey, apiKeyRotatedAt: new Date().toISOString() })
    // Update local store — backend response omits apiKey, so we set it manually
    set((state) => ({
      clients: state.clients.map((c) =>
        c.clientId === clientId
          ? { ...c, apiKey: newApiKey, apiKeyRotatedAt: new Date().toISOString() }
          : c
      ),
    }))
    return newApiKey
  },

  // ── Patch any fields in MongoDB then update local cache ──────────────────
  updateClient: async (clientId, updates) => {
    const res = await mongoPatchClient(clientId, updates)
    const updated = res.data
    set((state) => ({
      clients: state.clients.map((c) =>
        c.clientId === clientId ? { ...c, ...updated } : c
      ),
    }))
    return updated
  },

  // ── Delete from MongoDB then remove from local cache ─────────────────────
  removeClient: async (clientId) => {
    await mongoDeleteClient(clientId)
    set((state) => ({
      clients: state.clients.filter((c) => c.clientId !== clientId),
    }))
  },

  // ── Lookup helpers ───────────────────────────────────────────────────────
  getClient: (clientId) =>
    get().clients.find((c) => c.clientId === clientId),

  // ── Folder link ──────────────────────────────────────────────────────────
  setFolderLink: async (clientId, link, sourceType) => {
    set((state) => ({
      clients: state.clients.map((c) =>
        c.clientId === clientId
          ? { ...c, folderLink: link, sourceType: sourceType || c.sourceType }
          : c
      ),
    }))
    await mongoPatchClient(clientId, { folderLink: link, sourceType: sourceType || 'google-drive' })
  },

  setClientStatus: async (clientId, status, extra = {}) => {
    set((state) => ({
      clients: state.clients.map((c) =>
        c.clientId === clientId ? { ...c, status, ...extra } : c
      ),
    }))
    mongoPatchClient(clientId, { status, ...extra }).catch((err) =>
      console.warn('setClientStatus sync failed:', err.message)
    )
  },
}))
