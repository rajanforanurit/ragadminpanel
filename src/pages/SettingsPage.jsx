import React, { useState } from 'react'
import { useSettingsStore } from '../store/settingsStore'
import { useAuthStore } from '../store/authStore'
import { checkHealth, getStorageStatus } from '../services/api'
import toast from 'react-hot-toast'
import { Save, Eye, EyeOff, CheckCircle, AlertCircle, Key, Server, Shield, Trash2 } from 'lucide-react'
import { useClientStore } from '../store/clientStore'

export default function SettingsPage() {
  const { apiKey, setApiKey } = useSettingsStore()
  const { user } = useAuthStore()
  const { clients } = useClientStore()
  const [keyInput, setKeyInput] = useState(apiKey)
  const [showKey, setShowKey] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState(null)

  async function handleSave() {
    setApiKey(keyInput.trim())
    toast.success('API key saved')
  }

  async function handleTest() {
    if (!keyInput.trim()) return toast.error('Enter an API key first')
    setTesting(true)
    setTestResult(null)
    // Temporarily set the key for the test
    const original = apiKey
    setApiKey(keyInput.trim())
    try {
      await checkHealth()
      const s = await getStorageStatus()
      setTestResult({ ok: true, msg: `Connected · Azure: ${s.data?.account || '—'} · Container: ${s.data?.container || '—'}` })
    } catch (e) {
      const detail = e.response?.data?.detail || e.message
      setTestResult({ ok: false, msg: detail || 'Connection failed' })
      setApiKey(original)
    } finally {
      setTesting(false)
    }
  }

  function clearAllData() {
    if (!confirm('This will clear all client configurations from this browser. Azure Blob Storage data is NOT affected.')) return
    localStorage.removeItem('rag-admin-clients')
    localStorage.removeItem('rag-admin-settings')
    toast.success('Local data cleared — reload to reset')
  }

  return (
    <div className="animate-in" style={{ maxWidth: 640 }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 26, color: '#e8e8f0', marginBottom: 4 }}>
          Settings
        </h1>
        <p style={{ color: '#555570', fontSize: 13 }}>Configure your connection to the RAG ingestion backend</p>
      </div>

      {/* API Key */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <Key size={15} color="#6c63ff" />
          <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 15, color: '#e8e8f0' }}>
            RAG Backend API Key
          </span>
        </div>
        <p style={{ fontSize: 13, color: '#555570', marginBottom: 16 }}>
          The API key from your backend's <code style={{ fontFamily: "'Space Mono', monospace", color: '#6c63ff', fontSize: 11 }}>.env</code> file (<code style={{ fontFamily: "'Space Mono', monospace", color: '#6c63ff', fontSize: 11 }}>API_KEY</code> variable).
          This is sent as <code style={{ fontFamily: "'Space Mono', monospace", color: '#6c63ff', fontSize: 11 }}>Authorization: Bearer &lt;key&gt;</code> on every request.
        </p>

        <div style={{ position: 'relative', marginBottom: 12 }}>
          <input
            className="input input-mono"
            type={showKey ? 'text' : 'password'}
            placeholder="32a415f1f2ffea480ba1c5d2292441f4..."
            value={keyInput}
            onChange={e => setKeyInput(e.target.value)}
            style={{ paddingRight: 44 }}
          />
          <button
            onClick={() => setShowKey(!showKey)}
            style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#555570', cursor: 'pointer' }}
          >
            {showKey ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        </div>

        {testResult && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '10px 14px', borderRadius: 8, marginBottom: 12,
            background: testResult.ok ? 'rgba(34,211,160,0.08)' : 'rgba(244,63,94,0.08)',
            border: `1px solid ${testResult.ok ? 'rgba(34,211,160,0.2)' : 'rgba(244,63,94,0.2)'}`,
          }}>
            {testResult.ok ? <CheckCircle size={14} color="#22d3a0" /> : <AlertCircle size={14} color="#f43f5e" />}
            <span style={{ fontSize: 12, color: testResult.ok ? '#22d3a0' : '#f43f5e' }}>
              {testResult.msg}
            </span>
          </div>
        )}

        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost btn-sm" onClick={handleTest} disabled={testing || !keyInput.trim()}>
            {testing ? <><span className="spinner" />Testing...</> : 'Test Connection'}
          </button>
          <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={keyInput === apiKey}>
            <Save size={13} /> Save Key
          </button>
        </div>
      </div>

      {/* Backend info */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <Server size={15} color="#f59e0b" />
          <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 15, color: '#e8e8f0' }}>
            Backend Configuration
          </span>
        </div>
        {[
          ['API Base URL', import.meta.env.VITE_API_BASE_URL || 'https://anuritrag.onrender.com'],
          ['Storage Container', 'vectordbforrag'],
          ['Embedding Model', 'sentence-transformers/all-MiniLM-L12-v2'],
          ['Supported Formats', 'PDF, DOCX, PPTX, TXT, XLSX, CSV, JSON, HTML, MD'],
        ].map(([k, v]) => (
          <div key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #1e1e2e' }}>
            <span style={{ fontSize: 12, color: '#8888aa', fontWeight: 600 }}>{k}</span>
            <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: '#6c63ff' }}>{v}</span>
          </div>
        ))}
      </div>

      {/* Auth info */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <Shield size={15} color="#22d3a0" />
          <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 15, color: '#e8e8f0' }}>
            Admin Authentication
          </span>
        </div>
        <p style={{ fontSize: 12, color: '#555570', marginBottom: 12 }}>
          Login credentials are configured in the <code style={{ fontFamily: "'Space Mono', monospace", color: '#6c63ff', fontSize: 11 }}>.env</code> file.
          JWT tokens expire after 8 hours.
        </p>
        {[
          ['Logged in as', user || 'admin'],
          ['Auth method', 'JWT (local)'],
          ['Token expiry', '8 hours'],
          ['Clients configured', clients.length],
        ].map(([k, v]) => (
          <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #1e1e2e' }}>
            <span style={{ fontSize: 12, color: '#8888aa' }}>{k}</span>
            <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: '#e8e8f0' }}>{v}</span>
          </div>
        ))}
      </div>

      {/* Danger zone */}
      <div className="card" style={{ borderColor: 'rgba(244,63,94,0.2)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <Trash2 size={15} color="#f43f5e" />
          <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 15, color: '#f43f5e' }}>
            Danger Zone
          </span>
        </div>
        <p style={{ fontSize: 12, color: '#555570', marginBottom: 14 }}>
          Clear all local client configurations from this browser. Azure Blob Storage data is NOT affected.
        </p>
        <button className="btn btn-danger btn-sm" onClick={clearAllData}>
          Clear Local Data
        </button>
      </div>
    </div>
  )
}
