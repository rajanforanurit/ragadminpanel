import React, { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { useAuthStore } from './store/authStore'
import LoginPage from './pages/LoginPage'
import DashboardLayout from './pages/DashboardLayout'
import DashboardHome from './pages/DashboardHome'
import ClientsPage from './pages/ClientsPage'
import ClientDetailPage from './pages/ClientDetailPage'
import DocumentsPage from './pages/DocumentsPage'
import SettingsPage from './pages/SettingsPage'

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }
  static getDerivedStateFromError(error) {
    return { error }
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{
          minHeight: '100vh', display: 'flex', alignItems: 'center',
          justifyContent: 'center', flexDirection: 'column', gap: 16,
          background: '#0a0a0f', padding: 32,
        }}>
          <div style={{ fontSize: 32 }}>⚠️</div>
          <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 20, color: '#e8e8f0' }}>
            Something went wrong
          </div>
          <div style={{
            fontFamily: "'Space Mono', monospace", fontSize: 12, color: '#f43f5e',
            background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.2)',
            padding: '12px 16px', borderRadius: 8, maxWidth: 500, wordBreak: 'break-word',
          }}>
            {this.state.error.message}
          </div>
          <button
            onClick={() => { this.setState({ error: null }); window.location.href = '/clients' }}
            style={{
              padding: '10px 20px', background: '#6c63ff', border: 'none', borderRadius: 8,
              color: '#fff', fontFamily: "'Syne', sans-serif", fontWeight: 700,
              fontSize: 13, cursor: 'pointer',
            }}
          >
            Back to Clients
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

function RequireAuth({ children }) {
  const { isAuthenticated, checkAuth } = useAuthStore()
  const valid = isAuthenticated && checkAuth()
  return valid ? children : <Navigate to="/login" replace />
}

export default function App() {
  const { checkAuth } = useAuthStore()
  useEffect(() => { checkAuth() }, [])

  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#16161f',
            color: '#e8e8f0',
            border: '1px solid #2a2a3d',
            fontFamily: "'Syne', sans-serif",
            fontSize: '14px',
          },
          success: { iconTheme: { primary: '#22d3a0', secondary: '#0a0a0f' } },
          error: { iconTheme: { primary: '#f43f5e', secondary: '#0a0a0f' } },
        }}
      />
      <ErrorBoundary>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/"
            element={
              <RequireAuth>
                <DashboardLayout />
              </RequireAuth>
            }
          >
            <Route index element={<DashboardHome />} />
            <Route path="clients" element={<ClientsPage />} />
            <Route path="clients/:clientId" element={<ErrorBoundary><ClientDetailPage /></ErrorBoundary>} />
            <Route path="documents" element={<DocumentsPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </ErrorBoundary>
    </BrowserRouter>
  )
}