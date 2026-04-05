import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search, Eye, Package } from 'lucide-react'
import api from '../lib/api'
import { Link, useNavigate } from 'react-router-dom'
import { formatCurrency, formatDateTime, getOrderStatusBadge, ORDER_STATUSES, timeAgo } from '../lib/utils'

// ─── Fetch orders ──────────────────────────────────────────────────────────
const fetchOrders = async ({ queryKey }) => {
  const [, page, search, status] = queryKey
  const params = new URLSearchParams({ page, limit: 15 })
  if (search) params.set('search', search)
  if (status && status !== 'all') params.set('status', status)
  const { data } = await api.get(`/orders?${params}`)
  return { orders: data.data || [], pagination: data.pagination || {} }
}

export default function Orders() {
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  const { data, isLoading } = useQuery({ queryKey: ['orders', page, search, statusFilter], queryFn: fetchOrders })
  const orders = data?.orders || []
  const pagination = data?.pagination || {}

  const openOrder = (order) => navigate(`/orders/${order._id}`)

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Orders</h1>
          <p className="page-subtitle">Manage and track all customer orders</p>
        </div>
        <span className="badge badge-warning">{pagination.total || 0} total</span>
      </div>

      {/* Filters */}
      <div className="filters-bar">
        <div className="search-bar">
          <Search size={16} />
          <input className="form-input" placeholder="Search by order number..." value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }} />
        </div>
        <select className="form-select" value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1) }} style={{ width: 180 }}>
          <option value="all">All Statuses</option>
          {ORDER_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, marginBottom: 16 }}>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Order #</th>
                <th>Customer</th>
                <th>Items</th>
                <th>Amount</th>
                <th>Payment</th>
                <th>Status</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={8} style={{ textAlign: 'center', padding: 40 }}><div className="spinner" style={{ margin: 'auto' }} /></td></tr>
              ) : orders.length === 0 ? (
                <tr><td colSpan={8}><div className="empty-state"><Package size={40} /><h3>No orders found</h3></div></td></tr>
              ) : orders.map(order => {
                const { label, badge } = getOrderStatusBadge(order.status)
                const hasCustom = order.items?.some(i => {
                  const c = i.customization
                  return c && typeof c === 'object' && Object.keys(c).length > 0
                })
                return (
                  <tr key={order._id} style={{ cursor: 'pointer' }} onClick={() => openOrder(order)}>
                    <td>
                      <div style={{ fontWeight: 700, color: 'var(--brand-primary)', fontSize: 13 }}>#{order.orderNumber}</div>
                      {hasCustom && <span className="badge badge-brand" style={{ fontSize: 9, marginTop: 2, display: 'inline-block' }}>✏️ Custom</span>}
                    </td>
                    <td>
                      {order.user?._id ? (
                        <Link to={`/users/${order.user._id}`} style={{ textDecoration: 'none' }} onClick={e => e.stopPropagation()}>
                          <div className="entity-link" style={{ fontSize: 13, fontWeight: 600 }}>{order.user?.name || 'Guest'}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{order.user?.email}</div>
                        </Link>
                      ) : <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Guest</span>}
                    </td>
                    <td style={{ fontSize: 13 }}>{order.items?.length || 0} item(s)</td>
                    <td style={{ fontWeight: 700, color: 'var(--success)' }}>{formatCurrency(order.totalAmount)}</td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                        <span className="badge badge-default" style={{ fontSize: 10 }}>{order.paymentMethod?.toUpperCase()}</span>
                        <span className={`badge ${order.paymentStatus === 'paid' ? 'badge-success' : order.paymentStatus === 'failed' ? 'badge-danger' : 'badge-warning'}`} style={{ fontSize: 10 }}>
                          {order.paymentStatus}
                        </span>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                        <span className={`badge ${badge}`}>{label}</span>
                        {order.cancellationRequest?.requested && order.cancellationRequest?.status === 'pending' && <span className="badge badge-danger" style={{ fontSize: 9 }}>Cancel Req</span>}
                        {order.returnRequest?.requested && order.returnRequest?.status === 'pending' && <span className="badge badge-warning" style={{ fontSize: 9 }}>Return Req</span>}
                      </div>
                    </td>
                    <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      {formatDateTime(order.createdAt)}
                      <div style={{ fontSize: 10, opacity: 0.7 }}>{timeAgo(order.createdAt)}</div>
                    </td>
                    <td>
                      <button className="btn btn-primary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11 }} onClick={e => { e.stopPropagation(); openOrder(order) }}>
                        <Eye size={12} /> View
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="pagination">
          <span className="pagination-info">Page {pagination.page} of {pagination.totalPages}</span>
          <div className="pagination-controls">
            <button className="pagination-btn" disabled={page === 1} onClick={() => setPage(p => p - 1)}>‹</button>
            <button className="pagination-btn" disabled={!pagination.hasNextPage} onClick={() => setPage(p => p + 1)}>›</button>
          </div>
        </div>
      )}
    </div>
  )
}
