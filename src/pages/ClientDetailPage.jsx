import React, { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useClientStore } from '../store/clientStore'
import { getApiKey } from '../store/settingsStore'
import {
  ingestGoogleDrive, ingestSharePoint, ingestLocalDirectory,
  extractDriveFolderId, detectSourceType
} from '../services/api'
import toast from 'react-hot-toast'
import {
  ArrowLeft, Link, Play, RefreshCw, Save, Trash2,
  Clock, CheckCircle, AlertCircle, ToggleLeft,
  ToggleRight, FileText, Zap, Edit2, X, Info, HardDrive, Globe,
  Key, Copy, ShieldAlert, Eye, EyeOff
} from 'lucide-react'
import { formatDistanceToNow, format } from 'date-fns'

function RunLog({ run }) {
  return (
    <div style={{
      padding: '12px 14px', borderRadius: 8,
      background: '#1a1a24', border: `1px solid ${run.success ? 'rgba(34,211,160,0.2)' : 'rgba(244,63,94,0.2)'}`,
      marginBottom: 8,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {run.success
            ? <CheckCircle size={13} color="#22d3a0" />
            : <AlertCircle size={13} color="#f43f5e" />}
          <span style={{ fontSize: 12, fontWeight: 600, color: run.success ? '#22d3a0' : '#f43f5e' }}>
            {run.success ? 'Success' : 'Failed'}
          </span>
        </div>
        <span style={{ fontSize: 10, color: '#555570', fontFamily: "'Space Mono', monospace" }}>
          {format(new Date(run.timestamp), 'MMM d, HH:mm:ss')}
        </span>
      </div>
      {run.summary && (
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {[
            ['Docs', run.summary.documents_processed],
            ['Chunks', run.summary.total_chunks],
            ['Uploaded', run.summary.uploads_succeeded],
            ['Failed', run.summary.uploads_failed],
            ['Time', `${run.summary.elapsed_seconds?.toFixed(1)}s`],
          ].map(([k, v]) => (
            <div key={k} style={{ fontSize: 11 }}>
              <span style={{ color: '#555570' }}>{k}: </span>
              <span style={{ color: '#8888aa', fontFamily: "'Space Mono', monospace" }}>{v ?? '—'}</span>
            </div>
          ))}
        </div>
      )}
      {run.error && (
        <div style={{ fontSize: 11, color: '#f43f5e', marginTop: 6, fontFamily: "'Space Mono', monospace", wordBreak: 'break-word' }}>
          {typeof run.error === 'string' ? run.error : JSON.stringify(run.error)}
        </div>
      )}
    </div>
  )
}

function isWindowsPath(link) {
  if (!link) return false
  return /^[A-Za-z]:[/\\]/.test(link) || link.startsWith('\\\\')
}

function SourceTypePicker({ value, onChange }) {
  const options = [
    { id: 'google-drive', label: 'Google Drive', icon: Globe },
    { id: 'sharepoint',   label: 'SharePoint',   icon: Globe },
    { id: 'local',        label: 'Server Path',  icon: HardDrive },
  ]
  return (
    <div style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
      {options.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          type="button"
          onClick={() => onChange(id)}
          style={{
            flex: 1, padding: '8px 10px',
            background: value === id ? 'rgba(108,99,255,0.15)' : '#1a1a24',
            border: `1px solid ${value === id ? 'rgba(108,99,255,0.5)' : '#2a2a3d'}`,
            borderRadius: 8, cursor: 'pointer',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
            transition: 'all 0.15s',
          }}
        >
          <Icon size={14} color={value === id ? '#6c63ff' : '#555570'} />
          <span style={{
            fontFamily: "'Syne', sans-serif", fontSize: 11, fontWeight: 700,
            color: value === id ? '#6c63ff' : '#555570',
            textTransform: 'uppercase', letterSpacing: '0.06em',
          }}>{label}</span>
        </button>
      ))}
    </div>
  )
}

function parseErrorMsg(err) {
  try {
    const detail = err?.response?.data?.detail
    if (typeof detail === 'string') return detail
    if (Array.isArray(detail)) {
      return detail.map(e => e?.msg || JSON.stringify(e)).join(', ')
    }
    if (detail && typeof detail === 'object') {
      return detail.msg || JSON.stringify(detail)
    }
    if (err?.message) return err.message
  } catch (_) { /* ignore */ }
  return 'Ingestion failed'
}

