import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// Simple JWT-like token — signed with HMAC-style base64 encoding
// In production replace with a real JWT library; this is a self-contained approach
const SECRET = import.meta.env.VITE_JWT_SECRET || 'rag-admin-secret'
const ADMIN_USER = import.meta.env.VITE_ADMIN_USERNAME || 'admin'
const ADMIN_PASS = import.meta.env.VITE_ADMIN_PASSWORD || 'Admin@RAG2026'

function btoa64(str) {
  return btoa(unescape(encodeURIComponent(str)))
}

function atob64(str) {
  try { return decodeURIComponent(escape(atob(str))) } catch { return null }
}

function createToken(username) {
  const header = btoa64(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const payload = btoa64(JSON.stringify({
    sub: username,
    iat: Date.now(),
    exp: Date.now() + 8 * 60 * 60 * 1000, // 8 hours
  }))
  const sig = btoa64(`${header}.${payload}.${SECRET}`)
  return `${header}.${payload}.${sig}`
}

function verifyToken(token) {
  if (!token) return null
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const payload = JSON.parse(atob64(parts[1]))
    if (!payload || payload.exp < Date.now()) return null
    // Verify signature
    const expectedSig = btoa64(`${parts[0]}.${parts[1]}.${SECRET}`)
    if (parts[2] !== expectedSig) return null
    return payload
  } catch {
    return null
  }
}

export const useAuthStore = create(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      isAuthenticated: false,

      login: (username, password) => {
        if (username === ADMIN_USER && password === ADMIN_PASS) {
          const token = createToken(username)
          set({ token, user: username, isAuthenticated: true })
          return { success: true }
        }
        return { success: false, error: 'Invalid username or password' }
      },

      logout: () => {
        set({ token: null, user: null, isAuthenticated: false })
      },

      checkAuth: () => {
        const { token } = get()
        if (!token) return false
        const payload = verifyToken(token)
        if (!payload) {
          set({ token: null, user: null, isAuthenticated: false })
          return false
        }
        return true
      },

      getApiKey: () => {
        // The RAG backend API key — store in env or retrieve from admin config
        return import.meta.env.VITE_RAG_API_KEY || ''
      }
    }),
    { name: 'rag-admin-auth' }
  )
)
