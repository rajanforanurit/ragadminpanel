import axios from 'axios'
import { getApiKey } from '../store/settingsStore'
const CHAT_BACKEND = import.meta.env.VITE_CHAT_BACKEND_URL || 'https://anuritchatbackend.vercel.app'
const mongo = axios.create({
  baseURL: CHAT_BACKEND,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
})
mongo.interceptors.request.use((config) => {
  const key = getApiKey()
  if (key) config.headers['Authorization'] = `Bearer ${key}`
  return config
})
export const mongoCreateClient = (data) => mongo.post('/admin/clients', data)
export const mongoGetAllClients = () => mongo.get('/admin/clients')
export const mongoGetClient = (clientId) => mongo.get(`/admin/clients/${clientId}`)
export const mongoPatchClient = (clientId, updates) => mongo.patch(`/admin/clients/${clientId}`, updates)
export const mongoDeleteClient = (clientId) => mongo.delete(`/admin/clients/${clientId}`)
