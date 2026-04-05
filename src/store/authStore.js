import { create } from 'zustand'

const getStoredUser = () => {
  try {
    return JSON.parse(localStorage.getItem('ptc_admin_user') || 'null')
  } catch { return null }
}

const useAuthStore = create((set, get) => ({
  user: getStoredUser(),
  token: localStorage.getItem('ptc_admin_token') || null,
  isAuthenticated: !!localStorage.getItem('ptc_admin_token'),

  login: (user, token) => {
    localStorage.setItem('ptc_admin_token', token)
    localStorage.setItem('ptc_admin_user', JSON.stringify(user))
    set({ user, token, isAuthenticated: true })
  },

  logout: () => {
    localStorage.removeItem('ptc_admin_token')
    localStorage.removeItem('ptc_admin_user')
    set({ user: null, token: null, isAuthenticated: false })
  },

  updateUser: (data) => {
    const updated = { ...get().user, ...data }
    localStorage.setItem('ptc_admin_user', JSON.stringify(updated))
    set({ user: updated })
  },
}))

export default useAuthStore
