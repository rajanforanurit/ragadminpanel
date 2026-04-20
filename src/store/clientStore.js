// src/store/clientStore.js

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useClientStore = create(
  persist(
    (set, get) => ({
      clients: [],
      activeClient: null,

      addClient: ({
        name,
        clientId,
        clientUsername,
        clientPassword,
      }) => {
        try {
          if (!name || !clientId) {
            throw new Error(
              'Client name and Client ID are required'
            )
          }

          const client = {
            id: `client_${Date.now()}`,
            name: name.trim(),
            clientId: clientId.trim(),

            // NEW AUTH FIELDS
            clientUsername: clientUsername.trim(),
            clientPassword: clientPassword.trim(),

            folderLink: '',
            sourceType: 'google-drive',

            createdAt: new Date().toISOString(),
            lastRunAt: null,

            status: 'idle',
            documentsCount: 0,
            lastError: null,

            autoSync: false,
            watchIntervalMs: 5 * 60 * 1000,
          }

          set((state) => ({
            clients: [...state.clients, client],
          }))

          return client
        } catch (error) {
          console.error(
            'addClient() failed:',
            error
          )
          throw new Error(
            error?.message ||
              'Unable to create client'
          )
        }
      },

      updateClient: (id, updates) => {
        set((state) => ({
          clients: state.clients.map((c) =>
            c.id === id
              ? { ...c, ...updates }
              : c
          ),
        }))
      },

      removeClient: (id) => {
        set((state) => ({
          clients: state.clients.filter(
            (c) => c.id !== id
          ),
          activeClient:
            state.activeClient === id
              ? null
              : state.activeClient,
        }))
      },

      setActiveClient: (id) =>
        set({ activeClient: id }),

      getClient: (id) =>
        get().clients.find((c) => c.id === id),

      setFolderLink: (
        id,
        link,
        sourceType
      ) => {
        set((state) => ({
          clients: state.clients.map((c) =>
            c.id === id
              ? {
                  ...c,
                  folderLink: link,
                  sourceType:
                    sourceType || c.sourceType,
                }
              : c
          ),
        }))
      },

      setClientStatus: (
        id,
        status,
        extra = {}
      ) => {
        set((state) => ({
          clients: state.clients.map((c) =>
            c.id === id
              ? {
                  ...c,
                  status,
                  ...extra,
                }
              : c
          ),
        }))
      },
    }),
    {
      name: 'rag-admin-clients',
    }
  )
)