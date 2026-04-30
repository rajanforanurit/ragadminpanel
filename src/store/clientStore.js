// src/store/clientStore.js
import { create } from 'zustand'
import {
  mongoCreateClient,
  mongoGetAllClients,
  mongoGetClient,
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
      console.error("Failed to fetch clients:", err)
      throw err
    }
  },

  // ── Improved addClient with better error handling ─────────────────────
  addClient: async ({ name, clientId, apiKey }) => {
    try {
      console.log("Creating client with:", { 
        name, 
        clientId, 
        apiKey: apiKey?.slice(0, 20) + '...' 
      });

      const res = await mongoCreateClient({ name, clientId, apiKey });

      const client = { 
        ...res.data, 
        apiKey 
      };

      set((state) => ({ 
        clients: [client, ...state.clients] 
      }));

      return client;

    } catch (err) {
      console.error("=== FULL CREATE CLIENT ERROR ===");
      console.error("Status:", err.response?.status);
      console.error("Response Data:", err.response?.data);
      console.error("Full Error:", err);

      let userMessage = "Failed to create client";

      if (err.response?.status === 409) {
        userMessage = err.response.data?.error 
          || "A client with this Client ID or API Key already exists. Please use a different Client ID.";
      } 
      else if (err.response?.status === 400) {
        userMessage = err.response.data?.error 
          || "Missing required fields (name, clientId, or apiKey)";
      } 
      else if (err.response?.status === 401) {
        userMessage = "Authentication failed. Please check your Admin API Key.";
      } 
      else if (err.response?.status === 500) {
        userMessage = "Server error. Please try again later.";
      }

      // Also update store error state
      set({ error: userMessage });

      throw new Error(userMessage);
    }
  },

  // Fetch a single client's full record including apiKey
  fetchClientWithKey: async (clientId) => {
    try {
      const res = await mongoGetClient(clientId)
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
    await mongoPatchClient(clientId, { 
      apiKey: newApiKey, 
      apiKeyRotatedAt: new Date().toISOString() 
    })
    
    set((state) => ({
      clients: state.clients.map((c) =>
        c.clientId === clientId
          ? { ...c, apiKey: newApiKey, apiKeyRotatedAt: new Date().toISOString() }
          : c
      ),
    }))
    return newApiKey
  },

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

  removeClient: async (clientId) => {
    await mongoDeleteClient(clientId)
    set((state) => ({
      clients: state.clients.filter((c) => c.clientId !== clientId),
    }))
  },

  getClient: (clientId) =>
    get().clients.find((c) => c.clientId === clientId),

  setFolderLink: async (clientId, link, sourceType) => {
    set((state) => ({
      clients: state.clients.map((c) =>
        c.clientId === clientId
          ? { ...c, folderLink: link, sourceType: sourceType || c.sourceType }
          : c
      ),
    }))
    await mongoPatchClient(clientId, { 
      folderLink: link, 
      sourceType: sourceType || 'google-drive' 
    })
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
