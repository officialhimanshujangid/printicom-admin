import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import {
  Receipt, Plus, Search, Filter, Download, Mail, MessageCircle,
  Eye, XCircle, RotateCcw, RefreshCw, ChevronDown, FileText,
  ArrowUpRight, CheckCircle, Clock, AlertTriangle
} from 'lucide-react'
import api from '../lib/api'
import toast from 'react-hot-toast'
import { formatCurrency, extractError } from '../lib/utils'

const STATUS_CONFIG = {
  draft:     { label: 'Draft',     color: 'var(--text-muted)',   bg: 'var(--bg-hover)',            icon: <FileText size={12}/> },
  sent:      { label: 'Sent',      color: '#3b82f6',             bg: 'rgba(59,130,246,0.12)',       icon: <Mail size={12}/> },
  payment_pending: { label: 'Payment Pending', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)',      icon: <Clock size={12}/> },
  paid:      { label: 'Paid',      color: 'var(--success)',      bg: 'rgba(34,197,94,0.12)',        icon: <CheckCircle size={12}/> },
  cancelled: { label: 'Cancelled', color: 'var(--danger)',       bg: 'rgba(239,68,68,0.12)',        icon: <XCircle size={12}/> },
  refunded:  { label: 'Refunded',  color: '#8b5cf6',             bg: 'rgba(139,92,246,0.12)',       icon: <RotateCcw size={12}/> },
  revoked:   { label: 'Revoked',   color: '#f59e0b',             bg: 'rgba(245,158,11,0.12)',       icon: <RotateCcw size={12}/> },
}

const fetchInvoices = async (params) => {
  const q = new URLSearchParams(
    Object.fromEntries(Object.entries(params).filter(([, v]) => v !== '' && v != null))
  )
  const { data } = await api.get(`/invoices?${q}`)
  return data.data || {}
}

const fetchSettings = () => api.get('/settings').then(r => r.data.data?.settings || {})

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.draft
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
      color: cfg.color, background: cfg.bg, textTransform: 'uppercase', letterSpacing: '0.05em',
    }}>
      {cfg.icon} {cfg.label}
    </span>
  )
}

