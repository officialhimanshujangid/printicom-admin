import { useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  ShoppingCart, Receipt, Package, Users, Boxes, Ticket,
  FileBarChart2, Calendar, Download, TrendingUp, TrendingDown,
  RefreshCw, AlertTriangle
} from 'lucide-react'
import api from '../lib/api'

// ─── Constants ────────────────────────────────────────────────────────
const PRESETS = [
  { label: 'Today',          days: 1 },
  { label: 'Last 7 Days',    days: 7 },
  { label: 'Last 30 Days',   days: 30 },
  { label: 'Last 90 Days',   days: 90 },
  { label: 'This Year',      days: 365 },
]

const REPORT_META = {
  orders:    { label: 'Order Report',        icon: <ShoppingCart size={20} />,  desc: 'View order history, revenue breakdown, payment methods and daily trends filtered by date range.' },
  gst:       { label: 'GST / Tax Report',    icon: <Receipt size={20} />,       desc: 'GST collected per product, effective tax rate, monthly GST trend and GSTIN-ready breakdown.' },
  products:  { label: 'Product Performance', icon: <Package size={20} />,       desc: 'Top products by revenue, units sold, category breakdown and zero-sales alert list.' },
  customers: { label: 'Customer Report',     icon: <Users size={20} />,         desc: 'Top buyers, new vs repeat customer ratio, spending patterns and registration trends.' },
  stock:     { label: 'Stock Report',        icon: <Boxes size={20} />,         desc: 'Inventory levels by product and category, low-stock and out-of-stock alerts.' },
  coupons:   { label: 'Coupon Report',       icon: <Ticket size={20} />,        desc: 'Coupon usage, total discounts given, revenue with coupon, and all coupons status.' },
}

const REPORT_KEYS = {
  orders:    'ordersReport',
  gst:       'gstReport',
  products:  'productsReport',
  customers: 'customersReport',
  stock:     'stockReport',
  coupons:   'couponsReport',
}

