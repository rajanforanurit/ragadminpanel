import React, { useState, useEffect } from 'react'
import { listDocuments, deleteDocument, getChunks } from '../services/api'
import toast from 'react-hot-toast'
import { FileText, Trash2, Eye, RefreshCw, X, Search, ChevronDown } from 'lucide-react'
import { format } from 'date-fns'
import { useSettingsStore } from '../store/settingsStore'

function ChunksModal({ doc, onClose }) {
  const [chunks, setChunks] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getChunks(doc.doc_id)
      .then(r => setChunks(r.data))
      .catch(() => toast.error('Could not load chunks'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 700 }}>
        <div className="modal-header">
          <span className="modal-title">{doc.source_file}</span>
          <button className="btn-icon" onClick={onClose}><X size={16} /></button>
        </div>
        <div style={{ marginBottom: 16, display: 'flex', gap: 10 }}>
          <span className="badge badge-accent">{chunks?.total ?? '—'} chunks</span>
          <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: '#555570' }}>{doc.doc_id}</span>
        </div>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 32 }}><span className="spinner" /></div>
        ) : (
          <div style={{ maxHeight: 400, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {chunks?.chunks?.map(c => (
              <div key={c.chunk_id} style={{
                padding: '12px 14px', background: '#1a1a24',
                border: '1px solid #2a2a3d', borderRadius: 8,
              }}>
                <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                  <span className="tag">#{c.chunk_index}</span>
                  <span className="tag">p.{c.page}</span>
                  <span style={{ fontSize: 10, color: '#555570', marginLeft: 'auto' }}>{c.char_count} chars</span>
                </div>
                <p style={{ fontSize: 12, color: '#8888aa', lineHeight: 1.6, margin: 0 }}>{c.text}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default function DocumentsPage() {
  const { apiKey } = useSettingsStore()
  const [docs, setDocs] = useState(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedDoc, setSelectedDoc] = useState(null)
  const [deleting, setDeleting] = useState(null)

  async function load() {
    setLoading(true)
    try {
      const r = await listDocuments()
      setDocs(r.data)
    } catch {
      if (!apiKey) toast.error('Add API key in Settings to view documents')
      else toast.error('Failed to load documents')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function handleDelete(docId) {
    if (!confirm('Delete this document from Azure Blob Storage?')) return
    setDeleting(docId)
    try {
      await deleteDocument(docId)
      toast.success('Document deleted')
      load()
    } catch {
      toast.error('Delete failed')
    } finally {
      setDeleting(null)
    }
  }

  const filtered = docs?.documents?.filter(d =>
    d.source_file.toLowerCase().includes(search.toLowerCase()) ||
    d.doc_id.toLowerCase().includes(search.toLowerCase())
  ) || []

  return (
    <div className="animate-in">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 26, color: '#e8e8f0', marginBottom: 4 }}>
            Documents
          </h1>
          <p style={{ color: '#555570', fontSize: 13 }}>
            {docs ? `${docs.total} documents in Azure Blob Storage` : 'Loading...'}
          </p>
        </div>
        <button onClick={load} className="btn btn-ghost btn-sm" disabled={loading}>
          <RefreshCw size={13} style={{ animation: loading ? 'spin 0.7s linear infinite' : 'none' }} />
          Refresh
        </button>
      </div>

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: 20, maxWidth: 400 }}>
        <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#555570' }} />
        <input
          className="input"
          placeholder="Search documents..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ paddingLeft: 38 }}
        />
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[1,2,3,4,5].map(i => (
            <div key={i} style={{ height: 52, background: '#16161f', border: '1px solid #2a2a3d', borderRadius: 8 }} />
          ))}
        </div>
      ) : !apiKey ? (
        <div className="empty-state">
          <FileText size={40} />
          <h3 style={{ marginTop: 16, fontFamily: "'Syne', sans-serif", fontWeight: 700 }}>API Key Required</h3>
          <p style={{ fontSize: 13, marginTop: 8 }}>Add your RAG API key in Settings to view documents.</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <FileText size={40} />
          <h3 style={{ marginTop: 16, fontFamily: "'Syne', sans-serif", fontWeight: 700 }}>
            {search ? 'No matches' : 'No documents'}
          </h3>
          <p style={{ fontSize: 13, marginTop: 8 }}>
            {search ? 'Try a different search term' : 'Run an ingestion pipeline to add documents'}
          </p>
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>File</th>
                <th>Doc ID</th>
                <th>Chunks</th>
                <th>Processed</th>
                <th style={{ width: 80 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(doc => (
                <tr key={doc.doc_id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <FileText size={13} color="#6c63ff" />
                      <span style={{ color: '#e8e8f0', fontWeight: 600, fontSize: 13 }}>
                        {doc.source_file}
                      </span>
                    </div>
                  </td>
                  <td>
                    <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: '#555570' }}>
                      {doc.doc_id.slice(0, 16)}…
                    </span>
                  </td>
                  <td>
                    <span className="badge badge-accent">{doc.total_chunks}</span>
                  </td>
                  <td>
                    <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: '#555570' }}>
                      {format(new Date(doc.processed_at), 'MMM d, yyyy')}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn-icon" onClick={() => setSelectedDoc(doc)} title="View chunks">
                        <Eye size={13} />
                      </button>
                      <button
                        className="btn-icon"
                        onClick={() => handleDelete(doc.doc_id)}
                        disabled={deleting === doc.doc_id}
                        title="Delete"
                      >
                        {deleting === doc.doc_id
                          ? <span className="spinner" style={{ width: 12, height: 12 }} />
                          : <Trash2 size={13} color="#f43f5e" />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selectedDoc && <ChunksModal doc={selectedDoc} onClose={() => setSelectedDoc(null)} />}
    </div>
  )
}