export default function Invoices() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [search, setSearch]   = useState('')
  const [status, setStatus]   = useState('')
  const [type, setType]       = useState('')
  const [page, setPage]       = useState(1)
  const [actionLoading, setActionLoading] = useState(null)
  const [cancelModal, setCancelModal]   = useState(null)
  const [revokeModal, setRevokeModal]   = useState(null)
  const [cancelReason, setCancelReason] = useState('')
  const [revokeReason, setRevokeReason] = useState('')
  const searchTimeout = useRef(null)

  const { data: settings } = useQuery({ queryKey: ['settings'], queryFn: fetchSettings, staleTime: 60000 })
  const invoiceEnabled = settings?.invoice?.enabled

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['invoices', search, status, type, page],
    queryFn: () => fetchInvoices({ search, status, type, page, limit: 20 }),
    staleTime: 15000,
  })

  const invoices   = data?.invoices   || []
  const pagination = data?.pagination || {}

  const handleSearch = (val) => {
    clearTimeout(searchTimeout.current)
    searchTimeout.current = setTimeout(() => { setSearch(val); setPage(1) }, 400)
  }

  const doCancel = async () => {
    if (!cancelModal) return
    setActionLoading('cancel')
    try {
      await api.post(`/invoices/${cancelModal._id}/cancel`, { reason: cancelReason })
      toast.success('Invoice cancelled')
      qc.invalidateQueries({ queryKey: ['invoices'] })
      setCancelModal(null); setCancelReason('')
    } catch (err) { toast.error(extractError(err)) }
    finally { setActionLoading(null) }
  }

  const doRevoke = async () => {
    if (!revokeModal) return
    setActionLoading('revoke')
    try {
      await api.post(`/invoices/${revokeModal._id}/revoke`, { reason: revokeReason })
      toast.success('Invoice revoked — restored to Draft')
      qc.invalidateQueries({ queryKey: ['invoices'] })
      setRevokeModal(null); setRevokeReason('')
    } catch (err) { toast.error(extractError(err)) }
    finally { setActionLoading(null) }
  }

  const sendEmail = async (inv) => {
    setActionLoading(`email-${inv._id}`)
    try {
      await api.post(`/invoices/${inv._id}/send-email`)
      toast.success('Invoice emailed!')
      qc.invalidateQueries({ queryKey: ['invoices'] })
    } catch (err) { toast.error(extractError(err)) }
    finally { setActionLoading(null) }
  }

  const sendWhatsApp = async (inv) => {
    setActionLoading(`wa-${inv._id}`)
    try {
      await api.post(`/invoices/${inv._id}/send-whatsapp`)
      toast.success('Invoice sent via WhatsApp!')
    } catch (err) { toast.error(extractError(err)) }
    finally { setActionLoading(null) }
  }

  const downloadPDF = async (inv) => {
    setActionLoading(`pdf-${inv._id}`)
    try {
      const { data } = await api.get(`/invoices/${inv._id}/pdf`, { responseType: 'blob' })
      const url  = URL.createObjectURL(data)
      const a    = document.createElement('a')
      a.href = url; a.download = `${inv.invoiceNumber}.pdf`; a.click()
      URL.revokeObjectURL(url)
    } catch (err) { toast.error(extractError(err)) }
    finally { setActionLoading(null) }
  }

  if (!invoiceEnabled) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 400, gap: 16 }}>
        <Receipt size={64} color="var(--text-muted)" />
        <h2 style={{ color: 'var(--text-primary)' }}>Invoicing is Disabled</h2>
        <p style={{ color: 'var(--text-muted)', textAlign: 'center' }}>Enable invoicing in Settings → Invoice Settings to get started.</p>
        <button className="btn btn-primary" onClick={() => navigate('/settings')}>Go to Settings</button>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Invoices</h1>
          <p className="page-subtitle">Manage, create, and send invoices to clients</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => qc.invalidateQueries({ queryKey: ['invoices'] })}>
            <RefreshCw size={14} style={isFetching ? { animation: 'spin 0.8s linear infinite' } : {}} />
          </button>
          <button className="btn btn-primary" onClick={() => navigate('/invoices/new')}>
            <Plus size={15} /> New Invoice
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="filters-bar" style={{ marginBottom: 20 }}>
        <div className="search-bar" style={{ flex: '1 1 220px', maxWidth: 380 }}>
          <Search size={15} />
          <input
            className="form-input"
            placeholder="Search by number, client name or email…"
            onChange={(e) => handleSearch(e.target.value)}
          />
        </div>

        <select className="form-select" style={{ width: 'auto' }} value={status}
          onChange={e => { setStatus(e.target.value); setPage(1) }}>
          <option value="">All Statuses</option>
          {Object.entries(STATUS_CONFIG).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>

        <select className="form-select" style={{ width: 'auto' }} value={type}
          onChange={e => { setType(e.target.value); setPage(1) }}>
          <option value="">All Types</option>
          <option value="manual">Manual</option>
          <option value="order">From Order</option>
        </select>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0 }}>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Invoice #</th>
                <th>Client</th>
                <th>Type</th>
                <th>Date</th>
                <th>Amount</th>
                <th>GST</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={8} style={{ textAlign: 'center', padding: 48 }}><div className="spinner" style={{ margin: 'auto' }} /></td></tr>
              ) : invoices.length === 0 ? (
                <tr><td colSpan={8}><div className="empty-state"><Receipt size={40} /><h3>No invoices found</h3><p>Create your first invoice to get started</p></div></td></tr>
              ) : invoices.map(inv => (
                <tr key={inv._id}>
                  <td>
                    <div style={{ fontWeight: 700, color: 'var(--brand-primary)', fontSize: 13 }}>{inv.invoiceNumber}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{inv.financialYear}</div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{inv.client?.name || '—'}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{inv.client?.email}</div>
                    {inv.client?.gstin && <div style={{ fontSize: 10, color: 'var(--brand-primary)' }}>GSTIN: {inv.client.gstin}</div>}
                  </td>
                  <td>
                    <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10, background: inv.type === 'order' ? 'rgba(59,130,246,0.1)' : 'rgba(168,85,247,0.1)', color: inv.type === 'order' ? '#3b82f6' : '#a855f7', fontWeight: 700, textTransform: 'uppercase' }}>
                      {inv.type}
                    </span>
                  </td>
                  <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                    {new Date(inv.issueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </td>
                  <td style={{ fontWeight: 700, color: 'var(--success)' }}>{formatCurrency(inv.grandTotal)}</td>
                  <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    {inv.totalGst > 0 ? formatCurrency(inv.totalGst) : '—'}
                    {inv.totalCgst > 0 && <div style={{ fontSize: 10 }}>CGST+SGST</div>}
                    {inv.totalIgst > 0 && <div style={{ fontSize: 10 }}>IGST</div>}
                  </td>
                  <td><StatusBadge status={inv.status} /></td>
                  <td>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      <button className="btn btn-ghost btn-icon btn-sm" title="View / Edit" onClick={() => navigate(`/invoices/${inv._id}`)}>
                        <Eye size={13} />
                      </button>
                      <button className="btn btn-ghost btn-icon btn-sm" title="Download PDF"
                        disabled={actionLoading === `pdf-${inv._id}`}
                        onClick={() => downloadPDF(inv)}>
                        {actionLoading === `pdf-${inv._id}` ? <div className="spinner" style={{ width: 12, height: 12, borderWidth: 2 }} /> : <Download size={13} />}
                      </button>
                      {inv.client?.email && (
                        <button className="btn btn-ghost btn-icon btn-sm" title="Send Email"
                          disabled={actionLoading === `email-${inv._id}`}
                          onClick={() => sendEmail(inv)}>
                          {actionLoading === `email-${inv._id}` ? <div className="spinner" style={{ width: 12, height: 12, borderWidth: 2 }} /> : <Mail size={13} />}
                        </button>
                      )}
                      {settings?.invoice?.sendWhatsApp && inv.client?.phone && (
                        <button className="btn btn-ghost btn-icon btn-sm" title="Send WhatsApp"
                          disabled={actionLoading === `wa-${inv._id}`}
                          onClick={() => sendWhatsApp(inv)}
                          style={{ color: '#25D366' }}>
                          {actionLoading === `wa-${inv._id}` ? <div className="spinner" style={{ width: 12, height: 12, borderWidth: 2 }} /> : <MessageCircle size={13} />}
                        </button>
                      )}
                      {!['cancelled', 'revoked'].includes(inv.status) && (
                        <button className="btn btn-ghost btn-icon btn-sm" title="Cancel Invoice"
                          onClick={() => { setCancelModal(inv); setCancelReason('') }}
                          style={{ color: 'var(--danger)' }}>
                          <XCircle size={13} />
                        </button>
                      )}
                      {inv.status === 'cancelled' && settings?.invoice?.allowRevoke && (
                        <button className="btn btn-ghost btn-icon btn-sm" title="Revoke (Restore)"
                          onClick={() => { setRevokeModal(inv); setRevokeReason('') }}
                          style={{ color: '#f59e0b' }}>
                          <RotateCcw size={13} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="pagination">
          <span className="pagination-info">Page {pagination.page} of {pagination.totalPages} ({pagination.total} invoices)</span>
          <div className="pagination-controls">
            <button className="pagination-btn" disabled={page === 1} onClick={() => setPage(p => p - 1)}>‹</button>
            <button className="pagination-btn" disabled={page >= pagination.totalPages} onClick={() => setPage(p => p + 1)}>›</button>
          </div>
        </div>
      )}

      {/* Cancel Modal */}
      {cancelModal && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setCancelModal(null) }}>
          <div className="modal" style={{ maxWidth: 440 }}>
            <div className="modal-header">
              <h2 className="modal-title" style={{ color: 'var(--danger)' }}>Cancel Invoice</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setCancelModal(null)}>✕</button>
            </div>
            <p style={{ color: 'var(--text-muted)', marginBottom: 16 }}>
              Cancel <strong style={{ color: 'var(--text-primary)' }}>{cancelModal.invoiceNumber}</strong>? This cannot be undone unless revoke is enabled.
            </p>
            <div className="form-group">
              <label className="form-label">Reason (optional)</label>
              <textarea className="form-textarea" rows={3} value={cancelReason} onChange={e => setCancelReason(e.target.value)} placeholder="Reason for cancellation..." />
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setCancelModal(null)}>Back</button>
              <button className="btn btn-danger" disabled={actionLoading === 'cancel'} onClick={doCancel}>
                {actionLoading === 'cancel' ? 'Cancelling…' : 'Confirm Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Revoke Modal */}
      {revokeModal && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setRevokeModal(null) }}>
          <div className="modal" style={{ maxWidth: 440 }}>
            <div className="modal-header">
              <h2 className="modal-title" style={{ color: '#f59e0b' }}>Revoke Invoice</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setRevokeModal(null)}>✕</button>
            </div>
            <p style={{ color: 'var(--text-muted)', marginBottom: 16 }}>
              Revoke <strong style={{ color: 'var(--text-primary)' }}>{revokeModal.invoiceNumber}</strong>? This will restore it to <strong>Draft</strong> status.
            </p>
            <div className="form-group">
              <label className="form-label">Reason for Revocation</label>
              <textarea className="form-textarea" rows={3} value={revokeReason} onChange={e => setRevokeReason(e.target.value)} placeholder="Why is this invoice being revoked?" />
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setRevokeModal(null)}>Back</button>
              <button className="btn btn-primary" style={{ background: '#f59e0b', borderColor: '#f59e0b' }} disabled={actionLoading === 'revoke'} onClick={doRevoke}>
                {actionLoading === 'revoke' ? 'Revoking…' : 'Revoke Invoice'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
