import { useState, useRef } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import {
  Receipt, Plus, Search, Download, Mail, MessageCircle,
  Eye, XCircle, RotateCcw, RefreshCw, FileText,
  CheckCircle, Clock, AlertTriangle, DollarSign, TrendingUp,
  X, FileDown
} from 'lucide-react'
import api from '../lib/api'
import toast from 'react-hot-toast'
import { formatCurrency, extractError } from '../lib/utils'

const STATUS_CONFIG = {
  draft:           { label: 'Draft',           color: 'var(--text-muted)',   bg: 'var(--bg-hover)',            icon: <FileText size={11}/> },
  sent:            { label: 'Sent',            color: '#3b82f6',             bg: 'rgba(59,130,246,0.12)',       icon: <Mail size={11}/> },
  payment_pending: { label: 'Payment Pending', color: '#f59e0b',             bg: 'rgba(245,158,11,0.12)',       icon: <Clock size={11}/> },
  paid:            { label: 'Paid',            color: 'var(--success)',      bg: 'rgba(34,197,94,0.12)',        icon: <CheckCircle size={11}/> },
  cancelled:       { label: 'Cancelled',       color: 'var(--danger)',       bg: 'rgba(239,68,68,0.12)',        icon: <XCircle size={11}/> },
  refunded:        { label: 'Refunded',        color: '#8b5cf6',             bg: 'rgba(139,92,246,0.12)',       icon: <RotateCcw size={11}/> },
  revoked:         { label: 'Revoked',         color: '#f59e0b',             bg: 'rgba(245,158,11,0.12)',       icon: <AlertTriangle size={11}/> },
}

const fetchInvoices = async (params) => {
  const q = new URLSearchParams(
    Object.fromEntries(Object.entries(params).filter(([, v]) => v !== '' && v != null))
  )
  const { data } = await api.get(`/invoices?${q}`)
  return data.data || {}
}

const fetchReport = () => api.get('/invoices/report/summary').then(r => r.data.data || {})
const fetchSettings = () => api.get('/settings').then(r => r.data.data?.settings || {})

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.draft
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '3px 10px', borderRadius: 20, fontSize: 10, fontWeight: 700,
      color: cfg.color, background: cfg.bg, textTransform: 'uppercase', letterSpacing: '0.05em',
    }}>
      {cfg.icon} {cfg.label}
    </span>
  )
}

