// src/components/AddClientModal.jsx

import React, { useState } from 'react'
import { useClientStore } from '../store/clientStore'
import toast from 'react-hot-toast'
import { X, Users, Copy, CheckCircle } from 'lucide-react'

export default function AddClientModal({ onClose }) {
  const { addClient, clients } = useClientStore()

  const [name, setName] = useState('')
  const [clientId, setClientId] = useState('')
  const [clientUsername, setClientUsername] = useState('')
  const [clientPassword, setClientPassword] = useState('')
  const [error, setError] = useState('')
  const [createdClient, setCreatedClient] = useState(null)

  function validateForm() {
    setError('')

    if (!name.trim()) {
      setError('Client name is required')
      return false
    }

    if (!clientId.trim()) {
      setError('Client ID is required')
      return false
    }

    if (!/^[a-z0-9_-]+$/i.test(clientId.trim())) {
      setError(
        'Client ID must contain only letters, numbers, hyphens, and underscores'
      )
      return false
    }

    if (
      clients.some(
        (c) =>
          c.clientId?.toLowerCase() === clientId.trim().toLowerCase()
      )
    ) {
      setError('A client with this Client ID already exists')
      return false
    }

    if (!clientUsername.trim()) {
      setError('Client username is required')
      return false
    }

    if (
      clients.some(
        (c) =>
          c.clientUsername?.toLowerCase() ===
          clientUsername.trim().toLowerCase()
      )
    ) {
      setError('This client username is already in use')
      return false
    }

    if (!clientPassword.trim()) {
      setError('Client password is required')
      return false
    }

    if (clientPassword.trim().length < 6) {
      setError('Client password must be at least 6 characters')
      return false
    }

    return true
  }

  function handleSubmit(e) {
    e.preventDefault()

    try {
      const valid = validateForm()
      if (!valid) return

      const client = addClient({
        name,
        clientId,
        clientUsername,
        clientPassword,
      })

      setCreatedClient(client)

      toast.success(`Client "${client.name}" created successfully`)
    } catch (err) {
      console.error('Client creation failed:', err)

      setError(
        err?.message ||
          'Something went wrong while creating the client. Please check values and try again.'
      )

      toast.error('Client creation failed')
    }
  }

  async function copyEnvBlock() {
    if (!createdClient) return

    const envBlock = `
CLIENT_USERNAME=${createdClient.clientUsername}
CLIENT_PASSWORD=${createdClient.clientPassword}
JWT_SECRET=${createdClient.clientId}-jwt-secret
`.trim()

    try {
      await navigator.clipboard.writeText(envBlock)
      toast.success('Environment variables copied')
    } catch (err) {
      console.error('Copy failed:', err)
      toast.error('Failed to copy environment variables')
    }
  }

  if (createdClient) {
    return (
      <div
        className="modal-overlay"
        onClick={(e) =>
          e.target === e.currentTarget && onClose()
        }
      >
        <div className="modal">
          <div className="modal-header">
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
              }}
            >
              <CheckCircle size={18} color="#22d3a0" />
              <span className="modal-title">
                Client Created Successfully
              </span>
            </div>

            <button
              className="btn-icon"
              onClick={onClose}
            >
              <X size={16} />
            </button>
          </div>

          <p
            style={{
              color: '#8888aa',
              fontSize: 13,
              marginBottom: 18,
            }}
          >
            Add these values inside your Vercel project →
            Settings → Environment Variables
          </p>

          <div
            style={{
              background: '#12121a',
              border: '1px solid #2a2a3d',
              borderRadius: 10,
              padding: 16,
              fontFamily: "'Space Mono', monospace",
              fontSize: 13,
              lineHeight: 1.8,
              marginBottom: 18,
              whiteSpace: 'pre-wrap',
            }}
          >
{`CLIENT_USERNAME=${createdClient.clientUsername}
CLIENT_PASSWORD=${createdClient.clientPassword}
JWT_SECRET=${createdClient.clientId}-jwt-secret`}
          </div>

          <p
            style={{
              fontSize: 12,
              color: '#999',
              marginBottom: 18,
            }}
          >
            After adding these values in Vercel, the client
            can log in to the chatbot system using JWT auth.
          </p>

          <div style={{ display: 'flex', gap: 10 }}>
            <button
              className="btn btn-primary"
              style={{ flex: 1 }}
              onClick={copyEnvBlock}
            >
              <Copy size={14} />
              Copy ENV
            </button>

            <button
              className="btn btn-ghost"
              style={{ flex: 1 }}
              onClick={onClose}
            >
              Done
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      className="modal-overlay"
      onClick={(e) =>
        e.target === e.currentTarget && onClose()
      }
    >
      <div className="modal">
        <div className="modal-header">
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                background: 'rgba(108,99,255,0.15)',
                border:
                  '1px solid rgba(108,99,255,0.3)',
                borderRadius: 8,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Users size={16} color="#6c63ff" />
            </div>

            <span className="modal-title">
              New Client
            </span>
          </div>

          <button
            className="btn-icon"
            onClick={onClose}
          >
            <X size={16} />
          </button>
        </div>

        <p
          style={{
            color: '#8888aa',
            fontSize: 13,
            marginBottom: 24,
          }}
        >
          Create a client and assign secure login
          credentials for future chatbot access.
        </p>

        <form
          onSubmit={handleSubmit}
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
          }}
        >
          <div>
            <label>Client Name</label>
            <input
              className="input"
              placeholder="e.g. Acme Corporation"
              value={name}
              onChange={(e) =>
                setName(e.target.value)
              }
              autoFocus
            />
          </div>

          <div>
            <label>Client ID</label>
            <input
              className="input input-mono"
              placeholder="e.g. acme-corp"
              value={clientId}
              onChange={(e) =>
                setClientId(
                  e.target.value
                    .toLowerCase()
                    .replace(/\s+/g, '-')
                )
              }
            />
          </div>

          <div>
            <label>Client Username</label>
            <input
              className="input"
              placeholder="e.g. acme_user"
              value={clientUsername}
              onChange={(e) =>
                setClientUsername(e.target.value)
              }
            />
          </div>

          <div>
            <label>Client Password</label>
            <input
              className="input"
              type="password"
              placeholder="minimum 6 characters"
              value={clientPassword}
              onChange={(e) =>
                setClientPassword(e.target.value)
              }
            />
          </div>

          {error && (
            <div
              style={{
                padding: '10px 14px',
                background:
                  'rgba(244,63,94,0.08)',
                border:
                  '1px solid rgba(244,63,94,0.2)',
                borderRadius: 8,
                fontSize: 13,
                color: '#f43f5e',
              }}
            >
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: 10 }}>
            <button
              type="button"
              className="btn btn-ghost"
              style={{ flex: 1 }}
              onClick={onClose}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ flex: 1 }}
            >
              Create Client
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}