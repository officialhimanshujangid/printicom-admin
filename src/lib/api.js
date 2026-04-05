import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
})

// ─── Request interceptor: attach token ──────────────────────────
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('ptc_admin_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// ─── Response interceptor: handle 401 ───────────────────────────
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('ptc_admin_token')
      localStorage.removeItem('ptc_admin_user')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export default api
