import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft, ShoppingBag, Heart, Package, User, Mail, Phone,
  Calendar, Clock, CheckCircle, XCircle, TrendingUp, Star,
  MapPin, CreditCard, ToggleLeft, ToggleRight, ChevronRight,
  Users, ExternalLink, AlertCircle,
} from 'lucide-react'
import api from '../lib/api'
import toast from 'react-hot-toast'
import {
  formatCurrency, formatDateTime, formatDate, timeAgo,
  getInitials, getOrderStatusBadge, buildImageUrl, extractError,
} from '../lib/utils'

// ─── fetchers ────────────────────────────────────────────────
const fetchUserDetail = (id) => api.get(`/admin/users/${id}`).then(r => r.data.data)
const fetchProductWishlistStats = (pid) => api.get(`/admin/wishlist/product/${pid}`).then(r => r.data.data)

import OrderDetailDrawer from '../components/OrderDetailDrawer'

// ─── Product Wishlist Stats Drawer ───────────────────────────
function ProductWishlistDrawer({ productId, onClose }) {
  const { data, isLoading } = useQuery({
    queryKey: ['product-wishlist-stats', productId],
    queryFn: () => fetchProductWishlistStats(productId),
    enabled: !!productId,
  })

  const product = data?.product
  const users = data?.users || []
  const total = data?.totalWishlisted || 0

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal modal-lg" style={{ maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div className="modal-header">
          <h2 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Heart size={18} color="#f43f5e" /> Wishlist Analytics
          </h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>✕</button>
        </div>
        {isLoading ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 60 }}>
            <div className="spinner" />
          </div>
        ) : (
          <div style={{ flex: 1, overflowY: 'auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 18 }}>
            {/* Product card */}
            {product && (
              <div style={{ display: 'flex', gap: 14, alignItems: 'center', padding: 16, background: 'var(--bg-hover)', borderRadius: 12, border: '1px solid var(--border)' }}>
                <div style={{ width: 60, height: 60, borderRadius: 10, overflow: 'hidden', border: '1px solid var(--border)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-card)' }}>
                  {buildImageUrl(product.thumbnailImage) ? (
                    <img src={buildImageUrl(product.thumbnailImage)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : <Package size={22} color="var(--text-muted)" />}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--text-primary)', marginBottom: 4 }}>{product.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{product.productType?.replace('_', ' ')}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 24, fontWeight: 900, color: '#f43f5e', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Heart size={20} fill="#f43f5e" /> {total}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>users wishlisted</div>
                </div>
              </div>
            )}

            {/* Users list */}
            <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)' }}>
              Users who wishlisted this product ({total})
            </div>
            {users.length === 0 ? (
              <div className="empty-state" style={{ padding: 40 }}>
                <Heart size={36} />
                <h3>No users yet</h3>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {users.map((u, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: 'var(--bg-hover)', borderRadius: 10, border: '1px solid var(--border-light)' }}>
                    <div className="avatar-placeholder" style={{ width: 34, height: 34, fontSize: 13, flexShrink: 0 }}>
                      {getInitials(u.name)}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)' }}>{u.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{u.email}</div>
                    </div>
                    <div style={{ textAlign: 'right', fontSize: 11, color: 'var(--text-muted)' }}>
                      <span className={`badge ${u.isActive ? 'badge-success' : 'badge-danger'}`} style={{ fontSize: 10, marginBottom: 3 }}>
                        {u.isActive ? 'Active' : 'Inactive'}
                      </span>
                      <div>Added {timeAgo(u.addedAt)}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Main UserDetail Page ─────────────────────────────────────
export default function UserDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [activeTab, setActiveTab] = useState('orders')
  const [selectedOrderId, setSelectedOrderId] = useState(null)
  const [selectedProductId, setSelectedProductId] = useState(null)

  const { data, isLoading } = useQuery({
    queryKey: ['user-detail', id],
    queryFn: () => fetchUserDetail(id),
    enabled: !!id,
  })

  const toggleStatus = useMutation({
    mutationFn: () => api.patch(`/admin/users/${id}/toggle-status`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['user-detail', id] }); qc.invalidateQueries({ queryKey: ['users'] }); toast.success('User status updated!') },
    onError: (err) => toast.error(extractError(err)),
  })

  if (isLoading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
      <div className="spinner" style={{ width: 40, height: 40 }} />
    </div>
  )

  if (!data?.user) return (
    <div className="empty-state" style={{ height: '60vh' }}>
      <AlertCircle size={48} />
      <h3>User not found</h3>
      <button className="btn btn-primary" onClick={() => navigate('/users')}>Back to Users</button>
    </div>
  )

  const user = data.user
  const orders = data.orders || []
  const wishlist = data.wishlist?.products || []
  const stats = data.orderStats || {}

  const TABS = [
    { id: 'orders', label: `Orders (${orders.length})`, icon: <ShoppingBag size={14} /> },
    { id: 'wishlist', label: `Wishlist (${wishlist.length})`, icon: <Heart size={14} /> },
    { id: 'info', label: 'Profile Info', icon: <User size={14} /> },
  ]

  return (
    <div>
      {/* ── Breadcrumb ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20, fontSize: 13, color: 'var(--text-muted)' }}>
        <button onClick={() => navigate('/users')} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, color: 'var(--brand-primary)', fontWeight: 600 }}>
          <ArrowLeft size={14} /> Users
        </button>
        <ChevronRight size={14} />
        <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{user.name}</span>
      </div>

      {/* ── Hero Header ── */}
      <div className="card" style={{ padding: 0, marginBottom: 20, overflow: 'hidden' }}>
        <div style={{ background: 'linear-gradient(135deg, #6366f1 0%, #7c3aed 60%, #a855f7 100%)', padding: '28px 28px 24px' }}>
          <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <div className="avatar-placeholder" style={{ width: 72, height: 72, fontSize: 26, background: 'rgba(255,255,255,0.2)', border: '3px solid rgba(255,255,255,0.4)', color: '#fff', flexShrink: 0 }}>
              {getInitials(user.name)}
            </div>
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ fontSize: 24, fontWeight: 900, color: '#fff', letterSpacing: -0.5 }}>{user.name}</div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)', margin: '4px 0 10px', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Mail size={12} /> {user.email}
                {user.phone && <><span>·</span><Phone size={12} /> {user.phone}</>}
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <span className={`badge ${user.isActive ? 'badge-success' : 'badge-danger'}`}>{user.isActive ? 'Active' : 'Inactive'}</span>
                <span className={`badge ${user.isEmailVerified ? 'badge-success' : 'badge-warning'}`}>{user.isEmailVerified ? '✓ Verified' : 'Unverified'}</span>
                <span className="badge" style={{ background: 'rgba(255,255,255,0.2)', color: '#fff' }}>{user.role}</span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <button
                className="btn btn-sm"
                style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', border: '1px solid rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center', gap: 5 }}
                onClick={() => { if (confirm(`${user.isActive ? 'Deactivate' : 'Activate'} ${user.name}?`)) toggleStatus.mutate() }}
              >
                {user.isActive ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
                {user.isActive ? 'Deactivate' : 'Activate'}
              </button>
            </div>
          </div>
        </div>

        {/* Stats Strip */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', borderTop: '1px solid var(--border)' }}>
          {[
            { icon: <ShoppingBag size={16} />, label: 'Total Orders', value: stats.total || 0, color: '#6366f1' },
            { icon: <TrendingUp size={16} />, label: 'Total Spent', value: formatCurrency(stats.totalSpent || 0), color: '#22c55e' },
            { icon: <CheckCircle size={16} />, label: 'Delivered', value: stats.delivered || 0, color: '#22c55e' },
            { icon: <XCircle size={16} />, label: 'Cancelled', value: stats.cancelled || 0, color: '#ef4444' },
            { icon: <Heart size={16} />, label: 'Wishlisted', value: wishlist.length, color: '#f43f5e' },
            { icon: <Clock size={16} />, label: 'Member Since', value: formatDate(user.createdAt), color: '#a855f7' },
          ].map((s, i) => (
            <div key={i} style={{ padding: '16px 18px', borderRight: '1px solid var(--border-light)', textAlign: 'center' }}>
              <div style={{ color: s.color, display: 'flex', justifyContent: 'center', marginBottom: 5 }}>{s.icon}</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)' }}>{s.value}</div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.3 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Tabs ── */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: 20, gap: 4 }}>
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '11px 20px',
              background: 'transparent', border: 'none', cursor: 'pointer',
              borderBottom: activeTab === tab.id ? '2px solid var(--brand-primary)' : '2px solid transparent',
              color: activeTab === tab.id ? 'var(--brand-primary)' : 'var(--text-muted)',
              fontWeight: activeTab === tab.id ? 700 : 400, fontSize: 13, transition: 'all 0.2s',
            }}
          >{tab.icon} {tab.label}</button>
        ))}
      </div>

      {/* ── ORDERS TAB ── */}
      {activeTab === 'orders' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {orders.length === 0 ? (
            <div className="empty-state card" style={{ padding: 60 }}>
              <ShoppingBag size={48} /><h3>No orders yet</h3>
              <p style={{ color: 'var(--text-muted)' }}>This user hasn't placed any orders.</p>
            </div>
          ) : orders.map(order => {
            const statusInfo = getOrderStatusBadge(order.status)
            return (
              <div key={order._id} className="card" style={{ padding: '18px 20px', borderLeft: '3px solid var(--brand-primary)', cursor: 'pointer', transition: 'transform 0.15s, box-shadow 0.15s' }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = 'var(--shadow-lg)' }}
                onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '' }}
                onClick={() => setSelectedOrderId(order._id)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--text-primary)', fontFamily: 'monospace' }}>
                      #{order.orderNumber || order._id?.slice(-10).toUpperCase()}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                      <Clock size={11} style={{ display: 'inline', marginRight: 4 }} />{formatDateTime(order.createdAt)}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 900, fontSize: 16, color: '#22c55e' }}>{formatCurrency(order.totalAmount)}</div>
                    <div style={{ display: 'flex', gap: 5, marginTop: 5, justifyContent: 'flex-end' }}>
                      <span className={`badge ${statusInfo.badge}`} style={{ fontSize: 10 }}>{statusInfo.label}</span>
                      <span className={`badge ${order.paymentStatus === 'paid' ? 'badge-success' : order.paymentStatus === 'failed' ? 'badge-danger' : 'badge-warning'}`} style={{ fontSize: 10 }}>
                        {order.paymentStatus}
                      </span>
                    </div>
                  </div>
                </div>
                {/* Mini items list */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 8 }}>
                  {order.items?.slice(0, 4).map((item, i) => (
                    <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'center', background: 'var(--bg-hover)', padding: '7px 10px', borderRadius: 8 }}>
                      <div style={{ width: 34, height: 34, borderRadius: 6, overflow: 'hidden', border: '1px solid var(--border)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-card)' }}>
                        {buildImageUrl(item.productSnapshot?.thumbnailImage) ? (
                          <img src={buildImageUrl(item.productSnapshot?.thumbnailImage)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : <Package size={14} color="var(--text-muted)" />}
                      </div>
                      <div style={{ flex: 1, overflow: 'hidden' }}>
                        <Link
                          to={`/products?search=${encodeURIComponent(item.productSnapshot?.name || '')}`}
                          className="entity-link"
                          style={{ fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block' }}
                          onClick={(e) => e.stopPropagation()}
                        >{item.productSnapshot?.name}</Link>
                        <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Qty {item.quantity} × {formatCurrency(item.unitPrice)}</div>
                      </div>
                    </div>
                  ))}
                  {order.items?.length > 4 && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '7px 10px', background: 'var(--bg-hover)', borderRadius: 8, fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>
                      +{order.items.length - 4} more
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--border-light)' }}>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    <CreditCard size={11} style={{ display: 'inline', marginRight: 3 }} />{order.paymentMethod?.toUpperCase()}
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--brand-primary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                    View Full Detail <ChevronRight size={12} />
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── WISHLIST TAB ── */}
      {activeTab === 'wishlist' && (
        <div>
          {wishlist.length === 0 ? (
            <div className="empty-state card" style={{ padding: 60 }}>
              <Heart size={48} /><h3>Empty Wishlist</h3>
              <p style={{ color: 'var(--text-muted)' }}>This user hasn't wishlisted any products.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
              {wishlist.map(item => {
                const p = item.product
                if (!p) return null
                return (
                  <div key={item._id} className="card" style={{ padding: '14px 16px', display: 'flex', gap: 14, alignItems: 'flex-start', cursor: 'pointer', transition: 'transform 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                    onMouseLeave={e => e.currentTarget.style.transform = ''}
                    onClick={() => setSelectedProductId(p._id)}
                    title="Click to see how many users wishlisted this product"
                  >
                    <div style={{ width: 60, height: 60, borderRadius: 10, overflow: 'hidden', border: '1px solid var(--border)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-hover)' }}>
                      {buildImageUrl(p.thumbnailImage || p.images?.[0]) ? (
                        <img src={buildImageUrl(p.thumbnailImage || p.images?.[0])} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : <Package size={22} color="var(--text-muted)" />}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 13.5, color: 'var(--text-primary)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        {p.name}
                        <ExternalLink size={11} color="var(--text-muted)" />
                      </div>
                      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 6 }}>
                        <span className="badge badge-default" style={{ fontSize: 10 }}>{p.productType?.replace('_', ' ')}</span>
                        <span className={`badge ${p.isActive ? 'badge-success' : 'badge-danger'}`} style={{ fontSize: 10 }}>{p.isActive ? 'Available' : 'Unavailable'}</span>
                        {p.category?.name && <span className="badge" style={{ fontSize: 10, background: 'rgba(99,102,241,0.1)', color: 'var(--brand-primary)' }}>{p.category.icon} {p.category.name}</span>}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                        <div>
                          <span style={{ fontWeight: 800, color: '#22c55e', fontSize: 14 }}>{formatCurrency(p.discountPrice || p.basePrice)}</span>
                          {p.discountPrice && <span style={{ fontSize: 11, textDecoration: 'line-through', color: 'var(--text-muted)', marginLeft: 5 }}>{formatCurrency(p.basePrice)}</span>}
                        </div>
                        <div style={{ fontSize: 10, color: 'var(--text-muted)', textAlign: 'right' }}>
                          <Heart size={10} color="#f43f5e" style={{ display: 'inline', marginRight: 3 }} />
                          Added {timeAgo(item.addedAt)}
                        </div>
                      </div>
                      {p.rating?.average > 0 && (
                        <div style={{ fontSize: 10, color: '#f59e0b', marginTop: 4, display: 'flex', alignItems: 'center', gap: 3 }}>
                          <Star size={10} fill="#f59e0b" /> {p.rating.average} ({p.rating.count} reviews)
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
          {wishlist.length > 0 && (
            <div style={{ marginTop: 16, fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>
              <Heart size={12} color="#f43f5e" style={{ display: 'inline', marginRight: 5 }} />
              Click on any product to see how many users have wishlisted it
            </div>
          )}
        </div>
      )}

      {/* ── INFO TAB ── */}
      {activeTab === 'info' && (
        <div className="card" style={{ padding: 24, maxWidth: 600 }}>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 18, display: 'flex', alignItems: 'center', gap: 8 }}>
            <User size={16} color="var(--brand-primary)" /> Profile Information
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {[
              { icon: <Mail size={14} />, label: 'Email Address', value: user.email },
              { icon: <Phone size={14} />, label: 'Phone', value: user.phone || '—' },
              { icon: <User size={14} />, label: 'Role', value: user.role },
              { icon: <CheckCircle size={14} />, label: 'Email Verified', value: user.isEmailVerified ? '✓ Verified' : 'Not Verified', color: user.isEmailVerified ? '#22c55e' : '#f59e0b' },
              { icon: <Users size={14} />, label: 'Account Status', value: user.isActive ? 'Active' : 'Inactive', color: user.isActive ? '#22c55e' : '#ef4444' },
              { icon: <Calendar size={14} />, label: 'Joined', value: formatDateTime(user.createdAt) },
              { icon: <Clock size={14} />, label: 'Last Login', value: user.lastLogin ? formatDateTime(user.lastLogin) : 'Never logged in' },
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 0', borderBottom: '1px solid var(--border-light)' }}>
                <div style={{ color: 'var(--text-muted)', flexShrink: 0 }}>{item.icon}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 }}>{item.label}</div>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: item.color || 'var(--text-primary)' }}>{item.value}</div>
                </div>
              </div>
            ))}
          </div>
          {/* Addresses */}
          {user.addresses?.length > 0 && (
            <div style={{ marginTop: 24 }}>
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                <MapPin size={14} color="var(--brand-primary)" /> Saved Addresses ({user.addresses.length})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {user.addresses.map((addr, i) => (
                  <div key={i} style={{ padding: '12px 14px', background: 'var(--bg-hover)', borderRadius: 10, border: `1px solid ${addr.isDefault ? 'var(--brand-primary)' : 'var(--border-light)'}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontWeight: 700, fontSize: 13 }}>{addr.fullName}</span>
                        {addr.label && <span className="badge badge-default" style={{ fontSize: 10 }}>{addr.label}</span>}
                      </div>
                      {addr.isDefault && <span className="badge badge-brand" style={{ fontSize: 10 }}>Default</span>}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                      {addr.phone && <div>{addr.phone}</div>}
                      <div>{addr.street}, {addr.city}, {addr.state} {addr.pincode}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Drawers */}
      {selectedOrderId && <OrderDetailDrawer orderId={selectedOrderId} onClose={() => setSelectedOrderId(null)} showCustomerLink={false} />}
      {selectedProductId && <ProductWishlistDrawer productId={selectedProductId} onClose={() => setSelectedProductId(null)} />}
    </div>
  )
}
