import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useClientStore } from '../store/clientStore'
import { checkHealth, getStorageStatus, listDocuments } from '../services/api'
import {
  Server, Database, FileText, Users, RefreshCw,
  AlertTriangle, CheckCircle, Zap
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

function StatCard({ icon: Icon, label, value, sub, color = '#6c63ff', loading }) {
  return (
    <div className="card" style={{ position: 'relative', overflow: 'hidden' }}>
      <div style={{
        position: 'absolute', top: -20, right: -20,
        width: 80, height: 80,
        background: `radial-gradient(circle, ${color}18 0%, transparent 70%)`,
        borderRadius: '50%',
      }} />
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#555570', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
            {label}
          </div>
          {loading ? (
            <div style={{ width: 60, height: 28, background: '#2a2a3d', borderRadius: 4, animation: 'pulse 1.5s infinite' }} />
          ) : (
            <div style={{ fontSize: 28, fontWeight: 800, color: '#e8e8f0', fontFamily: "'Space Mono', monospace" }}>
              {value}
            </div>
          )}
          {sub && <div style={{ fontSize: 12, color: '#555570', marginTop: 4 }}>{sub}</div>}
        </div>
        <div style={{
          width: 40, height: 40,
          background: `${color}18`,
          border: `1px solid ${color}30`,
          borderRadius: 10,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon size={18} color={color} />
        </div>
      </div>
    </div>
  )
}

function ActivityRow({ client, onNavigate }) {
  return (
    <div
      onClick={() => onNavigate(`/clients/${client.id}`)}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 16px', borderRadius: 8, cursor: 'pointer',
        transition: 'background 0.15s',
        background: 'transparent',
      }}
      onMouseEnter={e => e.currentTarget.style.background = '#1c1c28'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          width: 8, height: 8, borderRadius: '50%',
          background: client.status === 'success' ? '#22d3a0' :
            client.status === 'running' ? '#f59e0b' :
              client.status === 'error' ? '#f43f5e' : '#333348',
          boxShadow: client.status === 'running' ? '0 0 8px #f59e0b' : undefined,
        }} />
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#e8e8f0' }}>{client.name}</div>
          <div style={{ fontSize: 11, color: '#555570', fontFamily: "'Space Mono', monospace" }}>
            {client.clientId}
          </div>
        </div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div className={`badge badge-${client.status === 'success' ? 'success' : client.status === 'running' ? 'warning' : client.status === 'error' ? 'danger' : 'muted'}`}>
          {client.status}
        </div>
        {client.lastRunAt && (
          <div style={{ fontSize: 10, color: '#555570', marginTop: 4 }}>
            {formatDistanceToNow(new Date(client.lastRunAt), { addSuffix: true })}
          </div>
        )}
      </div>
    </div>
  )
}

