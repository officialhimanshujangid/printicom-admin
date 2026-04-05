import { useState } from 'react'
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { Package, AlertTriangle, XCircle, Search, Plus, Minus, Edit3, RefreshCw, ArrowUp, ArrowDown } from 'lucide-react'
import api from '../lib/api'
import toast from 'react-hot-toast'
import { formatCurrency, buildImageUrl, extractError } from '../lib/utils'

const fetchStock = async ({ queryKey }) => {
  const [, filter, page, search] = queryKey
  const params = new URLSearchParams({ filter, page, limit: 20 })
  if (search) params.set('search', search)
  const { data } = await api.get(`/products/admin/stock-overview?${params}`)
  return data.data || { products: [], pagination: {}, summary: {} }
}

function StockBadge({ stock, threshold }) {
  if (stock <= 0) return <span className="badge badge-danger">Out of Stock</span>
  if (stock <= threshold) return <span className="badge badge-warning">Low Stock</span>
  return <span className="badge badge-success">In Stock</span>
}

function StockBar({ stock, threshold, max = 100 }) {
  const pct = Math.min(100, Math.round((stock / Math.max(max, threshold * 3, 1)) * 100))
  const color = stock <= 0 ? 'var(--danger)' : stock <= threshold ? '#f59e0b' : 'var(--success)'
  return (
    <div style={{ background: 'var(--bg-hover)', borderRadius: 4, height: 6, width: 80, overflow: 'hidden' }}>
      <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 4, transition: 'width 0.4s' }} />
    </div>
  )
}

