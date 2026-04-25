import React, { useState, useEffect } from 'react'
import { useClientStore } from '../store/clientStore'
import toast from 'react-hot-toast'
import { X, Users, Copy, CheckCircle, Loader, RefreshCw, Key } from 'lucide-react'
function slugify(name) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}
function generateApiKey() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*'
  const arr = new Uint8Array(24)
  crypto.getRandomValues(arr)
  const body = Array.from(arr)
    .map((b) => chars[b % chars.length])
    .join('')
  return `rak_${body}`
}
function CreatedScreen({ client, onClose }) {
  const [copied, setCopied] = useState(false)

  async function copyKey() {
    try {
      await navigator.clipboard.writeText(client.apiKey)
      setCopied(true)
      toast.success('API key copied to clipboard')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Failed to copy')
    }
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <CheckCircle size={18} color="#22d3a0" />
            <span className="modal-title">Client Created</span>
          </div>
          <button className="btn-icon" onClick={onClose}><X size={16} /></button>
        </div>

        <p style={{ color: '#8888aa', fontSize: 13, marginBottom: 6 }}>
          Share this API key with the client — they'll use it to authenticate with the chat panel.
        </p>
        <p style={{ color: '#f59e0b', fontSize: 12, marginBottom: 18, display: 'flex', alignItems: 'center', gap: 6 }}>
          ⚠ Copy it now — this key won't be shown in full again.
        </p>

        <div style={{
          background: '#12121a', border: '1px solid #2a2a3d', borderRadius: 10,
          padding: 16, fontFamily: "'Space Mono', monospace", fontSize: 13,
          lineHeight: 1.9, marginBottom: 18,
        }}>
          <div><span style={{ color: '#555570' }}>Name:      </span><span style={{ color: '#e8e8f0' }}>{client.name}</span></div>
          <div><span style={{ color: '#555570' }}>Client ID: </span><span style={{ color: '#6c63ff' }}>{client.clientId}</span></div>
          <div style={{ marginTop: 6 }}>
            <span style={{ color: '#555570' }}>API Key:</span>
          </div>
          <div style={{
            marginTop: 4, padding: '8px 10px', background: 'rgba(108,99,255,0.08)',
            border: '1px solid rgba(108,99,255,0.25)', borderRadius: 6,
            color: '#22d3a0', wordBreak: 'break-all', fontSize: 12, letterSpacing: '0.03em',
          }}>
            {client.apiKey}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-primary" style={{ flex: 1 }} onClick={copyKey}>
            {copied ? <CheckCircle size={14} /> : <Copy size={14} />}
            {copied ? 'Copied!' : 'Copy API Key'}
          </button>
          <button className="btn btn-ghost" style={{ flex: 1 }} onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  )
}

export default function AddClientModal({ onClose }) {
  const { addClient, clients } = useClientStore()

  const [name, setName]               = useState('')
  const [previewId, setPreviewId]     = useState('')
  const [previewKey, setPreviewKey]   = useState(() => generateApiKey())
  const [error, setError]             = useState('')
  const [submitting, setSubmitting]   = useState(false)
  const [createdClient, setCreatedClient] = useState(null)

  useEffect(() => {
    setPreviewId(slugify(name))
  }, [name])

  function regenerateKey() {
    setPreviewKey(generateApiKey())
    toast.success('New API key generated')
  }

  function validateForm() {
    setError('')
    if (!name.trim()) { setError('Client name is required'); return false }
    const slug = slugify(name.trim())
    if (!slug) { setError('Name must contain at least one letter or number'); return false }
    if (clients.some((c) => c.clientId?.toLowerCase() === slug.toLowerCase())) {
      setError('A client with this name/ID already exists')
      return false
    }
    return true
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!validateForm()) return
    setSubmitting(true)
    try {
      const slug = slugify(name.trim())
      const client = await addClient({
        name: name.trim(),
        clientId: slug,
        apiKey: previewKey,
      })
      setCreatedClient({ ...client, apiKey: previewKey })
      toast.success(`Client "${name.trim()}" created`)
    } catch (err) {
      const msg = err?.response?.data?.error || err?.message || 'Creation failed'
      setError(msg)
      toast.error(msg)
    } finally {
      setSubmitting(false)
    }
  }

  if (createdClient) {
    return <CreatedScreen client={createdClient} onClose={onClose} />
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 36, background: 'rgba(108,99,255,0.15)',
              border: '1px solid rgba(108,99,255,0.3)', borderRadius: 8,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Users size={16} color="#6c63ff" />
            </div>
            <span className="modal-title">New Client</span>
          </div>
          <button className="btn-icon" onClick={onClose}><X size={16} /></button>
        </div>

        <p style={{ color: '#8888aa', fontSize: 13, marginBottom: 24 }}>
          Enter the client's name — an API key will be auto-generated for chat panel access.
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          <div>
            <label>Client Name</label>
            <input
              className="input"
              placeholder="e.g. Acme Corporation"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>

          {previewId && (
            <div>
              <label>
                Client ID{' '}
                <span style={{ color: '#555570', fontWeight: 400 }}>
                  (auto-derived · stored as blob key)
                </span>
              </label>
              <div style={{
                padding: '9px 12px', background: '#12121a',
                border: '1px solid #2a2a3d', borderRadius: 8,
                fontFamily: "'Space Mono', monospace", fontSize: 12, color: '#6c63ff',
              }}>
                {previewId}
              </div>
            </div>
          )}

          <div>
            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Key size={12} color="#22d3a0" /> API Key
              </span>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                style={{ fontSize: 11, padding: '3px 8px', display: 'flex', alignItems: 'center', gap: 5 }}
                onClick={regenerateKey}
              >
                <RefreshCw size={11} /> Regenerate
              </button>
            </label>
            <div style={{
              padding: '9px 12px', background: '#12121a',
              border: '1px solid rgba(34,211,160,0.2)', borderRadius: 8,
              fontFamily: "'Space Mono', monospace", fontSize: 11,
              color: '#22d3a0', wordBreak: 'break-all', lineHeight: 1.6,
            }}>
              {previewKey}
            </div>
            <span style={{ fontSize: 11, color: '#555570', marginTop: 4, display: 'block' }}>
              Shown only once after creation — store it safely.
            </span>
          </div>

          {error && (
            <div style={{
              padding: '10px 14px', background: 'rgba(244,63,94,0.08)',
              border: '1px solid rgba(244,63,94,0.2)', borderRadius: 8,
              fontSize: 13, color: '#f43f5e',
            }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: 10 }}>
            <button type="button" className="btn btn-ghost" style={{ flex: 1 }} onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={submitting}>
              {submitting ? <><Loader size={13} className="spinner" /> Creating...</> : 'Create Client'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
