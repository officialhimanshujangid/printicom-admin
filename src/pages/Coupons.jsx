import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Trash2, ToggleLeft, ToggleRight, Search, Ticket, Eye, Users, CheckCircle, Clock } from 'lucide-react'
import api from '../lib/api'
import toast from 'react-hot-toast'
import { formatDate, formatCurrency, extractError } from '../lib/utils'

const fetchCoupons = async () => {
  const { data } = await api.get('/coupons')
  return data.data?.coupons || data.data || []
}

const defaultForm = {
  code: '', discountType: 'percentage', discountValue: '', minOrderAmount: '',
  maxDiscountAmount: '', validFrom: '', validUntil: '', usageLimit: '', perUserLimit: 1, description: '',
  // Advanced conditions
  isFirstOrderOnly: false, maxOrderAmount: '', minAccountAgeDays: '',
}

export default function Coupons() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState(defaultForm)
  const [saving, setSaving] = useState(false)
  
  const [detailsModal, setDetailsModal] = useState(null)
  
  const [targetModal, setTargetModal] = useState(false)
  const [targetForm, setTargetForm] = useState({
    code: '', discountType: 'percentage', discountValue: '', validDays: 7, targetType: 'state', targetValue: ''
  })
  const [targetSaving, setTargetSaving] = useState(false)

  const { data: coupons = [], isLoading } = useQuery({ queryKey: ['coupons'], queryFn: fetchCoupons })

  const filtered = coupons.filter((c) =>
    c.code?.toLowerCase().includes(search.toLowerCase())
  )

  const openCreate = () => {
    setForm({ ...defaultForm, validFrom: new Date().toISOString().split('T')[0] })
    setModal('create')
  }

  const openEdit = (coupon) => {
    setForm({
      code: coupon.code, discountType: coupon.discountType, discountValue: coupon.discountValue,
      minOrderAmount: coupon.minOrderAmount || '', maxDiscountAmount: coupon.maxDiscountAmount || '',
      validFrom: coupon.validFrom?.split('T')[0] || '', validUntil: coupon.validUntil?.split('T')[0] || '',
      usageLimit: coupon.usageLimit || '', perUserLimit: coupon.perUserLimit || 1, description: coupon.description || '',
      isFirstOrderOnly: coupon.isFirstOrderOnly || false,
      maxOrderAmount: coupon.maxOrderAmount || '', minAccountAgeDays: coupon.minAccountAgeDays || '',
    })
    setModal(coupon)
  }

  const handleSendTargeted = async (e) => {
    e.preventDefault()
    setTargetSaving(true)
    try {
      const criteria = {}
      if (targetForm.targetType === 'state') criteria.state = targetForm.targetValue
      else if (targetForm.targetType === 'minTotalSpent') criteria.minTotalSpent = targetForm.targetValue
      else if (targetForm.targetType === 'specificEmails') criteria.specificEmails = targetForm.targetValue.split(',').map(s=>s.trim()).filter(Boolean)
      
      const payload = {
         code: targetForm.code, discountType: targetForm.discountType, discountValue: targetForm.discountValue, validDays: targetForm.validDays,
         targetCriteria: criteria
      }
      
      await api.post('/coupons/targeted-campaign', payload)
      toast.success('Targeted campaign launched!')
      setTargetModal(false)
      qc.invalidateQueries({ queryKey: ['coupons'] })
    } catch (err) {
      toast.error(extractError(err))
    } finally {
      setTargetSaving(false)
    }
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = { ...form }
      if (!payload.usageLimit) delete payload.usageLimit
      if (!payload.minOrderAmount) delete payload.minOrderAmount
      if (!payload.maxDiscountAmount) delete payload.maxDiscountAmount

      if (modal === 'create') {
        await api.post('/coupons', payload)
        toast.success('Coupon created!')
      } else {
        await api.put(`/coupons/${modal._id}`, payload)
        toast.success('Coupon updated!')
      }
      qc.invalidateQueries({ queryKey: ['coupons'] })
      setModal(null)
    } catch (err) {
      toast.error(extractError(err))
    } finally {
      setSaving(false)
    }
  }

  const toggleStatus = useMutation({
    mutationFn: (id) => api.patch(`/coupons/${id}/toggle-status`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['coupons'] }); toast.success('Status updated!') },
    onError: (err) => toast.error(extractError(err)),
  })

  const deleteCoupon = useMutation({
    mutationFn: (id) => api.delete(`/coupons/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['coupons'] }); toast.success('Coupon deleted!') },
    onError: (err) => toast.error(extractError(err)),
  })

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Coupons</h1>
          <p className="page-subtitle">Manage discount codes and promotions</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-secondary" onClick={() => { setTargetForm({ code: '', discountType: 'percentage', discountValue: '', validDays: 7, targetType: 'state', targetValue: '' }); setTargetModal(true) }}>
            <Ticket size={16} /> Targeted Campaign
          </button>
          <button className="btn btn-primary" onClick={openCreate}>
            <Plus size={16} /> Create Coupon
          </button>
        </div>
      </div>

      <div className="filters-bar">
        <div className="search-bar">
          <Search size={16} />
          <input className="form-input" placeholder="Search coupons..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <span className="badge badge-default">{filtered.length} coupons</span>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Code</th>
                <th>Type</th>
                <th>Value</th>
                <th>Min Order</th>
                <th>Valid Until</th>
                <th>Uses</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={8} style={{ textAlign: 'center', padding: 40 }}><div className="spinner" style={{ margin: 'auto' }} /></td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={8}><div className="empty-state"><Ticket size={40} /><h3>No coupons found</h3></div></td></tr>
              ) : filtered.map((c) => (
                <tr key={c._id}>
                  <td>
                    <code style={{ background: 'rgba(99,102,241,0.12)', color: 'var(--brand-primary)', padding: '3px 8px', borderRadius: 6, fontSize: 12, fontWeight: 700, letterSpacing: 1 }}>
                      {c.code}
                    </code>
                  </td>
                  <td><span className="badge badge-info">{c.discountType}</span></td>
                  <td style={{ fontWeight: 700, color: 'var(--success)' }}>
                    {c.discountType === 'percentage' ? `${c.discountValue}%` : formatCurrency(c.discountValue)}
                    {c.maxDiscountAmount ? <span style={{ fontSize: 10, color: 'var(--text-muted)', display: 'block' }}>Max: {formatCurrency(c.maxDiscountAmount)}</span> : null}
                  </td>
                  <td>{c.minOrderAmount ? formatCurrency(c.minOrderAmount) : '—'}</td>
                  <td style={{ fontSize: 12 }}>{formatDate(c.validUntil)}</td>
                  <td style={{ fontSize: 12 }}>
                    {c.usageCount || 0}{c.usageLimit ? `/${c.usageLimit}` : ''}
                  </td>
                  <td><span className={`badge ${c.isActive ? 'badge-success' : 'badge-danger'}`}>{c.isActive ? 'Active' : 'Inactive'}</span></td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setDetailsModal(c)}><Eye size={14} /></button>
                      <button className="btn btn-ghost btn-icon btn-sm" onClick={() => openEdit(c)}><Pencil size={14} /></button>
                      <button className="btn btn-ghost btn-icon btn-sm" onClick={() => toggleStatus.mutate(c._id)} style={{ color: c.isActive ? 'var(--warning)' : 'var(--success)' }}>
                        {c.isActive ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                      </button>
                      <button className="btn btn-ghost btn-icon btn-sm" onClick={() => { if (confirm('Delete this coupon?')) deleteCoupon.mutate(c._id) }} style={{ color: 'var(--danger)' }}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {modal !== null && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setModal(null) }}>
          <div className="modal">
            <div className="modal-header">
              <h2 className="modal-title">{modal === 'create' ? 'Create Coupon' : 'Edit Coupon'}</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setModal(null)}>✕</button>
            </div>
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Coupon Code *</label>
                  <input className="form-input" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} required placeholder="SAVE20" style={{ letterSpacing: 1, fontWeight: 700 }} />
                </div>
                <div className="form-group">
                  <label className="form-label">Discount Type *</label>
                  <select className="form-select" value={form.discountType} onChange={(e) => setForm({ ...form, discountType: e.target.value })}>
                    <option value="percentage">Percentage (%)</option>
                    <option value="flat">Flat (₹)</option>
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Discount Value *</label>
                  <input type="number" className="form-input" value={form.discountValue} onChange={(e) => setForm({ ...form, discountValue: e.target.value })} required min={1} placeholder={form.discountType === 'percentage' ? '20' : '50'} />
                </div>
                {form.discountType === 'percentage' && (
                  <div className="form-group">
                    <label className="form-label">Max Discount (₹)</label>
                    <input type="number" className="form-input" value={form.maxDiscountAmount} onChange={(e) => setForm({ ...form, maxDiscountAmount: e.target.value })} min={0} placeholder="500" />
                  </div>
                )}
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Min Order Amount (₹)</label>
                  <input type="number" className="form-input" value={form.minOrderAmount} onChange={(e) => setForm({ ...form, minOrderAmount: e.target.value })} min={0} placeholder="500" />
                </div>
                <div className="form-group">
                  <label className="form-label">Usage Limit</label>
                  <input type="number" className="form-input" value={form.usageLimit} onChange={(e) => setForm({ ...form, usageLimit: e.target.value })} min={1} placeholder="Unlimited" />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Valid From *</label>
                  <input type="date" className="form-input" value={form.validFrom} onChange={(e) => setForm({ ...form, validFrom: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Valid Until *</label>
                  <input type="date" className="form-input" value={form.validUntil} onChange={(e) => setForm({ ...form, validUntil: e.target.value })} required />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <input className="form-input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Internal note..." />
              </div>

              {/* Advanced Conditions */}
              <div style={{ background: 'var(--bg-hover)', borderRadius: 10, padding: '12px 16px' }}>
                <div style={{ fontWeight: 700, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 12 }}>🎯 Advanced Conditions <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(all optional)</span></div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Max Order Amount (₹)</label>
                    <input type="number" className="form-input" value={form.maxOrderAmount} onChange={(e) => setForm({ ...form, maxOrderAmount: e.target.value })} min={0} placeholder="Unlimited" />
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Coupon only valid when cart is below this</div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Min Account Age (days)</label>
                    <input type="number" className="form-input" value={form.minAccountAgeDays} onChange={(e) => setForm({ ...form, minAccountAgeDays: e.target.value })} min={0} placeholder="Any" />
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>User account must be at least X days old</div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
                  <label className="toggle" style={{ flexShrink: 0 }}>
                    <input type="checkbox" checked={form.isFirstOrderOnly} onChange={(e) => setForm({ ...form, isFirstOrderOnly: e.target.checked })} />
                    <span className="toggle-slider" />
                  </label>
                  <div>
                    <span className="form-label" style={{ marginBottom: 0 }}>First Order Only</span>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Coupon is only valid for users who have never placed an order</div>
                  </div>
                </div>
              </div>
              <div className="modal-footer" style={{ margin: 0, padding: 0, border: 0 }}>
                <button type="button" className="btn btn-secondary" onClick={() => setModal(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? <div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> : modal === 'create' ? 'Create Coupon' : 'Update Coupon'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Targeted Campaign Modal */}
      {targetModal && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setTargetModal(false) }}>
          <div className="modal">
            <div className="modal-header">
              <h2 className="modal-title">Launch Targeted Campaign</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setTargetModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSendTargeted} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Coupon Code *</label>
                  <input className="form-input" value={targetForm.code} onChange={(e) => setTargetForm({ ...targetForm, code: e.target.value.toUpperCase() })} required placeholder="SPECIAL20" style={{ letterSpacing: 1, fontWeight: 700 }} />
                </div>
                <div className="form-group">
                  <label className="form-label">Discount Type *</label>
                  <select className="form-select" value={targetForm.discountType} onChange={(e) => setTargetForm({ ...targetForm, discountType: e.target.value })}>
                    <option value="percentage">Percentage (%)</option>
                    <option value="flat">Flat (₹)</option>
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Discount Value *</label>
                  <input type="number" className="form-input" value={targetForm.discountValue} onChange={(e) => setTargetForm({ ...targetForm, discountValue: e.target.value })} required min={1} />
                </div>
                <div className="form-group">
                  <label className="form-label">Valid For (Days) *</label>
                  <input type="number" className="form-input" value={targetForm.validDays} onChange={(e) => setTargetForm({ ...targetForm, validDays: e.target.value })} required min={1} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Target Audience By *</label>
                  <select className="form-select" value={targetForm.targetType} onChange={(e) => setTargetForm({ ...targetForm, targetType: e.target.value, targetValue: '' })}>
                    <option value="state">Specific State</option>
                    <option value="minTotalSpent">Minimum Lifetime Value (₹)</option>
                    <option value="specificEmails">Specific Customer Emails</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Target Value *</label>
                {targetForm.targetType === 'state' && <input className="form-input" placeholder="e.g. Maharashtra" value={targetForm.targetValue} onChange={(e) => setTargetForm({ ...targetForm, targetValue: e.target.value })} required />}
                {targetForm.targetType === 'minTotalSpent' && <input type="number" className="form-input" placeholder="e.g. 5000" value={targetForm.targetValue} onChange={(e) => setTargetForm({ ...targetForm, targetValue: e.target.value })} required />}
                {targetForm.targetType === 'specificEmails' && <textarea className="form-input" placeholder="comma separated emails" rows={3} value={targetForm.targetValue} onChange={(e) => setTargetForm({ ...targetForm, targetValue: e.target.value })} required />}
              </div>
              <div className="modal-footer" style={{ margin: 0, padding: 0, border: 0 }}>
                <button type="button" className="btn btn-secondary" onClick={() => setTargetModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={targetSaving}>
                  {targetSaving ? <div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> : 'Launch Campaign'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* Details / Stats Modal */}
      {detailsModal && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setDetailsModal(null) }}>
          <div className="modal" style={{ maxWidth: 700, maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
            <div className="modal-header">
              <h2 className="modal-title">Coupon Details - <span style={{ color: 'var(--brand-primary)', letterSpacing: 1 }}>{detailsModal.code}</span></h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setDetailsModal(null)}>✕</button>
            </div>
            
            <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
                <div style={{ background: 'rgba(99,102,241,0.06)', borderRadius: 12, padding: 16, border: '1px solid rgba(99,102,241,0.1)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--brand-primary)', marginBottom: 8, fontWeight: 600 }}><Users size={18} /> Targeted Users</div>
                  <div style={{ fontSize: 24, fontWeight: 800 }}>{detailsModal.targetedUsers?.length || 0}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Users specifically sent this code</div>
                </div>
                <div style={{ background: 'rgba(16,185,129,0.06)', borderRadius: 12, padding: 16, border: '1px solid rgba(16,185,129,0.1)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--success)', marginBottom: 8, fontWeight: 600 }}><CheckCircle size={18} /> Claimed By</div>
                  <div style={{ fontSize: 24, fontWeight: 800 }}>
                    {new Set(detailsModal.usedBy?.map(u => u.user?._id)).size || 0}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Unique users who successfully used it</div>
                </div>
                <div style={{ background: 'rgba(245,158,11,0.06)', borderRadius: 12, padding: 16, border: '1px solid rgba(245,158,11,0.1)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--warning)', marginBottom: 8, fontWeight: 600 }}><Ticket size={18} /> Total Usages</div>
                  <div style={{ fontSize: 24, fontWeight: 800 }}>{detailsModal.usageCount || 0}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Total times code applied</div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                {/* Targeted List */}
                <div>
                  <h3 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: 12, paddingBottom: 8, borderBottom: '1px solid var(--border)' }}>Sent To (Targeted)</h3>
                  {(!detailsModal.targetedUsers || detailsModal.targetedUsers.length === 0) ? (
                    <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem', background: 'var(--bg-hover)', borderRadius: 8 }}>
                      Public Coupon
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {detailsModal.targetedUsers.map(u => u && (
                        <div key={u._id} style={{ display: 'flex', gap: 12, alignItems: 'center', background: 'var(--bg-hover)', padding: '10px 12px', borderRadius: 8 }}>
                          <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--brand-primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.9rem' }}>
                            {u.name?.charAt(0).toUpperCase() || '?'}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 600, fontSize: '0.85rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.name}</div>
                            <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.email}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Used By List */}
                <div>
                  <h3 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: 12, paddingBottom: 8, borderBottom: '1px solid var(--border)' }}>Claim History</h3>
                  {(!detailsModal.usedBy || detailsModal.usedBy.length === 0) ? (
                    <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem', background: 'var(--bg-hover)', borderRadius: 8 }}>
                      Not claimed yet
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {detailsModal.usedBy.slice().reverse().map((usage, idx) => usage.user && (
                        <div key={idx} style={{ display: 'flex', gap: 12, alignItems: 'center', background: 'var(--bg-hover)', padding: '10px 12px', borderRadius: 8 }}>
                          <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--success)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.9rem' }}>
                            {usage.user?.name?.charAt(0).toUpperCase() || '?'}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 600, fontSize: '0.85rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{usage.user.name}</div>
                            <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{usage.user.email}</div>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                            <Clock size={12} style={{ color: 'var(--text-muted)', marginBottom: 2 }} />
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{new Date(usage.usedAt).toLocaleDateString()}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="modal-footer" style={{ marginTop: 0 }}>
              <button className="btn btn-secondary" onClick={() => setDetailsModal(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
