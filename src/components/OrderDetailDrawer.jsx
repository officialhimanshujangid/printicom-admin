import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import {
  ShoppingBag, Package, Clock, CreditCard, MapPin,
  Tag, Box, AlertCircle, ExternalLink,
} from 'lucide-react'
import api from '../lib/api'
import {
  formatCurrency, formatDateTime, timeAgo,
  getOrderStatusBadge, buildImageUrl,
} from '../lib/utils'

export default function OrderDetailDrawer({ orderId, onClose, showCustomerLink = true }) {
  const navigate = useNavigate()
  const { data, isLoading } = useQuery({
    queryKey: ['admin-order-detail', orderId],
    queryFn: () => api.get(`/admin/orders/${orderId}`).then(r => r.data.data.order),
    enabled: !!orderId,
  })
  const order = data

  const handleProductClick = (name) => {
    onClose()
    navigate(`/products?search=${encodeURIComponent(name)}`)
  }

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal modal-lg" style={{ maxHeight: '94vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div className="modal-header">
          <h2 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <ShoppingBag size={18} color="var(--brand-primary)" />
            Order Detail
          </h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>✕</button>
        </div>

        {isLoading ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 60 }}>
            <div className="spinner" />
          </div>
        ) : !order ? (
          <div className="empty-state" style={{ flex: 1 }}><AlertCircle size={36} /><h3>Order not found</h3></div>
        ) : (
          <div style={{ flex: 1, overflowY: 'auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
              <div>
                <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'monospace' }}>
                  #{order.orderNumber || order._id?.slice(-10).toUpperCase()}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                  <Clock size={11} style={{ display: 'inline', marginRight: 4 }} />
                  {formatDateTime(order.createdAt)} · {timeAgo(order.createdAt)}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {(() => { const s = getOrderStatusBadge(order.status); return <span className={`badge ${s.badge}`}>{s.label}</span> })()}
                <span className={`badge ${order.paymentStatus === 'paid' ? 'badge-success' : order.paymentStatus === 'failed' ? 'badge-danger' : 'badge-warning'}`}>
                  {order.paymentStatus}
                </span>
              </div>
            </div>

            {/* Customer Info */}
            {order.user && (
              <div className="card" style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 14 }}>
                <div className="avatar-placeholder" style={{ width: 40, height: 40, fontSize: 14, flexShrink: 0 }}>
                  {order.user.name?.[0]?.toUpperCase() || '?'}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>{order.user.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{order.user.email}</div>
                  {order.user.phone && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{order.user.phone}</div>}
                </div>
                {showCustomerLink && order.user._id && (
                  <Link
                    to={`/users/${order.user._id}`}
                    className="btn btn-ghost btn-sm entity-link"
                    style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}
                    onClick={onClose}
                  >
                    <ExternalLink size={12} /> View Profile
                  </Link>
                )}
              </div>
            )}

            {/* Items */}
            <div className="card" style={{ padding: 20 }}>
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Box size={15} color="var(--brand-primary)" /> Order Items ({order.items?.length || 0})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {order.items?.map((item, i) => (
                  <div key={i} style={{ display: 'flex', gap: 14, alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border-light)' }}>
                    <div style={{ width: 52, height: 52, borderRadius: 10, overflow: 'hidden', border: '1px solid var(--border)', background: 'var(--bg-hover)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {buildImageUrl(item.productSnapshot?.thumbnailImage) ? (
                        <img src={buildImageUrl(item.productSnapshot?.thumbnailImage)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : <Package size={20} color="var(--text-muted)" />}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div
                        className="entity-link"
                        style={{ fontWeight: 700, fontSize: 13.5, marginBottom: 3, cursor: 'pointer' }}
                        onClick={() => item.productSnapshot?.name && handleProductClick(item.productSnapshot.name)}
                      >
                        {item.productSnapshot?.name || '—'}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        <span className="badge badge-default" style={{ fontSize: 10 }}>{item.productSnapshot?.productType?.replace('_', ' ')}</span>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>{formatCurrency(item.lineTotal)}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Qty {item.quantity} × {formatCurrency(item.unitPrice)}</div>
                    </div>
                  </div>
                ))}
              </div>
              {/* Totals */}
              <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {[
                  { label: 'Subtotal', value: formatCurrency(order.subtotal), bold: false },
                  { label: 'Shipping', value: `+${formatCurrency(order.shippingCharge || 0)}`, bold: false },
                  order.couponDiscount > 0 && { label: `Coupon (${order.coupon?.code || ''})`, value: `−${formatCurrency(order.couponDiscount)}`, bold: false, color: '#22c55e' },
                  { label: 'Total', value: formatCurrency(order.totalAmount), bold: true, color: 'var(--brand-primary)' },
                ].filter(Boolean).map((row, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: row.bold ? 15 : 12, fontWeight: row.bold ? 800 : 500, color: row.color || 'var(--text-secondary)', paddingTop: row.bold ? 10 : 0, borderTop: row.bold ? '1px solid var(--border)' : 'none' }}>
                    <span>{row.label}</span><span>{row.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Payment + Shipping grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              {/* Payment Info */}
              <div className="card" style={{ padding: 18 }}>
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <CreditCard size={14} color="var(--brand-primary)" /> Payment
                </div>
                {[
                  { label: 'Method', value: order.paymentMethod?.toUpperCase() },
                  { label: 'Status', value: order.paymentStatus },
                  order.razorpayOrderId && { label: 'Razorpay ID', value: order.razorpayOrderId },
                  order.razorpayPaymentId && { label: 'Payment ID', value: order.razorpayPaymentId },
                ].filter(Boolean).map((r, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 6 }}>
                    <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>{r.label}</span>
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontFamily: r.label.includes('ID') ? 'monospace' : 'inherit', fontSize: r.label.includes('ID') ? 10 : 12 }}>{r.value}</span>
                  </div>
                ))}
              </div>

              {/* Shipping Address */}
              <div className="card" style={{ padding: 18 }}>
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <MapPin size={14} color="var(--brand-primary)" /> Shipping Address
                </div>
                {order.shippingAddress ? (
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.8 }}>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{order.shippingAddress.name || order.shippingAddress.fullName}</div>
                    {order.shippingAddress.phone && <div>{order.shippingAddress.phone}</div>}
                    <div>{order.shippingAddress.street}</div>
                    <div>{order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.pincode}</div>
                    {order.shippingAddress.country && <div>{order.shippingAddress.country}</div>}
                  </div>
                ) : <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>No address on file</div>}
              </div>
            </div>

            {/* Tracking */}
            {order.trackingNumber && (
              <div className="card" style={{ padding: 16, display: 'flex', gap: 10, alignItems: 'center' }}>
                <Tag size={16} color="var(--brand-primary)" />
                <div style={{ fontSize: 13 }}>
                  <span style={{ fontWeight: 600, color: 'var(--text-muted)' }}>Tracking: </span>
                  <span style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--text-primary)' }}>{order.trackingNumber}</span>
                </div>
                {order.trackingUrl && (
                  <a href={order.trackingUrl} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm" style={{ marginLeft: 'auto', fontSize: 11 }}>
                    <ExternalLink size={11} /> Track
                  </a>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