function StatCard({ label, value, sub, color, icon }) {
  return (
    <div style={{
      background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14,
      padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 6,
      flex: '1 1 200px', minWidth: 160,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-muted)', fontSize: 12 }}>
        <div style={{ color }}>{icon}</div>
        {label}
      </div>
      <div style={{ fontSize: 22, fontWeight: 900, color: color || 'var(--text-primary)' }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{sub}</div>}
    </div>
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
  const { data: report }   = useQuery({ queryKey: ['invoice-report'], queryFn: fetchReport, staleTime: 30000 })
  const invoiceEnabled = settings?.invoice?.enabled !== false // default true if not set

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

  const doMarkPaid = async (inv) => {
    setActionLoading(`paid-${inv._id}`)
    try {
      await api.post(`/invoices/${inv._id}/mark-paid`)
      toast.success('Invoice marked as Paid! 🎉')
      qc.invalidateQueries({ queryKey: ['invoices'] })
      qc.invalidateQueries({ queryKey: ['invoice-report'] })
    } catch (err) { toast.error(extractError(err)) }
    finally { setActionLoading(null) }
  }

  const doCancel = async () => {
    if (!cancelModal) return
    setActionLoading('cancel')
    try {
      await api.post(`/invoices/${cancelModal._id}/cancel`, { reason: cancelReason })
      toast.success('Invoice cancelled — stock restored')
      qc.invalidateQueries({ queryKey: ['invoices'] })
      qc.invalidateQueries({ queryKey: ['invoice-report'] })
      setCancelModal(null); setCancelReason('')
    } catch (err) { toast.error(extractError(err)) }
    finally { setActionLoading(null) }
  }

  const doRevoke = async () => {
    if (!revokeModal) return
    if (!revokeReason.trim()) return toast.error('Revocation reason is required')
    setActionLoading('revoke')
    try {
      await api.post(`/invoices/${revokeModal._id}/revoke`, { reason: revokeReason })
      toast.success('Invoice permanently revoked')
      qc.invalidateQueries({ queryKey: ['invoices'] })
      qc.invalidateQueries({ queryKey: ['invoice-report'] })
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
      const url = URL.createObjectURL(data)
      const a   = document.createElement('a')
      a.href = url; a.download = `${inv.invoiceNumber}.pdf`; a.click()
      URL.revokeObjectURL(url)
    } catch (err) { toast.error(extractError(err)) }
    finally { setActionLoading(null) }
  }

  // CSV Export
  const exportCSV = () => {
    if (!invoices.length) return toast.error('No invoices to export')
    const rows = [
      ['Invoice #', 'Client', 'Email', 'Type', 'Status', 'Issue Date', 'Due Date', 'Subtotal', 'GST', 'Grand Total', 'FY'],
      ...invoices.map(inv => [
        inv.invoiceNumber, inv.client?.name || '', inv.client?.email || '', inv.type,
        inv.status, inv.issueDate ? new Date(inv.issueDate).toLocaleDateString('en-IN') : '',
        inv.dueDate  ? new Date(inv.dueDate).toLocaleDateString('en-IN')  : '',
        inv.subtotal || 0, inv.totalGst || 0, inv.grandTotal || 0, inv.financialYear || '',
      ])
    ]
    const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a'); a.href = url; a.download = 'invoices.csv'; a.click()
    URL.revokeObjectURL(url)
    toast.success('CSV downloaded!')
  }

  const fmt = n => `₹${(Number(n) || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`

  if (!invoiceEnabled && settings && Object.keys(settings).length > 0) {
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
          <p className="page-subtitle">
            Manage, create and send invoices · FY {report?.currentFY || new Date().getFullYear()}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => { qc.invalidateQueries({ queryKey: ['invoices'] }); qc.invalidateQueries({ queryKey: ['invoice-report'] }) }}>
            <RefreshCw size={14} style={isFetching ? { animation: 'spin 0.8s linear infinite' } : {}} />
          </button>
          <button className="btn btn-secondary btn-sm" onClick={exportCSV} title="Export visible invoices as CSV">
            <FileDown size={14} /> Export
          </button>
          <button className="btn btn-primary" onClick={() => navigate('/invoices/new')}>
            <Plus size={15} /> New Invoice
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 24 }}>
        <StatCard
          label="Total Revenue (Paid)"
          value={fmt(report?.totalRevenue || 0)}
          sub={`${report?.paidCount || 0} paid invoices`}
          color="var(--success)"
          icon={<TrendingUp size={16} />}
        />
        <StatCard
          label="Outstanding"
          value={fmt(report?.outstandingRevenue || 0)}
          sub={`${report?.outstandingCount || 0} unpaid`}
          color="#f59e0b"
          icon={<Clock size={16} />}
        />
        <StatCard
          label="Total GST Collected"
          value={fmt(report?.totalGst || 0)}
          sub="CGST + SGST + IGST"
          color="#3b82f6"
          icon={<Receipt size={16} />}
        />
        <StatCard
          label="This Month"
          value={fmt(report?.thisMonthRevenue || 0)}
          sub={`${report?.thisMonthCount || 0} invoices`}
          color="var(--brand-primary)"
          icon={<DollarSign size={16} />}
        />
        <StatCard
          label="Drafts"
          value={report?.draftCount || 0}
          sub="Unsent drafts"
          color="var(--text-muted)"
          icon={<FileText size={16} />}
        />
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

        {(search || status || type) && (
          <button className="btn btn-ghost btn-sm" onClick={() => { setSearch(''); setStatus(''); setType(''); setPage(1) }}>
            <X size={13} /> Clear
          </button>
        )}
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
                    <div style={{ fontWeight: 700, color: 'var(--brand-primary)', fontSize: 13, cursor: 'pointer' }}
                      onClick={() => navigate(`/invoices/${inv._id}`)}>
                      {inv.invoiceNumber}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{inv.financialYear}</div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{inv.client?.name || '—'}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{inv.client?.email}</div>
                    {inv.client?.gstin && <div style={{ fontSize: 10, color: 'var(--brand-primary)', fontFamily: 'monospace' }}>GST: {inv.client.gstin}</div>}
                  </td>
                  <td>
                    <span style={{
                      fontSize: 10, padding: '2px 8px', borderRadius: 10, fontWeight: 700, textTransform: 'uppercase',
                      background: inv.type === 'order' ? 'rgba(59,130,246,0.1)' : 'rgba(168,85,247,0.1)',
                      color: inv.type === 'order' ? '#3b82f6' : '#a855f7',
                    }}>
                      {inv.type}
                    </span>
                  </td>
                  <td style={{ fontSize: 12, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                    {new Date(inv.issueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    {inv.dueDate && (
                      <div style={{ fontSize: 10, color: new Date(inv.dueDate) < new Date() && inv.status !== 'paid' ? 'var(--danger)' : 'var(--text-muted)' }}>
                        Due: {new Date(inv.dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                      </div>
                    )}
                  </td>
                  <td>
                    <div style={{ fontWeight: 700, color: 'var(--success)', fontSize: 13 }}>{formatCurrency(inv.grandTotal)}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>sub: {formatCurrency(inv.subtotal)}</div>
                  </td>
                  <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    {inv.totalGst > 0 ? (
                      <>
                        <div style={{ fontWeight: 600, color: '#3b82f6' }}>{formatCurrency(inv.totalGst)}</div>
                        <div style={{ fontSize: 10 }}>
                          {inv.totalCgst > 0 ? 'CGST+SGST' : inv.totalIgst > 0 ? 'IGST' : ''}
                        </div>
                      </>
                    ) : '—'}
                  </td>
                  <td><StatusBadge status={inv.status} /></td>
                  <td>
                    <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                      <button className="btn btn-ghost btn-icon btn-sm" title="View / Edit"
                        onClick={() => navigate(`/invoices/${inv._id}`)}>
                        <Eye size={13} />
                      </button>
                      <button className="btn btn-ghost btn-icon btn-sm" title="Download PDF"
                        disabled={actionLoading === `pdf-${inv._id}`}
                        onClick={() => downloadPDF(inv)}>
                        {actionLoading === `pdf-${inv._id}` ? <div className="spinner" style={{ width: 12, height: 12, borderWidth: 2 }} /> : <Download size={13} />}
                      </button>
                      {inv.client?.email && !['cancelled','revoked'].includes(inv.status) && (
                        <button className="btn btn-ghost btn-icon btn-sm" title="Send Email"
                          disabled={actionLoading === `email-${inv._id}`}
                          onClick={() => sendEmail(inv)}>
                          {actionLoading === `email-${inv._id}` ? <div className="spinner" style={{ width: 12, height: 12, borderWidth: 2 }} /> : <Mail size={13} />}
                        </button>
                      )}
                      {settings?.invoice?.sendWhatsApp && inv.client?.phone && (
                        <button className="btn btn-ghost btn-icon btn-sm" title="WhatsApp"
                          disabled={actionLoading === `wa-${inv._id}`}
                          onClick={() => sendWhatsApp(inv)}
                          style={{ color: '#25D366' }}>
                          {actionLoading === `wa-${inv._id}` ? <div className="spinner" style={{ width: 12, height: 12, borderWidth: 2 }} /> : <MessageCircle size={13} />}
                        </button>
                      )}
                      {!['paid', 'cancelled', 'revoked'].includes(inv.status) && (
                        <button className="btn btn-ghost btn-icon btn-sm" title="Mark as Paid"
                          disabled={actionLoading === `paid-${inv._id}`}
                          onClick={() => doMarkPaid(inv)}
                          style={{ color: 'var(--success)' }}>
                          {actionLoading === `paid-${inv._id}` ? <div className="spinner" style={{ width: 12, height: 12, borderWidth: 2 }} /> : <CheckCircle size={13} />}
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
                        <button className="btn btn-ghost btn-icon btn-sm" title="Revoke (Permanent Void)"
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
            {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => i + 1).map(n => (
              <button key={n} className={`pagination-btn${page === n ? ' active' : ''}`} onClick={() => setPage(n)}>{n}</button>
            ))}
            <button className="pagination-btn" disabled={page >= pagination.totalPages} onClick={() => setPage(p => p + 1)}>›</button>
          </div>
        </div>
      )}

      {/* Cancel Modal */}
      {cancelModal && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setCancelModal(null) }}>
          <div className="modal" style={{ maxWidth: 440 }}>
            <div className="modal-header">
              <h2 className="modal-title" style={{ color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <XCircle size={18} /> Cancel Invoice
              </h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setCancelModal(null)}><X size={16} /></button>
            </div>
            <p style={{ color: 'var(--text-muted)', marginBottom: 12, fontSize: 14 }}>
              Cancel <strong style={{ color: 'var(--text-primary)' }}>{cancelModal.invoiceNumber}</strong>?
              Product stock will be <strong>restored</strong> automatically.
            </p>
            <div style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: '8px 12px', marginBottom: 14, fontSize: 12, color: 'var(--danger)' }}>
              ⚠️ This can only be undone via Revoke (if enabled in settings).
            </div>
            <div className="form-group">
              <label className="form-label">Reason (optional)</label>
              <textarea className="form-textarea" rows={3} value={cancelReason}
                onChange={e => setCancelReason(e.target.value)} placeholder="Reason for cancellation..." />
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setCancelModal(null)}>Back</button>
              <button className="btn btn-danger" disabled={actionLoading === 'cancel'} onClick={doCancel}>
                {actionLoading === 'cancel' ? <div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> : <XCircle size={14} />}
                Confirm Cancel
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
              <h2 className="modal-title" style={{ color: '#f59e0b', display: 'flex', alignItems: 'center', gap: 8 }}>
                <RotateCcw size={18} /> Revoke Invoice
              </h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setRevokeModal(null)}><X size={16} /></button>
            </div>
            <p style={{ color: 'var(--text-muted)', marginBottom: 12, fontSize: 14 }}>
              Permanently void <strong style={{ color: 'var(--text-primary)' }}>{revokeModal.invoiceNumber}</strong>?
              This action <strong style={{ color: '#f59e0b' }}>cannot be undone</strong>.
            </p>
            <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 8, padding: '8px 12px', marginBottom: 14, fontSize: 12, color: '#d97706' }}>
              ⚠️ Revocation permanently voids the invoice for legal/audit purposes. Use only for disputes or fraud.
            </div>
            <div className="form-group">
              <label className="form-label">Reason for Revocation <span style={{ color: 'var(--danger)' }}>*</span></label>
              <textarea className="form-textarea" rows={3} value={revokeReason}
                onChange={e => setRevokeReason(e.target.value)} placeholder="Why is this invoice being permanently revoked?" />
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setRevokeModal(null)}>Back</button>
              <button className="btn btn-primary" style={{ background: '#f59e0b', borderColor: '#f59e0b' }}
                disabled={actionLoading === 'revoke'} onClick={doRevoke}>
                {actionLoading === 'revoke' ? <div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> : <RotateCcw size={14} />}
                Revoke Permanently
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

