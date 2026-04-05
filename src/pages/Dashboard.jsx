import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate, Link } from 'react-router-dom'
import {
  Users, Package, ShoppingCart, DollarSign,
  TrendingUp, Clock, CheckCircle,
  AlertCircle, Star, ArrowUpRight, Truck,
  AlertTriangle, Eye, Zap, BarChart3,
  Ticket, Image, ShoppingBag, IndianRupee, Mail, MailOpen,
} from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, CartesianGrid } from 'recharts'
import api from '../lib/api'
import { formatCurrency, formatDateTime, getOrderStatusBadge, timeAgo } from '../lib/utils'
import OrderDetailDrawer from '../components/OrderDetailDrawer'

const fetchDashboard = async () => {
  const [dashRes, salesRes] = await Promise.all([
    api.get('/admin/dashboard'),
    api.get('/analytics/sales?period=30')
  ])
  return {
    ...dashRes.data.data,
    salesChart: salesRes.data.data?.revenueByDay || []
  }
}

const StatCard = ({ icon: Icon, label, value, sub, color, badge, to }) => {
  const navigate = useNavigate()
  return (
    <div
      className={`stat-card${to ? ' clickable' : ''}`}
      onClick={to ? () => navigate(to) : undefined}
    >
      <div className="stat-header">
        <div className="stat-icon" style={{ background: `${color}20` }}>
          <Icon size={22} color={color} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {badge && <span className="badge badge-success" style={{ fontSize: 10 }}>{badge}</span>}
          {to && <ArrowUpRight size={14} color="var(--text-muted)" />}
        </div>
      </div>
      <div>
        <div className="stat-value">{value}</div>
        <div className="stat-label">{label}</div>
        {sub && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{sub}</div>}
      </div>
    </div>
  )
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: 'var(--bg-modal)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', fontSize: 12 }}>
      <div style={{ color: 'var(--text-muted)', marginBottom: 4 }}>{label}</div>
      {payload.map((p) => (
        <div key={p.name} style={{ color: p.color, fontWeight: 600 }}>
          {p.name}: {typeof p.value === 'number' && p.value > 100 ? formatCurrency(p.value) : p.value}
        </div>
      ))}
    </div>
  )
}

