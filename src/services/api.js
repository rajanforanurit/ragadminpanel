import axios from 'axios'
import { getApiKey } from '../store/settingsStore'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://ragapi-frd0aeaeajh7gthx.southindia-01.azurewebsites.net'

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 120000,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  const apiKey = getApiKey()
  if (apiKey) {
    config.headers['Authorization'] = `Bearer ${apiKey}`
  }
  return config
})

// ── Health ──────────────────────────────────────────────────────────────────
export const checkHealth = () => api.get('/health')

// ── Storage status ──────────────────────────────────────────────────────────
export const getStorageStatus = () => api.get('/storage/status')

// ── Documents ───────────────────────────────────────────────────────────────
export const listDocuments = () => api.get('/documents')
export const getDocument = (docId) => api.get(`/document/${docId}`)
export const deleteDocument = (docId) => api.delete(`/document/${docId}`)
export const getChunks = (docId) => api.get(`/chunks/${docId}`)

// ── Ingestion ────────────────────────────────────────────────────────────────

export const ingestGoogleDriveStart = (folderId, label, extraMetadata = {}) => {
  const { client_id, ...restMeta } = extraMetadata
  return api.post('/ingest/google-drive', {
    client_id: client_id || '',
    folder_id: folderId,
    label,
    recursive: true,
    extra_metadata: restMeta,
  })
}

export const ingestGoogleDriveStatus = (requestId) =>
  api.get(`/ingest/google-drive/status/${requestId}`)

export const ingestGoogleDrive = (folderId, label, onProgress = null, extraMetadata = {}, intervalMs = 4000) => {
  return new Promise(async (resolve, reject) => {
    try {
      const startRes = await ingestGoogleDriveStart(folderId, label, extraMetadata)
      const { request_id } = startRes.data

      if (onProgress) onProgress('pending', request_id)

      const poll = setInterval(async () => {
        try {
          const statusRes = await ingestGoogleDriveStatus(request_id)
          const job = statusRes.data

          if (onProgress) onProgress(job.status, request_id)

          if (job.status === 'done') {
            clearInterval(poll)
            resolve(job.result)
          } else if (job.status === 'error') {
            clearInterval(poll)
            reject(new Error(job.detail || 'Ingestion failed'))
          }
        } catch (pollErr) {
          clearInterval(poll)
          reject(pollErr)
        }
      }, intervalMs)

    } catch (startErr) {
      reject(startErr)
    }
  })
}

export const ingestSharePoint = (siteUrl, folderPath, label, extraMetadata = {}) => {
  const { client_id, ...restMeta } = extraMetadata
  return api.post('/ingest/sharepoint', {
    client_id: client_id || '',
    site_url: siteUrl,
    folder_path: folderPath,
    label,
    extra_metadata: restMeta,
  })
}

export const ingestLocalDirectory = (directoryPath, label, extraMetadata = {}) => {
  const { client_id, ...restMeta } = extraMetadata
  return api.post('/ingest/local-directory', {
    client_id: client_id || '',
    directory_path: directoryPath,
    label,
    extra_metadata: restMeta,
  })
}

export const scanDirectory = (directoryPath) =>
  api.post('/scan-directory', { directory_path: directoryPath })

export const rebuildIndex = (docId = null, force = false) =>
  api.post('/rebuild-index', { doc_id: docId, force })

// ── Helper: extract Google Drive folder ID from a link ───────────────────────
export function extractDriveFolderId(link) {
  if (!link) return null
  const m1 = link.match(/\/folders\/([a-zA-Z0-9_-]+)/)
  if (m1) return m1[1]
  const m2 = link.match(/folders\/([a-zA-Z0-9_-]+)/)
  if (m2) return m2[1]
  if (/^[a-zA-Z0-9_-]{10,}$/.test(link.trim())) return link.trim()
  return null
}

// ── Helper: detect source type from link ────────────────────────────────────
export function detectSourceType(link) {
  if (!link) return 'google-drive'
  if (link.includes('drive.google.com')) return 'google-drive'
  if (link.includes('sharepoint.com')) return 'sharepoint'
  if (link.startsWith('/') || link.match(/^[A-Z]:\\/)) return 'local'
  return 'google-drive'
}

export default api