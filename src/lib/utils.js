// ─── Format currency (INR) ──────────────────────────────────────
export const formatCurrency = (amount) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount || 0)

// ─── Format date ────────────────────────────────────────────────
export const formatDate = (date) => {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

export const formatDateTime = (date) => {
  if (!date) return '—'
  return new Date(date).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export const timeAgo = (date) => {
  if (!date) return '—'
  const seconds = Math.floor((Date.now() - new Date(date)) / 1000)
  if (seconds < 60) return `${seconds}s ago`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  return `${Math.floor(seconds / 86400)}d ago`
}

// ─── Order status helpers ───────────────────────────────────────
export const ORDER_STATUSES = [
  { value: 'pending', label: 'Pending', badge: 'badge-warning' },
  { value: 'payment_failed', label: 'Payment Failed', badge: 'badge-danger' },
  { value: 'confirmed', label: 'Confirmed', badge: 'badge-info' },
  { value: 'processing', label: 'Processing', badge: 'badge-brand' },
  { value: 'ready_to_ship', label: 'Ready to Ship', badge: 'badge-brand' },
  { value: 'shipped', label: 'Shipped', badge: 'badge-info' },
  { value: 'delivered', label: 'Delivered', badge: 'badge-success' },
  { value: 'cancelled', label: 'Cancelled', badge: 'badge-danger' },
  { value: 'refund_initiated', label: 'Refund Initiated', badge: 'badge-warning' },
  { value: 'refunded', label: 'Refunded', badge: 'badge-default' },
]

export const getOrderStatusBadge = (status) =>
  ORDER_STATUSES.find((s) => s.value === status) || { label: status, badge: 'badge-default' }

// ─── Product types ──────────────────────────────────────────────
export const PRODUCT_TYPES = [
  'mug', 'calendar', 'photo_print', 'canvas_print',
  'pillow', 'keychain', 'frame', 'poster', 'card', 'custom',
]

// ─── Banner placements ──────────────────────────────────────────
export const BANNER_PLACEMENTS = [
  'hero_slider', 'offer_strip', 'homepage_grid',
  'category_page', 'product_page', 'popup', 'sidebar', 'checkout_offer',
]

// ─── Build image URL ─────────────────────────────────────────────
const API_BASE = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000'
export const buildImageUrl = (path) => {
  if (!path) return null
  if (path.startsWith('http')) return path
  return `${API_BASE}${path.startsWith('/') ? '' : '/'}${path}`
}

// ─── Get initials ───────────────────────────────────────────────
export const getInitials = (name) => {
  if (!name) return '?'
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
}

// ─── Truncate text ──────────────────────────────────────────────
export const truncate = (str, max = 40) =>
  str?.length > max ? `${str.substring(0, max)}…` : str || ''

// ─── Extract error message ──────────────────────────────────────
export const extractError = (err) =>
  err?.response?.data?.message || err?.message || 'Something went wrong'