export default function Stock() {
  const qc = useQueryClient()
  const [filter, setFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [adjustModal, setAdjustModal] = useState(null) // { product }
  const [adjustForm, setAdjustForm] = useState({ action: 'set', quantity: 0 })
  const [saving, setSaving] = useState(false)

  const queryKey = ['stock-overview', filter, page, search]
  const { data, isLoading, isFetching } = useQuery({
    queryKey,
    queryFn: fetchStock,
    placeholderData: keepPreviousData,
    staleTime: 15_000,
  })

  const products = data?.products || []
  const pagination = data?.pagination || {}
  const summary = data?.summary || {}

  const openAdjust = (p) => {
    setAdjustModal(p)
    setAdjustForm({ action: 'set', quantity: p.stock || 0 })
  }

  const handleAdjust = async (e) => {
    e.preventDefault()
    if (!adjustModal) return
    setSaving(true)
    try {
      const payload = { action: adjustForm.action, quantity: parseInt(adjustForm.quantity) }
      if (isNaN(payload.quantity) || payload.quantity < 0) {
        toast.error('Enter a valid non-negative quantity')
        return
      }
      const { data: resp } = await api.patch(`/products/${adjustModal._id}/stock`, payload)
      toast.success(resp.message || 'Stock updated!')
      qc.invalidateQueries({ queryKey: ['stock-overview'] })
      setAdjustModal(null)
    } catch (err) {
      toast.error(extractError(err))
    } finally {
      setSaving(false)
    }
  }

  const handleFilterChange = (f) => { setFilter(f); setPage(1) }

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Stock Management</h1>
          <p className="page-subtitle">Monitor and adjust inventory across all products</p>
        </div>
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => qc.invalidateQueries({ queryKey: ['stock-overview'] })}
          title="Refresh"
        >
          <RefreshCw size={14} style={isFetching ? { animation: 'spin 0.8s linear infinite' } : {}} />
        </button>
      </div>

      {/* Summary Cards */}
      <div className="stats-grid" style={{ marginBottom: 24 }}>
        <div className="stat-card clickable" onClick={() => handleFilterChange('all')}>
          <div className="stat-card-header">
            <span className="stat-card-label">Total Products</span>
            <Package size={18} style={{ color: 'var(--brand-primary)' }} />
          </div>
          <div className="stat-card-value">{pagination.total ?? '—'}</div>
        </div>
        <div className="stat-card clickable" style={{ borderColor: summary.outOfStock > 0 ? 'var(--danger)' : undefined }} onClick={() => handleFilterChange('out_of_stock')}>
          <div className="stat-card-header">
            <span className="stat-card-label">Out of Stock</span>
            <XCircle size={18} style={{ color: 'var(--danger)' }} />
          </div>
          <div className="stat-card-value" style={{ color: summary.outOfStock > 0 ? 'var(--danger)' : 'var(--text-primary)' }}>
            {summary.outOfStock ?? '—'}
          </div>
        </div>
        <div className="stat-card clickable" style={{ borderColor: summary.lowStock > 0 ? '#f59e0b' : undefined }} onClick={() => handleFilterChange('low_stock')}>
          <div className="stat-card-header">
            <span className="stat-card-label">Low Stock</span>
            <AlertTriangle size={18} style={{ color: '#f59e0b' }} />
          </div>
          <div className="stat-card-value" style={{ color: summary.lowStock > 0 ? '#f59e0b' : 'var(--text-primary)' }}>
            {summary.lowStock ?? '—'}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-label">Healthy Stock</span>
            <Package size={18} style={{ color: 'var(--success)' }} />
          </div>
          <div className="stat-card-value" style={{ color: 'var(--success)' }}>
            {pagination.total != null ? pagination.total - (summary.outOfStock || 0) - (summary.lowStock || 0) : '—'}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="filters-bar">
        <div className="search-bar" style={{ flex: '1 1 200px', maxWidth: 340 }}>
          <Search size={15} />
          <input
            className="form-input"
            placeholder="Search products…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          />
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {[
            { v: 'all', label: 'All' },
            { v: 'out_of_stock', label: '🚫 Out of Stock' },
            { v: 'low_stock', label: '⚠️ Low Stock' },
          ].map(({ v, label }) => (
            <button
              key={v}
              className={`btn btn-sm ${filter === v ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => handleFilterChange(v)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, marginBottom: 16 }}>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Product</th>
                <th>Category</th>
                <th>Stock</th>
                <th>Threshold</th>
                <th>Level</th>
                <th>Status</th>
                <th>Price</th>
                <th>Adjust</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={8} style={{ textAlign: 'center', padding: 48 }}><div className="spinner" style={{ margin: 'auto' }} /></td></tr>
              ) : products.length === 0 ? (
                <tr><td colSpan={8}><div className="empty-state"><Package size={40} /><h3>No products found</h3></div></td></tr>
              ) : products.map((p) => (
                <tr key={p._id} style={{ opacity: p.stock <= 0 ? 0.75 : 1 }}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 40, height: 40, borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border)', background: 'var(--bg-hover)', flexShrink: 0 }}>
                        {buildImageUrl(p.thumbnailImage) ? (
                          <img src={buildImageUrl(p.thumbnailImage)} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}><Package size={16} color="var(--text-muted)" /></div>
                        )}
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                        <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'capitalize' }}>{p.productType?.replace('_', ' ')}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{p.category?.name || '—'}</td>
                  <td>
                    <span style={{ fontSize: 20, fontWeight: 800, color: p.stock <= 0 ? 'var(--danger)' : p.stock <= p.lowStockThreshold ? '#f59e0b' : 'var(--success)' }}>
                      {p.stock ?? 0}
                    </span>
                  </td>
                  <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{p.lowStockThreshold ?? 5}</td>
                  <td><StockBar stock={p.stock ?? 0} threshold={p.lowStockThreshold ?? 5} /></td>
                  <td><StockBadge stock={p.stock ?? 0} threshold={p.lowStockThreshold ?? 5} /></td>
                  <td style={{ fontWeight: 600, color: 'var(--success)', fontSize: 13 }}>{formatCurrency(p.discountPrice || p.basePrice)}</td>
                  <td>
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => openAdjust(p)}
                      style={{ gap: 4 }}
                    >
                      <Edit3 size={12} /> Adjust
                    </button>
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
          <span className="pagination-info">Page {pagination.page} of {pagination.totalPages} ({pagination.total} products)</span>
          <div className="pagination-controls">
            <button className="pagination-btn" disabled={page === 1} onClick={() => setPage(p => p - 1)}>‹</button>
            <button className="pagination-btn" disabled={page >= pagination.totalPages} onClick={() => setPage(p => p + 1)}>›</button>
          </div>
        </div>
      )}

      {/* Adjust Stock Modal */}
      {adjustModal && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setAdjustModal(null) }}>
          <div className="modal">
            <div className="modal-header">
              <div>
                <h2 className="modal-title">Adjust Stock</h2>
                <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>{adjustModal.name}</div>
              </div>
              <button className="btn btn-ghost btn-icon" onClick={() => setAdjustModal(null)}>✕</button>
            </div>

            <div style={{ padding: '0 0 16px', display: 'flex', gap: 16, alignItems: 'center' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Current Stock</div>
                <div style={{ fontSize: 32, fontWeight: 900, color: adjustModal.stock <= 0 ? 'var(--danger)' : adjustModal.stock <= adjustModal.lowStockThreshold ? '#f59e0b' : 'var(--success)' }}>
                  {adjustModal.stock ?? 0}
                </div>
              </div>
              <div style={{ flex: 1 }}>
                <StockBadge stock={adjustModal.stock ?? 0} threshold={adjustModal.lowStockThreshold ?? 5} />
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>Low stock alert at {adjustModal.lowStockThreshold ?? 5} units</div>
              </div>
            </div>

            <form onSubmit={handleAdjust} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="form-group">
                <label className="form-label">Adjustment Action</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                  {[
                    { v: 'set', label: '📦 Set', desc: 'Set exact stock' },
                    { v: 'add', label: '➕ Add', desc: 'Add to current' },
                    { v: 'remove', label: '➖ Remove', desc: 'Remove from current' },
                  ].map(({ v, label, desc }) => (
                    <button
                      key={v}
                      type="button"
                      className={`btn btn-sm ${adjustForm.action === v ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={() => setAdjustForm(f => ({ ...f, action: v }))}
                      style={{ flexDirection: 'column', height: 'auto', padding: '10px 6px', gap: 2 }}
                    >
                      <span style={{ fontSize: 16 }}>{label.split(' ')[0]}</span>
                      <span style={{ fontSize: 10, fontWeight: 600 }}>{label.split(' ')[1]}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">
                  {adjustForm.action === 'set' ? 'New Stock Value' : adjustForm.action === 'add' ? 'Units to Add' : 'Units to Remove'}
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button
                    type="button"
                    className="btn btn-secondary btn-icon"
                    onClick={() => setAdjustForm(f => ({ ...f, quantity: Math.max(0, parseInt(f.quantity || 0) - 1) }))}
                  >
                    <Minus size={14} />
                  </button>
                  <input
                    type="number"
                    className="form-input"
                    value={adjustForm.quantity}
                    onChange={(e) => setAdjustForm(f => ({ ...f, quantity: Math.max(0, parseInt(e.target.value) || 0) }))}
                    min={0}
                    style={{ textAlign: 'center', fontWeight: 700, fontSize: 18 }}
                    required
                  />
                  <button
                    type="button"
                    className="btn btn-secondary btn-icon"
                    onClick={() => setAdjustForm(f => ({ ...f, quantity: parseInt(f.quantity || 0) + 1 }))}
                  >
                    <Plus size={14} />
                  </button>
                </div>
                {adjustForm.action !== 'set' && (
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>
                    Result:{' '}
                    <strong style={{ color: 'var(--text-primary)' }}>
                      {adjustForm.action === 'add'
                        ? (adjustModal.stock || 0) + (parseInt(adjustForm.quantity) || 0)
                        : Math.max(0, (adjustModal.stock || 0) - (parseInt(adjustForm.quantity) || 0))
                      } units
                    </strong>
                  </div>
                )}
              </div>

              {/* Quick-set buttons */}
              <div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>Quick set:</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {[10, 25, 50, 100, 200, 500].map(v => (
                    <button
                      key={v}
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => setAdjustForm({ action: 'set', quantity: v })}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>

              <div className="modal-footer" style={{ margin: 0, padding: 0, border: 0 }}>
                <button type="button" className="btn btn-secondary" onClick={() => setAdjustModal(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? <div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> : 'Update Stock'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
