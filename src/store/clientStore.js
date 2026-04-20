// src/store/clientStore.js
// Clients are now stored in MongoDB via the Vercel backend.
// Local Zustand state is a cache — synced on load and after mutations.

import { create } from 'zustand'
import {
  mongoCreateClient,
  mongoGetAllClients,
  mongoPatchClient,
  mongoDeleteClient,
} from '../services/mongoApi'

export const useClientStore = create((set, get) => ({
  clients: [],
  loading: false,
  error: null,

  // ── Load all clients from MongoDB ────────────────────────────────────────
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

  // ── Create client in MongoDB ─────────────────────────────────────────────
  addClient: async ({ name, clientId, clientUsername, clientPassword }) => {
    const res = await mongoCreateClient({ name, clientId, clientUsername, clientPassword })
    const client = res.data
    set((state) => ({ clients: [client, ...state.clients] }))
    return client
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
  // ClientDetailPage uses useParams clientId which is now the MongoDB clientId
  getClient: (clientId) =>
    get().clients.find((c) => c.clientId === clientId),

  // ── Folder link ──────────────────────────────────────────────────────────
  setFolderLink: async (clientId, link, sourceType) => {
    // Optimistic local update
    set((state) => ({
      clients: state.clients.map((c) =>
        c.clientId === clientId
          ? { ...c, folderLink: link, sourceType: sourceType || c.sourceType }
          : c
      ),
    }))
    // Persist to MongoDB
    await mongoPatchClient(clientId, { folderLink: link, sourceType: sourceType || 'google-drive' })
  },

  // ── Status update (called during/after ingestion) ────────────────────────
  setClientStatus: async (clientId, status, extra = {}) => {
    // Optimistic local update first so UI reflects immediately
    set((state) => ({
      clients: state.clients.map((c) =>
        c.clientId === clientId ? { ...c, status, ...extra } : c
      ),
    }))
    // Persist to MongoDB (non-blocking — don't await in hot path)
    mongoPatchClient(clientId, { status, ...extra }).catch((err) =>
      console.warn('setClientStatus sync failed:', err.message)
    )
  },
}))