export default function Dashboard() {
  const navigate = useNavigate()
  const [selectedOrderId, setSelectedOrderId] = useState(null)
  const { data, isLoading, error } = useQuery({ queryKey: ['dashboard'], queryFn: fetchDashboard })

  if (isLoading) return (
    <div className="loading-spinner">
      <div className="spinner" />
    </div>
  )

  if (error) return (
    <div className="empty-state">
      <AlertCircle size={48} />
      <h3>Failed to load dashboard</h3>
      <p>{error.message}</p>
    </div>
  )

  const { stats, recentOrders, recentUsers, todayOrders, attentionOrders, lowStockProducts } = data || {}

  return (
    <div>
      {/* Stats */}
      <div className="stats-grid">
        <StatCard
          icon={Users}
          label="Total Clients"
          value={stats?.users?.total || 0}
          sub={`${stats?.users?.active || 0} active`}
          color="var(--brand-primary)"
          to="/users"
        />
        <StatCard
          icon={Package}
          label="Active Products"
          value={stats?.products?.total || 0}
          color="var(--info)"
          to="/products"
        />
        <StatCard
          icon={ShoppingCart}
          label="Total Orders"
          value={stats?.orders?.total || 0}
          sub={`${stats?.orders?.today || 0} today`}
          color="var(--warning)"
          to="/orders"
        />
        <StatCard
          icon={DollarSign}
          label="Total Revenue"
          value={formatCurrency(stats?.revenue?.total)}
          sub={`${formatCurrency(stats?.revenue?.thisMonth)} this month`}
          color="var(--success)"
          to="/revenue"
        />
        <StatCard
          icon={IndianRupee}
          label="Today's Revenue"
          value={formatCurrency(stats?.revenue?.today)}
          color="#22c55e"
          to="/revenue"
        />
        <StatCard
          icon={Clock}
          label="Pending Orders"
          value={stats?.orders?.pending || 0}
          color="var(--warning)"
          badge={stats?.orders?.pending > 0 ? 'Needs attention' : undefined}
          to="/orders"
        />
        <StatCard
          icon={Truck}
          label="Processing"
          value={stats?.orders?.processing || 0}
          color="var(--info)"
          to="/orders"
        />
        <StatCard
          icon={CheckCircle}
          label="Delivered"
          value={stats?.orders?.delivered || 0}
          color="var(--success)"
          to="/orders"
        />
        <StatCard
          icon={Star}
          label="Total Reviews"
          value={stats?.reviews?.total || 0}
          color="#f59e0b"
          to="/reviews"
        />
        <StatCard
          icon={Mail}
          label="Contact Inbox"
          value={stats?.contact?.new || 0}
          sub="Pending replies"
          color="var(--brand-primary)"
          badge={stats?.contact?.new > 0 ? 'New message' : undefined}
          to="/contact"
        />
      </div>

      {/* Quick Actions */}
      <div className="quick-actions">
        <Link to="/orders" className="quick-action-btn"><ShoppingCart size={16} /> Orders</Link>
        <Link to="/products" className="quick-action-btn"><Package size={16} /> Products</Link>
        <Link to="/users" className="quick-action-btn"><Users size={16} /> Users</Link>
        <Link to="/analytics" className="quick-action-btn"><BarChart3 size={16} /> Analytics</Link>
        <Link to="/revenue" className="quick-action-btn"><TrendingUp size={16} /> Revenue</Link>
        <Link to="/coupons" className="quick-action-btn"><Ticket size={16} /> Coupons</Link>
        <Link to="/banners" className="quick-action-btn"><Image size={16} /> Banners</Link>
      </div>

      {/* Today's Orders + Needs Attention */}
      <div className="two-col" style={{ marginBottom: 24 }}>
        {/* Today's Orders */}
        <div className="card today-highlight" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="section-title">
              <Zap size={18} color="var(--brand-primary)" />
              Today's Orders
              <span className="badge badge-brand" style={{ fontSize: 11 }}>{todayOrders?.length || 0}</span>
            </div>
            <Link to="/orders" className="btn btn-ghost btn-sm" style={{ color: 'var(--brand-primary)', fontSize: 12 }}>
              View all <ArrowUpRight size={12} />
            </Link>
          </div>
          <div style={{ overflowX: 'auto' }}>
            {todayOrders?.length > 0 ? (
              <table>
                <thead>
                  <tr>
                    <th>Order</th>
                    <th>Customer</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Time</th>
                  </tr>
                </thead>
                <tbody>
                  {todayOrders.map((order) => {
                    const { label, badge } = getOrderStatusBadge(order.status)
                    return (
                      <tr key={order._id} className="clickable-row" onClick={() => setSelectedOrderId(order._id)}>
                        <td style={{ fontWeight: 700, fontSize: 12, color: 'var(--brand-primary)' }}>
                          #{order.orderNumber}
                        </td>
                        <td>
                          {order.user?._id ? (
                            <Link to={`/users/${order.user._id}`} className="entity-link" onClick={(e) => e.stopPropagation()} style={{ fontSize: 12, fontWeight: 600 }}>
                              {order.user?.name || 'Guest'}
                            </Link>
                          ) : (
                            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Guest</span>
                          )}
                        </td>
                        <td style={{ fontWeight: 700, color: 'var(--success)', fontSize: 12 }}>{formatCurrency(order.totalAmount)}</td>
                        <td><span className={`badge ${badge}`} style={{ fontSize: 10 }}>{label}</span></td>
                        <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>{timeAgo(order.createdAt)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            ) : (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
                <ShoppingBag size={32} style={{ marginBottom: 8, opacity: 0.5 }} />
                <div style={{ fontSize: 13 }}>No orders today yet</div>
              </div>
            )}
          </div>
        </div>

        {/* Needs Attention */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="section-title">
              <AlertTriangle size={18} color="var(--warning)" />
              Needs Attention
              {attentionOrders?.length > 0 && (
                <span className="badge badge-warning" style={{ fontSize: 11 }}>{attentionOrders.length}</span>
              )}
            </div>
            <Link to="/orders" className="btn btn-ghost btn-sm" style={{ color: 'var(--warning)', fontSize: 12 }}>
              Manage <ArrowUpRight size={12} />
            </Link>
          </div>
          <div style={{ padding: attentionOrders?.length > 0 ? 12 : 0 }}>
            {attentionOrders?.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {attentionOrders.map((order) => {
                  const { label, badge } = getOrderStatusBadge(order.status)
                  const isCritical = order.status === 'payment_failed'
                  return (
                    <div
                      key={order._id}
                      className={`attention-card${isCritical ? ' critical' : ''}`}
                      style={{ padding: '12px 14px', background: 'var(--bg-hover)', borderRadius: 10, cursor: 'pointer' }}
                      onClick={() => setSelectedOrderId(order._id)}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontWeight: 700, fontSize: 12, color: 'var(--brand-primary)', fontFamily: 'monospace' }}>#{order.orderNumber}</span>
                            <span className={`badge ${badge}`} style={{ fontSize: 9 }}>{label}</span>
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                            {order.user?._id ? (
                              <Link to={`/users/${order.user._id}`} className="entity-link" onClick={(e) => e.stopPropagation()} style={{ fontSize: 11 }}>
                                {order.user?.name}
                              </Link>
                            ) : (
                              <span>Guest</span>
                            )}
                            {' · '}{timeAgo(order.createdAt)}
                          </div>
                        </div>
                        <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: 13 }}>
                          {formatCurrency(order.totalAmount)}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
                <CheckCircle size={32} color="var(--success)" style={{ marginBottom: 8, opacity: 0.6 }} />
                <div style={{ fontSize: 13 }}>All clear! No orders need attention.</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Low Stock Alerts */}
      {lowStockProducts?.length > 0 && (
        <div className="card" style={{ marginBottom: 24, padding: 0, overflow: 'hidden', borderLeft: '4px solid var(--danger)' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(239, 68, 68, 0.05)' }}>
            <div className="section-title">
              <AlertCircle size={18} color="var(--danger)" />
              Low Stock Alerts
              <span className="badge badge-danger" style={{ fontSize: 11 }}>{lowStockProducts.length} items</span>
            </div>
            <Link to="/products" className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)', fontSize: 12 }}>
              Inventory Management <ArrowUpRight size={12} />
            </Link>
          </div>
          <div style={{ padding: 12, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
            {lowStockProducts.map((p) => (
              <div 
                key={p._id} 
                className="attention-card critical" 
                style={{ padding: '12px 14px', background: 'var(--bg-hover)', borderRadius: 10, cursor: 'pointer', display: 'flex', gap: 12, alignItems: 'center' }}
                onClick={() => navigate(`/products?search=${encodeURIComponent(p.name)}`)}
              >
                <div style={{ width: 40, height: 40, borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border)', flexShrink: 0, background: 'var(--bg-card)' }}>
                  {p.thumbnailImage ? (
                    <img src={p.thumbnailImage} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : <Package size={20} color="var(--text-muted)" />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--danger)', fontWeight: 600, marginTop: 2 }}>
                    Only {p.stock} left (Threshold: {p.lowStockThreshold})
                  </div>
                </div>
                <Zap size={14} color="var(--danger)" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Charts Row */}
      <div className="two-col" style={{ marginBottom: 24 }}>
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Revenue Trend</h2>
            <span className="badge badge-success">30 Days</span>
          </div>
          <div className="chart-wrapper">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data?.salesChart || []} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis dataKey="_id" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(val) => val ? val.substring(5) : ''} />
                <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} labelFormatter={(val) => val} />
                <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#6366f1" fill="url(#revGrad)" strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Orders per Day</h2>
            <span className="badge badge-info">30 Days</span>
          </div>
          <div className="chart-wrapper">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.salesChart || []} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis dataKey="_id" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(val) => val ? val.substring(5) : ''} />
                <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="orders" name="Orders" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Recent Orders + Recent Users */}
      <div className="two-col">
        <div className="card" style={{ overflowX: 'auto' }}>
          <div className="card-header">
            <h2 className="card-title">Recent Orders</h2>
            <Link to="/orders" className="btn btn-ghost btn-sm" style={{ color: 'var(--brand-primary)' }}>
              View all <ArrowUpRight size={13} />
            </Link>
          </div>
          <table>
            <thead>
              <tr>
                <th>Order</th>
                <th>Customer</th>
                <th>Amount</th>
                <th>Payment</th>
                <th>Status</th>
                <th>When</th>
              </tr>
            </thead>
            <tbody>
              {(recentOrders || []).map((order) => {
                const { label, badge } = getOrderStatusBadge(order.status)
                return (
                  <tr key={order._id} className="clickable-row" onClick={() => setSelectedOrderId(order._id)}>
                    <td style={{ fontWeight: 700, fontSize: 12, color: 'var(--brand-primary)' }}>#{order.orderNumber}</td>
                    <td>
                      {order.user?._id ? (
                        <Link to={`/users/${order.user._id}`} className="entity-link" onClick={(e) => e.stopPropagation()} style={{ fontSize: 12, fontWeight: 600 }}>
                          {order.user?.name || 'Guest'}
                        </Link>
                      ) : (
                        <span style={{ fontSize: 12 }}>Guest</span>
                      )}
                    </td>
                    <td style={{ fontWeight: 700, color: 'var(--success)', fontSize: 12 }}>{formatCurrency(order.totalAmount)}</td>
                    <td>
                      <span className={`badge ${order.paymentStatus === 'paid' ? 'badge-success' : order.paymentStatus === 'failed' ? 'badge-danger' : 'badge-warning'}`} style={{ fontSize: 9 }}>
                        {order.paymentMethod?.toUpperCase()} · {order.paymentStatus}
                      </span>
                    </td>
                    <td><span className={`badge ${badge}`} style={{ fontSize: 10 }}>{label}</span></td>
                    <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>{timeAgo(order.createdAt)}</td>
                  </tr>
                )
              })}
              {!recentOrders?.length && (
                <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 24 }}>No orders yet</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Recent Users</h2>
            <Link to="/users" className="btn btn-ghost btn-sm" style={{ color: 'var(--brand-primary)' }}>
              View all <ArrowUpRight size={13} />
            </Link>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {(recentUsers || []).map((user) => (
              <div
                key={user._id}
                style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', padding: '6px 10px', borderRadius: 8, transition: 'background 0.2s' }}
                onClick={() => navigate(`/users/${user._id}`)}
                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-hover)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <div className="avatar-placeholder" style={{ width: 34, height: 34, fontSize: 12 }}>
                  {user.name?.[0]?.toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{user.email}</div>
                </div>
                <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{timeAgo(user.createdAt)}</span>
              </div>
            ))}
          </div>

          <div className="card-header" style={{ marginTop: 24, borderTop: '1px solid var(--border-light)', paddingTop: 16 }}>
            <h2 className="card-title">Recent Queries</h2>
            <Link to="/contact" className="btn btn-ghost btn-sm" style={{ color: 'var(--brand-primary)' }}>
              Inbox <ArrowUpRight size={13} />
            </Link>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {(data?.recentContacts || []).map((sub) => (
              <div
                key={sub._id}
                style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', padding: '6px 10px', borderRadius: 8, transition: 'background 0.2s', opacity: sub.status === 'closed' ? 0.6 : 1 }}
                onClick={() => navigate('/contact')}
                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-hover)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <div className="avatar-placeholder" style={{ width: 34, height: 34, fontSize: 12, background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                  <MailOpen size={16} color="var(--text-muted)" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sub.subject || sub.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sub.category} · {sub.name}</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
                  <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{timeAgo(sub.createdAt)}</span>
                  <span className={`badge ${sub.status === 'new' ? 'badge-primary' : sub.status === 'replied' ? 'badge-success' : 'badge-default'}`} style={{ fontSize: 8 }}>{sub.status}</span>
                </div>
              </div>
            ))}
            {!data?.recentContacts?.length && (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 12, fontSize: 12 }}>No recent messages</div>
            )}
          </div>
        </div>
      </div>

      {/* Order Detail Drawer */}
      {selectedOrderId && <OrderDetailDrawer orderId={selectedOrderId} onClose={() => setSelectedOrderId(null)} />}
    </div>
  )
}
