import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft, Truck, AlertCircle, ChevronRight, Package, ExternalLink,
  Image as ImageIcon, Type, X, MapPin, User, CreditCard,
  ShoppingBag, Clock, CheckCircle, MessageSquare, Download, RefreshCw
} from 'lucide-react'
import api from '../lib/api'
import toast from 'react-hot-toast'
import { formatCurrency, formatDateTime, getOrderStatusBadge, ORDER_STATUSES, extractError, timeAgo } from '../lib/utils'

function parseCustomization(customization) {
  if (!customization || typeof customization !== 'object') return []
  const entries = []
  for (const [key, val] of Object.entries(customization)) {
    if (!val) continue
    if (typeof val === 'object' && (val.type === 'image_upload' || val.type === 'text_input')) {
      entries.push({ key, ...val })
      continue
    }
    if (key === 'uploadedPhotos' && Array.isArray(val) && val.length > 0) {
      val.forEach((url, i) => entries.push({ key: `photo_${i}`, type: 'image_upload', label: `Upload ${i + 1}`, value: url }))
      continue
    }
    if (key === 'text' && val && typeof val === 'string') {
      entries.push({ key, type: 'text_input', label: 'Custom Text', value: val })
      continue
    }
    if (key === 'additionalOptions' && typeof val === 'object') continue
    if (typeof val === 'string' && val && !['null', 'undefined'].includes(val)) {
      const isImg = /photo|image|img|pic|upload/i.test(key)
      const isUrl = val.startsWith('http')
      entries.push({
        key,
        type: isImg || isUrl ? 'image_upload' : 'text_input',
        label: key.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
        value: val,
      })
    }
  }
  return entries.filter(e => e.value)
}

function Lightbox({ src, label, onClose }) {
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 99999, background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(6px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
      <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: 600 }}>{label}</div>
      <img src={src} alt={label} onClick={e => e.stopPropagation()} style={{ maxWidth: '90vw', maxHeight: '80vh', objectFit: 'contain', borderRadius: 12, boxShadow: '0 0 60px rgba(0,0,0,0.8)' }} />
      <div style={{ display: 'flex', gap: 12 }}>
        <a href={src} download target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: 'rgba(255,255,255,0.1)', borderRadius: 8, color: 'white', textDecoration: 'none', fontSize: 13 }}><Download size={14} /> Download</a>
        <button onClick={onClose} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: 'rgba(255,255,255,0.1)', borderRadius: 8, color: 'white', border: 'none', cursor: 'pointer', fontSize: 13 }}><X size={14} /> Close</button>
      </div>
      <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11 }}>Click anywhere to close</div>
    </div>
  )
}

