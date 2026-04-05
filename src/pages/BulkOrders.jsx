import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  Package, Mail, Phone, Building2, Clock, CheckCircle, 
  AlertCircle, Search, ExternalLink, MoreHorizontal, 
  Trash2, Filter, ArrowRight, MessageSquare, IndianRupee,
  Calendar, CheckSquare, XCircle, Loader2
} from 'lucide-react'
import api from '../lib/api'
import toast from 'react-hot-toast'
import { extractError, formatDateTime, timeAgo, formatCurrency } from '../lib/utils'

const fetchBulkOrders = async ({ queryKey }) => {
  const [, status, page] = queryKey
  const params = new URLSearchParams({ page })
  if (status) params.set('status', status)
  const { data: res } = await api.get(`/bulk-orders/admin?${params}`)
  return { orders: res.data || [], pagination: res.pagination || {} }
}

const fetchStats = async () => {
  const { data: res } = await api.get('/bulk-orders/admin/stats')
  return res.data
}

export default function BulkOrders() {
  const qc = useQueryClient()
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [adminNote, setAdminNote] = useState('')

  const { data, isLoading } = useQuery({ 
    queryKey: ['bulkOrders', status, page], 
    queryFn: fetchBulkOrders 
  })
  
  const { data: stats } = useQuery({ 
    queryKey: ['bulkOrderStats'], 
    queryFn: fetchStats 
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, status, note }) => {
      await api.put(`/bulk-orders/admin/${id}`, { status, note })
    },
    onSuccess: () => {
      toast.success('Inquiry updated')
      qc.invalidateQueries({ queryKey: ['bulkOrders'] })
      qc.invalidateQueries({ queryKey: ['bulkOrderStats'] })
      setSelectedOrder(null)
      setAdminNote('')
    },
    onError: (err) => toast.error(extractError(err))
  })

  const orders = data?.orders || []
  const pagination = data?.pagination || {}

  const STATUS_MAP = {
    pending: { label: 'Pending', color: '#6366f1', bg: 'rgba(99,102,241,0.1)', icon: <Clock size={14}/> },
    contacted: { label: 'Contacted', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', icon: <Phone size={14}/> },
    'quote-sent': { label: 'Quote Sent', color: '#10b981', bg: 'rgba(16,185,129,0.1)', icon: <IndianRupee size={14}/> },
    negotiating: { label: 'Negotiating', color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)', icon: <MessageSquare size={14}/> },
    converted: { label: 'Converted', color: '#059669', bg: 'rgba(5,150,105,0.15)', icon: <CheckCircle size={14}/> },
    closed: { label: 'Closed', color: '#6b7280', bg: 'rgba(107,114,128,0.1)', icon: <XCircle size={14}/> },
  }

  if (isLoading) return <div className="loading-spinner"><div className="spinner" /></div>

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Bulk & B2B Orders</h1>
          <p className="page-subtitle">Track and manage high-volume corporate and community inquiries</p>
        </div>
      </div>

      <div className="stats-grid" style={{ marginBottom: 24 }}>
        <div className="stat-card">
          <div className="stat-label">Total Inquiries</div>
          <div className="stat-value">{stats?.total || 0}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Pending Response</div>
          <div className="stat-value" style={{ color: 'var(--brand)' }}>{stats?.pending || 0}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Successfully Converted</div>
          <div className="stat-value" style={{ color: 'var(--success)' }}>{stats?.converted || 0}</div>
        </div>
      </div>

      <div className="filter-bar" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 12 }}>
          <select 
            className="form-select" 
            value={status} 
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
            style={{ width: 180 }}
          >
            <option value="">All Leads</option>
            {Object.entries(STATUS_MAP).map(([val, info]) => (
              <option key={val} value={val}>{info.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <table className="table">
          <thead>
            <tr>
              <th>Lead / Contact</th>
              <th>Company</th>
              <th>Product & Qty</th>
              <th>Status</th>
              <th>Time</th>
              <th width="80">Actions</th>
            </tr>
          </thead>
          <tbody>
            {orders.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                  No bulk inquiries found matching your filters.
                </td>
              </tr>
            ) : (
              orders.map(order => (
                <tr key={order._id}>
                  <td>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{order.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{order.email}</div>
                  </td>
                  <td>{order.company || <span style={{ opacity: 0.3 }}>Individual</span>}</td>
                  <td>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{order.productName}</div>
                    <div style={{ fontSize: 12, color: 'var(--brand)', fontWeight: 700 }}>
                      Qty: {order.quantityEstimate || 'N/A'}
                    </div>
                  </td>
                  <td>
                    <span 
                      className="badge" 
                      style={{ 
                        background: STATUS_MAP[order.status]?.bg || 'var(--bg-elevated)', 
                        color: STATUS_MAP[order.status]?.color || 'var(--text-muted)',
                        display: 'flex', gap: 6, alignItems: 'center', width: 'fit-content'
                      }}
                    >
                      {STATUS_MAP[order.status]?.icon}
                      {STATUS_MAP[order.status]?.label}
                    </span>
                  </td>
                  <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{timeAgo(order.createdAt)}</td>
                  <td>
                    <button 
                      className="btn btn-ghost btn-icon btn-sm" 
                      onClick={() => {
                        setSelectedOrder(order)
                        setAdminNote('')
                      }}
                    >
                      <ArrowRight size={16} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {selectedOrder && (
        <div className="modal-overlay">
          <div className="modal modal-lg">
            <div className="modal-header">
              <h2 className="modal-title">Bulk Inquiry Detail</h2>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setSelectedOrder(null)}>✕</button>
            </div>
            <div className="modal-body" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <section>
                  <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>Contact Person</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div className="avatar-placeholder" style={{ width: 44, height: 44, fontSize: 18 }}>{selectedOrder.name[0]}</div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 16 }}>{selectedOrder.name}</div>
                      <div style={{ fontSize: 13, color: 'var(--brand)' }}>{selectedOrder.email}</div>
                    </div>
                  </div>
                  <div style={{ marginTop: 12, display: 'flex', gap: 16 }}>
                    <div style={{ fontSize: 13 }}><Phone size={14} style={{ marginRight: 4, verticalAlign: 'middle' }}/> {selectedOrder.phone || 'N/A'}</div>
                    {selectedOrder.whatsappNumber && <div style={{ fontSize: 13, color: '#25D366' }}><MessageSquare size={14} style={{ marginRight: 4, verticalAlign: 'middle' }}/> {selectedOrder.whatsappNumber}</div>}
                  </div>
                </section>

                <section>
                  <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>Entity Details</label>
                  <div style={{ fontWeight: 600 }}>{selectedOrder.company || 'Individual / Personal Inquiry'}</div>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
                    Method: {selectedOrder.preferredContactMethod}
                  </div>
                </section>

                <section style={{ background: 'var(--bg-elevated)', padding: 16, borderRadius: 12 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>Initial Message</label>
                  <div style={{ fontSize: 14, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{selectedOrder.message}</div>
                </section>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <section style={{ border: '1px solid var(--border)', padding: 16, borderRadius: 12, background: 'rgba(255,107,53,0.03)' }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>Target Requirements</label>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                    <span style={{ fontSize: 13 }}>Product:</span>
                    <span style={{ fontWeight: 700 }}>{selectedOrder.productName}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                    <span style={{ fontSize: 13 }}>Estimate Qty:</span>
                    <span style={{ fontWeight: 800, color: 'var(--brand)', fontSize: 18 }}>{selectedOrder.quantityEstimate || 'N/A'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                    <span style={{ fontSize: 13 }}>Timeline:</span>
                    <span>{selectedOrder.timeline || '—'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 13 }}>Budget:</span>
                    <span style={{ fontWeight: 600 }}>{selectedOrder.budgetRange || '—'}</span>
                  </div>
                </section>

                <section>
                  <label className="form-label">Manage Status</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                    {Object.entries(STATUS_MAP).map(([val, info]) => (
                      <button 
                        key={val} 
                        className={`btn btn-sm ${selectedOrder.status === val ? 'btn-primary' : 'btn-outline'}`}
                        style={{ fontSize: 11, padding: '8px 4px' }}
                        onClick={() => updateMutation.mutate({ id: selectedOrder._id, status: val })}
                        disabled={updateMutation.isPending}
                      >
                        {val === selectedOrder.status && updateMutation.isPending ? <Loader2 size={12} className="spin"/> : info.label}
                      </button>
                    ))}
                  </div>
                </section>

                <section>
                   <label className="form-label">Add Follow-up Note</label>
                   <textarea 
                     className="form-textarea" 
                     placeholder="Customer called, quote sent over WhatsApp..." 
                     style={{ minHeight: 80 }}
                     value={adminNote}
                     onChange={(e) => setAdminNote(e.target.value)}
                   />
                   <button 
                     className="btn btn-secondary btn-sm" 
                     style={{ marginTop: 8, width: '100%' }}
                     onClick={() => updateMutation.mutate({ id: selectedOrder._id, note: adminNote })}
                     disabled={!adminNote.trim() || updateMutation.isPending}
                   >
                     Save Note
                   </button>
                </section>

                <section>
                  <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>History / Notes</label>
                  <div style={{ maxHeight: 120, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {selectedOrder.adminNotes?.length === 0 ? (
                      <div style={{ fontSize: 12, fontStyle: 'italic', color: 'var(--text-muted)' }}>No follow-up notes yet.</div>
                    ) : (
                      selectedOrder.adminNotes.map((n, i) => (
                        <div key={i} style={{ fontSize: 12, padding: 8, background: 'var(--bg-elevated)', borderRadius: 6 }}>
                          <div style={{ fontWeight: 600, marginBottom: 2 }}>{n.note}</div>
                          <div style={{ color: 'var(--text-muted)', fontSize: 10 }}>{formatDateTime(n.createdAt)}</div>
                        </div>
                      )).reverse()
                    )}
                  </div>
                </section>
              </div>
            </div>
            <div className="modal-footer" style={{ justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost" onClick={() => setSelectedOrder(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