// ─── Helper ─────────────────────────────────────────────────────────
const fmt = (n) => `₹${(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const fmtNum = (n) => (n || 0).toLocaleString('en-IN')

const getIstDateStr = (dateObj) => {
  const d = new Date(dateObj.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const today = () => getIstDateStr(new Date());
const daysAgo = (n) => {
  const d = new Date(); 
  d.setDate(d.getDate() - n); 
  return getIstDateStr(d);
}

function StatCard({ label, value, sub, trend, color = 'var(--brand)' }) {
  return (
    <div className="card" style={{ padding: '18px 20px' }}>
      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color }}>{value}</div>
      {sub  && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{sub}</div>}
      {trend !== undefined && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 6, fontSize: 12, color: trend >= 0 ? '#22c55e' : '#ef4444' }}>
          {trend >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
          {Math.abs(trend)}% vs prev period
        </div>
      )}
    </div>
  )
}

function StatusBadge({ status }) {
  const map = {
    pending:         { bg: 'rgba(245,158,11,0.15)', color: '#f59e0b', label: 'Pending' },
    confirmed:       { bg: 'rgba(99,102,241,0.15)',  color: '#6366f1', label: 'Confirmed' },
    processing:      { bg: 'rgba(59,130,246,0.15)',  color: '#3b82f6', label: 'Processing' },
    shipped:         { bg: 'rgba(16,185,129,0.15)',  color: '#10b981', label: 'Shipped' },
    delivered:       { bg: 'rgba(34,197,94,0.15)',   color: '#22c55e', label: 'Delivered' },
    cancelled:       { bg: 'rgba(239,68,68,0.15)',   color: '#ef4444', label: 'Cancelled' },
    refunded:        { bg: 'rgba(168,85,247,0.15)',  color: '#a855f7', label: 'Refunded' },
    payment_failed:  { bg: 'rgba(239,68,68,0.12)',   color: '#ef4444', label: 'Payment Failed' },
    'In Stock':      { bg: 'rgba(34,197,94,0.15)',   color: '#22c55e', label: 'In Stock' },
    'Low Stock':     { bg: 'rgba(245,158,11,0.15)',  color: '#f59e0b', label: 'Low Stock' },
    'Out of Stock':  { bg: 'rgba(239,68,68,0.15)',   color: '#ef4444', label: 'Out of Stock' },
  }
  const s = map[status] || { bg: 'rgba(148,163,184,0.15)', color: '#94a3b8', label: status }
  return (
    <span style={{ padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: s.bg, color: s.color }}>
      {s.label}
    </span>
  )
}

function DateRangeFilter({ from, to, onFrom, onTo, onPreset }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
      <div style={{ display: 'flex', gap: 6 }}>
        {PRESETS.map(p => (
          <button
            key={p.days}
            className="btn btn-ghost btn-sm"
            style={{ fontSize: 12 }}
            onClick={() => onPreset(p.days)}
          >
            {p.label}
          </button>
        ))}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Calendar size={14} style={{ color: 'var(--text-muted)'}} />
        <input type="date" className="form-input" style={{ width: 140, fontSize: 12, padding: '6px 10px' }} value={from} onChange={e => onFrom(e.target.value)} />
        <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>to</span>
        <input type="date" className="form-input" style={{ width: 140, fontSize: 12, padding: '6px 10px' }} value={to} onChange={e => onTo(e.target.value)} />
      </div>
    </div>
  )
}

// ─── CSV Export ───────────────────────────────────────────────────────
function exportCSV(filename, rows, headers) {
  const csv = [
    headers.join(','),
    ...rows.map(r => headers.map(h => {
      const v = r[h] ?? ''
      return typeof v === 'string' && v.includes(',') ? `"${v}"` : v
    }).join(','))
  ].join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob)
  a.download = filename; a.click()
}

// ═══════════════════════════════════════════════════════════════════════
// ORDER REPORT
// ═══════════════════════════════════════════════════════════════════════
function OrderReport() {
  const [from, setFrom] = useState(daysAgo(30))
  const [to, setTo]     = useState(today())
  const [status, setStatus] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('')

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['report-orders', from, to, status, paymentMethod],
    queryFn: () => api.get('/reports/orders', { params: { from, to, status, paymentMethod, limit: 100 } }).then(r => r.data.data),
  })

  const s = data?.summary || {}
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <DateRangeFilter from={from} to={to} onFrom={setFrom} onTo={setTo} onPreset={d => { setFrom(daysAgo(d)); setTo(today()) }} />
        <div style={{ display: 'flex', gap: 8 }}>
          <select className="form-select" style={{ fontSize: 12, width: 140 }} value={status} onChange={e => setStatus(e.target.value)}>
            <option value="">All Statuses</option>
            {['pending','confirmed','processing','shipped','delivered','cancelled','refunded'].map(s => (
              <option key={s} value={s}>{s.replace(/_/g,' ')}</option>
            ))}
          </select>
          <select className="form-select" style={{ fontSize: 12, width: 140 }} value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}>
            <option value="">All Payment</option>
            <option value="razorpay">Razorpay</option>
            <option value="cod">COD</option>
          </select>
          <button className="btn btn-ghost btn-sm" onClick={() => refetch()}><RefreshCw size={13} /></button>
          <button className="btn btn-secondary btn-sm" onClick={() => data?.orders && exportCSV('orders_report.csv', data.orders, ['orderNumber','status','paymentStatus','paymentMethod','totalAmount','gstTotal','shippingCharge','couponDiscount','createdAt'])}>
            <Download size={13} /> Export CSV
          </button>
        </div>
      </div>

      {isLoading ? <div className="loading-spinner"><div className="spinner" /></div> : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
            <StatCard label="Total Orders"    value={fmtNum(s.totalOrders)}     color="var(--text-primary)" />
            <StatCard label="Paid Orders"     value={fmtNum(s.paidOrders)}      color="#22c55e" />
            <StatCard label="Pending"         value={fmtNum(s.pendingOrders)}   color="#f59e0b" />
            <StatCard label="Cancelled"       value={fmtNum(s.cancelledOrders)} color="#ef4444" />
            <StatCard label="Total Revenue"   value={fmt(s.totalRevenue)}       color="var(--brand)" />
            <StatCard label="GST Collected"   value={fmt(s.totalGst)}           color="var(--brand)" />
            <StatCard label="Shipping Earned" value={fmt(s.totalShipping)}      color="var(--text-primary)" />
            <StatCard label="Discounts Given" value={fmt(s.totalDiscount)}      color="#ef4444" />
            <StatCard label="Avg Order Value" value={fmt(s.avgOrderValue)}      color="var(--text-primary)" />
          </div>

          <div className="card" style={{ padding: 0 }}>
            <div className="card-header"><h3 className="card-title">Orders ({fmtNum(data?.pagination?.total)})</h3></div>
            <div style={{ overflowX: 'auto' }}>
              <table className="table">
                <thead><tr>
                  <th>Order #</th><th>Date</th><th>Customer</th><th>Status</th>
                  <th>Payment</th><th>Revenue</th><th>GST</th><th>Shipping</th><th>Discount</th>
                </tr></thead>
                <tbody>
                  {(data?.orders || []).map(o => (
                    <tr key={o._id}>
                      <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{o.orderNumber}</td>
                      <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{new Date(o.createdAt).toLocaleDateString('en-IN')}</td>
                      <td>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{o.user?.name || '—'}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{o.user?.email}</div>
                      </td>
                      <td><StatusBadge status={o.status} /></td>
                      <td style={{ fontSize: 12 }}>{o.paymentMethod?.toUpperCase()}</td>
                      <td style={{ fontWeight: 700 }}>{fmt(o.totalAmount)}</td>
                      <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{fmt(o.gstTotal)}</td>
                      <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{fmt(o.shippingCharge)}</td>
                      <td style={{ color: '#ef4444', fontSize: 12 }}>{o.couponDiscount > 0 ? `-${fmt(o.couponDiscount)}` : '—'}</td>
                    </tr>
                  ))}
                  {!data?.orders?.length && <tr><td colSpan={9} style={{ textAlign: 'center', padding: 20, color: 'var(--text-muted)' }}>No orders found</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════
// GST REPORT
// ═══════════════════════════════════════════════════════════════════════
function GSTReport() {
  const [from, setFrom] = useState(daysAgo(30))
  const [to, setTo]     = useState(today())

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['report-gst', from, to],
    queryFn: () => api.get('/reports/gst', { params: { from, to } }).then(r => r.data.data),
  })

  const s = data?.summary || {}
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <DateRangeFilter from={from} to={to} onFrom={setFrom} onTo={setTo} onPreset={d => { setFrom(daysAgo(d)); setTo(today()) }} />
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => refetch()}><RefreshCw size={13} /></button>
          <button className="btn btn-secondary btn-sm" onClick={() => data?.byProduct && exportCSV('gst_report.csv', data.byProduct, ['productName','unitsSold','baseRevenue','gstCollected','gstRate','lineTotal','orderCount'])}>
            <Download size={13} /> Export CSV
          </button>
        </div>
      </div>

      {isLoading ? <div className="loading-spinner"><div className="spinner" /></div> : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
            <StatCard label="Net GST Collected"   value={fmt(s.totalGstCollected)}  color="var(--brand)" />
            <StatCard label="Gross GST"           value={fmt(s.grossGst)}           color="var(--text-primary)" />
            <StatCard label="Refunded GST"        value={fmt(s.refundedGst)}        color="#ef4444" />
            <StatCard label="Net Revenue"         value={fmt(s.totalRevenue)}       color="#22c55e" />
            <StatCard label="Orders / Refunded"   value={`${fmtNum(s.totalOrders)} / ${fmtNum(s.refundedCount)}`} color="var(--text-primary)" />
            <StatCard label="Effective Rate"      value={s.effectiveGstRate || '0%'} color="#6366f1" />
          </div>

          {/* Monthly GST Trend */}
          {data?.monthlyGst?.length > 0 && (
            <div className="card" style={{ padding: 0 }}>
              <div className="card-header"><h3 className="card-title">Monthly GST Trend</h3></div>
              <table className="table">
                <thead><tr><th>Month</th><th>Orders</th><th>Revenue</th><th>GST Collected</th></tr></thead>
                <tbody>
                  {data.monthlyGst.map(m => (
                    <tr key={m.month}>
                      <td style={{ fontWeight: 600 }}>{m.month}</td>
                      <td>{fmtNum(m.orderCount)}</td>
                      <td>{fmt(m.revenue)}</td>
                      <td style={{ color: 'var(--brand)', fontWeight: 700 }}>{fmt(m.gstTotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Product-level GST */}
          <div className="card" style={{ padding: 0 }}>
            <div className="card-header"><h3 className="card-title">GST by Product</h3></div>
            <div style={{ overflowX: 'auto' }}>
              <table className="table">
                <thead><tr>
                  <th>Product</th><th>GST Rate</th><th>Units Sold</th>
                  <th>Base Revenue</th><th>GST Collected</th><th>Total (incl. GST)</th><th>Orders</th>
                </tr></thead>
                <tbody>
                  {(data?.byProduct || []).map(p => (
                    <tr key={p.productId || p.productName}>
                      <td style={{ fontWeight: 600 }}>{p.productName}</td>
                      <td><span className="badge badge-default">{p.gstRate || 0}%</span></td>
                      <td>{fmtNum(p.unitsSold)}</td>
                      <td>{fmt(p.baseRevenue)}</td>
                      <td style={{ color: 'var(--brand)', fontWeight: 700 }}>{fmt(p.gstCollected)}</td>
                      <td>{fmt(p.lineTotal)}</td>
                      <td>{fmtNum(p.orderCount)}</td>
                    </tr>
                  ))}
                  {!data?.byProduct?.length && <tr><td colSpan={7} style={{ textAlign: 'center', padding: 20, color: 'var(--text-muted)' }}>No GST data found</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════
// PRODUCT PERFORMANCE
// ═══════════════════════════════════════════════════════════════════════
function ProductReport() {
  const [from, setFrom] = useState(daysAgo(30))
  const [to, setTo]     = useState(today())

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['report-products', from, to],
    queryFn: () => api.get('/reports/products', { params: { from, to } }).then(r => r.data.data),
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <DateRangeFilter from={from} to={to} onFrom={setFrom} onTo={setTo} onPreset={d => { setFrom(daysAgo(d)); setTo(today()) }} />
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => refetch()}><RefreshCw size={13} /></button>
          <button className="btn btn-secondary btn-sm" onClick={() => data?.topProducts && exportCSV('products_report.csv', data.topProducts, ['rank','productName','categoryName','productType','unitsSold','orderCount','revenue','gstCollected','avgUnitPrice'])}>
            <Download size={13} /> Export CSV
          </button>
        </div>
      </div>

      {isLoading ? <div className="loading-spinner"><div className="spinner" /></div> : (
        <>
          {/* By Category */}
          {data?.byCategory?.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
              {data.byCategory.map(c => (
                <StatCard key={c.categoryName} label={c.categoryName} value={fmt(c.revenue)} sub={`${fmtNum(c.unitsSold)} units · ${fmtNum(c.orderCount)} orders`} color="var(--brand)" />
              ))}
            </div>
          )}

          {/* Top Products */}
          <div className="card" style={{ padding: 0 }}>
            <div className="card-header"><h3 className="card-title">Top Products by Revenue</h3></div>
            <div style={{ overflowX: 'auto' }}>
              <table className="table">
                <thead><tr>
                  <th>#</th><th>Product</th><th>Category</th><th>Units Sold</th>
                  <th>Orders</th><th>Revenue</th><th>GST</th><th>Avg Price</th>
                </tr></thead>
                <tbody>
                  {(data?.topProducts || []).map(p => (
                    <tr key={p.productId || p.productName}>
                      <td style={{ color: 'var(--text-muted)', fontWeight: 700 }}>#{p.rank}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          {p.thumbnail && <img src={`${import.meta.env.VITE_API_URL?.replace('/api', '')}/${p.thumbnail}`} alt="" style={{ width: 36, height: 36, borderRadius: 6, objectFit: 'cover' }} onError={e => e.target.style.display='none'} />}
                          <div>
                            <div style={{ fontWeight: 600, fontSize: 13 }}>{p.productName}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{p.productType}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ fontSize: 12 }}>{p.categoryName}</td>
                      <td style={{ fontWeight: 600 }}>{fmtNum(p.unitsSold)}</td>
                      <td>{fmtNum(p.orderCount)}</td>
                      <td style={{ fontWeight: 700, color: 'var(--brand)' }}>{fmt(p.revenue)}</td>
                      <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{fmt(p.gstCollected)}</td>
                      <td style={{ fontSize: 12 }}>{fmt(p.avgUnitPrice)}</td>
                    </tr>
                  ))}
                  {!data?.topProducts?.length && <tr><td colSpan={8} style={{ textAlign: 'center', padding: 20, color: 'var(--text-muted)' }}>No product sales in this period</td></tr>}
                </tbody>
              </table>
            </div>
          </div>

          {/* Zero Sales */}
          {data?.zeroSalesProducts?.length > 0 && (
            <div className="card" style={{ padding: 0, border: '1px solid rgba(239,68,68,0.2)' }}>
              <div className="card-header">
                <h3 className="card-title" style={{ color: '#ef4444' }}>⚠️ Products with No Sales ({data.zeroSalesProducts.length})</h3>
              </div>
              <table className="table">
                <thead><tr><th>Product</th><th>Category</th><th>Type</th><th>Stock</th></tr></thead>
                <tbody>
                  {data.zeroSalesProducts.map(p => (
                    <tr key={p.productId}>
                      <td style={{ fontWeight: 600 }}>{p.productName}</td>
                      <td style={{ fontSize: 12 }}>{p.categoryName}</td>
                      <td style={{ fontSize: 12 }}>{p.productType}</td>
                      <td>{fmtNum(p.stock)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════
// CUSTOMER REPORT
// ═══════════════════════════════════════════════════════════════════════
function CustomerReport() {
  const [from, setFrom] = useState(daysAgo(30))
  const [to, setTo]     = useState(today())

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['report-customers', from, to],
    queryFn: () => api.get('/reports/customers', { params: { from, to } }).then(r => r.data.data),
  })

  const s = data?.summary || {}
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <DateRangeFilter from={from} to={to} onFrom={setFrom} onTo={setTo} onPreset={d => { setFrom(daysAgo(d)); setTo(today()) }} />
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => refetch()}><RefreshCw size={13} /></button>
          <button className="btn btn-secondary btn-sm" onClick={() => data?.topBuyers && exportCSV('customers_report.csv', data.topBuyers, ['name','email','phone','totalSpent','orderCount','avgOrderVal','lastOrderAt','joinedAt'])}>
            <Download size={13} /> Export CSV
          </button>
        </div>
      </div>

      {isLoading ? <div className="loading-spinner"><div className="spinner" /></div> : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
            <StatCard label="Total Users"       value={fmtNum(s.totalUsers)}       color="var(--text-primary)" />
            <StatCard label="New in Period"     value={fmtNum(s.newUsersInRange)}   color="#6366f1" />
            <StatCard label="Active Buyers"     value={fmtNum(s.activeBuyers)}      color="var(--brand)" />
            <StatCard label="Repeat Customers"  value={fmtNum(s.repeatCustomers)}   color="#22c55e" />
            <StatCard label="One-time Buyers"   value={fmtNum(s.oneTimeCustomers)}  color="#f59e0b" />
          </div>

          <div className="card" style={{ padding: 0 }}>
            <div className="card-header"><h3 className="card-title">Top Buyers</h3></div>
            <div style={{ overflowX: 'auto' }}>
              <table className="table">
                <thead><tr>
                  <th>Customer</th><th>Joined</th><th>Orders</th>
                  <th>Total Spent</th><th>Avg Order</th><th>Last Order</th>
                </tr></thead>
                <tbody>
                  {(data?.topBuyers || []).map((c, i) => (
                    <tr key={c.userId || c.email}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div className="avatar-placeholder" style={{ width: 30, height: 30, fontSize: 11 }}>{c.name?.[0]?.toUpperCase()}</div>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: 13 }}>{c.name}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{c.email}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{c.joinedAt ? new Date(c.joinedAt).toLocaleDateString('en-IN') : '—'}</td>
                      <td style={{ fontWeight: 600 }}>{fmtNum(c.orderCount)}</td>
                      <td style={{ fontWeight: 700, color: 'var(--brand)' }}>{fmt(c.totalSpent)}</td>
                      <td style={{ fontSize: 12 }}>{fmt(c.avgOrderVal)}</td>
                      <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{new Date(c.lastOrderAt).toLocaleDateString('en-IN')}</td>
                    </tr>
                  ))}
                  {!data?.topBuyers?.length && <tr><td colSpan={6} style={{ textAlign: 'center', padding: 20, color: 'var(--text-muted)' }}>No buyer data</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════
// STOCK REPORT
// ═══════════════════════════════════════════════════════════════════════
function StockReport() {
  const [threshold, setThreshold] = useState(10)
  const [search, setSearch] = useState('')

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['report-stock', threshold],
    queryFn: () => api.get('/reports/stock', { params: { lowStockThreshold: threshold } }).then(r => r.data.data),
  })

  const s = data?.summary || {}
  const filtered = (data?.products || []).filter(p =>
    !search || p.productName?.toLowerCase().includes(search.toLowerCase()) || p.categoryName?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Low stock threshold:</span>
          <input type="number" className="form-input" style={{ width: 80, fontSize: 12, padding: '6px 10px' }} value={threshold} min={1} onChange={e => setThreshold(parseInt(e.target.value) || 10)} />
        </div>
        <input className="form-input" placeholder="Filter products..." style={{ width: 200, fontSize: 12 }} value={search} onChange={e => setSearch(e.target.value)} />
        <button className="btn btn-ghost btn-sm" onClick={() => refetch()}><RefreshCw size={13} /></button>
        <button className="btn btn-secondary btn-sm" onClick={() => data?.products && exportCSV('stock_report.csv', data.products, ['productName','categoryName','productType','stock','status'])}>
          <Download size={13} /> Export CSV
        </button>
      </div>

      {isLoading ? <div className="loading-spinner"><div className="spinner" /></div> : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
            <StatCard label="Total Products"    value={fmtNum(s.totalProducts)}    color="var(--text-primary)" />
            <StatCard label="In Stock"          value={fmtNum(s.inStockCount)}     color="#22c55e" />
            <StatCard label="Low Stock"         value={fmtNum(s.lowStockCount)}    color="#f59e0b" />
            <StatCard label="Out of Stock"      value={fmtNum(s.outOfStockCount)}  color="#ef4444" />
            <StatCard label="Inventory Value"   value={fmt(s.totalInventoryValue)} color="var(--brand)" />
          </div>

          {/* By Category */}
          {data?.byCategory?.length > 0 && (
            <div className="card" style={{ padding: 0 }}>
              <div className="card-header"><h3 className="card-title">Stock by Category</h3></div>
              <table className="table">
                <thead><tr><th>Category</th><th>Products</th><th>Total Stock</th><th>Low Stock</th><th>Out of Stock</th><th>Inventory Value</th></tr></thead>
                <tbody>
                  {data.byCategory.map(c => (
                    <tr key={c.categoryName}>
                      <td style={{ fontWeight: 600 }}>{c.categoryName}</td>
                      <td>{fmtNum(c.totalProducts)}</td>
                      <td>{fmtNum(c.totalStock)}</td>
                      <td style={{ color: '#f59e0b', fontWeight: 600 }}>{fmtNum(c.lowStock)}</td>
                      <td style={{ color: '#ef4444', fontWeight: 600 }}>{fmtNum(c.outOfStock)}</td>
                      <td>{fmt(c.inventoryValue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="card" style={{ padding: 0 }}>
            <div className="card-header"><h3 className="card-title">All Products ({filtered.length})</h3></div>
            <div style={{ overflowX: 'auto' }}>
              <table className="table">
                <thead><tr><th>Product</th><th>Category</th><th>Type</th><th>Stock</th><th>Status</th></tr></thead>
                <tbody>
                  {filtered.map(p => (
                    <tr key={p.productId}>
                      <td style={{ fontWeight: 600, fontSize: 13 }}>{p.productName}</td>
                      <td style={{ fontSize: 12 }}>{p.categoryName}</td>
                      <td style={{ fontSize: 12 }}>{p.productType}</td>
                      <td style={{ fontWeight: 700 }}>{fmtNum(p.stock)}</td>
                      <td><StatusBadge status={p.status} /></td>
                    </tr>
                  ))}
                  {!filtered.length && <tr><td colSpan={5} style={{ textAlign: 'center', padding: 20, color: 'var(--text-muted)' }}>No products found</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════
// COUPON REPORT
// ═══════════════════════════════════════════════════════════════════════
function CouponReport() {
  const [from, setFrom] = useState(daysAgo(30))
  const [to, setTo]     = useState(today())

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['report-coupons', from, to],
    queryFn: () => api.get('/reports/coupons', { params: { from, to } }).then(r => r.data.data),
  })

  const s = data?.summary || {}
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <DateRangeFilter from={from} to={to} onFrom={setFrom} onTo={setTo} onPreset={d => { setFrom(daysAgo(d)); setTo(today()) }} />
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => refetch()}><RefreshCw size={13} /></button>
          <button className="btn btn-secondary btn-sm" onClick={() => data?.couponsUsed && exportCSV('coupons_report.csv', data.couponsUsed, ['couponCode','usageCount','totalDiscount','totalRevenue','avgOrderValue'])}>
            <Download size={13} /> Export CSV
          </button>
        </div>
      </div>

      {isLoading ? <div className="loading-spinner"><div className="spinner" /></div> : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
            <StatCard label="Total Orders"       value={fmtNum(s.totalOrders)}       color="var(--text-primary)" />
            <StatCard label="Orders With Coupon" value={fmtNum(s.ordersWithCoupon)}  color="var(--brand)" />
            <StatCard label="Coupon Usage Rate"  value={`${s.couponUsageRate || 0}%`} color="#6366f1" />
            <StatCard label="Total Discount Given" value={fmt(s.totalDiscountGiven)} color="#ef4444" />
            <StatCard label="Revenue (with coupon)" value={fmt(s.totalRevenue)}      color="#22c55e" />
          </div>

          {/* Usage by code */}
          <div className="card" style={{ padding: 0 }}>
            <div className="card-header"><h3 className="card-title">Coupon Usage in Period</h3></div>
            <table className="table">
              <thead><tr><th>Code</th><th>Times Used</th><th>Total Discount</th><th>Revenue Generated</th><th>Avg Order Value</th></tr></thead>
              <tbody>
                {(data?.couponsUsed || []).map(c => (
                  <tr key={c.couponCode}>
                    <td><span className="badge badge-default" style={{ fontFamily: 'monospace', fontSize: 12 }}>{c.couponCode}</span></td>
                    <td style={{ fontWeight: 600 }}>{fmtNum(c.usageCount)}</td>
                    <td style={{ color: '#ef4444' }}>{fmt(c.totalDiscount)}</td>
                    <td style={{ color: '#22c55e', fontWeight: 600 }}>{fmt(c.totalRevenue)}</td>
                    <td>{fmt(c.avgOrderValue)}</td>
                  </tr>
                ))}
                {!data?.couponsUsed?.length && <tr><td colSpan={5} style={{ textAlign: 'center', padding: 20, color: 'var(--text-muted)' }}>No coupon orders in this period</td></tr>}
              </tbody>
            </table>
          </div>

          {/* All coupons */}
          <div className="card" style={{ padding: 0 }}>
            <div className="card-header"><h3 className="card-title">All Coupons</h3></div>
            <table className="table">
              <thead><tr><th>Code</th><th>Type</th><th>Value</th><th>Used / Limit</th><th>Expires</th><th>Status</th></tr></thead>
              <tbody>
                {(data?.allCoupons || []).map(c => (
                  <tr key={c.code}>
                    <td><span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{c.code}</span></td>
                    <td style={{ fontSize: 12 }}>{c.type}</td>
                    <td style={{ fontWeight: 600 }}>{c.type === 'percentage' ? `${c.value}%` : fmt(c.value)}</td>
                    <td>{fmtNum(c.usageCount)} / {c.usageLimit ?? '∞'}</td>
                    <td style={{ fontSize: 12, color: c.isExpired ? '#ef4444' : 'var(--text-muted)' }}>
                      {c.expiresAt ? new Date(c.expiresAt).toLocaleDateString('en-IN') : 'No expiry'}
                    </td>
                    <td>
                      <span style={{ padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                        background: c.isActive && !c.isExpired ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
                        color: c.isActive && !c.isExpired ? '#22c55e' : '#ef4444' }}>
                        {c.isExpired ? 'Expired' : c.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}


export default function Reports() {
  const [searchParams] = useSearchParams()
  const activeReport = searchParams.get('r') || 'orders'

  // Fetch settings to check visibility
  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: () => api.get('/settings').then(r => r.data.data?.settings || {}),
    staleTime: 60 * 1000,
  })

  const reports = settings?.reports || {}
  const settingsKey = REPORT_KEYS[activeReport]
  const isEnabled = !settingsKey || reports[settingsKey] !== false

  const meta = REPORT_META[activeReport]

  const ActiveComponent = {
    orders:    OrderReport,
    gst:       GSTReport,
    products:  ProductReport,
    customers: CustomerReport,
    stock:     StockReport,
    coupons:   CouponReport,
  }[activeReport] || OrderReport

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <FileBarChart2 size={22} style={{ color: 'var(--brand)' }} />
            <div>
              <h1 className="page-title" style={{ marginBottom: 2 }}>{meta?.label || 'Reports'}</h1>
              <p className="page-subtitle">{meta?.desc || 'Business intelligence and analytics'}</p>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Link to="/settings?tab=reports" className="btn btn-ghost btn-sm">
            ⚙️ Report Settings
          </Link>
        </div>
      </div>

      {/* Disabled state */}
      {!isEnabled ? (
        <div className="card" style={{ textAlign: 'center', padding: 60 }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            🚫
          </div>
          <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>This report is disabled</div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>
            Enable <strong>{meta?.label}</strong> from Settings → Reports to view this data.
          </div>
          <Link to="/settings?tab=reports" className="btn btn-primary" style={{ display: 'inline-flex' }}>
            Go to Report Settings
          </Link>
        </div>
      ) : (
        <ActiveComponent />
      )}
    </div>
  )
}
