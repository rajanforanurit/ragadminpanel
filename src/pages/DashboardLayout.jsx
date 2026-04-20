import React, { useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import {
  LayoutDashboard, Users, FileText, Settings, LogOut,
  Terminal, ChevronLeft, ChevronRight, Activity
} from 'lucide-react'

const NAV = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/clients', icon: Users, label: 'Clients' },
  { to: '/documents', icon: FileText, label: 'Documents' },
  { to: '/settings', icon: Settings, label: 'Settings' },
]

export default function DashboardLayout() {
  const navigate = useNavigate()
  const { logout, user } = useAuthStore()
  const [collapsed, setCollapsed] = useState(false)

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div style={styles.root}>
      {/* Sidebar */}
      <aside style={{ ...styles.sidebar, width: collapsed ? 64 : 220 }}>
        {/* Logo */}
        <div style={styles.logoArea}>
          <div style={styles.logoIcon}>
            <Terminal size={16} color="#6c63ff" />
          </div>
          {!collapsed && (
            <span style={styles.logoText}>
              RAG<span style={{ color: '#6c63ff' }}>ADMIN</span>
            </span>
          )}
        </div>

        {/* Nav */}
        <nav style={styles.nav}>
          {NAV.map(({ to, icon: Icon, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              style={({ isActive }) => ({
                ...styles.navItem,
                background: isActive ? 'rgba(108,99,255,0.12)' : 'transparent',
                color: isActive ? '#6c63ff' : '#8888aa',
                borderLeft: isActive ? '2px solid #6c63ff' : '2px solid transparent',
                paddingLeft: isActive ? 14 : 16,
              })}
            >
              <Icon size={17} />
              {!collapsed && <span style={styles.navLabel}>{label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* Bottom section */}
        <div style={styles.sidebarBottom}>
          {!collapsed && (
            <div style={styles.userBadge}>
              <div style={styles.userAvatar}>
                {user?.[0]?.toUpperCase() || 'A'}
              </div>
              <div>
                <div style={styles.userName}>{user || 'admin'}</div>
                <div style={styles.userRole}>Administrator</div>
              </div>
            </div>
          )}
          <button onClick={handleLogout} style={styles.logoutBtn} title="Logout">
            <LogOut size={15} />
            {!collapsed && <span>Logout</span>}
          </button>
        </div>

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          style={styles.collapseBtn}
        >
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </aside>

      {/* Main content */}
      <main style={styles.main}>
        {/* Top bar */}
        <header style={styles.topbar}>
          <div style={styles.topbarLeft}>
            <div style={styles.liveIndicator}>
              <span className="status-dot online" />
              <span style={styles.liveText}>Pipeline Active</span>
            </div>
          </div>
          <div style={styles.topbarRight}>
            <Activity size={14} color="#555570" />
            <span style={styles.topbarDate}>
              {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
            </span>
          </div>
        </header>

        <div style={styles.content}>
          <Outlet />
        </div>
      </main>
    </div>
  )
}

const styles = {
  root: {
    display: 'flex',
    minHeight: '100vh',
    background: '#0a0a0f',
  },
  sidebar: {
    background: '#0d0d14',
    borderRight: '1px solid #1e1e2e',
    display: 'flex',
    flexDirection: 'column',
    position: 'fixed',
    top: 0,
    left: 0,
    bottom: 0,
    transition: 'width 0.25s cubic-bezier(0.4,0,0.2,1)',
    zIndex: 50,
    overflow: 'hidden',
  },
  logoArea: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '20px 16px',
    borderBottom: '1px solid #1e1e2e',
    minHeight: 64,
  },
  logoIcon: {
    width: 32,
    height: 32,
    background: 'rgba(108,99,255,0.15)',
    border: '1px solid rgba(108,99,255,0.25)',
    borderRadius: 8,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  logoText: {
    fontFamily: "'Syne', sans-serif",
    fontWeight: 800,
    fontSize: 15,
    letterSpacing: '0.06em',
    color: '#e8e8f0',
    whiteSpace: 'nowrap',
  },
  nav: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
    padding: '12px 8px',
    flex: 1,
  },
  navItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '10px 16px',
    borderRadius: 8,
    textDecoration: 'none',
    fontFamily: "'Syne', sans-serif",
    fontWeight: 600,
    fontSize: 13,
    transition: 'all 0.15s ease',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
  },
  navLabel: {
    fontFamily: "'Syne', sans-serif",
  },
  sidebarBottom: {
    padding: '12px 8px',
    borderTop: '1px solid #1e1e2e',
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  userBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '8px',
    borderRadius: 8,
    overflow: 'hidden',
  },
  userAvatar: {
    width: 28,
    height: 28,
    background: 'rgba(108,99,255,0.2)',
    border: '1px solid rgba(108,99,255,0.3)',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: "'Syne', sans-serif",
    fontWeight: 800,
    fontSize: 11,
    color: '#6c63ff',
    flexShrink: 0,
  },
  userName: {
    fontFamily: "'Syne', sans-serif",
    fontWeight: 700,
    fontSize: 12,
    color: '#e8e8f0',
    whiteSpace: 'nowrap',
  },
  userRole: {
    fontFamily: "'Syne', sans-serif",
    fontSize: 10,
    color: '#555570',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
  },
  logoutBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '8px 12px',
    background: 'transparent',
    border: '1px solid #1e1e2e',
    borderRadius: 8,
    color: '#555570',
    cursor: 'pointer',
    fontFamily: "'Syne', sans-serif",
    fontWeight: 600,
    fontSize: 12,
    transition: 'all 0.15s ease',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    width: '100%',
  },
  collapseBtn: {
    position: 'absolute',
    top: '50%',
    right: -12,
    transform: 'translateY(-50%)',
    width: 24,
    height: 24,
    background: '#1a1a24',
    border: '1px solid #2a2a3d',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    color: '#555570',
    zIndex: 10,
    transition: 'all 0.15s',
  },
  main: {
    flex: 1,
    marginLeft: 220,
    display: 'flex',
    flexDirection: 'column',
    minHeight: '100vh',
    transition: 'margin-left 0.25s cubic-bezier(0.4,0,0.2,1)',
  },
  topbar: {
    height: 56,
    borderBottom: '1px solid #1e1e2e',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 28px',
    background: 'rgba(13,13,20,0.8)',
    backdropFilter: 'blur(10px)',
    position: 'sticky',
    top: 0,
    zIndex: 40,
  },
  topbarLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
  },
  liveIndicator: {
    display: 'flex',
    alignItems: 'center',
    gap: 7,
  },
  liveText: {
    fontFamily: "'Syne', sans-serif",
    fontSize: 12,
    fontWeight: 600,
    color: '#22d3a0',
  },
  topbarRight: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  topbarDate: {
    fontFamily: "'Space Mono', monospace",
    fontSize: 11,
    color: '#555570',
  },
  content: {
    flex: 1,
    padding: 28,
    maxWidth: 1400,
    width: '100%',
  },
}