function CustomizationSection({ customization }) {
  const [lightbox, setLightbox] = useState(null)
  const entries = parseCustomization(customization)
  if (entries.length === 0) return null

  const imageEntries = entries.filter(e => e.type === 'image_upload' && e.value)
  const textEntries = entries.filter(e => e.type === 'text_input' && e.value)

  return (
    <>
      {lightbox && <Lightbox src={lightbox.src} label={lightbox.label} onClose={() => setLightbox(null)} />}
      <div style={{ marginTop: 12, border: '1px solid rgba(99,102,241,0.25)', borderRadius: 12, overflow: 'hidden', background: 'linear-gradient(135deg, rgba(99,102,241,0.06) 0%, rgba(16,185,129,0.03) 100%)' }}>
        <div style={{ padding: '10px 14px', background: 'rgba(99,102,241,0.1)', borderBottom: '1px solid rgba(99,102,241,0.15)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 22, height: 22, borderRadius: 6, background: 'rgba(99,102,241,0.2)', color: '#818cf8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><MessageSquare size={11} /></div>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#818cf8', textTransform: 'uppercase', letterSpacing: 0.8 }}>Customer Customization</span>
          <span style={{ marginLeft: 'auto', fontSize: 10, color: 'rgba(129,140,248,0.7)' }}>{entries.length} field{entries.length !== 1 ? 's' : ''}</span>
        </div>
        <div style={{ padding: '14px' }}>
          {imageEntries.length > 0 && (
            <div style={{ marginBottom: textEntries.length > 0 ? 14 : 0 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.6, display: 'flex', alignItems: 'center', gap: 5 }}><ImageIcon size={10} /> Images ({imageEntries.length})</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                {imageEntries.map((entry, idx) => (
                  <div key={idx} style={{ position: 'relative' }}>
                    <img src={entry.value} alt={entry.label} onClick={() => setLightbox({ src: entry.value, label: entry.label })} style={{ width: 90, height: 90, objectFit: 'cover', borderRadius: 10, border: '2px solid rgba(99,102,241,0.2)', cursor: 'zoom-in', display: 'block', transition: 'border-color 0.2s' }} onMouseEnter={e => e.target.style.borderColor = 'rgba(99,102,241,0.6)'} onMouseLeave={e => e.target.style.borderColor = 'rgba(99,102,241,0.2)'} />
                    <div onClick={() => setLightbox({ src: entry.value, label: entry.label })} style={{ position: 'absolute', inset: 0, borderRadius: 10, background: 'rgba(0,0,0,0)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', padding: '0 0 6px', transition: 'background 0.2s', cursor: 'zoom-in' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.35)'} onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,0,0,0)'}></div>
                    <div style={{ fontSize: 9, color: 'var(--text-muted)', textAlign: 'center', marginTop: 4, maxWidth: 90, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{entry.label}</div>
                    <a href={entry.value} target="_blank" rel="noopener noreferrer" download style={{ display: 'block', textAlign: 'center', fontSize: 9, color: '#818cf8', marginTop: 2 }}>Full size ↗</a>
                  </div>
                ))}
              </div>
            </div>
          )}
          {textEntries.length > 0 && (
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.6, display: 'flex', alignItems: 'center', gap: 5 }}><Type size={10} /> Text Fields ({textEntries.length})</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {textEntries.map((entry, idx) => (
                  <div key={idx} style={{ display: 'grid', gridTemplateColumns: '130px 1fr', gap: 8, alignItems: 'flex-start', padding: '8px 10px', background: 'var(--bg-hover)', borderRadius: 8, border: '1px solid var(--border-light)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <div style={{ width: 16, height: 16, borderRadius: 4, background: 'rgba(16,185,129,0.15)', color: '#34d399', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Type size={9} /></div>
                      <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)' }}>{entry.label}</span>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-primary)', fontStyle: 'italic', lineHeight: 1.5, wordBreak: 'break-word', borderLeft: '2px solid rgba(16,185,129,0.3)', paddingLeft: 10 }}>"{entry.value}"</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

function SectionLabel({ icon: Icon, label, color = 'var(--text-muted)' }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 12 }}>
      {Icon && <Icon size={13} color={color} />}
      <span style={{ fontSize: 11, fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: 0.8 }}>{label}</span>
    </div>
  )
}

export default function OrderDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [activeTab, setActiveTab] = useState('details')
  const [saving, setSaving] = useState(false)
  
  const [statusForm, setStatusForm] = useState({ status: '', note: '' })
  const [trackingForm, setTrackingForm] = useState({ trackingNumber: '', courierName: '', trackingUrl: '', estimatedDeliveryDate: '' })

  const getAvailableStatuses = (current, isPaid) => {
    switch(current) {
      case 'pending': return ['pending', 'confirmed', 'cancelled']
      case 'payment_failed': return ['payment_failed', 'confirmed', 'cancelled']
      case 'confirmed': return ['confirmed', 'processing', 'cancelled']
      case 'processing': return ['processing', 'ready_to_ship', 'cancelled']
      case 'ready_to_ship': return ['ready_to_ship', 'shipped', 'cancelled']
      case 'shipped': return ['shipped', 'delivered']
      case 'delivered': return ['delivered']
      case 'cancelled': return isPaid ? ['cancelled', 'refund_initiated'] : ['cancelled']
      case 'refund_initiated': return ['refund_initiated', 'refunded']
      case 'refunded': return ['refunded']
      default: return []
    }
  }

  const { data: orderResponse, isLoading, error } = useQuery({
    queryKey: ['order', id],
    queryFn: async () => {
      const { data } = await api.get(`/orders/admin/${id}`)
      return data.data?.order || data.data
    }
  })

  const selectedOrder = orderResponse

  useEffect(() => {
    if (selectedOrder) {
      setStatusForm(prev => prev.status ? prev : { status: selectedOrder.status, note: '' })
      setTrackingForm(prev => prev.trackingNumber ? prev : {
        trackingNumber: selectedOrder.trackingNumber || '',
        courierName: selectedOrder.courierName || '',
        trackingUrl: selectedOrder.trackingUrl || '',
        estimatedDeliveryDate: selectedOrder.estimatedDeliveryDate?.split('T')[0] || '',
      })
    }
  }, [selectedOrder])

  const updateStatus = async (e, customPayload = null) => {
    if (e && e.preventDefault) e.preventDefault()
    setSaving(true)
    try {
      await api.patch(`/orders/admin/${selectedOrder._id}/status`, customPayload || statusForm)
      toast.success('Order status updated!')
      qc.invalidateQueries({ queryKey: ['order', id] })
    } catch (err) { toast.error(extractError(err)) }
    finally { setSaving(false) }
  }

  const updateTracking = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await api.patch(`/orders/admin/${selectedOrder._id}/tracking`, trackingForm)
      toast.success('Tracking info updated!')
      qc.invalidateQueries({ queryKey: ['order', id] })
    } catch (err) { toast.error(extractError(err)) }
    finally { setSaving(false) }
  }

  const processShipment = async (method) => {
    setSaving(true)
    try {
      await api.post(`/orders/admin/${selectedOrder._id}/process-shipment`, { method, ...trackingForm })
      toast.success(method === 'shiprocket' ? 'Shipped seamlessly via Shiprocket!' : 'Manual shipment processed!')
      qc.invalidateQueries({ queryKey: ['order', id] })
    } catch (err) { toast.error(extractError(err)) }
    finally { setSaving(false) }
  }

  const syncTracking = async () => {
    setSaving(true)
    try {
      const res = await api.post(`/orders/admin/${selectedOrder._id}/sync-tracking`)
      if (res.data?.data?.tracking?.statusChanged) {
         toast.success(`Synced! Status actively updated to ${res.data.data.tracking.mappedStatus}.`)
      } else {
         toast.success('Synced! No new status leaps detected.')
      }
      qc.invalidateQueries({ queryKey: ['order', id] })
    } catch (err) { toast.error(extractError(err)) }
    finally { setSaving(false) }
  }

  const handleRequestAction = async (type, action) => {
    setSaving(true)
    try {
      const endpoint = type === 'cancellation' ? 'cancellation-request' : 'return-request'
      const { data } = await api.patch(`/orders/admin/${selectedOrder._id}/${endpoint}`, { action })
      toast.success(data.message || 'Request processed!')
      qc.invalidateQueries({ queryKey: ['order', id] })
    } catch (err) { toast.error(extractError(err)) }
    finally { setSaving(false) }
  }

  if (isLoading) return <div className="page-container"><div className="spinner" style={{ margin: '100px auto' }} /></div>
  if (error || !selectedOrder) return <div className="page-container"><h2>Error loading order or not found.</h2><button onClick={() => navigate('/orders')} className="btn btn-secondary mt-4">Back to Orders</button></div>

  const hasPendingRequest = selectedOrder?.cancellationRequest?.requested || selectedOrder?.returnRequest?.requested

  return (
    <div className="page-container">
      <div className="page-header" style={{ alignItems: 'flex-start' }}>
        <div>
          <button className="btn btn-ghost btn-sm" style={{ padding: 0, marginBottom: 12, color: 'var(--text-muted)' }} onClick={() => navigate('/orders')}>
            <ArrowLeft size={14} style={{ marginRight: 6 }} /> Back to Orders
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <h1 className="page-title" style={{ margin: 0 }}>Order #{selectedOrder.orderNumber}</h1>
            <span className={`badge ${getOrderStatusBadge(selectedOrder.status).badge}`} style={{ fontSize: 12 }}>
              {getOrderStatusBadge(selectedOrder.status).label}
            </span>
            <span className={`badge ${selectedOrder.paymentStatus === 'paid' ? 'badge-success' : 'badge-warning'}`} style={{ fontSize: 11 }}>
              {selectedOrder.paymentMethod?.toUpperCase()} · {selectedOrder.paymentStatus}
            </span>
            {(selectedOrder.status === 'pending' || selectedOrder.status === 'payment_failed') && selectedOrder.paymentStatus !== 'paid' && (
               <button className="btn btn-secondary btn-sm" onClick={() => {
                 if (window.confirm('Mark this order as paid manually? This will confirm the order.')) {
                   updateStatus(null, { status: 'confirmed', note: 'Manual Payment Recorded', markPaid: true })
                 }
               }}><CheckCircle size={12} style={{marginRight: 4}}/> Mark Payment Done</button>
            )}
            {selectedOrder.status === 'cancelled' && selectedOrder.paymentStatus === 'paid' && (
              <button className="btn btn-secondary btn-sm" onClick={() => {
                 if (window.confirm('Initiate refund process?')) {
                   updateStatus(null, { status: 'refund_initiated', note: 'Initializing Refund for cancelled order' })
                 }
               }}><Clock size={12} style={{marginRight: 4}}/> Initiate Refund</button>
            )}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>
            Placed {formatDateTime(selectedOrder.createdAt)} · {timeAgo(selectedOrder.createdAt)}
          </div>
        </div>
      </div>

      <div className="tabs" style={{ marginBottom: 20 }}>
        {[
          { key: 'details', label: 'Order Details' },
          { key: 'status', label: 'Update Status' },
          { key: 'tracking', label: 'Tracking & Shipping' },
          { key: 'timeline', label: 'Timeline History' },
          ...(hasPendingRequest ? [{ key: 'requests', label: '⚠️ Action Required' }] : []),
        ].map(t => (
          <button key={t.key} className={`tab-btn${activeTab === t.key ? ' active' : ''}`} onClick={() => setActiveTab(t.key)}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="card" style={{ padding: 24 }}>
        {activeTab === 'details' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 20 }}>
              <div style={{ background: 'var(--bg-hover)', borderRadius: 12, padding: 20, border: '1px solid var(--border-light)' }}>
                <SectionLabel icon={User} label="Customer Information" />
                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>{selectedOrder.user?.name || 'Guest'}</div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>{selectedOrder.user?.email}</div>
                {selectedOrder.user?.phone && <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{selectedOrder.user.phone}</div>}
                {selectedOrder.user?._id && (
                  <Link to={`/users/${selectedOrder.user._id}`} className="entity-link" style={{ fontSize: 12, marginTop: 12, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <ExternalLink size={12} /> View Complete Profile
                  </Link>
                )}
                {selectedOrder.customerNote && (
                  <div style={{ marginTop: 16, padding: '10px 14px', background: 'rgba(245,158,11,0.08)', borderRadius: 8, border: '1px solid rgba(245,158,11,0.2)' }}>
                    <div style={{ fontSize: 10, fontWeight: 800, color: '#f59e0b', marginBottom: 4 }}>📝 CUSTOMER NOTE</div>
                    <div style={{ fontSize: 13, color: 'var(--text-secondary)', fontStyle: 'italic', lineHeight: 1.5 }}>{selectedOrder.customerNote}</div>
                  </div>
                )}
              </div>

              <div style={{ background: 'var(--bg-hover)', borderRadius: 12, padding: 20, border: '1px solid var(--border-light)' }}>
                <SectionLabel icon={MapPin} label="Shipping Address" />
                {selectedOrder.shippingAddress ? (
                  <div style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.8 }}>
                    <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>{selectedOrder.shippingAddress.fullName}</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>📞 {selectedOrder.shippingAddress.phone}</div>
                    <div>{selectedOrder.shippingAddress.street}</div>
                    {selectedOrder.shippingAddress.landmark && <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Near: {selectedOrder.shippingAddress.landmark}</div>}
                    <div>{selectedOrder.shippingAddress.city}, {selectedOrder.shippingAddress.state}</div>
                    <div style={{ fontWeight: 700, marginTop: 4, letterSpacing: 0.5 }}>PIN: {selectedOrder.shippingAddress.pincode}</div>
                  </div>
                ) : <span style={{ fontSize: 14, color: 'var(--text-muted)' }}>No Shipping Address Available</span>}
              </div>
            </div>

            <div>
              <SectionLabel icon={ShoppingBag} label={`Order Items (${selectedOrder.items?.length || 0})`} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {(selectedOrder.items || []).map((item, i) => {
                  const customEntries = parseCustomization(item.customization)
                  return (
                    <div key={i} style={{ border: '1px solid var(--border-light)', borderRadius: 12, overflow: 'hidden', background: 'var(--bg-card)' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, padding: '16px 20px', background: 'var(--bg-hover)' }}>
                        {item.productSnapshot?.thumbnailImage ? (
                          <img src={item.productSnapshot.thumbnailImage} alt={item.productSnapshot.name} style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--border)', flexShrink: 0 }} />
                        ) : (
                          <div style={{ width: 64, height: 64, borderRadius: 8, background: 'var(--bg-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: '1px solid var(--border)' }}><Package size={24} color="var(--text-muted)" /></div>
                        )}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <Link to={`/products?search=${encodeURIComponent(item.productSnapshot?.name || '')}`} className="entity-link" style={{ fontSize: 16, fontWeight: 700, marginBottom: 6, display: 'inline-block' }}>
                            {item.productSnapshot?.name || 'Removed Product'}
                          </Link>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Quantity: <strong style={{ color: 'var(--text-primary)' }}>{item.quantity}</strong></span>
                            {item.variantName && <span className="badge badge-default" style={{ fontSize: 11, padding: '2px 8px' }}>{item.variantName}</span>}
                            {item.productSnapshot?.productType && <span className="badge badge-default" style={{ fontSize: 11, padding: '2px 8px' }}>Type: {item.productSnapshot.productType}</span>}
                            {customEntries.length > 0 && <span className="badge badge-brand" style={{ fontSize: 11, padding: '2px 8px' }}>✏️ Customised</span>}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <div style={{ fontWeight: 800, color: 'var(--success)', fontSize: 18 }}>{formatCurrency(item.lineTotal)}</div>
                          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{formatCurrency(item.unitPrice)} × {item.quantity}</div>
                        </div>
                      </div>
                      {customEntries.length > 0 && (
                        <div style={{ padding: '0 20px 20px' }}>
                          <CustomizationSection customization={item.customization} />
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            <div style={{ background: 'var(--bg-hover)', borderRadius: 12, padding: 24, border: '1px solid var(--border-light)', maxWidth: 400, marginLeft: 'auto', width: '100%' }}>
              <SectionLabel icon={CreditCard} label="Order Summary" />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  { label: 'Subtotal', value: formatCurrency(selectedOrder.subtotal) },
                  { label: 'Shipping', value: formatCurrency(selectedOrder.shippingCharge) },
                  selectedOrder.couponDiscount > 0 && { label: `Coupon (${selectedOrder.coupon?.code || ''})`, value: `-${formatCurrency(selectedOrder.couponDiscount)}`, color: 'var(--success)' },
                ].filter(Boolean).map(row => (
                  <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 14, color: 'var(--text-secondary)' }}>
                    <span>{row.label}</span>
                    <span style={{ color: row.color, fontWeight: 600 }}>{row.value}</span>
                  </div>
                ))}
                <div style={{ height: 1, background: 'var(--border-light)', margin: '8px 0' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 18, fontWeight: 800 }}>
                  <span style={{ color: 'var(--text-primary)' }}>Total Received</span>
                  <span style={{ color: 'var(--success)' }}>{formatCurrency(selectedOrder.totalAmount)}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'status' && (
          <form onSubmit={updateStatus} style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 600 }}>
            <div style={{ padding: '16px', background: 'var(--bg-hover)', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 12, border: '1px solid var(--border-light)' }}>
              <span style={{ fontSize: 14, color: 'var(--text-muted)' }}>Current Status:</span>
              <span className={`badge ${getOrderStatusBadge(selectedOrder.status).badge}`}>{getOrderStatusBadge(selectedOrder.status).label}</span>
            </div>
            <div className="form-group">
              <label className="form-label">Change Status To</label>
              <select className="form-select" value={statusForm.status} onChange={e => setStatusForm({ ...statusForm, status: e.target.value })}>
                {ORDER_STATUSES.filter(s => getAvailableStatuses(selectedOrder.status, selectedOrder.paymentStatus === 'paid').includes(s.value)).map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Internal Admin Note (optional)</label>
              <textarea className="form-textarea" value={statusForm.note} onChange={e => setStatusForm({ ...statusForm, note: e.target.value })} placeholder="E.g. Sent for printing..." rows={3} />
            </div>
            <button id="status-form-submit" type="submit" className="btn btn-primary" disabled={saving || statusForm.status === selectedOrder.status} style={{ width: 'fit-content' }}>
              {saving ? <div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> : <><CheckCircle size={16} /> Save Status Update</>}
            </button>
          </form>
        )}

        {activeTab === 'tracking' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 600 }}>
            {/* If order is already shipped or has active tracking info */}
            {(selectedOrder.trackingNumber || selectedOrder.isManualShipped === false) && (
              <div style={{ padding: '20px', background: 'rgba(16,185,129,0.07)', borderRadius: 12, border: '1px solid rgba(16,185,129,0.2)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div style={{ fontWeight: 800, color: 'var(--success)', fontSize: 15, display: 'flex', gap: 8, alignItems: 'center' }}><Truck size={18} /> Shipment Dispatched</div>
                  {selectedOrder.isManualShipped === false ? (
                     <span className="badge badge-brand">🚀 Shiprocket Auto</span>
                  ) : (
                     <span className="badge badge-default">🖐️ Manual Dispatch</span>
                  )}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: 12, background: 'var(--bg-elevated)', padding: 16, borderRadius: 8 }}>
                  <div>
                     <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>Courier</div>
                     <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{selectedOrder.courierName || 'Pending Assignment'}</div>
                  </div>
                  <div>
                     <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>Tracking AWB / Number</div>
                     <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{selectedOrder.trackingNumber || 'Pending AWB Generation'}</div>
                  </div>
                  {selectedOrder.shipmentId && (
                    <div style={{ gridColumn: '1 / -1' }}>
                       <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>Shiprocket Shipment ID</div>
                       <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'monospace' }}>{selectedOrder.shipmentId}</div>
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
                  {selectedOrder.trackingUrl && <a href={selectedOrder.trackingUrl} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm">Track Package ↗</a>}
                  {selectedOrder.labelUrl && <a href={selectedOrder.labelUrl} target="_blank" rel="noopener noreferrer" className="btn btn-primary btn-sm"><Download size={14} /> Download Label</a>}
                  {selectedOrder.isManualShipped === false && selectedOrder.trackingNumber && (
                    <button onClick={syncTracking} disabled={saving} className="btn btn-secondary btn-sm" style={{ borderColor: 'var(--border-focus)' }}>
                      {saving ? <div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> : <RefreshCw size={14} />} Sync Status
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Manual Update Tracking Form */}
            {selectedOrder.status !== 'cancelled' && selectedOrder.status !== 'refunded' && (
              <div className="card" style={{ padding: 24 }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                  {selectedOrder.trackingNumber || selectedOrder.shipmentId ? 'Update Existing Shipment' : 'Process New Shipment'}
                </h3>
                
                {/* Auto Shipment Banner */}
                {!(selectedOrder.trackingNumber || selectedOrder.shipmentId) && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 20, background: 'linear-gradient(135deg, rgba(255,107,53,0.08) 0%, rgba(255,107,53,0.02) 100%)', borderRadius: 12, border: '1px solid rgba(255,107,53,0.2)', marginBottom: 24 }}>
                    <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: 14 }}>🚀 Automated Dispatch (Shiprocket)</div>
                    <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Instantly assign a courier, generate an AWB, generate a shipping label, and ping the customer tracking updates.</div>
                    <button className="btn btn-primary" onClick={() => processShipment('shiprocket')} disabled={saving} style={{ alignSelf: 'flex-start' }}>
                       {saving ? <div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> : 'Generate Auto Shipment'}
                    </button>
                  </div>
                )}

                <form onSubmit={e => { e.preventDefault(); selectedOrder.trackingNumber || selectedOrder.shipmentId ? updateTracking(e) : processShipment('manual') }} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: 14, borderBottom: '1px solid var(--border)', paddingBottom: 8 }}>🖐️ Manual Dispatch Properties</div>
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Courier Service</label>
                      <input className="form-input" value={trackingForm.courierName} onChange={e => setTrackingForm({ ...trackingForm, courierName: e.target.value })} placeholder="e.g. India Post, Local" />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Tracking Number</label>
                      <input className="form-input" value={trackingForm.trackingNumber} onChange={e => setTrackingForm({ ...trackingForm, trackingNumber: e.target.value })} placeholder="AWB / Ref Num" />
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Tracking Link</label>
                    <input type="url" className="form-input" value={trackingForm.trackingUrl} onChange={e => setTrackingForm({ ...trackingForm, trackingUrl: e.target.value })} placeholder="https://..." />
                  </div>
                  <button type="submit" className="btn btn-secondary" disabled={saving || (!trackingForm.courierName && !selectedOrder.trackingNumber)} style={{ width: 'fit-content' }}>
                    <Truck size={16} /> {saving ? <div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> : (selectedOrder.trackingNumber || selectedOrder.shipmentId ? 'Update Info' : 'Process Manual Shipment')}
                  </button>
                </form>
              </div>
            )}
          </div>
        )}

        {activeTab === 'timeline' && (
          <div className="timeline" style={{ paddingLeft: 10, maxWidth: 600 }}>
            {(selectedOrder.statusHistory || []).length === 0 ? (
              <div className="empty-state"><AlertCircle size={32} /><p>No history entries yet.</p></div>
            ) : [...(selectedOrder.statusHistory || [])].reverse().map((h, i) => {
              const { label, badge } = getOrderStatusBadge(h.status)
              return (
                <div key={i} className="timeline-item">
                  <div className={`timeline-dot${i === 0 ? ' active' : ''}`} style={{ background: i === 0 ? 'var(--brand-primary)' : 'var(--border)' }}>
                    <ChevronRight size={14} color="#fff" />
                  </div>
                  <div className="timeline-content" style={{ paddingBottom: 24 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                      <span className={`badge ${badge}`} style={{ fontSize: 11 }}>{label}</span>
                      <span className="timeline-time" style={{ color: 'var(--text-muted)', fontSize: 12 }}>{formatDateTime(h.timestamp)}</span>
                    </div>
                    {h.note && <div className="timeline-note" style={{ color: 'var(--text-primary)', fontSize: 13, background: 'var(--bg-hover)', padding: '10px 14px', borderRadius: 8, display: 'inline-block', marginTop: 4 }}>{h.note}</div>}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {activeTab === 'requests' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 600 }}>
            {selectedOrder.cancellationRequest?.requested && (
              <div style={{ padding: 24, border: '1px solid var(--danger)', borderRadius: 16, background: 'rgba(239, 83, 80, 0.03)' }}>
                <h3 style={{ fontSize: 17, fontWeight: 700, color: 'var(--danger)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}><AlertCircle size={18} /> Cancellation Request</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 12, fontSize: 14, marginBottom: 20 }}>
                  <span style={{ color: 'var(--text-muted)' }}>Status</span>
                  <span className="badge badge-default" style={{ justifySelf: 'start', textTransform: 'capitalize' }}>{selectedOrder.cancellationRequest.status}</span>
                  <span style={{ color: 'var(--text-muted)' }}>Customer Reason</span>
                  <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{selectedOrder.cancellationRequest.reason}</span>
                </div>
                {selectedOrder.cancellationRequest.status === 'pending' && (
                  <div style={{ display: 'flex', gap: 12 }}>
                    <button className="btn btn-success" onClick={() => handleRequestAction('cancellation', 'approve')} disabled={saving}>Approve & Cancel Order</button>
                    <button className="btn btn-danger" onClick={() => handleRequestAction('cancellation', 'reject')} disabled={saving}>Reject Request</button>
                  </div>
                )}
              </div>
            )}
            {selectedOrder.returnRequest?.requested && (
              <div style={{ padding: 24, border: '1px solid var(--warning)', borderRadius: 16, background: 'rgba(255, 179, 71, 0.03)' }}>
                <h3 style={{ fontSize: 17, fontWeight: 700, color: 'var(--warning)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}><AlertCircle size={18} /> Return Request</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 12, fontSize: 14, marginBottom: 20 }}>
                  <span style={{ color: 'var(--text-muted)' }}>Status</span>
                  <span className="badge badge-default" style={{ justifySelf: 'start', textTransform: 'capitalize' }}>{selectedOrder.returnRequest.status?.replace('_', ' ')}</span>
                  <span style={{ color: 'var(--text-muted)' }}>Customer Reason</span>
                  <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{selectedOrder.returnRequest.reason}</span>
                  <span style={{ color: 'var(--text-muted)' }}>Refund Status</span>
                  <span className={`badge ${selectedOrder.returnRequest.refundStatus === 'refunded' ? 'badge-success' : 'badge-default'}`} style={{ justifySelf: 'start', textTransform: 'capitalize' }}>{selectedOrder.returnRequest.refundStatus}</span>
                </div>
                {selectedOrder.returnRequest.status === 'pending' && (
                  <div style={{ display: 'flex', gap: 12 }}>
                    <button className="btn btn-success" onClick={() => handleRequestAction('return', 'approve')} disabled={saving}>Approve Return</button>
                    <button className="btn btn-danger" onClick={() => handleRequestAction('return', 'reject')} disabled={saving}>Reject Request</button>
                  </div>
                )}
                {selectedOrder.returnRequest.status === 'approved' && (
                  <button className="btn btn-primary" onClick={() => handleRequestAction('return', 'receive_items')} disabled={saving}>Mark Items as Received</button>
                )}
                {selectedOrder.returnRequest.status === 'items_received' && selectedOrder.returnRequest.refundStatus === 'pending' && (
                  <button className="btn btn-success" onClick={() => handleRequestAction('return', 'issue_refund')} disabled={saving}>Issue Refund & Close Return</button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