export default function DashboardHome() {
  const navigate = useNavigate()
  const { clients } = useClientStore()
  const [health, setHealth] = useState(null)
  const [storage, setStorage] = useState(null)
  const [docs, setDocs] = useState(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  async function loadData() {
    try {
      const [h, s, d] = await Promise.allSettled([
        checkHealth(),
        getStorageStatus(),
        listDocuments(),
      ])
      if (h.status === 'fulfilled') setHealth(h.value.data)
      if (s.status === 'fulfilled') setStorage(s.value.data)
      if (d.status === 'fulfilled') setDocs(d.value.data)
    } catch (e) {
      console.error(e)
      // silent
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => { loadData() }, [])

  function refresh() {
    setRefreshing(true)
    loadData()
  }

  const totalBlobs = storage?.prefixes?.reduce((a, p) => a + p.blob_count, 0) ?? 0
  const totalBytes = storage?.prefixes?.reduce((a, p) => a + p.total_bytes, 0) ?? 0
  const totalDocs = docs?.total ?? 0
  const activeClients = clients.filter(c => c.folderLink).length
  const runningClients = clients.filter(c => c.status === 'running').length

  function fmtBytes(b) {
    if (b > 1e9) return `${(b / 1e9).toFixed(1)}GB`
    if (b > 1e6) return `${(b / 1e6).toFixed(1)}MB`
    if (b > 1e3) return `${(b / 1e3).toFixed(1)}KB`
    return `${b}B`
  }

  return (
    <div className="animate-in">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 26, color: '#e8e8f0', marginBottom: 4 }}>
            Dashboard
          </h1>
          <p style={{ color: '#555570', fontSize: 13 }}>
            RAG Ingestion Pipeline — <span style={{ fontFamily: "'Space Mono', monospace", color: '#6c63ff', fontSize: 12 }}>https://ragapi-frd0aeaeajh7gthx.southindia-01.azurewebsites.net</span>
          </p>
        </div>
        <button onClick={refresh} className="btn btn-ghost btn-sm" disabled={refreshing}>
          <RefreshCw size={13} style={{ animation: refreshing ? 'spin 0.7s linear infinite' : 'none' }} />
          Refresh
        </button>
      </div>

      {/* Backend status banner */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '10px 16px', borderRadius: 8, marginBottom: 24,
        background: health?.status === 'ok' ? 'rgba(34,211,160,0.06)' : loading ? 'rgba(85,85,112,0.1)' : 'rgba(244,63,94,0.06)',
        border: `1px solid ${health?.status === 'ok' ? 'rgba(34,211,160,0.2)' : loading ? '#2a2a3d' : 'rgba(244,63,94,0.2)'}`,
      }}>
        {loading ? (
          <><span className="spinner" style={{ width: 14, height: 14 }} />
            <span style={{ fontSize: 13, color: '#8888aa' }}>Checking backend health...</span></>
        ) : health?.status === 'ok' ? (
          <><CheckCircle size={15} color="#22d3a0" />
            <span style={{ fontSize: 13, color: '#22d3a0', fontWeight: 600 }}>Backend online</span>
            {storage?.account && <span style={{ fontSize: 12, color: '#555570', marginLeft: 8, fontFamily: "'Space Mono', monospace" }}>Azure: {storage.account}</span>}
          </>
        ) : (
          <><AlertTriangle size={15} color="#f43f5e" />
            <span style={{ fontSize: 13, color: '#f43f5e', fontWeight: 600 }}>Backend unreachable — check API key in Settings</span></>
        )}
        <div style={{ marginLeft: 'auto', fontSize: 11, color: '#555570', fontFamily: "'Space Mono', monospace" }}>
          Container: vectordbforrag
        </div>
      </div>

      {/* Stats grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 }}>
        <StatCard icon={Users} label="Total Clients" value={clients.length} sub={`${activeClients} with folder links`} color="#6c63ff" loading={loading} />
        <StatCard icon={FileText} label="Documents" value={loading ? '—' : totalDocs} sub="in Azure Blob" color="#22d3a0" loading={loading} />
        <StatCard icon={Database} label="Blob Storage" value={loading ? '—' : fmtBytes(totalBytes)} sub={`${totalBlobs} objects`} color="#f59e0b" loading={loading} />
        <StatCard icon={Zap} label="Running" value={runningClients} sub="active pipelines" color={runningClients > 0 ? '#f59e0b' : '#555570'} loading={false} />
      </div>

      {/* Two-column lower section */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Client activity */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '20px 20px 12px', borderBottom: '1px solid #1e1e2e', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h2 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 14, color: '#e8e8f0' }}>Client Activity</h2>
            <button onClick={() => navigate('/clients')} className="btn btn-ghost btn-sm">View all</button>
          </div>
          <div style={{ padding: 8 }}>
            {clients.length === 0 ? (
              <div className="empty-state" style={{ padding: 32 }}>
                <Users size={32} />
                <p style={{ fontSize: 13, marginTop: 8 }}>No clients yet</p>
                <button onClick={() => navigate('/clients')} className="btn btn-primary btn-sm" style={{ marginTop: 12 }}>
                  Add Client
                </button>
              </div>
            ) : clients.map(c => (
              <ActivityRow key={c.id} client={c} onNavigate={navigate} />
            ))}
          </div>
        </div>

        {/* Storage breakdown */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '20px 20px 12px', borderBottom: '1px solid #1e1e2e' }}>
            <h2 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 14, color: '#e8e8f0' }}>Storage Breakdown</h2>
          </div>
          <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {loading ? (
              [1, 2, 3, 4].map(i => (
                <div key={i} style={{ height: 40, background: '#1a1a24', borderRadius: 6 }} />
              ))
            ) : storage?.prefixes?.length > 0 ? storage.prefixes.map(p => (
              <div key={p.prefix} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 14px', background: '#1a1a24', borderRadius: 8,
                border: '1px solid #2a2a3d',
              }}>
                <div>
                  <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: '#6c63ff' }}>{p.prefix}</div>
                  <div style={{ fontSize: 11, color: '#555570', marginTop: 2 }}>{p.blob_count} blobs</div>
                </div>
                <div style={{ fontSize: 12, color: '#8888aa', fontFamily: "'Space Mono', monospace" }}>
                  {fmtBytes(p.total_bytes)}
                </div>
              </div>
            )) : (
              <div className="empty-state">
                <Server size={28} />
                <p style={{ fontSize: 12, marginTop: 8 }}>No storage data — check API key</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}