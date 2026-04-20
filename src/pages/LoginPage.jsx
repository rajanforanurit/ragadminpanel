import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import toast from 'react-hot-toast'
import { Eye, EyeOff, Terminal, Shield } from 'lucide-react'

export default function LoginPage() {
  const navigate = useNavigate()
  const { login, isAuthenticated } = useAuthStore()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [shake, setShake] = useState(false)

  useEffect(() => {
    if (isAuthenticated) navigate('/', { replace: true })
  }, [isAuthenticated])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!username || !password) return
    setLoading(true)
    await new Promise((r) => setTimeout(r, 600)) // small delay for UX
    const result = login(username, password)
    setLoading(false)
    if (result.success) {
      toast.success('Access granted')
      navigate('/', { replace: true })
    } else {
      setShake(true)
      setTimeout(() => setShake(false), 500)
      toast.error(result.error)
    }
  }

  return (
    <div style={styles.root}>
      {/* Animated background glows */}
      <div style={styles.glow1} />
      <div style={styles.glow2} />

      <div style={{ ...styles.card, animation: shake ? 'shakeX 0.4s ease' : undefined }}>
        {/* Logo area */}
        <div style={styles.logoRow}>
          <div style={styles.logoIcon}>
            <Terminal size={20} color="#6c63ff" />
          </div>
          <span style={styles.logoText}>RAG<span style={{ color: '#6c63ff' }}>ADMIN</span></span>
        </div>

        <div style={styles.titleBlock}>
          <h1 style={styles.title}>Secure Access</h1>
          <p style={styles.subtitle}>Ingestion Pipeline Control Panel</p>
        </div>

        {/* Auth badge */}
        <div style={styles.authBadge}>
          <Shield size={11} />
          <span>JWT Protected</span>
        </div>

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.field}>
            <label style={styles.label}>USERNAME</label>
            <input
              style={styles.input}
              type="text"
              autoComplete="username"
              placeholder="admin"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoFocus
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>PASSWORD</label>
            <div style={{ position: 'relative' }}>
              <input
                style={{ ...styles.input, paddingRight: 44 }}
                type={showPass ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                style={styles.eyeBtn}
              >
                {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !username || !password}
            style={{
              ...styles.submitBtn,
              opacity: (loading || !username || !password) ? 0.5 : 1,
              cursor: (loading || !username || !password) ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span className="spinner" />
                Authenticating...
              </span>
            ) : (
              'Access Panel'
            )}
          </button>
        </form>

        <p style={styles.hint}>
          Default credentials in <code style={styles.code}>.env</code> file
        </p>
      </div>

      <style>{`
        @keyframes shakeX {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-10px); }
          40% { transform: translateX(10px); }
          60% { transform: translateX(-6px); }
          80% { transform: translateX(6px); }
        }
      `}</style>
    </div>
  )
}

const styles = {
  root: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    position: 'relative',
    overflow: 'hidden',
  },
  glow1: {
    position: 'fixed',
    top: '-20%',
    right: '-10%',
    width: 600,
    height: 600,
    background: 'radial-gradient(circle, rgba(108,99,255,0.12) 0%, transparent 70%)',
    pointerEvents: 'none',
  },
  glow2: {
    position: 'fixed',
    bottom: '-20%',
    left: '-10%',
    width: 500,
    height: 500,
    background: 'radial-gradient(circle, rgba(34,211,160,0.06) 0%, transparent 70%)',
    pointerEvents: 'none',
  },
  card: {
    background: '#16161f',
    border: '1px solid #2a2a3d',
    borderRadius: 16,
    padding: '40px 36px',
    width: '100%',
    maxWidth: 420,
    boxShadow: '0 24px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(108,99,255,0.1)',
    position: 'relative',
    zIndex: 1,
    animation: 'fadeIn 0.4s ease',
  },
  logoRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    marginBottom: 28,
  },
  logoIcon: {
    width: 36,
    height: 36,
    background: 'rgba(108,99,255,0.15)',
    border: '1px solid rgba(108,99,255,0.3)',
    borderRadius: 8,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    fontFamily: "'Syne', sans-serif",
    fontWeight: 800,
    fontSize: 18,
    letterSpacing: '0.06em',
    color: '#e8e8f0',
  },
  titleBlock: {
    marginBottom: 20,
  },
  title: {
    fontFamily: "'Syne', sans-serif",
    fontWeight: 800,
    fontSize: 26,
    color: '#e8e8f0',
    marginBottom: 4,
  },
  subtitle: {
    fontFamily: "'Syne', sans-serif",
    fontSize: 13,
    color: '#8888aa',
  },
  authBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 5,
    padding: '3px 10px',
    background: 'rgba(108,99,255,0.1)',
    border: '1px solid rgba(108,99,255,0.2)',
    borderRadius: 20,
    fontSize: 11,
    fontWeight: 700,
    color: '#6c63ff',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    marginBottom: 28,
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 20,
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
  },
  label: {
    fontFamily: "'Syne', sans-serif",
    fontSize: 11,
    fontWeight: 700,
    color: '#8888aa',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    marginBottom: 8,
  },
  input: {
    width: '100%',
    padding: '12px 14px',
    background: '#1a1a24',
    border: '1px solid #2a2a3d',
    borderRadius: 8,
    color: '#e8e8f0',
    fontFamily: "'Space Mono', monospace",
    fontSize: 13,
    outline: 'none',
    transition: 'border-color 0.2s, box-shadow 0.2s',
    boxSizing: 'border-box',
  },
  eyeBtn: {
    position: 'absolute',
    right: 12,
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'none',
    border: 'none',
    color: '#555570',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    padding: 4,
  },
  submitBtn: {
    width: '100%',
    padding: '13px',
    background: '#6c63ff',
    border: 'none',
    borderRadius: 8,
    color: '#fff',
    fontFamily: "'Syne', sans-serif",
    fontWeight: 700,
    fontSize: 14,
    letterSpacing: '0.03em',
    cursor: 'pointer',
    transition: 'background 0.2s, box-shadow 0.2s, transform 0.1s',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  hint: {
    marginTop: 20,
    textAlign: 'center',
    fontSize: 12,
    color: '#555570',
    fontFamily: "'Syne', sans-serif",
  },
  code: {
    fontFamily: "'Space Mono', monospace",
    background: 'rgba(108,99,255,0.1)',
    padding: '1px 6px',
    borderRadius: 4,
    color: '#6c63ff',
    fontSize: 11,
  },
}
