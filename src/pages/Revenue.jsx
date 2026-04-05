import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  TrendingUp, TrendingDown, DollarSign, ShoppingBag, Users,
  BarChart2, PieChart, Award, CreditCard, RefreshCw,
  Calendar, Package, Heart, ArrowUpRight, ArrowDownRight, Star,
} from 'lucide-react'
import {
  AreaChart, Area, BarChart, Bar, PieChart as RPieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import api from '../lib/api'
import { formatCurrency, formatDate, buildImageUrl, timeAgo } from '../lib/utils'

// ─── Palette ─────────────────────────────────────────────────────
const COLORS = ['#6366f1', '#a855f7', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#ef4444', '#14b8a6']
const CHART_STYLE = { fontSize: 11, fill: 'var(--text-muted)' }

// ─── Fetchers ────────────────────────────────────────────────────
const fetchSummary   = (p) => api.get(`/revenue/summary?period=${p}`).then(r => r.data.data)
const fetchTrend     = (p, g) => api.get(`/revenue/trend?period=${p}&groupBy=${g}`).then(r => r.data.data)
const fetchCategory  = (p) => api.get(`/revenue/by-category?period=${p}`).then(r => r.data.data)
const fetchOccasion  = (p) => api.get(`/revenue/by-occasion?period=${p}`).then(r => r.data.data)
const fetchPayment   = (p) => api.get(`/revenue/by-payment-method?period=${p}`).then(r => r.data.data)
const fetchProdType  = (p) => api.get(`/revenue/by-product-type?period=${p}`).then(r => r.data.data)
const fetchTopProds  = (p) => api.get(`/revenue/top-products?period=${p}&limit=10`).then(r => r.data.data)
const fetchTopClients= (p) => api.get(`/revenue/top-clients?period=${p}&limit=10`).then(r => r.data.data)
const fetchMonthly   = () => api.get('/revenue/monthly-comparison').then(r => r.data.data)
const fetchRefunds   = (p) => api.get(`/revenue/refunds?period=${p}`).then(r => r.data.data)

// ─── Stat Card ────────────────────────────────────────────────────
function StatCard({ icon, label, value, sub, growth, color = '#6366f1', loading }) {
  const isPositive = growth >= 0
  return (
    <div className="card" style={{ padding: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div style={{ width: 38, height: 38, borderRadius: 10, background: `${color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {icon}
        </div>
        {growth !== undefined && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, fontWeight: 700, color: isPositive ? '#22c55e' : '#ef4444' }}>
            {isPositive ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
            {Math.abs(growth)}%
          </div>
        )}
      </div>
      <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 4 }}>
        {loading ? <div style={{ width: 80, height: 22, background: 'var(--bg-hover)', borderRadius: 4, animation: 'pulse 1.5s infinite' }} /> : value}
      </div>
      <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.4 }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{sub}</div>}
    </div>
  )
}

// ─── Section header ───────────────────────────────────────────────
function SectionHeader({ icon, title, sub }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, paddingBottom: 12, borderBottom: '1px solid var(--border-light)' }}>
      <div style={{ color: 'var(--brand-primary)' }}>{icon}</div>
      <div>
        <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--text-primary)' }}>{title}</div>
        {sub && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 1 }}>{sub}</div>}
      </div>
    </div>
  )
}

// ─── Custom tooltip for charts ────────────────────────────────────
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 14px', boxShadow: 'var(--shadow-lg)' }}>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ fontSize: 13, fontWeight: 700, color: p.color }}>
          {p.name}: {p.name?.toLowerCase().includes('revenue') || p.name?.toLowerCase().includes('₹') ? formatCurrency(p.value) : p.value}
        </div>
      ))}
    </div>
  )
}

export default function Revenue() {
  const [period, setPeriod] = useState('30')
  const [groupBy, setGroupBy] = useState('day')
  const [activeTab, setActiveTab] = useState('overview')

  const { data: summary, isLoading: sumLoading } = useQuery({ queryKey: ['rev-summary', period], queryFn: () => fetchSummary(period) })
  const { data: trend } = useQuery({ queryKey: ['rev-trend', period, groupBy], queryFn: () => fetchTrend(period, groupBy) })
  const { data: catData } = useQuery({ queryKey: ['rev-cat', period], queryFn: () => fetchCategory(period) })
  const { data: occData } = useQuery({ queryKey: ['rev-occ', period], queryFn: () => fetchOccasion(period) })
  const { data: payData } = useQuery({ queryKey: ['rev-pay', period], queryFn: () => fetchPayment(period) })
  const { data: typeData } = useQuery({ queryKey: ['rev-type', period], queryFn: () => fetchProdType(period) })
  const { data: topProds } = useQuery({ queryKey: ['rev-prods', period], queryFn: () => fetchTopProds(period) })
  const { data: topClients } = useQuery({ queryKey: ['rev-clients', period], queryFn: () => fetchTopClients(period) })
  const { data: monthly } = useQuery({ queryKey: ['rev-monthly'], queryFn: fetchMonthly })
  const { data: refunds } = useQuery({ queryKey: ['rev-refunds', period], queryFn: () => fetchRefunds(period) })

  const trendData = trend?.trend || []
  const categories = catData?.categories || []
  const occasions = occData?.occasions || []
  const payments = payData?.methods || []
  const productTypes = typeData?.productTypes || []
  const products = topProds?.products || []
  const clients = topClients?.clients || []
  const monthlyData = monthly?.monthly || []
  const growth = summary?.growth

  const PERIODS = [
    { label: '7D', val: '7' },
    { label: '30D', val: '30' },
    { label: '60D', val: '60' },
    { label: '90D', val: '90' },
  ]
  const TABS = [
    { id: 'overview', label: 'Overview', icon: <BarChart2 size={14} /> },
    { id: 'breakdown', label: 'By Category / Type', icon: <PieChart size={14} /> },
    { id: 'occasions', label: 'By Occasion', icon: <Heart size={14} /> },
    { id: 'products', label: 'Top Products', icon: <Package size={14} /> },
    { id: 'clients', label: 'Top Clients', icon: <Users size={14} /> },
    { id: 'monthly', label: 'Monthly', icon: <Calendar size={14} /> },
  ]

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <TrendingUp size={26} color="#6366f1" /> Revenue
          </h1>
          <p className="page-subtitle">Complete revenue analytics across all perspectives</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {PERIODS.map(p => (
            <button
              key={p.val}
              onClick={() => setPeriod(p.val)}
              className={`btn btn-sm ${period === p.val ? 'btn-primary' : 'btn-secondary'}`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── SUMMARY CARDS ─────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 14, marginBottom: 24 }}>
        <StatCard icon={<DollarSign size={18} color="#6366f1" />} label="All-Time Revenue" value={formatCurrency(summary?.allTime?.revenue)} sub={`${summary?.allTime?.orders || 0} orders`} color="#6366f1" loading={sumLoading} />
        <StatCard icon={<TrendingUp size={18} color="#10b981" />} label={summary?.thisPeriod?.label || `Last ${period} Days`} value={formatCurrency(summary?.thisPeriod?.revenue)} growth={summary?.growth?.percent} sub={`${summary?.thisPeriod?.orders || 0} orders`} color="#10b981" loading={sumLoading} />
        <StatCard icon={<Calendar size={18} color="#a855f7" />} label={summary?.prevPeriod?.label || `Prev ${period} Days`} value={formatCurrency(summary?.prevPeriod?.revenue)} sub={`${summary?.prevPeriod?.orders || 0} orders`} color="#a855f7" loading={sumLoading} />
        <StatCard icon={<ShoppingBag size={18} color="#f59e0b" />} label="This Week" value={formatCurrency(summary?.thisWeek?.revenue)} sub={`${summary?.thisWeek?.orders || 0} orders`} color="#f59e0b" loading={sumLoading} />
        <StatCard icon={<CreditCard size={18} color="#3b82f6" />} label="Today" value={formatCurrency(summary?.today?.revenue)} sub={`${summary?.today?.orders || 0} orders`} color="#3b82f6" loading={sumLoading} />
        <StatCard icon={<Award size={18} color="#ec4899" />} label="Avg Order Value" value={formatCurrency(summary?.thisPeriod?.avgOrderValue)} sub={summary?.thisPeriod?.label} color="#ec4899" loading={sumLoading} />
        <div className="card" style={{ padding: 20, background: summary?.growth?.isPositive ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)', border: `1px solid ${summary?.growth?.isPositive ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
            {summary?.growth?.isPositive ? <TrendingUp size={20} color="#22c55e" /> : <TrendingDown size={20} color="#ef4444" />}
            <span style={{ fontWeight: 700, fontSize: 13, color: summary?.growth?.isPositive ? '#22c55e' : '#ef4444' }}>Growth</span>
          </div>
          <div style={{ fontSize: 28, fontWeight: 900, color: summary?.growth?.isPositive ? '#22c55e' : '#ef4444' }}>
            {summary?.growth?.isPositive ? '+' : ''}{summary?.growth?.percent ?? 0}%
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{summary?.growth?.label || `vs prev ${period} days`}</div>
          {summary?.growth?.momLabel && (
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 3, borderTop: '1px solid var(--border)', paddingTop: 4 }}>
              MoM: {summary?.growth?.momLabel}
            </div>
          )}
        </div>
        {refunds && (
          <div className="card" style={{ padding: 20, background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.15)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <RefreshCw size={16} color="#ef4444" />
              <span style={{ fontWeight: 700, fontSize: 12, color: '#ef4444' }}>Refunds / Cancels</span>
            </div>
            <div style={{ fontSize: 14, fontWeight: 800, color: '#ef4444' }}>{formatCurrency(refunds.refunds?.amount)}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{refunds.refunds?.count} refunds · {refunds.cancellations?.count} cancels</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Coupons: −{formatCurrency(refunds.couponImpact?.totalDiscountGiven)}</div>
          </div>
        )}
      </div>

      {/* ── TABS ─────────────────────────────────── */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: 20, overflowX: 'auto', gap: 2 }}>
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '10px 18px', background: 'transparent', border: 'none', cursor: 'pointer',
              borderBottom: activeTab === tab.id ? '2px solid var(--brand-primary)' : '2px solid transparent',
              color: activeTab === tab.id ? 'var(--brand-primary)' : 'var(--text-muted)',
              fontWeight: activeTab === tab.id ? 700 : 400, fontSize: 13, whiteSpace: 'nowrap',
              transition: 'all 0.2s',
            }}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW TAB ──────────────────────────────── */}
      {activeTab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Revenue Trend Chart */}
          <div className="card" style={{ padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <SectionHeader icon={<TrendingUp size={18} />} title="Revenue Trend" sub={`Last ${period} days`} />
              <div style={{ display: 'flex', gap: 6 }}>
                {[['day', 'Daily'], ['week', 'Weekly']].map(([val, lbl]) => (
                  <button key={val} className={`btn btn-sm ${groupBy === val ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setGroupBy(val)}>{lbl}</button>
                ))}
              </div>
            </div>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={trendData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="ordGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#a855f7" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" />
                <XAxis dataKey="date" tick={CHART_STYLE} />
                <YAxis tick={CHART_STYLE} tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Area type="monotone" dataKey="revenue" name="Revenue (₹)" stroke="#6366f1" fill="url(#revGrad)" strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Payment Methods */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <div className="card" style={{ padding: 24 }}>
              <SectionHeader icon={<CreditCard size={16} />} title="By Payment Method" sub={`Last ${period} days`} />
              <ResponsiveContainer width="100%" height={200}>
                <RPieChart>
                  <Pie data={payments} dataKey="totalRevenue" nameKey="paymentMethod" cx="50%" cy="50%" outerRadius={75} label={({ paymentMethod, percent }) => `${paymentMethod} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                    {payments.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v) => formatCurrency(v)} />
                </RPieChart>
              </ResponsiveContainer>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 10 }}>
                {payments.map((p, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ width: 10, height: 10, borderRadius: 2, background: COLORS[i % COLORS.length] }} />
                      <span style={{ color: 'var(--text-secondary)', textTransform: 'capitalize' }}>{p.paymentMethod}</span>
                      <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>({p.successRate}% success)</span>
                    </div>
                    <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{formatCurrency(p.totalRevenue)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Orders per Day bar */}
            <div className="card" style={{ padding: 24 }}>
              <SectionHeader icon={<BarChart2 size={16} />} title="Orders per Day" sub={`Last ${period} days`} />
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={trendData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" />
                  <XAxis dataKey="date" tick={CHART_STYLE} />
                  <YAxis tick={CHART_STYLE} allowDecimals={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="orders" name="Orders" fill="#a855f7" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* ── BREAKDOWN TAB ────────────────────────────── */}
      {activeTab === 'breakdown' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* By Category */}
          <div className="card" style={{ padding: 24 }}>
            <SectionHeader icon={<PieChart size={16} />} title="Revenue by Category" sub={`Last ${period} days — Total: ${formatCurrency(catData?.totalRevenue)}`} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
              <ResponsiveContainer width="100%" height={220}>
                <RPieChart>
                  <Pie data={categories} dataKey="revenue" nameKey="categoryName" cx="50%" cy="50%" outerRadius={80} innerRadius={40}>
                    {categories.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v, n) => [formatCurrency(v), n]} />
                </RPieChart>
              </ResponsiveContainer>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {categories.map((c, i) => (
                  <div key={c._id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 12, height: 12, borderRadius: 3, background: COLORS[i % COLORS.length], flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginBottom: 2 }}>
                        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{c.categoryIcon} {c.categoryName}</span>
                        <span style={{ fontWeight: 700, color: COLORS[i % COLORS.length] }}>{formatCurrency(c.revenue)}</span>
                      </div>
                      <div style={{ height: 5, borderRadius: 3, background: 'var(--bg-hover)' }}>
                        <div style={{ width: `${c.percent}%`, height: '100%', borderRadius: 3, background: COLORS[i % COLORS.length] }} />
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{c.percent}% · {c.unitsSold} units</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* By Product Type */}
          <div className="card" style={{ padding: 24 }}>
            <SectionHeader icon={<Package size={16} />} title="Revenue by Product Type" sub={`Last ${period} days`} />
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={productTypes} layout="vertical" margin={{ left: 20, right: 30 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" />
                <XAxis type="number" tick={CHART_STYLE} tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`} />
                <YAxis dataKey="productType" type="category" tick={{ ...CHART_STYLE, textTransform: 'capitalize' }} width={90} />
                <Tooltip formatter={(v) => [formatCurrency(v), 'Revenue']} />
                <Bar dataKey="revenue" name="Revenue" fill="#6366f1" radius={[0, 4, 4, 0]}>
                  {productTypes.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 10, marginTop: 16 }}>
              {productTypes.map((t, i) => (
                <div key={t.productType} className="card" style={{ padding: '10px 14px', background: 'var(--bg-hover)', border: 'none' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'capitalize', marginBottom: 4 }}>{t.productType?.replace(/_/g, ' ')}</div>
                  <div style={{ fontWeight: 800, color: COLORS[i % COLORS.length], fontSize: 14 }}>{formatCurrency(t.revenue)}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{t.unitsSold} units · {t.percent}%</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── OCCASIONS TAB ────────────────────────────── */}
      {activeTab === 'occasions' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="card" style={{ padding: 24 }}>
            <SectionHeader icon={<Heart size={16} />} title="Revenue by Occasion" sub={`Last ${period} days — Total: ${formatCurrency(occData?.totalRevenue)}`} />
            {occasions.length === 0 ? (
              <div className="empty-state" style={{ padding: 40 }}>
                <Heart size={36} />
                <h3>No occasion revenue yet</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Products needs to be linked to occasions and have paid orders</p>
              </div>
            ) : (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                  <ResponsiveContainer width="100%" height={240}>
                    <RPieChart>
                      <Pie data={occasions} dataKey="revenue" nameKey="occasionName" cx="50%" cy="50%" outerRadius={90} innerRadius={45}>
                        {occasions.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(v) => [formatCurrency(v), 'Revenue']} />
                    </RPieChart>
                  </ResponsiveContainer>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, justifyContent: 'center' }}>
                    {occasions.map((o, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 12, height: 12, borderRadius: 3, background: COLORS[i % COLORS.length], flexShrink: 0 }} />
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 2 }}>
                            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{o.occasionIcon} {o.occasionName}</span>
                            <span style={{ fontWeight: 700, color: COLORS[i % COLORS.length] }}>{formatCurrency(o.revenue)}</span>
                          </div>
                          <div style={{ height: 5, borderRadius: 3, background: 'var(--bg-hover)' }}>
                            <div style={{ width: `${o.percent}%`, height: '100%', borderRadius: 3, background: COLORS[i % COLORS.length] }} />
                          </div>
                          <div style={{ fontSize: 10.5, color: 'var(--text-muted)', marginTop: 2 }}>{o.percent}% · {o.unitsSold} units · {o.orderCount} orders</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12, marginTop: 20 }}>
                  {occasions.map((o, i) => (
                    <div key={i} className="card" style={{ padding: 16, borderLeft: `3px solid ${COLORS[i % COLORS.length]}` }}>
                      <div style={{ fontSize: 22, marginBottom: 6 }}>{o.occasionIcon || '🎁'}</div>
                      <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)', marginBottom: 4 }}>{o.occasionName}</div>
                      <div style={{ fontWeight: 800, fontSize: 18, color: COLORS[i % COLORS.length] }}>{formatCurrency(o.revenue)}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{o.unitsSold} units · {o.orderCount} orders</div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── TOP PRODUCTS TAB ───────────────────────── */}
      {activeTab === 'products' && (
        <div className="card" style={{ padding: 24 }}>
          <SectionHeader icon={<Award size={16} />} title="Top Revenue Products" sub={`Last ${period} days — Total: ${formatCurrency(topProds?.totalRevenue)}`} />
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th style={{ width: 40 }}>Rank</th>
                  <th>Product</th>
                  <th>Type</th>
                  <th>Units Sold</th>
                  <th>Avg Price</th>
                  <th>Revenue</th>
                  <th>Share</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.rank}>
                    <td>
                      <div style={{ width: 28, height: 28, borderRadius: 8, background: p.rank <= 3 ? 'var(--brand-gradient)' : 'var(--bg-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, color: p.rank <= 3 ? '#fff' : 'var(--text-muted)' }}>
                        {p.rank}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 38, height: 38, borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border)', background: 'var(--bg-hover)', flexShrink: 0 }}>
                          {buildImageUrl(p.thumbnailImage) ? (
                            <img src={buildImageUrl(p.thumbnailImage)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : <Package size={18} color="var(--text-muted)" style={{ margin: 10 }} />}
                        </div>
                        <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>{p.productName || '—'}</span>
                      </div>
                    </td>
                    <td><span className="badge badge-default" style={{ fontSize: 10 }}>{p.productType?.replace('_', ' ')}</span></td>
                    <td style={{ fontWeight: 600 }}>{p.unitsSold}</td>
                    <td>{formatCurrency(p.avgUnitPrice)}</td>
                    <td><span style={{ fontWeight: 800, color: '#22c55e', fontSize: 14 }}>{formatCurrency(p.revenue)}</span></td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ width: 50, height: 5, borderRadius: 3, background: 'var(--bg-hover)' }}>
                          <div style={{ width: `${p.percent}%`, height: '100%', borderRadius: 3, background: 'var(--brand-gradient)' }} />
                        </div>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{p.percent}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TOP CLIENTS TAB ─────────────────────────── */}
      {activeTab === 'clients' && (
        <div className="card" style={{ padding: 24 }}>
          <SectionHeader icon={<Users size={16} />} title="Top Spending Clients" sub={`Last ${period} days — Total: ${formatCurrency(topClients?.totalRevenue)}`} />
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th style={{ width: 40 }}>Rank</th>
                  <th>Client</th>
                  <th>Email</th>
                  <th>Orders</th>
                  <th>Avg Order</th>
                  <th>Total Spent</th>
                  <th>Last Order</th>
                  <th>Share</th>
                </tr>
              </thead>
              <tbody>
                {clients.map((c) => (
                  <tr key={c.rank}>
                    <td>
                      <div style={{ width: 28, height: 28, borderRadius: 8, background: c.rank <= 3 ? 'linear-gradient(135deg, #ec4899, #a855f7)' : 'var(--bg-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, color: c.rank <= 3 ? '#fff' : 'var(--text-muted)' }}>
                        {c.rank}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div className="avatar-placeholder" style={{ width: 32, height: 32, fontSize: 12 }}>
                          {c.name?.[0]?.toUpperCase() || '?'}
                        </div>
                        <span style={{ fontWeight: 700, fontSize: 13 }}>{c.name}</span>
                      </div>
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{c.email}</td>
                    <td style={{ fontWeight: 600 }}>{c.orders}</td>
                    <td>{formatCurrency(c.avgOrderValue)}</td>
                    <td><span style={{ fontWeight: 800, color: '#6366f1', fontSize: 14 }}>{formatCurrency(c.revenue)}</span></td>
                    <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>{timeAgo(c.lastOrderAt)}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ width: 50, height: 5, borderRadius: 3, background: 'var(--bg-hover)' }}>
                          <div style={{ width: `${c.percent}%`, height: '100%', borderRadius: 3, background: 'linear-gradient(135deg, #ec4899, #a855f7)' }} />
                        </div>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{c.percent}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── MONTHLY TAB ──────────────────────────────── */}
      {activeTab === 'monthly' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="card" style={{ padding: 24 }}>
            <SectionHeader icon={<Calendar size={16} />} title="Monthly Revenue (Last 12 Months)" sub={`Total: ${formatCurrency(monthly?.totalRevenue)} · ${monthly?.totalOrders || 0} orders`} />
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={monthlyData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" />
                <XAxis dataKey="month" tick={CHART_STYLE} />
                <YAxis tick={CHART_STYLE} tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`} />
                <Tooltip formatter={(v, n) => [n === 'revenue' ? formatCurrency(v) : v, n === 'revenue' ? 'Revenue' : 'Orders']} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="revenue" name="Revenue" fill="#6366f1" radius={[4, 4, 0, 0]} />
                <Bar dataKey="couponDiscount" name="Coupon Discount" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="table-container card" style={{ padding: 0 }}>
            <table>
              <thead>
                <tr>
                  <th>Month</th>
                  <th>Orders</th>
                  <th>Revenue</th>
                  <th>Avg Order</th>
                  <th>Shipping</th>
                  <th>Coupon Discount</th>
                </tr>
              </thead>
              <tbody>
                {[...monthlyData].reverse().map((m) => (
                  <tr key={m.month}>
                    <td style={{ fontWeight: 700 }}>{m.month}</td>
                    <td>{m.orders}</td>
                    <td><span style={{ fontWeight: 800, color: '#22c55e' }}>{formatCurrency(m.revenue)}</span></td>
                    <td>{formatCurrency(m.avgOrderValue)}</td>
                    <td>{formatCurrency(m.shipping)}</td>
                    <td style={{ color: '#ef4444', fontWeight: 600 }}>- {formatCurrency(m.couponDiscount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
