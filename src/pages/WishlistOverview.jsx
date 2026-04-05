import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Heart, TrendingUp, Users, ShoppingBag, Package, ChevronRight, Info, Mail, Search, Ticket } from 'lucide-react'
import api from '../lib/api'
import toast from 'react-hot-toast'
import { extractError, formatCurrency, buildImageUrl, timeAgo } from '../lib/utils'

const fetchWishlistStats = async () => {
  const { data } = await api.get('/admin/wishlist')
  return data.data || { topProducts: [], stats: {} }
}

export default function WishlistOverview() {
  const [filterType, setFilterType] = useState('all') // 'all', 'Physical', 'Digital'
  const [sortBy, setSortBy] = useState('most_wishlisted') // 'most_wishlisted', 'least_wishlisted', 'newest'
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [search, setSearch] = useState('')
  const [couponModalOpen, setCouponModalOpen] = useState(false)
  const [couponData, setCouponData] = useState({ code: 'WISH10', discountType: 'percentage', discountValue: 10, validDays: 7 })

  const { data, isLoading } = useQuery({ queryKey: ['wishlistStats'], queryFn: fetchWishlistStats })
  const stats = data?.topWishlisted || []

  // Drawer for product-specific wishlist details
  const { data: detailData, isLoading: isDetailLoading } = useQuery({
    queryKey: ['wishlistProductDetail', selectedProduct?._id],
    queryFn: async () => {
      const { data } = await api.get(`/admin/wishlist/product/${selectedProduct._id}`)
      return data.data || { product: null, wishlistedBy: [] }
    },
    enabled: !!selectedProduct?._id
  })

  // Normalize stats for UI (backend returns topWishlisted with count/product)
  let statsList = stats.map(s => ({
    product: s, // The backend object for each entry in topWishlisted contains product details at root (productId, name, etc.)
    wishlisted: s.wishlisted,
    _id: s.productId,
    latestAddedAt: s.latestAddedAt
  }))

  // Apply filters
  let filteredStats = statsList.filter(s => s.product?.name?.toLowerCase().includes(search.toLowerCase()))
  
  if (filterType !== 'all') {
    filteredStats = filteredStats.filter(s => s.product?.productType === filterType)
  }

  // Apply sorting
  filteredStats.sort((a, b) => {
    if (sortBy === 'most_wishlisted') return b.wishlisted - a.wishlisted
    if (sortBy === 'least_wishlisted') return a.wishlisted - b.wishlisted
    if (sortBy === 'newest') return new Date(b.latestAddedAt) - new Date(a.latestAddedAt)
    return 0
  })

  const sendCoupon = async () => {
    try {
      await api.post('/coupons/targeted-campaign', {
        code: couponData.code,
        discountType: couponData.discountType,
        discountValue: couponData.discountValue,
        validDays: couponData.validDays,
        targetCriteria: { wishlistProductId: selectedProduct._id }
      })
      toast.success('Targeted campaign launched successfully!')
      setCouponModalOpen(false)
    } catch (err) {
      toast.error(extractError(err))
    }
  }

  if (isLoading) return <div className="loading-spinner"><div className="spinner" /></div>

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Wishlist Analytics</h1>
          <p className="page-subtitle">Track trending products and customer purchase intent</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20, marginBottom: 32 }}>
        <div className="stat-card" style={{ background: 'linear-gradient(135deg, #111827 0%, #1a2340 100%)' }}>
           <div className="stat-header"><div className="stat-icon" style={{ background: '#f43f5e1a', color: '#f43f5e' }}><Heart size={20}/></div><div className="stat-label">Total Wishlists</div></div>
           <div className="stat-value" style={{ color: '#f43f5e' }}>{data?.stats?.totalWishlistUsers || statsList.reduce((sum, s) => sum + s.wishlisted, 0)}</div>
        </div>
        <div className="stat-card" style={{ background: 'linear-gradient(135deg, #111827 0%, #1a2340 100%)' }}>
           <div className="stat-header"><div className="stat-icon" style={{ background: '#6366f11a', color: '#6366f1' }}><Package size={20}/></div><div className="stat-label">Items Saved</div></div>
           <div className="stat-value">{data?.stats?.totalWishlistItems || 0}</div>
        </div>
        <div className="stat-card" style={{ background: 'linear-gradient(135deg, #111827 0%, #22c55e0d 100%)' }}>
           <div className="stat-header"><div className="stat-icon" style={{ background: '#22c55e1a', color: '#22c55e' }}><TrendingUp size={20}/></div><div className="stat-label">Potential Revenue</div></div>
           <div className="stat-value" style={{ color: '#22c55e' }}>{formatCurrency(statsList.reduce((sum, s) => sum + (s.product?.discountPrice || s.product?.basePrice || 0) * s.wishlisted, 0))}</div>
        </div>
        <div className="stat-card" style={{ background: 'linear-gradient(135deg, #111827 0%, #1a2340 100%)' }}>
           <div className="stat-header"><div className="stat-icon" style={{ background: '#f59e0b1a', color: '#f59e0b' }}><Users size={20}/></div><div className="stat-label">Unique Products</div></div>
           <div className="stat-value">{data?.stats?.uniqueProductsWishlisted || 0}</div>
        </div>
      </div>

      <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-light)', borderRadius: 20, padding: 24, marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: 12, flex: 2, minWidth: 280 }}>
            <div className="search-bar" style={{ maxWidth: '100%' }}>
              <Search size={18} />
              <input type="text" className="form-input" style={{ paddingLeft: 44, height: 46, borderRadius: 12, background: 'var(--bg-base)' }} placeholder="Search trending products..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, justifyContent: 'flex-end', minWidth: 280 }}>
            <div style={{ display: 'flex', background: 'var(--bg-base)', padding: 4, borderRadius: 12, border: '1px solid var(--border-light)' }}>
              {['all', 'Physical', 'Digital'].map(type => (
                <button key={type} onClick={() => setFilterType(type)} style={{ padding: '8px 16px', borderRadius: 10, fontSize: 13, border: 'none', cursor: 'pointer', background: filterType === type ? 'var(--brand-primary)' : 'transparent', color: filterType === type ? '#fff' : 'var(--text-secondary)', transition: 'all 0.2s' }}>{type}</button>
              ))}
            </div>
            <select className="form-select" style={{ width: 180, height: 46, borderRadius: 12, background: 'var(--bg-base)' }} value={sortBy} onChange={e => setSortBy(e.target.value)}>
              <option value="most_wishlisted">Most Wishlisted</option>
              <option value="least_wishlisted">Least Wishlisted</option>
              <option value="newest">Latest Activity</option>
            </select>
          </div>
        </div>

        {search && (
          <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: 'var(--text-muted)' }}>
            <span>Showing results for "{search}" in {filterType} products</span>
            <button className="btn btn-sm btn-ghost" onClick={() => setSearch('')} style={{ color: 'var(--brand-primary)', padding: 0 }}>Clear Search</button>
          </div>
        )}
      </div>

      <div className="card" style={{ padding: 0 }}>
        <div className="card-header" style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
           <h3 className="card-title">Top Wishlisted Products</h3>
        </div>
        <table className="table">
          <thead>
            <tr>
              <th width="350">Product</th>
              <th>Category</th>
              <th>Status</th>
              <th>Wishlist Count</th>
              <th width="100">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredStats.map(stat => (
              <tr key={stat._id}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{ width: 44, height: 44, borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border)', background: 'var(--bg-hover)', flexShrink: 0 }}>
                       {stat.product?.thumbnailImage ? (
                         <img src={buildImageUrl(stat.product.thumbnailImage)} alt={stat.product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                       ) : (
                         <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Package size={20} color="var(--text-muted)" /></div>
                       )}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{stat.product?.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--success)', fontWeight: 700 }}>{formatCurrency(stat.product?.discountPrice || stat.product?.basePrice)}</div>
                    </div>
                  </div>
                </td>
                <td><span className="badge badge-default">{stat.product?.productType || 'Product'}</span></td>
                <td><span className={`badge ${stat.product?.isActive ? 'badge-success' : 'badge-danger'}`}>{stat.product?.isActive ? 'Available' : 'Draft'}</span></td>
                <td>
                   <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ fontWeight: 800, fontSize: 16, color: '#f43f5e' }}>{stat.wishlisted}</div>
                      <div style={{ flex: 1, minWidth: 100, height: 6, background: 'var(--bg-hover)', borderRadius: 10, overflow: 'hidden' }}>
                         <div style={{ width: `${Math.min(100, (stat.wishlisted / 20) * 100)}%`, height: '100%', background: '#f43f5e', borderRadius: 10 }} />
                      </div>
                   </div>
                </td>
                <td><button className="btn btn-ghost btn-icon" onClick={() => setSelectedProduct({ _id: stat._id, name: stat.product.name })}><Users size={16} /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Product Wishlist Users Drawer */}
      {selectedProduct && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setSelectedProduct(null)}>
          <div className="modal modal-lg" style={{ maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <Heart size={20} color="#f43f5e" />
                <h2 className="modal-title">Wishlist Audience: {selectedProduct.name}</h2>
              </div>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setSelectedProduct(null)}>✕</button>
            </div>
            
            <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
              {isDetailLoading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: 100 }}><div className="spinner" /></div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  <div className="alert alert-info" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 20px' }}>
                    <Info size={18} />
                    <div style={{ fontSize: 13.5, flex: 1 }}>There are <strong>{detailData.users?.length || 0} users</strong> who have this product in their wishlist. You can broadcast a notification or offer to them.</div>
                    <button className="btn btn-primary btn-sm" onClick={() => setCouponModalOpen(true)}>
                       <Ticket size={14} /> Send Special Coupon
                    </button>
                  </div>

                  <div className="card" style={{ padding: 0 }}>
                    <table className="table">
                      <thead>
                        <tr>
                          <th>User</th>
                          <th>Status</th>
                          <th>Verified</th>
                          <th>Added On</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(detailData.users || []).map(entry => (
                          <tr key={entry.userId}>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <div className="avatar-placeholder" style={{ width: 34, height: 34, fontSize: 14 }}>{entry.name?.[0]}</div>
                                <div>
                                  <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{entry.name}</div>
                                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{entry.email}</div>
                                </div>
                              </div>
                            </td>
                            <td><span className={`badge ${entry.isActive ? 'badge-success' : 'badge-danger'}`}>{entry.isActive ? 'Active' : 'Deactivated'}</span></td>
                            <td><span className={`badge ${entry.isEmailVerified ? 'badge-success' : 'badge-warning'}`}>{entry.isEmailVerified ? '✅' : '❌'}</span></td>
                            <td style={{ fontSize: 13, color: 'var(--text-muted)' }}>{timeAgo(entry.addedAt)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Send Coupon Modal */}
      {couponModalOpen && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2 className="modal-title">Send Wishlist Coupon</h2>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setCouponModalOpen(false)}>✕</button>
            </div>
            <div style={{ padding: 20 }}>
              <div style={{ marginBottom: 15 }}>
                <label className="form-label">Coupon Code</label>
                <input className="form-input" value={couponData.code} onChange={e => setCouponData({...couponData, code: e.target.value.toUpperCase()})} />
              </div>
              <div style={{ display: 'flex', gap: 10, marginBottom: 15 }}>
                 <div style={{ flex: 1 }}>
                    <label className="form-label">Discount Type</label>
                    <select className="form-select" value={couponData.discountType} onChange={e => setCouponData({...couponData, discountType: e.target.value})}>
                       <option value="percentage">Percentage (%)</option>
                       <option value="flat">Flat Amount (₹)</option>
                    </select>
                 </div>
                 <div style={{ flex: 1 }}>
                    <label className="form-label">Value</label>
                    <input type="number" className="form-input" value={couponData.discountValue} onChange={e => setCouponData({...couponData, discountValue: e.target.value})} />
                 </div>
              </div>
              <div style={{ marginBottom: 20 }}>
                <label className="form-label">Valid For (Days)</label>
                <input type="number" className="form-input" value={couponData.validDays} onChange={e => setCouponData({...couponData, validDays: e.target.value})} />
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                 <button className="btn btn-ghost" onClick={() => setCouponModalOpen(false)}>Cancel</button>
                 <button className="btn btn-primary" onClick={sendCoupon}>Send to {detailData?.users?.length || 0} Users</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
