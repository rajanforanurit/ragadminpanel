import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useClientStore } from '../store/clientStore'
import toast from 'react-hot-toast'
import {
  Plus, Trash2, Play, Users, ChevronRight,
  Link, Clock, CheckCircle, AlertCircle, Loader
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import AddClientModal from '../components/AddClientModal'

function ClientCard({ client, onDelete, onNavigate, onRun }) {
  const statusConfig = {
    idle: { color: '#555570', icon: null, label: 'Idle' },
    running: { color: '#f59e0b', icon: Loader, label: 'Running' },
    success: { color: '#22d3a0', icon: CheckCircle, label: 'Success' },
    error: { color: '#f43f5e', icon: AlertCircle, label: 'Error' },
  }
  const sc = statusConfig[client.status] || statusConfig.idle
  const Icon = sc.icon

  return (
    <div
      className="card"
      style={{ cursor: 'pointer', transition: 'border-color 0.2s, transform 0.15s', position: 'relative' }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = '#3a3a55'; e.currentTarget.style.transform = 'translateY(-2px)' }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = '#2a2a3d'; e.currentTarget.style.transform = 'translateY(0)' }}
      onClick={() => onNavigate(`/clients/${client.id}`)}
    >
      {/* Status stripe */}
      <div style={{
        position: 'absolute', top: 0, left: 0, bottom: 0, width: 3,
        background: sc.color, borderRadius: '12px 0 0 12px',
        opacity: client.status === 'idle' ? 0.3 : 1,
      }} />

      <div style={{ paddingLeft: 8 }}>
        {/* Header row */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <h3 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 15, color: '#e8e8f0' }}>
                {client.name}
              </h3>
              {Icon && (
                <Icon size={13} color={sc.color}
                  style={{ animation: client.status === 'running' ? 'spin 1s linear infinite' : 'none' }}
                />
              )}
            </div>
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: '#6c63ff' }}>
              ID: {client.clientId}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6 }} onClick={e => e.stopPropagation()}>
            <button
              className="btn-icon"
              onClick={() => onRun(client)}
              disabled={client.status === 'running' || !client.folderLink}
              title={!client.folderLink ? 'Set folder link first' : 'Run ingestion'}
              style={{ opacity: (!client.folderLink || client.status === 'running') ? 0.4 : 1 }}
            >
              <Play size={13} color="#22d3a0" />
            </button>
            <button className="btn-icon" onClick={() => onDelete(client.id)} title="Delete client">
              <Trash2 size={13} color="#f43f5e" />
            </button>
          </div>
        </div>

        {/* Folder link */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 7,
          padding: '8px 10px', borderRadius: 6,
          background: '#1a1a24', border: '1px solid #2a2a3d',
          marginBottom: 12,
        }}>
          <Link size={11} color={client.folderLink ? '#6c63ff' : '#333348'} />
          <span style={{
            fontFamily: "'Space Mono', monospace", fontSize: 10,
            color: client.folderLink ? '#8888aa' : '#333348',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1,
          }}>
            {client.folderLink || 'No folder link set — click to configure'}
          </span>
          {client.autoSync && (
            <span style={{ fontSize: 9, color: '#22d3a0', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              AUTO
            </span>
          )}
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span className={`badge badge-${client.status === 'success' ? 'success' : client.status === 'error' ? 'danger' : client.status === 'running' ? 'warning' : 'muted'}`}>
              {sc.label}
            </span>
            {client.documentsCount > 0 && (
              <span className="badge badge-accent">{client.documentsCount} docs</span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#555570', fontSize: 11 }}>
            {client.lastRunAt ? (
              <>
                <Clock size={10} />
                <span style={{ fontFamily: "'Space Mono', monospace" }}>
                  {formatDistanceToNow(new Date(client.lastRunAt), { addSuffix: true })}
                </span>
              </>
            ) : (
              <span>Never run</span>
            )}
            <ChevronRight size={12} />
          </div>
        </div>
      </div>
    </div>
  )
}

export default function ClientsPage() {
  const navigate = useNavigate()
  const { clients, removeClient, setClientStatus, updateClient } = useClientStore()
  const [showAdd, setShowAdd] = useState(false)

  async function handleRun(client) {
    // Navigate to client detail which handles ingestion
    navigate(`/clients/${client.id}`)
  }

  function handleDelete(id) {
    if (confirm('Remove this client? This will not delete any data from Azure Blob Storage.')) {
      removeClient(id)
      toast.success('Client removed')
    }
  }

  return (
    <div className="animate-in">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 26, color: '#e8e8f0', marginBottom: 4 }}>
            Clients
          </h1>
          <p style={{ color: '#555570', fontSize: 13 }}>
            Manage data ingestion pipelines for each client
          </p>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn btn-primary">
          <Plus size={16} />
          New Client
        </button>
      </div>

      {/* Client grid */}
      {clients.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '80px 24px',
          border: '2px dashed #2a2a3d', borderRadius: 16,
        }}>
          <div style={{
            width: 64, height: 64,
            background: 'rgba(108,99,255,0.1)', border: '1px solid rgba(108,99,255,0.2)',
            borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 20px',
          }}>
            <Users size={28} color="#6c63ff" />
          </div>
          <h2 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 18, color: '#e8e8f0', marginBottom: 8 }}>
            No clients yet
          </h2>
          <p style={{ color: '#555570', fontSize: 13, marginBottom: 24, maxWidth: 360, margin: '0 auto 24px' }}>
            Create a client to set up a dedicated ingestion pipeline for their documents.
          </p>
          <button onClick={() => setShowAdd(true)} className="btn btn-primary">
            <Plus size={16} />
            Add First Client
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
          {clients.map(client => (
            <ClientCard
              key={client.id}
              client={client}
              onDelete={handleDelete}
              onNavigate={navigate}
              onRun={handleRun}
            />
          ))}
        </div>
      )}

      {showAdd && <AddClientModal onClose={() => setShowAdd(false)} />}
    </div>
  )
}
