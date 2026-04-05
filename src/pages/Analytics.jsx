import { useQuery } from '@tanstack/react-query'
import { BarChart, Bar, AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell, Legend } from 'recharts'
import api from '../lib/api'
import { formatCurrency } from '../lib/utils'

const fetchSales = async () => { const { data } = await api.get('/analytics/sales'); return data.data || {} }
const fetchCarts = async () => { const { data } = await api.get('/analytics/carts'); return data.data || {} }
const fetchCustomers = async () => { const { data } = await api.get('/analytics/customers'); return data.data || {} }
const fetchReviews = async () => { const { data } = await api.get('/analytics/reviews'); return data.data || {} }

const COLORS = ['#6366f1', '#8b5cf6', '#22c55e', '#f59e0b', '#ef4444', '#38bdf8']

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: 'var(--bg-modal)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', fontSize: 12 }}>
      <div style={{ color: 'var(--text-muted)', marginBottom: 4 }}>{label}</div>
      {payload.map((p) => (
        <div key={p.name} style={{ color: p.color, fontWeight: 600 }}>
          {p.name}: {typeof p.value === 'number' && p.value > 999 ? formatCurrency(p.value) : p.value}
        </div>
      ))}
    </div>
  )
}

export default function Analytics() {
  const { data: sales, isLoading: salesLoading } = useQuery({ queryKey: ['analytics-sales'], queryFn: fetchSales })
  const { data: carts } = useQuery({ queryKey: ['analytics-carts'], queryFn: fetchCarts })
  const { data: customers } = useQuery({ queryKey: ['analytics-customers'], queryFn: fetchCustomers })
  const { data: reviews } = useQuery({ queryKey: ['analytics-reviews'], queryFn: fetchReviews })

  const monthlySales = sales?.revenueByDay || []
  const ordersByStatus = sales?.ordersByStatus || []
  const topProducts = sales?.topSellingProducts || []
  const cartStats = carts || {}
  const customerStats = customers || {}
  const reviewStats = reviews || {}
  const ratingDist = reviews?.ratingBreakdown || []

  if (salesLoading) return <div className="loading-spinner"><div className="spinner" /></div>

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Analytics</h1>
          <p className="page-subtitle">Comprehensive business insights and reports</p>
        </div>
      </div>

      {/* Sales Overview Stats */}
      <div className="stats-grid" style={{ marginBottom: 24 }}>
        {[
          { label: 'Total Revenue', value: formatCurrency(sales?.summary?.totalRevenue), color: 'var(--success)' },
          { label: 'Total Orders', value: sales?.summary?.totalOrders || 0, color: 'var(--brand-primary)' },
          { label: 'Avg Order Value', value: formatCurrency(sales?.summary?.avgOrderValue), color: 'var(--info)' },
          { label: 'Total Customers', value: customerStats?.totalCustomers || 0, color: 'var(--warning)' },
          { label: 'Active Carts', value: cartStats?.totalCartsWithItems || 0, color: 'var(--info)' },
          { label: 'Total Reviews', value: reviewStats?.totalReviews || 0, color: '#f59e0b' },
        ].map((s) => (
          <div key={s.label} className="stat-card">
            <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Monthly Revenue */}
      {monthlySales.length > 0 && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header">
            <h2 className="card-title">Monthly Revenue</h2>
            <span className="badge badge-success">{monthlySales.length} months</span>
          </div>
          <div className="chart-wrapper">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlySales} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="revGrad2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis dataKey="_id" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="totalRevenue" name="Revenue" stroke="#6366f1" fill="url(#revGrad2)" strokeWidth={2} dot={false} />
                <Area type="monotone" dataKey="orderCount" name="Orders" stroke="#22c55e" fill="none" strokeWidth={2} dot={false} strokeDasharray="5 3" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="two-col" style={{ marginBottom: 20 }}>
        {/* Orders by Status */}
        {ordersByStatus.length > 0 && (
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">Orders by Status</h2>
            </div>
            <div className="chart-wrapper">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={ordersByStatus} dataKey="count" nameKey="_id" cx="50%" cy="50%" outerRadius={90} label={({ _id, count }) => `${_id?.replace('_', ' ')}: ${count}`} labelLine={false}>
                    {ordersByStatus.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Rating Distribution */}
        {ratingDist.length > 0 && (
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">Rating Distribution</h2>
              <div style={{ display: 'flex', gap: 8 }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 18, fontWeight: 800, color: '#f59e0b' }}>{reviewStats?.averageRating?.toFixed(1)}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Average</div>
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[5, 4, 3, 2, 1].map((star) => {
                const item = ratingDist.find(r => r._id === star) || { count: 0 }
                const pct = reviewStats?.total ? Math.round((item.count / reviewStats.total) * 100) : 0
                return (
                  <div key={star} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)', width: 20 }}>{star}★</span>
                    <div style={{ flex: 1, height: 8, background: 'var(--bg-hover)', borderRadius: 4, overflow: 'hidden' }}>
                      <div style={{ width: `${pct}%`, height: '100%', background: pct > 60 ? 'var(--success)' : pct > 30 ? 'var(--warning)' : 'var(--danger)', borderRadius: 4, transition: 'width 0.5s ease' }} />
                    </div>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', width: 40, textAlign: 'right' }}>{item.count}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      <div className="two-col" style={{ marginBottom: 20 }}>
        {/* Top Products */}
        {topProducts.length > 0 && (
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">Top Products by Revenue</h2>
            </div>
            <div className="chart-wrapper">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topProducts.slice(0, 8)} layout="vertical" margin={{ top: 0, right: 30, left: 60, bottom: 0 }}>
                  <CartesianGrid stroke="rgba(255,255,255,0.04)" horizontal={false} />
                  <XAxis type="number" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} axisLine={false} tickLine={false} width={55} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="totalRevenue" name="Revenue" fill="#6366f1" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Cart Analytics */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Cart Analytics</h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {[
              { label: 'Total Active Carts', value: cartStats?.totalCartsWithItems || 0, color: 'var(--brand-primary)' },
              { label: 'Avg Cart Value', value: formatCurrency(cartStats?.avgCartValue), color: 'var(--success)' },
              { label: 'Carts With Coupon', value: cartStats?.cartsWithCoupon || 0, color: 'var(--info)' },
              { label: 'Abandoned Carts', value: cartStats?.abandondedCarts || 0, color: 'var(--danger)' },
            ].map((item) => (
              <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid var(--border-light)' }}>
                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{item.label}</span>
                <span style={{ fontSize: 16, fontWeight: 800, color: item.color }}>{item.value}</span>
              </div>
            ))}
            <div style={{ marginTop: 8 }}>
              <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 12 }}>Top Carted Products</h3>
              {(cartStats?.topCartedProducts || []).slice(0, 3).map((item, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-secondary)', padding: '4px 0' }}>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '60%' }}>{item.name}</span>
                  <span style={{ fontWeight: 700, color: 'var(--warning)' }}>{item.timesAdded} carts</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Customer Analytics */}
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Customer Highlights</h2>
          <div style={{ display: 'flex', gap: 16 }}>
            {[
              { label: 'Verified', value: customerStats?.verifiedCustomers || 0, color: 'var(--success)' },
              { label: 'Unverified', value: customerStats?.unverifiedCustomers || 0, color: 'var(--danger)' },
              { label: 'Repeat', value: customerStats?.repeatCustomers || 0, color: 'var(--brand-primary)' },
            ].map(s => (
              <div key={s.label} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 16, fontWeight: 800, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