export default function ClientDetailPage() {
  const { clientId } = useParams()
  const navigate = useNavigate()
  const {
    clients, fetchClients, fetchClientWithKey,
    getClient, setFolderLink, setClientStatus,
    updateClient, removeClient, regenerateApiKey,
  } = useClientStore()

  // ── FIX: Don't redirect immediately — wait for clients to load first ──────
  const [initialised, setInitialised] = useState(clients.length > 0)
  const [showFullKey, setShowFullKey] = useState(false)

  useEffect(() => {
    if (clients.length === 0) {
      fetchClients()
        .then(() => setInitialised(true))
        .catch(() => setInitialised(true))
    }
  }, [])

  const client = getClient(clientId)

  // ── FIX: Load full client record (including apiKey) on mount ──────────────
  useEffect(() => {
    if (client && client.apiKey === undefined) {
      fetchClientWithKey(clientId)
    }
  }, [client?.clientId])

  const [folderInput, setFolderInput] = useState(client?.folderLink || '')
  const [manualSourceType, setManualSourceType] = useState(client?.sourceType || 'google-drive')
  const [editingFolder, setEditingFolder] = useState(!client?.folderLink)
  const [running, setRunning] = useState(false)
  const [regenerating, setRegenerating] = useState(false)
  const [newKeyPreview, setNewKeyPreview] = useState(null)
  const [runLogs, setRunLogs] = useState(() => {
    try { return JSON.parse(localStorage.getItem(`run-logs-${clientId}`) || '[]') } catch { return [] }
  })
  const watcherRef = useRef(null)

  // ── FIX: Only redirect after we've tried to load clients ─────────────────
  useEffect(() => {
    if (initialised && !getClient(clientId)) {
      navigate('/clients', { replace: true })
    }
  }, [initialised, clientId])

  useEffect(() => {
    if (client?.folderLink) setFolderInput(client.folderLink)
    if (client?.sourceType) setManualSourceType(client.sourceType)
  }, [client?.folderLink, client?.sourceType])

  useEffect(() => {
    const detected = detectSourceType(folderInput)
    setManualSourceType(detected)
  }, [folderInput])

  useEffect(() => {
    if (watcherRef.current) clearInterval(watcherRef.current)
    if (client?.autoSync && client?.folderLink) {
      const interval = client.watchIntervalMs || 5 * 60 * 1000
      watcherRef.current = setInterval(() => { runIngestion(true) }, interval)
    }
    return () => { if (watcherRef.current) clearInterval(watcherRef.current) }
  }, [client?.autoSync, client?.folderLink, client?.watchIntervalMs])

  if (!initialised) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, color: '#555570', fontSize: 13 }}>
        Loading…
      </div>
    )
  }
  if (!client) return null

  function saveRunLog(log) {
    const updated = [log, ...runLogs].slice(0, 20)
    setRunLogs(updated)
    localStorage.setItem(`run-logs-${clientId}`, JSON.stringify(updated))
  }

  async function saveFolderLink() {
    if (!folderInput.trim()) return toast.error('Folder link cannot be empty')
    setFolderLink(clientId, folderInput.trim(), manualSourceType)
    setEditingFolder(false)
    toast.success('Folder link saved permanently')
  }

  async function runIngestion(silent = false) {
    if (!client.folderLink) return toast.error('Set a folder link first')
    if (!getApiKey()) return toast.error('Add your API key in Settings first')
    if (running) return

    const sourceType = client.sourceType || manualSourceType

    if (sourceType === 'local' && isWindowsPath(client.folderLink)) {
      const errMsg = `Windows path "${client.folderLink}" cannot exist on the Render server (Linux). ` +
        'Upload your files to Google Drive and use a Google Drive folder URL instead.'
      setClientStatus(clientId, 'error', { lastRunAt: new Date().toISOString(), lastError: errMsg })
      saveRunLog({ timestamp: new Date().toISOString(), success: false, error: errMsg })
      toast.error('Windows paths do not work — use Google Drive instead', { duration: 5000 })
      return
    }

    setRunning(true)
    setClientStatus(clientId, 'running')
    if (!silent) toast.loading('Starting ingestion pipeline...', { id: 'ingest' })

    const startTime = Date.now()
    try {
      let res

      if (sourceType === 'google-drive') {
        const folderId = extractDriveFolderId(client.folderLink)
        if (!folderId) throw new Error(
          'Could not extract Google Drive folder ID. ' +
          'Expected: https://drive.google.com/drive/folders/FOLDER_ID'
        )
        if (!silent) toast.loading('Job queued — waiting for pipeline...', { id: 'ingest' })
        res = await ingestGoogleDrive(
          folderId,
          client.name,
          (jobStatus) => {
            if (!silent) {
              if (jobStatus === 'running') toast.loading('Downloading & embedding...', { id: 'ingest' })
              if (jobStatus === 'pending') toast.loading('Job queued — waiting for pipeline...', { id: 'ingest' })
            }
          },
          { client_id: client.clientId },
        )
        const summary = res
        const docsCount = summary?.documents_processed || summary?.files_found || 0
        setClientStatus(clientId, 'success', {
          lastRunAt: new Date().toISOString(),
          documentsCount: docsCount,
          lastError: null,
        })
        saveRunLog({ timestamp: new Date().toISOString(), success: true, summary, elapsed: Date.now() - startTime })
        if (!silent) toast.success(`Ingestion complete — ${docsCount} docs processed`, { id: 'ingest' })
        else toast.success(`Auto-sync: ${docsCount} docs for ${client.name}`)
        setRunning(false)
        return

      } else if (sourceType === 'sharepoint') {
        const url = new URL(client.folderLink)
        const parts = url.pathname.split('/')
        const siteIdx = parts.findIndex(p => p === 'sites')
        const sitePath = siteIdx >= 0 ? parts.slice(0, siteIdx + 2).join('/') : ''
        const siteUrl = `${url.protocol}//${url.hostname}${sitePath}`
        const folderPath = url.pathname.replace(sitePath, '').replace(/^\//, '') || 'Shared Documents'
        res = await ingestSharePoint(siteUrl, folderPath, client.name, { client_id: client.clientId })
      } else {
        res = await ingestLocalDirectory(client.folderLink, client.name, { client_id: client.clientId })
      }

      const summary = res.data?.summary
      const docsCount = summary?.documents_processed || res.data?.files_found || 0
      setClientStatus(clientId, 'success', {
        lastRunAt: new Date().toISOString(),
        documentsCount: docsCount,
        lastError: null,
      })
      saveRunLog({ timestamp: new Date().toISOString(), success: true, summary, elapsed: Date.now() - startTime })
      if (!silent) toast.success(`Ingestion complete — ${docsCount} docs processed`, { id: 'ingest' })
      else toast.success(`Auto-sync: ${docsCount} docs for ${client.name}`)

    } catch (err) {
      const msg = parseErrorMsg(err)
      try {
        setClientStatus(clientId, 'error', { lastRunAt: new Date().toISOString(), lastError: msg })
        saveRunLog({ timestamp: new Date().toISOString(), success: false, error: msg, elapsed: Date.now() - startTime })
      } catch (_) { /* store update failed */ }
      if (!silent) toast.error(msg, { id: 'ingest', duration: 6000 })
    } finally {
      setRunning(false)
    }
  }

  function toggleAutoSync() {
    updateClient(clientId, { autoSync: !client.autoSync })
    toast.success(client.autoSync ? 'Auto-sync disabled' : 'Auto-sync enabled')
  }

  function generateNewApiKey() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    const arr = new Uint8Array(28)
    crypto.getRandomValues(arr)
    return 'rak_' + Array.from(arr).map((b) => chars[b % chars.length]).join('')
  }

  async function handleRegenerateKey() {
    if (!confirm(
      `Regenerate API key for "${client.name}"?\n\n` +
      `The existing key will be IMMEDIATELY EXPIRED — any chat sessions using it will stop working. ` +
      `You'll need to share the new key with the client.`
    )) return
    setRegenerating(true)
    try {
      const newKey = generateNewApiKey()
      await regenerateApiKey(client.clientId, newKey)
      setNewKeyPreview(newKey)
      setShowFullKey(true)
      toast.success('API key regenerated — old key is now invalid')
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Failed to regenerate key')
    } finally {
      setRegenerating(false)
    }
  }

  async function copyKey(key) {
    try {
      await navigator.clipboard.writeText(key)
      toast.success('API key copied')
    } catch {
      toast.error('Failed to copy')
    }
  }

  function handleDelete() {
    if (confirm(`Delete client "${client.name}"? This will not remove data from Azure Blob Storage.`)) {
      removeClient(clientId)
      navigate('/clients')
      toast.success('Client deleted')
    }
  }

  const sourceType = client.sourceType || manualSourceType
  const sourceLabel = {
    'google-drive': 'Google Drive',
    'sharepoint': 'SharePoint',
    'local': 'Server Path (Render)',
  }[sourceType] || sourceType

  const savedLinkIsWindowsPath = client.folderLink && isWindowsPath(client.folderLink)

  // The key to display: prefer newKeyPreview (just regenerated), else stored key
  const activeKey = newKeyPreview || client.apiKey || null
  const maskedKey = activeKey
    ? `${activeKey.slice(0, 16)}${'•'.repeat(12)}`
    : null

  return (
    <div className="animate-in">
      <button onClick={() => navigate('/clients')} className="btn btn-ghost btn-sm" style={{ marginBottom: 20 }}>
        <ArrowLeft size={14} /> Back to Clients
      </button>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <h1 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 26, color: '#e8e8f0' }}>
              {client.name}
            </h1>
            <span className={`badge badge-${client.status === 'success' ? 'success' : client.status === 'error' ? 'danger' : client.status === 'running' ? 'warning' : 'muted'}`}>
              {client.status}
            </span>
          </div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 12, color: '#6c63ff' }}>{client.clientId}</span>
            <span style={{ color: '#333348' }}>·</span>
            <span style={{ fontSize: 12, color: '#555570' }}>
              Created {formatDistanceToNow(new Date(client.createdAt), { addSuffix: true })}
            </span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className="btn btn-primary"
            onClick={() => runIngestion(false)}
            disabled={running || !client.folderLink}
          >
            {running ? <><span className="spinner" />Running...</> : <><Play size={14} />Run Ingestion</>}
          </button>
          <button className="btn btn-danger btn-sm" onClick={handleDelete}><Trash2 size={13} /></button>
        </div>
      </div>

      {/* Windows path warning banner */}
      {savedLinkIsWindowsPath && (
        <div style={{
          display: 'flex', gap: 12, padding: '14px 16px', borderRadius: 10, marginBottom: 20,
          background: 'rgba(244,63,94,0.07)', border: '1px solid rgba(244,63,94,0.3)',
        }}>
          <AlertCircle size={16} color="#f43f5e" style={{ flexShrink: 0, marginTop: 2 }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#f43f5e', marginBottom: 6 }}>
              Windows path detected — ingestion will fail
            </div>
            <div style={{ fontSize: 12, color: '#aa6670', lineHeight: 1.65 }}>
              Your backend runs on <strong style={{ color: '#e8e8f0' }}>Render (Linux)</strong>, not your Windows PC.
              The path <code style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: '#f87171' }}>{client.folderLink}</code> does not exist on the server.
              <br /><br />
              <strong style={{ color: '#e8e8f0' }}>Solution:</strong> Upload your docs folder to Google Drive →
              share the folder with your service account → paste the Drive folder URL here.
            </div>
            <button
              className="btn btn-sm"
              style={{ marginTop: 10, background: 'rgba(108,99,255,0.15)', border: '1px solid rgba(108,99,255,0.4)', color: '#6c63ff' }}
              onClick={() => { setFolderInput(''); setManualSourceType('google-drive'); setEditingFolder(true) }}
            >
              Switch to Google Drive
            </button>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 20 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Folder Link */}
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Link size={15} color="#6c63ff" />
                <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 14, color: '#e8e8f0' }}>
                  Documents Folder
                </span>
              </div>
              {!editingFolder && client.folderLink && (
                <button className="btn-icon" onClick={() => setEditingFolder(true)}><Edit2 size={13} /></button>
              )}
            </div>

            {editingFolder ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label>Source Type</label>
                  <SourceTypePicker value={manualSourceType} onChange={setManualSourceType} />
                </div>

                <div>
                  <label>
                    {manualSourceType === 'google-drive' ? 'Google Drive Folder URL'
                      : manualSourceType === 'sharepoint' ? 'SharePoint Folder URL'
                      : 'Server Directory Path'}
                  </label>
                  <input
                    className="input input-mono"
                    placeholder={
                      manualSourceType === 'google-drive'
                        ? 'https://drive.google.com/drive/folders/1BxiMVs0XRA5...'
                        : manualSourceType === 'sharepoint'
                        ? 'https://company.sharepoint.com/sites/HR/Shared Documents/Policies'
                        : '/app/data/docs  ← must exist on Render server, not your PC'
                    }
                    value={folderInput}
                    onChange={e => setFolderInput(e.target.value)}
                    autoFocus
                  />
                </div>

                {manualSourceType === 'local' && (
                  <div style={{
                    display: 'flex', gap: 8, padding: '10px 12px', borderRadius: 8,
                    background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.25)',
                  }}>
                    <Info size={14} color="#f59e0b" style={{ flexShrink: 0, marginTop: 1 }} />
                    <div style={{ fontSize: 12, color: '#9a7030', lineHeight: 1.65 }}>
                      <strong style={{ color: '#f59e0b' }}>Server paths only.</strong> This path must exist on the
                      Render server (Linux), e.g. <code style={{ fontFamily: "'Space Mono', monospace" }}>/app/data/docs</code>.
                      Windows paths like <code style={{ fontFamily: "'Space Mono', monospace" }}>C:\Users\...</code> will fail —
                      use <strong style={{ color: '#e8e8f0' }}>Google Drive</strong> for files on your local machine.
                    </div>
                  </div>
                )}

                {manualSourceType === 'google-drive' && (
                  <div style={{
                    display: 'flex', gap: 8, padding: '10px 12px', borderRadius: 8,
                    background: 'rgba(108,99,255,0.07)', border: '1px solid rgba(108,99,255,0.2)',
                  }}>
                    <Info size={14} color="#6c63ff" style={{ flexShrink: 0, marginTop: 1 }} />
                    <div style={{ fontSize: 12, color: '#6c63ff', lineHeight: 1.65 }}>
                      Share your Drive folder with the service account email in
                      <code style={{ fontFamily: "'Space Mono', monospace", fontSize: 11 }}> GOOGLE_SERVICE_ACCOUNT_JSON</code> on the backend (Viewer role).
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-primary btn-sm" onClick={saveFolderLink} disabled={!folderInput.trim()}>
                    <Save size={13} /> Save Permanently
                  </button>
                  {client.folderLink && (
                    <button className="btn btn-ghost btn-sm" onClick={() => {
                      setFolderInput(client.folderLink)
                      setManualSourceType(client.sourceType || 'google-drive')
                      setEditingFolder(false)
                    }}>
                      <X size={13} /> Cancel
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div>
                <div style={{
                  padding: '12px 14px', borderRadius: 8, background: '#1a1a24',
                  border: '1px solid #2a2a3d', marginBottom: 10,
                }}>
                  <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 12, color: '#8888aa', wordBreak: 'break-all' }}>
                    {client.folderLink}
                  </div>
                </div>
                <div style={{ fontSize: 12, color: '#555570' }}>
                  Source type: <span style={{ color: '#6c63ff' }}>{sourceLabel}</span>
                </div>
              </div>
            )}
          </div>

          {/* Auto-sync */}
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <RefreshCw size={15} color={client.autoSync ? '#22d3a0' : '#555570'} />
                  <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 14, color: '#e8e8f0' }}>Auto-Sync</span>
                  {client.autoSync && <span className="badge badge-success">Active</span>}
                </div>
                <p style={{ fontSize: 12, color: '#555570' }}>
                  Re-run ingestion on a schedule to pick up new files.
                  {client.autoSync && ` Every ${Math.round((client.watchIntervalMs || 300000) / 60000)} min.`}
                </p>
              </div>
              <button
                onClick={toggleAutoSync}
                disabled={!client.folderLink}
                style={{ background: 'none', border: 'none', cursor: client.folderLink ? 'pointer' : 'not-allowed', opacity: client.folderLink ? 1 : 0.4 }}
              >
                {client.autoSync ? <ToggleRight size={32} color="#22d3a0" /> : <ToggleLeft size={32} color="#555570" />}
              </button>
            </div>
            {client.autoSync && (
              <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #2a2a3d' }}>
                <label>Sync Interval</label>
                <select
                  className="input"
                  value={client.watchIntervalMs || 300000}
                  onChange={e => updateClient(clientId, { watchIntervalMs: Number(e.target.value) })}
                  style={{ background: '#1a1a24' }}
                >
                  <option value={60000}>Every 1 minute</option>
                  <option value={300000}>Every 5 minutes</option>
                  <option value={900000}>Every 15 minutes</option>
                  <option value={1800000}>Every 30 minutes</option>
                  <option value={3600000}>Every 1 hour</option>
                </select>
              </div>
            )}
          </div>

          {/* API Key Management — FIXED: shows persistent key, supports reveal/hide */}
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Key size={15} color="#6c63ff" />
                <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 14, color: '#e8e8f0' }}>
                  API Key
                </span>
                {client.apiKeyRotatedAt && (
                  <span style={{ fontSize: 10, color: '#555570', fontFamily: "'Space Mono', monospace" }}>
                    rotated {formatDistanceToNow(new Date(client.apiKeyRotatedAt), { addSuffix: true })}
                  </span>
                )}
              </div>
              <button
                className="btn btn-sm"
                style={{
                  background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.25)',
                  color: '#f43f5e', display: 'flex', alignItems: 'center', gap: 6,
                  fontSize: 12, padding: '5px 12px', borderRadius: 7, cursor: 'pointer',
                  opacity: regenerating ? 0.6 : 1,
                }}
                onClick={handleRegenerateKey}
                disabled={regenerating}
                title="Generate a new API key — the current key will be immediately expired"
              >
                {regenerating
                  ? <><span className="spinner" style={{ width: 11, height: 11 }} />Regenerating...</>
                  : <><RefreshCw size={12} />Regenerate Key</>
                }
              </button>
            </div>

            {/* New key banner shown right after regeneration */}
            {newKeyPreview && (
              <div style={{
                display: 'flex', gap: 8, padding: '10px 12px', borderRadius: 8, marginBottom: 12,
                background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.25)',
              }}>
                <ShieldAlert size={14} color="#f59e0b" style={{ flexShrink: 0, marginTop: 1 }} />
                <div style={{ fontSize: 12, color: '#9a7030', lineHeight: 1.65 }}>
                  <strong style={{ color: '#f59e0b' }}>New key generated.</strong> The previous key is now expired.
                  Share this new key with the client immediately.
                </div>
              </div>
            )}

            {/* Active key display */}
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 11, color: '#555570', marginBottom: 6, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Active Key
              </div>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '10px 12px', background: '#12121a',
                border: `1px solid ${newKeyPreview ? 'rgba(34,211,160,0.3)' : '#2a2a3d'}`,
                borderRadius: 8,
              }}>
                <div style={{
                  flex: 1,
                  fontFamily: "'Space Mono', monospace", fontSize: 11,
                  color: activeKey ? (newKeyPreview ? '#22d3a0' : '#8888aa') : '#333348',
                  wordBreak: 'break-all', lineHeight: 1.6,
                }}>
                  {activeKey
                    ? (showFullKey ? activeKey : maskedKey)
                    : 'No key on record — regenerate to create one'}
                </div>
                {activeKey && (
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    <button
                      className="btn-icon"
                      onClick={() => setShowFullKey(v => !v)}
                      title={showFullKey ? 'Hide key' : 'Reveal full key'}
                    >
                      {showFullKey ? <EyeOff size={13} color="#555570" /> : <Eye size={13} color="#555570" />}
                    </button>
                    <button
                      className="btn-icon"
                      onClick={() => copyKey(activeKey)}
                      title="Copy key"
                    >
                      <Copy size={13} color="#6c63ff" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            <p style={{ fontSize: 11, color: '#555570', marginTop: 4 }}>
              Click <strong style={{ color: '#e8e8f0' }}>Regenerate Key</strong> to invalidate the current key and issue a new one.
              The client must update their key immediately after regeneration.
            </p>
          </div>

          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            {[
              { label: 'Documents', value: client.documentsCount || 0, icon: FileText, color: '#22d3a0' },
              { label: 'Last Run', value: client.lastRunAt ? formatDistanceToNow(new Date(client.lastRunAt), { addSuffix: true }) : 'Never', icon: Clock, color: '#6c63ff' },
              { label: 'Total Runs', value: runLogs.length, icon: Zap, color: '#f59e0b' },
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="card" style={{ padding: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontSize: 10, color: '#555570', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8, fontWeight: 700 }}>{label}</div>
                    <div style={{ fontFamily: "'Space Mono', monospace", fontSize: typeof value === 'number' ? 22 : 13, fontWeight: 700, color: '#e8e8f0' }}>{value}</div>
                  </div>
                  <Icon size={15} color={color} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Run history */}
        <div className="card" style={{ padding: 0, overflow: 'hidden', alignSelf: 'start' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #1e1e2e', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 14, color: '#e8e8f0' }}>Run History</span>
            <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: '#555570' }}>{runLogs.length} runs</span>
          </div>
          <div style={{ padding: 12, maxHeight: 480, overflowY: 'auto' }}>
            {runLogs.length === 0 ? (
              <div className="empty-state">
                <Clock size={28} />
                <p style={{ fontSize: 12, marginTop: 8 }}>No runs yet</p>
              </div>
            ) : runLogs.map((log, i) => <RunLog key={i} run={log} />)}
          </div>
        </div>
      </div>
    </div>
  )
}

